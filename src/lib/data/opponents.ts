import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { Opponent } from "@/types/models";

export async function getOpponents(): Promise<Opponent[]> {
  const { data, error } = await supabaseAdmin
    .from("opponents")
    .select("*")
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}
