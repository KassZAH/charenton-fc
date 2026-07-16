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
