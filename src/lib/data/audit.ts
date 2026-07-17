import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getActivePlayers } from "./players";
import type { Json } from "@/types/database";

export type AuditAction = "insert" | "update" | "delete";

const TRACKED_TABLE_LABELS: Record<string, string> = {
  matches: "Score du match",
  goals: "But",
  cards: "Carton",
  players: "Fiche joueur",
  dues: "Cotisation",
  seasons: "Saison",
};

/**
 * Enregistre une modification à fort enjeu (score, buts, cartons, fiches
 * joueurs) pour pouvoir la restaurer plus tard. Fonctionnalité annexe —
 * ne doit jamais faire échouer l'action principale si elle rate.
 */
export async function logChange(params: {
  tableName: string;
  recordId: string;
  action: AuditAction;
  oldData?: Record<string, unknown> | null;
  newData?: Record<string, unknown> | null;
  changedByPlayerId: string;
  changedByName: string;
}): Promise<void> {
  try {
    await supabaseAdmin.from("audit_log").insert({
      table_name: params.tableName,
      record_id: params.recordId,
      action: params.action,
      old_data: (params.oldData ?? null) as Json,
      new_data: (params.newData ?? null) as Json,
      changed_by_player_id: params.changedByPlayerId,
      changed_by_name: params.changedByName,
    });
  } catch {
    // la table peut ne pas encore exister (migration pas encore lancée) — tant pis pour l'historique
  }
}

export type AuditEntry = {
  id: string;
  tableName: string;
  tableLabel: string;
  recordId: string;
  action: AuditAction;
  oldData: Record<string, unknown> | null;
  newData: Record<string, unknown> | null;
  changedByName: string;
  restoredAt: string | null;
  createdAt: string;
  diffLines: { label: string; from: string; to: string }[];
};

const FIELD_LABELS: Record<string, string> = {
  team_score: "Score Charenton",
  opponent_score: "Score adverse",
  status: "Statut",
  scorer_player_id: "Buteur",
  assist_player_id: "Passeur",
  minute: "Minute",
  is_unknown_scorer: "Buteur inconnu",
  card_type: "Type de carton",
  comment: "Commentaire",
  first_name: "Prénom",
  last_name: "Nom",
  nickname: "Surnom",
  role: "Rôle",
  shirt_number: "Numéro",
  primary_position: "Poste",
  strong_foot: "Pied fort",
  quote: "Citation",
  status_player: "Statut",
  amount_due: "Montant dû",
  amount_paid: "Montant payé",
  player_count: "Nombre de joueurs",
};

function formatValue(value: unknown, nameById: Map<string, string>): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "string" && nameById.has(value)) return nameById.get(value)!;
  if (typeof value === "boolean") return value ? "Oui" : "Non";
  return String(value);
}

function buildDiffLines(
  oldData: Record<string, unknown> | null,
  newData: Record<string, unknown> | null,
  nameById: Map<string, string>
): { label: string; from: string; to: string }[] {
  const keys = new Set([...Object.keys(oldData ?? {}), ...Object.keys(newData ?? {})]);
  const lines: { label: string; from: string; to: string }[] = [];

  for (const key of keys) {
    if (!(key in FIELD_LABELS)) continue;
    const before = oldData ? oldData[key] : undefined;
    const after = newData ? newData[key] : undefined;
    if (JSON.stringify(before) === JSON.stringify(after)) continue;
    lines.push({
      label: FIELD_LABELS[key],
      from: formatValue(before, nameById),
      to: formatValue(after, nameById),
    });
  }

  return lines;
}

export async function getRecentAuditLog(limit = 30): Promise<AuditEntry[]> {
  const [players, { data, error }] = await Promise.all([
    getActivePlayers(),
    supabaseAdmin.from("audit_log").select("*").order("created_at", { ascending: false }).limit(limit),
  ]);

  if (error) {
    // table peut ne pas encore exister — dégradation propre
    return [];
  }

  const nameById = new Map(players.map((p) => [p.id, p.nickname || p.first_name]));

  return (data ?? []).map((entry) => {
    const oldData = (entry.old_data as Record<string, unknown> | null) ?? null;
    const newData = (entry.new_data as Record<string, unknown> | null) ?? null;
    return {
      id: entry.id,
      tableName: entry.table_name,
      tableLabel: TRACKED_TABLE_LABELS[entry.table_name] ?? entry.table_name,
      recordId: entry.record_id,
      action: entry.action as AuditAction,
      oldData,
      newData,
      changedByName: entry.changed_by_name,
      restoredAt: entry.restored_at,
      createdAt: entry.created_at,
      diffLines: buildDiffLines(oldData, newData, nameById),
    };
  });
}
