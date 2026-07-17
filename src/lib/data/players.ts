import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { Player } from "@/types/models";

export async function getActivePlayers(): Promise<Player[]> {
  const { data, error } = await supabaseAdmin
    .from("players")
    .select("*")
    .eq("status", "active")
    .order("first_name", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getArchivedPlayers(): Promise<Player[]> {
  const { data, error } = await supabaseAdmin
    .from("players")
    .select("*")
    .eq("status", "archived")
    .order("first_name", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getPlayerById(id: string): Promise<Player | null> {
  const { data, error } = await supabaseAdmin
    .from("players")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Pour le flux calendrier abonnable — authentifie sans cookie de session. */
export async function getPlayerByCalendarToken(token: string): Promise<Player | null> {
  if (!UUID_RE.test(token)) return null; // évite une erreur Postgres sur un token mal formé
  const { data, error } = await supabaseAdmin
    .from("players")
    .select("*")
    .eq("calendar_token", token)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}
