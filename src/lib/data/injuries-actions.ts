"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireAdmin, requireUser } from "@/lib/auth/current-user";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getActiveInjury } from "./injuries";
import type { InjuryDurationPreset } from "@/types/models";

/**
 * Le générateur de types Supabase ne connaît pas cette RPC (Lot 8, roadmap
 * V3) — cast vers le client non typé, même pattern que les RPC des Lots 6/7.
 */
const untypedDb = supabaseAdmin as unknown as SupabaseClient;

type InjurySyncRow = { injury_id: string; availability_synced: number };

/**
 * Remplace l'ancienne séquence en 3 étapes non transactionnelle
 * (update/insert injuries → delete+upsert availability → insert audit_log)
 * par un seul appel RPC tout-ou-rien (upsert_injury_and_sync_availability,
 * migration 20260720000000). p_injury_id=null crée une nouvelle blessure ;
 * sinon met à jour la blessure existante et resynchronise sa couverture.
 */
async function syncInjuryAndAvailability(params: {
  injuryId: string | null;
  playerId: string;
  newStatus: "active" | "closed" | "cancelled";
  startedAt: string | null;
  estimatedReturnDate: string | null;
  actualReturnDate: string | null;
  comment: string | null;
  commentVisibility: string | null;
  changedByPlayerId: string;
  changedByName: string;
}): Promise<InjurySyncRow> {
  const { data, error } = await untypedDb.rpc("upsert_injury_and_sync_availability", {
    p_injury_id: params.injuryId,
    p_player_id: params.playerId,
    p_new_status: params.newStatus,
    p_started_at: params.startedAt,
    p_estimated_return_date: params.estimatedReturnDate,
    p_actual_return_date: params.actualReturnDate,
    p_comment: params.comment,
    p_comment_visibility: params.commentVisibility,
    p_changed_by_player_id: params.changedByPlayerId,
    p_changed_by_name: params.changedByName,
  });
  if (error) throw new Error(error.message);
  return (data as InjurySyncRow[])[0];
}

async function resolveEstimatedReturnDate(
  preset: InjuryDurationPreset,
  customDate: string | null
): Promise<string | null> {
  const today = new Date();
  const addDays = (days: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  };

  switch (preset) {
    case "1_week":
      return addDays(7);
    case "2_weeks":
      return addDays(14);
    case "1_month":
      return addDays(30);
    case "custom_date":
      if (!customDate) throw new Error("Choisis une date de retour.");
      return customDate;
    case "next_match": {
      const { data } = await supabaseAdmin
        .from("matches")
        .select("match_date")
        .eq("status", "scheduled")
        .is("deleted_at", null)
        .order("match_date", { ascending: true })
        .limit(1)
        .maybeSingle();
      return data?.match_date ?? null;
    }
    case "unknown":
    default:
      return null;
  }
}

export async function declareInjury(formData: FormData) {
  const user = await requireUser();

  const existing = await getActiveInjury(user.playerId);
  if (existing) {
    // Pré-vérification pour un message d'erreur clair — la garantie réelle contre le double-clic
    // est l'index unique partiel injuries_one_active_per_player, appliqué dans la RPC elle-même.
    throw new Error("Une blessure est déjà active — clôture-la avant d'en déclarer une nouvelle.");
  }

  const preset = String(formData.get("duration_preset") ?? "unknown") as InjuryDurationPreset;
  const customDate = String(formData.get("custom_date") ?? "") || null;
  const comment = String(formData.get("comment") ?? "").trim() || null;
  const commentVisibility = String(formData.get("comment_visibility") ?? "team");
  const startedAt = String(formData.get("started_at") ?? "") || new Date().toISOString().slice(0, 10);

  const estimatedReturnDate = await resolveEstimatedReturnDate(preset, customDate);

  await syncInjuryAndAvailability({
    injuryId: null,
    playerId: user.playerId,
    newStatus: "active",
    startedAt,
    estimatedReturnDate,
    actualReturnDate: null,
    comment,
    commentVisibility,
    changedByPlayerId: user.playerId,
    changedByName: user.name,
  });

  revalidatePath("/profile");
  revalidatePath("/");
  revalidatePath("/matches");
}

export async function recoverFromInjury() {
  const user = await requireUser();
  const injury = await getActiveInjury(user.playerId);
  if (!injury) return;

  const today = new Date().toISOString().slice(0, 10);
  await syncInjuryAndAvailability({
    injuryId: injury.id,
    playerId: user.playerId,
    newStatus: "closed",
    startedAt: null,
    estimatedReturnDate: null,
    actualReturnDate: today,
    comment: null,
    commentVisibility: null,
    changedByPlayerId: user.playerId,
    changedByName: user.name,
  });

  revalidatePath("/profile");
  revalidatePath("/");
  revalidatePath("/matches");
}

