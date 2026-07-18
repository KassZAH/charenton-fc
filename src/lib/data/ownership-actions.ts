"use server";

import { revalidatePath } from "next/cache";
import { requireOwner } from "@/lib/auth/current-user";
import { supabaseAdmin } from "@/lib/supabase/server";
import { logChange } from "./audit";
import { buildOwnershipTransferAuditEntry, getOwnerPlayerId, OWNERSHIP_TRANSFER_ENABLED } from "./team-settings";

/**
 * Promotion/rétrogradation réservées au propriétaire (roadmap V3, Lot 5).
 * Ne touchent jamais pin_hash/pin_length — un changement de rôle ne doit
 * jamais forcer un joueur à changer de PIN (voir la revue du plan).
 */
export async function promoteToCoach(playerId: string) {
  const owner = await requireOwner();

  const { data: target } = await supabaseAdmin
    .from("players")
    .select("*")
    .eq("id", playerId)
    .maybeSingle();
  if (!target) throw new Error("Joueur introuvable.");
  if (target.status !== "active") throw new Error("Seul un joueur actif peut être promu.");
  if (target.role !== "player") throw new Error("Ce compte n'est pas un joueur.");

  const { error } = await supabaseAdmin
    .from("players")
    .update({ role: "coach", session_version: target.session_version + 1 })
    .eq("id", playerId);
  if (error) throw new Error(error.message);

  await logChange({
    tableName: "players",
    recordId: playerId,
    action: "update",
    oldData: { role: target.role },
    newData: { role: "coach" },
    changedByPlayerId: owner.playerId,
    changedByName: owner.name,
  });

  revalidatePath("/team");
  revalidatePath(`/team/${playerId}`);
  revalidatePath("/admin/coachs");
}

export async function demoteToPlayer(playerId: string) {
  const owner = await requireOwner();

  const ownerPlayerId = await getOwnerPlayerId();
  if (playerId === ownerPlayerId) {
    throw new Error("Le propriétaire ne peut pas être rétrogradé — transfère la propriété d'abord.");
  }

  const { data: target } = await supabaseAdmin
    .from("players")
    .select("*")
    .eq("id", playerId)
    .maybeSingle();
  if (!target) throw new Error("Joueur introuvable.");
  if (target.role !== "coach" && target.role !== "admin") throw new Error("Ce compte n'est pas coach.");

  const { error } = await supabaseAdmin
    .from("players")
    .update({ role: "player", session_version: target.session_version + 1 })
    .eq("id", playerId);
  if (error) throw new Error(error.message);

  await logChange({
    tableName: "players",
    recordId: playerId,
    action: "update",
    oldData: { role: target.role },
    newData: { role: "player" },
    changedByPlayerId: owner.playerId,
    changedByName: owner.name,
  });

  revalidatePath("/team");
  revalidatePath(`/team/${playerId}`);
  revalidatePath("/admin/coachs");
}

/**
 * Transfert transactionnel de propriété (RPC transfer_ownership, voir la
 * migration dédiée) — le nouveau propriétaire doit être un joueur actif, il
 * devient coach s'il ne l'était pas, l'ancien reste coach, les deux sessions
 * sont révoquées. Journalisé séparément après la RPC.
 *
 * ⚠️ Non exécutée en conditions réelles pendant le Lot 5 (roadmap V3) — pas
 * d'environnement Supabase isolé disponible pour un test d'intégration
 * complet. Voir le compte rendu du lot.
 */
export async function transferOwnership(newOwnerPlayerId: string) {
  const owner = await requireOwner();

  if (!OWNERSHIP_TRANSFER_ENABLED) {
    throw new Error(
      "Le transfert de propriété est désactivé en attendant un test d'intégration sur un environnement isolé."
    );
  }

  const oldOwnerPlayerId = await getOwnerPlayerId();

  const { error } = await supabaseAdmin.rpc("transfer_ownership", { p_new_owner_id: newOwnerPlayerId });
  if (error) throw new Error(error.message);

  const auditEntry = buildOwnershipTransferAuditEntry(oldOwnerPlayerId, newOwnerPlayerId);
  await logChange({
    ...auditEntry,
    action: "update",
    changedByPlayerId: owner.playerId,
    changedByName: owner.name,
  });

  revalidatePath("/", "layout");
  revalidatePath("/admin/coachs");
}
