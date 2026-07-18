import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { supabaseAdmin } from "@/lib/supabase/server";
import { LoginScreen } from "./LoginScreen";

export default async function LoginPage() {
  const currentUser = await getCurrentUser();
  if (currentUser) {
    redirect("/");
  }

  const { data: players, error } = await supabaseAdmin
    .from("players")
    .select("id, first_name, last_name, nickname, role, pin_length")
    .eq("status", "active")
    .order("first_name", { ascending: true });

  if (error) {
    throw new Error("Impossible de charger l'effectif : " + error.message);
  }

  const validPlayers = (players ?? []).filter(
    (player): player is typeof player & { role: "player" | "admin" | "coach" } =>
      player.role === "player" || player.role === "admin" || player.role === "coach"
  );

  return <LoginScreen players={validPlayers} />;
}
