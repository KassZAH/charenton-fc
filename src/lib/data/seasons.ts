import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function getActiveSeasonId(): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from("seasons")
    .select("id")
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data?.id ?? null;
}
