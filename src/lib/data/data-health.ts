import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getMatchesNeedingReview } from "./match-completeness";
import { getLastBackupAge } from "./backups";
import { getDemoMatchIds } from "./demo-scope";

const BACKUP_STALE_DAYS = 8;

export type DataHealth = {
  completedMatchesCount: number;
  matchesNeedingReview: number;
  lastBackup: { createdAt: string; daysAgo: number } | null;
  backupIsStale: boolean;
};

export async function getDataHealth(): Promise<DataHealth> {
  const demoMatchIds = await getDemoMatchIds();
  let completedQuery = supabaseAdmin.from("matches").select("*", { count: "exact", head: true }).eq("status", "completed").is("deleted_at", null);
  if (demoMatchIds.length > 0) completedQuery = completedQuery.not("id", "in", `(${demoMatchIds.join(",")})`);

  const [{ count }, needingReview, lastBackup] = await Promise.all([
    completedQuery,
    getMatchesNeedingReview(),
    getLastBackupAge(),
  ]);

  return {
    completedMatchesCount: count ?? 0,
    matchesNeedingReview: needingReview.length,
    lastBackup,
    backupIsStale: !lastBackup || lastBackup.daysAgo > BACKUP_STALE_DAYS,
  };
}
