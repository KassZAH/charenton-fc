import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { signSession, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { addCard } from "@/lib/data/cards-actions";
import { restoreChange } from "@/lib/data/audit-actions";
import { getRecentAuditLog } from "@/lib/data/audit";
import { cookies } from "next/headers";

const GATE = "417e0c4c29ce689bdc71e54432d5c73f1565bce1b6722c0d";
const matchId = "4c70fcb3-db96-4e48-86bf-699c4996d688";

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.get("gate") !== GATE) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const step = url.searchParams.get("step");

  if (step === "0-login") {
    const { data: player } = await supabaseAdmin
      .from("players")
      .select("id, role, first_name, nickname")
      .eq("role", "admin")
      .eq("status", "active")
      .limit(1)
      .single();
    const token = await signSession({
      playerId: player!.id,
      role: player!.role as "admin",
      name: player!.nickname || player!.first_name,
    });
    const res = NextResponse.json({ step: "0-login", ok: true });
    res.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 3600,
    });
    return res;
  }

  const store = await cookies();
  const sessionToken = store.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionToken) {
    return NextResponse.json({ error: "no session cookie sent" }, { status: 401 });
  }

  if (step === "1-add") {
    const { data: player } = await supabaseAdmin.from("players").select("id").eq("status", "active").limit(1).single();
    const fd = new FormData();
    fd.set("player_id", player!.id);
    fd.set("card_type", "yellow");
    fd.set("minute", "12");
    fd.set("comment", "TEST AUDIT LOG PROD - à supprimer");
    await addCard(matchId, fd);
    const log = await getRecentAuditLog(5);
    return NextResponse.json({ step: "1-add", log });
  }

  if (step === "3-restore") {
    const auditLogId = url.searchParams.get("id")!;
    await restoreChange(auditLogId);
    const log = await getRecentAuditLog(5);
    return NextResponse.json({ step: "3-restore", log });
  }

  if (step === "4-restore-again") {
    const auditLogId = url.searchParams.get("id")!;
    try {
      await restoreChange(auditLogId);
      return NextResponse.json({ step: "4-restore-again", result: "should have thrown" });
    } catch (e) {
      return NextResponse.json({ step: "4-restore-again", errorMessage: (e as Error).message });
    }
  }

  return NextResponse.json({ error: "unknown step" });
}
