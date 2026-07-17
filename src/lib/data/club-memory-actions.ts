"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/current-user";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { HallOfFameCategory } from "@/types/models";

const HALL_OF_FAME_CATEGORIES: HallOfFameCategory[] = [
  "fondateur",
  "capitaine_emblematique",
  "meilleur_buteur_historique",
  "legende_vestiaire",
  "autre",
];

export async function updateClubFounding(formData: FormData) {
  await requireAdmin();

  const foundedDate = String(formData.get("founded_date") ?? "").trim() || null;
  const foundingNote = String(formData.get("founding_note") ?? "").trim() || null;

  const { error } = await supabaseAdmin
    .from("team_settings")
    .update({ founded_date: foundedDate, founding_note: foundingNote })
    .eq("id", 1);
  if (error) throw new Error(error.message);

  revalidatePath("/memoire");
}

export async function addHallOfFameEntry(formData: FormData) {
  await requireAdmin();

  const playerId = String(formData.get("player_id") ?? "").trim() || null;
  const displayName = String(formData.get("display_name") ?? "").trim() || null;
  const category = String(formData.get("category") ?? "");
  const description = String(formData.get("description") ?? "").trim() || null;
  const retiredNumberRaw = String(formData.get("retired_number") ?? "").trim();
  const inductedAt = String(formData.get("inducted_at") ?? "").trim() || null;

  if (!playerId && !displayName) {
    throw new Error("Choisis un joueur ou renseigne un nom.");
  }
  if (!HALL_OF_FAME_CATEGORIES.includes(category as HallOfFameCategory)) {
    throw new Error("Catégorie invalide.");
  }
  const retiredNumber = retiredNumberRaw ? Number(retiredNumberRaw) : null;
  if (retiredNumberRaw && (retiredNumber === null || Number.isNaN(retiredNumber))) {
    throw new Error("Numéro retiré invalide.");
  }

  const { error } = await supabaseAdmin.from("hall_of_fame_entries").insert({
    player_id: playerId,
    display_name: playerId ? null : displayName,
    category,
    description,
    retired_number: retiredNumber,
    ...(inductedAt ? { inducted_at: inductedAt } : {}),
  });
  if (error) throw new Error(error.message);

  revalidatePath("/memoire");
  revalidatePath("/memoire/hall-of-fame");
}

export async function deleteHallOfFameEntry(entryId: string) {
  await requireAdmin();

  const { error } = await supabaseAdmin.from("hall_of_fame_entries").delete().eq("id", entryId);
  if (error) throw new Error(error.message);

  revalidatePath("/memoire");
  revalidatePath("/memoire/hall-of-fame");
}

export async function addClubQuote(formData: FormData) {
  await requireAdmin();

  const quoteText = String(formData.get("quote_text") ?? "").trim();
  const authorLabel = String(formData.get("author_label") ?? "").trim() || null;
  const playerId = String(formData.get("player_id") ?? "").trim() || null;

  if (!quoteText) {
    throw new Error("La citation ne peut pas être vide.");
  }

  const { error } = await supabaseAdmin.from("club_quotes").insert({
    quote_text: quoteText,
    author_label: authorLabel,
    player_id: playerId,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/memoire/citations");
}

export async function deleteClubQuote(quoteId: string) {
  await requireAdmin();

  const { error } = await supabaseAdmin.from("club_quotes").delete().eq("id", quoteId);
  if (error) throw new Error(error.message);

  revalidatePath("/memoire/citations");
}

export async function addJerseyHistoryEntry(formData: FormData) {
  await requireAdmin();

  const seasonLabel = String(formData.get("season_label") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const imageUrl = String(formData.get("image_url") ?? "").trim() || null;

  if (!seasonLabel) {
    throw new Error("La saison est obligatoire.");
  }

  const { error } = await supabaseAdmin.from("jersey_history_entries").insert({
    season_label: seasonLabel,
    description,
    image_url: imageUrl,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/memoire/maillots");
}

export async function deleteJerseyHistoryEntry(entryId: string) {
  await requireAdmin();

  const { error } = await supabaseAdmin.from("jersey_history_entries").delete().eq("id", entryId);
  if (error) throw new Error(error.message);

  revalidatePath("/memoire/maillots");
}
