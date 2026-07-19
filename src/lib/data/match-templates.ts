import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { MatchTemplate } from "@/types/models";

/** match_templates n'est pas dans les types générés (voir models.ts). */
const untypedDb = supabaseAdmin as unknown as SupabaseClient;

export async function getMatchTemplates(): Promise<MatchTemplate[]> {
  const { data, error } = await untypedDb.from("match_templates").select("*").order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getMatchTemplateById(id: string): Promise<MatchTemplate | null> {
  const { data, error } = await untypedDb.from("match_templates").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

/**
 * Un modèle mémorise un décalage en minutes (pas d'heure de RDV absolue, un modèle n'a pas de
 * date) — convertie ici en heure de RDV concrète pour un coup d'envoi donné. Fonction pure,
 * testable sans base (Lot 22, roadmap V3).
 */
export function computeMeetingTimeFromOffset(kickoffTime: string | null, offsetMinutes: number | null): string | null {
  if (!kickoffTime || offsetMinutes == null) return null;
  const [h, m] = kickoffTime.slice(0, 5).split(":").map(Number);
  const total = (((h * 60 + m - offsetMinutes) % 1440) + 1440) % 1440;
  const hh = String(Math.floor(total / 60)).padStart(2, "0");
  const mm = String(total % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}
