"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, requireUser } from "@/lib/auth/current-user";
import { supabaseAdmin } from "@/lib/supabase/server";
import { logChange } from "./audit";
import { getActiveInjury } from "./injuries";
import type { InjuryDurationPreset } from "@/types/models";

/** Retire toute trace de cette blessure sur les convocations (statuts posés à la main non concernés, ils ont injury_id=null). */
async function clearInjuryCoverage(injuryId: string) {
  const { error } = await supabaseAdmin.from("availability").delete().eq("injury_id", injuryId);
  if (error) throw new Error(error.message);
}

/** Marque "Blessé" tous les matchs à venir couverts par la période de la blessure (remplace toute réponse existante). */
async function applyInjuryCoverage(playerId: string, injuryId: string, estimatedReturnDate: string | null) {
  let query = supabaseAdmin
    .from("matches")
    .select("id")
    .eq("status", "scheduled")
    .is("deleted_at", null);
  if (estimatedReturnDate) query = query.lte("match_date", estimatedReturnDate);

  const { data: matches, error } = await query;
  if (error) throw new Error(error.message);
  if (!matches || matches.length === 0) return;

  const { error: upsertError } = await supabaseAdmin.from("availability").upsert(
    matches.map((m) => ({ match_id: m.id, player_id: playerId, status: "injured" as const, injury_id: injuryId })),
    { onConflict: "match_id,player_id" }
  );
  if (upsertError) throw new Error(upsertError.message);
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
    throw new Error("Une blessure est déjà active — clôture-la avant d'en déclarer une nouvelle.");
  }

  const preset = String(formData.get("duration_preset") ?? "unknown") as InjuryDurationPreset;
  const customDate = String(formData.get("custom_date") ?? "") || null;
  const comment = String(formData.get("comment") ?? "").trim() || null;
  const commentVisibility = String(formData.get("comment_visibility") ?? "team");
  const startedAt = String(formData.get("started_at") ?? "") || new Date().toISOString().slice(0, 10);

  const estimatedReturnDate = await resolveEstimatedReturnDate(preset, customDate);

  const { data: injury, error } = await supabaseAdmin
    .from("injuries")
    .insert({
      player_id: user.playerId,
      started_at: startedAt,
      estimated_return_date: estimatedReturnDate,
      comment,
      comment_visibility: commentVisibility,
      status: "active",
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  await applyInjuryCoverage(user.playerId, injury.id, estimatedReturnDate);

  await logChange({
    tableName: "injuries",
    recordId: injury.id,
    action: "insert",
    newData: injury,
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
  const { error } = await supabaseAdmin
    .from("injuries")
    .update({ status: "closed", actual_return_date: today, updated_at: new Date().toISOString() })
    .eq("id", injury.id);
  if (error) throw new Error(error.message);

  await clearInjuryCoverage(injury.id);

  await logChange({
    tableName: "injuries",
    recordId: injury.id,
    action: "update",
    oldData: injury,
    newData: { status: "closed", actual_return_date: today },
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

  const { error } = await supabaseAdmin
    .from("injuries")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", injury.id);
  if (error) throw new Error(error.message);

  await clearInjuryCoverage(injury.id);

  await logChange({
    tableName: "injuries",
    recordId: injury.id,
    action: "update",
    oldData: injury,
    newData: { status: "cancelled" },
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

  const { error } = await supabaseAdmin
    .from("injuries")
    .update({ estimated_return_date: estimatedReturnDate, updated_at: new Date().toISOString() })
    .eq("id", injury.id);
  if (error) throw new Error(error.message);

  await clearInjuryCoverage(injury.id);
  await applyInjuryCoverage(user.playerId, injury.id, estimatedReturnDate);

  await logChange({
    tableName: "injuries",
    recordId: injury.id,
    action: "update",
    oldData: { estimated_return_date: injury.estimated_return_date },
    newData: { estimated_return_date: estimatedReturnDate },
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
 * au moment de la déclaration.
 */
export async function syncActiveInjuriesToUpcomingMatches() {
  const { data: activeInjuries, error } = await supabaseAdmin
    .from("injuries")
    .select("id, player_id, estimated_return_date")
    .eq("status", "active");
  if (error) throw new Error(error.message);

  for (const injury of activeInjuries ?? []) {
    await applyInjuryCoverage(injury.player_id, injury.id, injury.estimated_return_date);
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