export async function cancelInjury() {
  const user = await requireUser();
  const injury = await getActiveInjury(user.playerId);
  if (!injury) return;

  await syncInjuryAndAvailability({
    injuryId: injury.id,
    playerId: user.playerId,
    newStatus: "cancelled",
    startedAt: null,
    estimatedReturnDate: null,
    actualReturnDate: null,
    comment: null,
    commentVisibility: null,
    changedByPlayerId: user.playerId,
    changedByName: user.name,
  });

  revalidatePath("/profile");
  revalidatePath("/");
  revalidatePath("/matches");
}

export async function updateInjuryReturnDate(formData: FormData) {
  const user = await requireUser();
  const injury = await getActiveInjury(user.playerId);
  if (!injury) throw new Error("Aucune blessure active.");

  const preset = String(formData.get("duration_preset") ?? "unknown") as InjuryDurationPreset;
  const customDate = String(formData.get("custom_date") ?? "") || null;
  const estimatedReturnDate = await resolveEstimatedReturnDate(preset, customDate);

  await syncInjuryAndAvailability({
    injuryId: injury.id,
    playerId: user.playerId,
    newStatus: "active",
    startedAt: null,
    estimatedReturnDate,
    actualReturnDate: null,
    comment: null,
    commentVisibility: null,
    changedByPlayerId: user.playerId,
    changedByName: user.name,
  });

  revalidatePath("/profile");
  revalidatePath("/");
  revalidatePath("/matches");
}

/**
 * À appeler après la création d'un ou plusieurs matchs : les blessures déjà actives doivent
 * couvrir les nouveaux matchs s'ils tombent dans leur période, pas seulement ceux qui existaient
 * au moment de la déclaration. Pure resynchronisation en lecture-écriture, sans changement d'état
 * de la blessure elle-même : ne passe pas par la RPC transactionnelle (pas de clôture/modification
 * à auditer ici), reste un simple upsert idempotent comme avant le Lot 8.
 */
export async function syncActiveInjuriesToUpcomingMatches() {
  const { data: activeInjuries, error } = await supabaseAdmin
    .from("injuries")
    .select("id, player_id, estimated_return_date")
    .eq("status", "active");
  if (error) throw new Error(error.message);

  for (const injury of activeInjuries ?? []) {
    let query = supabaseAdmin.from("matches").select("id").eq("status", "scheduled").is("deleted_at", null);
    if (injury.estimated_return_date) query = query.lte("match_date", injury.estimated_return_date);

    const { data: matches, error: matchesError } = await query;
    if (matchesError) throw new Error(matchesError.message);
    if (!matches || matches.length === 0) continue;

    const { error: upsertError } = await supabaseAdmin.from("availability").upsert(
      matches.map((m) => ({ match_id: m.id, player_id: injury.player_id, status: "injured" as const, injury_id: injury.id })),
      { onConflict: "match_id,player_id" }
    );
    if (upsertError) throw new Error(upsertError.message);
  }
}

/** Le joueur blessé choisit "Présent" pour un match couvert par sa blessure active. */
export async function resolveInjuredPresence(matchId: string, choice: "recovered" | "play_anyway") {
  const user = await requireUser();

  // "recovered" clôture la blessure partout ; "play_anyway" ne touche que ce match précis,
  // la blessure reste active pour le reste des convocations couvertes.
  if (choice === "recovered") {
    await recoverFromInjury();
  }

  const { error } = await supabaseAdmin
    .from("availability")
    .upsert(
      { match_id: matchId, player_id: user.playerId, status: "present", injury_id: null },
      { onConflict: "match_id,player_id" }
    );
  if (error) throw new Error(error.message);

  revalidatePath(`/matches/${matchId}`);
  revalidatePath("/");
}

/** Équivalent admin : un admin passe un joueur déjà marqué blessé en "Présent" pour un match donné. */
export async function adminOverrideInjuredPresence(
  matchId: string,
  playerId: string,
  choice: "this_match_only" | "close_and_present"
) {
  await requireAdmin();

  const { error } = await supabaseAdmin
    .from("availability")
    .upsert(
      { match_id: matchId, player_id: playerId, status: "present", injury_id: null },
      { onConflict: "match_id,player_id" }
    );
  if (error) throw new Error(error.message);

  if (choice === "close_and_present") {
    const injury = await getActiveInjury(playerId);
    if (injury) {
      const today = new Date().toISOString().slice(0, 10);
      await supabaseAdmin
        .from("injuries")
        .update({ status: "closed", actual_return_date: today, updated_at: new Date().toISOString() })
        .eq("id", injury.id);
      // On vient de forcer ce match à "present" ci-dessus — on ne veut pas que la levée de
      // couverture générale de la blessure l'écrase à nouveau, donc pas de re-upsert dessus.
      await supabaseAdmin.from("availability").delete().eq("injury_id", injury.id).neq("match_id", matchId);
    }
  }

  revalidatePath(`/matches/${matchId}`);
  revalidatePath("/");
}
