import { createHash } from "crypto";
import type { BackupTriggerReason, BackupType } from "@/types/models";

/** Seul algorithme accepté aujourd'hui — toute évolution future de la canonicalisation obtient une nouvelle chaîne de version. */
export const CHECKSUM_ALGORITHM = "sha256-canonical-json-v1";

/**
 * Tri récursif alphabétique des clés d'objet, tableaux jamais réordonnés
 * (l'ordre des lignes dans un snapshot est signifiant), sérialisation
 * compacte. Utilisée à l'identique à l'écriture (création d'un backup) et à
 * la lecture (vérification/téléchargement) — jamais deux implémentations.
 */
export function canonicalizeForChecksum(value: unknown): string {
  return JSON.stringify(sortKeysDeep(value));
}

function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortKeysDeep);
  }
  if (value !== null && typeof value === "object") {
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      sorted[key] = sortKeysDeep((value as Record<string, unknown>)[key]);
    }
    return sorted;
  }
  return value;
}

/** sha256 hex de la forme canonique, encodée en UTF-8 avant hachage. */
export function computeChecksum(value: unknown): string {
  return createHash("sha256").update(canonicalizeForChecksum(value), "utf8").digest("hex");
}

/**
 * Quatre états distincts — ne jamais présenter un backup comme "ok" (Intègre)
 * uniquement parce qu'un checksum est stocké. "unverified" est l'état par
 * défaut d'un backup format 2 tant qu'aucun recalcul actif n'a eu lieu dans
 * la requête en cours ; "ok"/"mismatch" ne sont atteints qu'après un
 * recalcul réel (voir verifyChecksum ci-dessous, jamais checksumPresenceStatus).
 */
export type ChecksumStatus = "legacy-unverifiable" | "unverified" | "ok" | "mismatch";

export const CHECKSUM_STATUS_LABELS: Record<ChecksumStatus, string> = {
  "legacy-unverifiable": "Non vérifiable — backup legacy",
  unverified: "Non vérifié — checksum disponible",
  ok: "Intègre — après recalcul réussi",
  mismatch: "Divergence détectée — après recalcul différent",
};

/**
 * Statut à partir de la seule PRÉSENCE du checksum stocké — jamais un
 * recalcul, donc jamais "ok"/"mismatch". Seule fonction utilisable dans un
 * contexte qui ne charge pas le contenu complet (ex. liste des backups
 * accessible aux coachs, qui ne doit jamais charger `snapshot`).
 */
export function checksumPresenceStatus(storedChecksum: string | null): "legacy-unverifiable" | "unverified" {
  return storedChecksum ? "unverified" : "legacy-unverifiable";
}

/**
 * Recalcule réellement le checksum à partir du contenu et compare — seule
 * fonction qui peut renvoyer "ok" ou "mismatch". Nécessite d'avoir chargé le
 * contenu complet (snapshot ou payload d'artefact) ; à n'appeler que depuis
 * une action serveur déjà gardée (requireFreshCoach() au minimum).
 */
export function verifyChecksum(storedChecksum: string | null, content: unknown): ChecksumStatus {
  if (!storedChecksum) return "legacy-unverifiable";
  return computeChecksum(content) === storedChecksum ? "ok" : "mismatch";
}

/** Tables listées comme incluses mais absentes du snapshot réel — signal d'anomalie, jamais silencieux. */
export function detectMissingTables(tablesIncluded: string[], snapshot: Record<string, unknown>): string[] {
  return tablesIncluded.filter((table) => !(table in snapshot));
}

/** Compteur déclaré (table_counts) différent du nombre de lignes réellement présentes dans le snapshot. */
export function detectCountMismatches(
  tableCounts: Record<string, number>,
  snapshot: Record<string, unknown>
): { table: string; declared: number; actual: number }[] {
  const mismatches: { table: string; declared: number; actual: number }[] = [];
  for (const [table, declared] of Object.entries(tableCounts)) {
    const rows = snapshot[table];
    const actual = Array.isArray(rows) ? rows.length : 0;
    if (actual !== declared) mismatches.push({ table, declared, actual });
  }
  return mismatches;
}

/**
 * backup_type est toujours dérivé de trigger_reason, jamais fourni
 * séparément par l'appelant — élimine tout risque d'incohérence entre les
 * deux (Lot 6, roadmap V3).
 */
export function backupTypeForTriggerReason(reason: BackupTriggerReason): BackupType {
  switch (reason) {
    case "manual":
      return "manual";
    case "weekly":
      return "routine";
    case "before_reset":
    case "before_restore":
    case "before_migration":
    case "before_fusion":
    case "before_unlock":
      return "pre_operation";
    case "end_of_season":
      return "end_of_season";
  }
}

/** trigger_reason dont l'artefact audit_log doit être généré automatiquement (backups "sensibles"). */
const SENSITIVE_TRIGGER_REASONS: readonly BackupTriggerReason[] = ["before_restore", "before_migration", "before_fusion"];

export function requiresAuditLogArtifact(reason: BackupTriggerReason): boolean {
  return SENSITIVE_TRIGGER_REASONS.includes(reason);
}
