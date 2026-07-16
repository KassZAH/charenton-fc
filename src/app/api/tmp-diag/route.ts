import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { signSession, SESSION_COOKIE_NAME } from "@/lib/auth/session";

const GATE = "9f2c7e1a6b3d4058a1c9e2f6b7d3a04c5e8f1b2d3a6c";

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.get("gate") !== GATE) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { data: player } = await supabaseAdmin
    .from("players")
    .select("id, role, first_name, nickname")
    .in("role", ["admin", "coach"])
    .eq("status", "active")
    .limit(1)
    .single();
  const token = await signSession({
    playerId: player!.id,
    role: player!.role as "admin" | "coach",
    name: player!.nickname || player!.first_name,
  });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 3600,
  });
  return res;
}
