import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getMatchesNeedingReview } from "./match-completeness";
import { getLastBackupAge } from "./backups";

const BACKUP_STALE_DAYS = 8;

export type DataHealth = {
  completedMatchesCount: number;
  matchesNeedingReview: number;
  lastBackup: { createdAt: string; daysAgo: number } | null;
  backupIsStale: boolean;
};

export async function getDataHealth(): Promise<DataHealth> {
  const [{ count }, needingReview, lastBackup] = await Promise.all([
    supabaseAdmin
      .from("matches")
      .select("*", { count: "exact", head: true })
      .eq("status", "completed")
      .is("deleted_at", null),
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
