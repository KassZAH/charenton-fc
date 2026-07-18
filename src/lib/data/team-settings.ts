import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";

/**
 * team_settings est une table à une seule ligne (contrainte CHECK id = 1,
 * posée dans la migration baseline) — id = 1 n'est donc pas une supposition
 * silencieuse, c'est la seule ligne qui puisse jamais exister.
 */
export async function getOwnerPlayerId(): Promise<string | null> {
  const { data } = await supabaseAdmin.from("team_settings").select("owner_player_id").eq("id", 1).maybeSingle();
  return data?.owner_player_id ?? null;
}

/**
 * Le transfert de propriété (RPC transactionnelle transfer_ownership) n'a
 * jamais été exécuté en conditions réelles — aucun environnement Supabase
 * isolé n'est disponible pour un test d'intégration complet (roadmap V3,
 * Lot 5). Désactivé par défaut tant que ce test n'a pas eu lieu.
 */
export const OWNERSHIP_TRANSFER_ENABLED = false;

/**
 * audit_log.record_id est de type uuid — team_settings n'a pas de clé uuid
 * (id=1, entier), donc l'entrée d'audit d'un transfert est tracée sur l'uuid
 * du nouveau propriétaire (seule valeur uuid pertinente ici) ; l'ancien
 * propriétaire et le nouveau restent tous deux disponibles dans oldData/newData.
 * Extrait en fonction pure (testable sans base de données ni "use server")
 * après la découverte que le littéral "1" utilisé avant faisait échouer
 * l'insertion (22P02, voir Lot 5 Étape C).
 */
export function buildOwnershipTransferAuditEntry(oldOwnerPlayerId: string | null, newOwnerPlayerId: string) {
  return {
    tableName: "team_settings" as const,
    recordId: newOwnerPlayerId,
    oldData: { owner_player_id: oldOwnerPlayerId },
    newData: { owner_player_id: newOwnerPlayerId },
  };
}
