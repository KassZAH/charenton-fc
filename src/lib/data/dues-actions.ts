"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/current-user";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getActivePlayers } from "./players";

export async function setDueAmount(playerId: string, seasonId: string, formData: FormData) {
  await requireAdmin();
  const amountDue = Number(formData.get("amount_due"));
  if (!Number.isFinite(amountDue) || amountDue < 0) {
    throw new Error("Montant invalide.");
  }

  const { error } = await supabaseAdmin
    .from("dues")
    .upsert(
      { player_id: playerId, season_id: seasonId, amount_due: amountDue, updated_at: new Date().toISOString() },
      { onConflict: "player_id,season_id" }
    );
  if (error) throw new Error(error.message);

  revalidatePath("/dues");
}

export async function setPaidAmount(playerId: string, seasonId: string, formData: FormData) {
  await requireAdmin();
  const amountPaid = Number(formData.get("amount_paid"));
  if (!Number.isFinite(amountPaid) || amountPaid < 0) {
    throw new Error("Montant invalide.");
  }

  const { error } = await supabaseAdmin
    .from("dues")
    .upsert(
      { player_id: playerId, season_id: seasonId, amount_paid: amountPaid, updated_at: new Date().toISOString() },
      { onConflict: "player_id,season_id" }
    );
  if (error) throw new Error(error.message);

  revalidatePath("/dues");
}

export async function bulkSetDueAmount(seasonId: string, formData: FormData) {
  await requireAdmin();
  const amountDue = Number(formData.get("bulk_amount_due"));
  if (!Number.isFinite(amountDue) || amountDue < 0) {
    throw new Error("Montant invalide.");
  }

  const players = await getActivePlayers();
  const now = new Date().toISOString();
  const { error } = await supabaseAdmin
    .from("dues")
    .upsert(
      players.map((p) => ({ player_id: p.id, season_id: seasonId, amount_due: amountDue, updated_at: now })),
      { onConflict: "player_id,season_id" }
    );
  if (error) throw new Error(error.message);

  revalidatePath("/dues");
}
