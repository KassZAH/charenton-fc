import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";

export type BadgeKey =
  | "first_goal"
  | "first_brace"
  | "first_hat_trick"
  | "matches_10"
  | "matches_25"
  | "matches_50"
  | "presence_streak_5"
  | "goal_streak_3"
  | "assists_10"
  | "first_red_card"
  | "awards_5";

export const BADGE_LABELS: Record<BadgeKey, string> = {
  first_goal: "Premier but",
  first_brace: "Premier doublé",
  first_hat_trick: "Premier triplé",
  matches_10: "10 matchs joués",
  matches_25: "25 matchs joués",
  matches_50: "50 matchs joués",
  presence_streak_5: "5 matchs de suite présent",
  goal_streak_3: "3 matchs de suite avec un but",
  assists_10: "10 passes décisives",
  first_red_card: "Premier carton rouge — gloire administrative éternelle",
  awards_5: "5 récompenses de match",
};

async function awardBadgeIfMissing(playerId: string, badgeKey: BadgeKey, matchId: string | null) {
  const { data: existing } = await supabaseAdmin
    .from("player_badges")
    .select("id")
    .eq("player_id", playerId)
    .eq("badge_key", badgeKey)
    .maybeSingle();
  if (existing) return;

  await supabaseAdmin.from("player_badges").insert({ player_id: playerId, badge_key: badgeKey, match_id: matchId });
}

function longestStreak<T>(items: T[], isHit: (item: T) => boolean): number {
  let best = 0;
  let current = 0;
  for (const item of items) {
    if (isHit(item)) {
      current++;
      best = Math.max(best, current);
    } else {
      current = 0;
    }
  }
  return best;
}

/**
 * Recalcule tous les seuils/séries pour un joueur et attribue les badges
 * manquants. Idempotent (contrainte unique player_id+badge_key) — sans
 * risque à rappeler plusieurs fois.
 */
export async function checkAndAwardBadges(playerId: string): Promise<void> {
  const [{ data: playedRows }, { data: goalRows }, { data: cardRows }, { data: voteRows }] = await Promise.all([
    supabaseAdmin.from("match_players").select("match_id").eq("player_id", playerId).eq("was_present", true),
    supabaseAdmin
      .from("goals")
      .select("match_id, scorer_player_id, assist_player_id")
      .eq("credited_to", "charenton")
      .is("deleted_at", null),
    supabaseAdmin.from("cards").select("card_type").eq("player_id", playerId).is("deleted_at", null),
    supabaseAdmin.from("votes").select("match_id, award_id, voted_player_id"),
  ]);

  const playedMatchIds = (playedRows ?? []).map((r) => r.match_id);
  const matchesPlayed = playedMatchIds.length;

  const goalsByMatch = new Map<string, number>();
  let totalAssists = 0;
  for (const g of goalRows ?? []) {
    if (g.scorer_player_id === playerId) {
      goalsByMatch.set(g.match_id, (goalsByMatch.get(g.match_id) ?? 0) + 1);
    }
    if (g.assist_player_id === playerId) totalAssists++;
  }
  const totalGoals = [...goalsByMatch.values()].reduce((a, b) => a + b, 0);
  const hasRedCard = (cardRows ?? []).some((c) => c.card_type === "red");

  // Récompenses de match gagnées (le plus voté par match+catégorie, égalités comptées).
  const voteGroups = new Map<string, Map<string, number>>();
  for (const v of voteRows ?? []) {
    if (!v.voted_player_id) continue;
    const key = `${v.match_id}::${v.award_id}`;
    const counts = voteGroups.get(key) ?? new Map<string, number>();
    counts.set(v.voted_player_id, (counts.get(v.voted_player_id) ?? 0) + 1);
    voteGroups.set(key, counts);
  }
  let awardWins = 0;
  for (const counts of voteGroups.values()) {
    const max = Math.max(...counts.values());
    if (max > 0 && (counts.get(playerId) ?? 0) === max) awardWins++;
  }

  const { data: allMatches } = await supabaseAdmin
    .from("matches")
    .select("id")
    .eq("status", "completed")
    .is("deleted_at", null)
    .order("match_date", { ascending: true });
  const orderedMatchIds = (allMatches ?? []).map((m) => m.id);
  const playedSet = new Set(playedMatchIds);
  const orderedPlayedIds = orderedMatchIds.filter((id) => playedSet.has(id));

  const presenceStreak = longestStreak(orderedMatchIds, (id) => playedSet.has(id));
  const goalStreak = longestStreak(orderedPlayedIds, (id) => (goalsByMatch.get(id) ?? 0) > 0);

  const braceMatch = orderedPlayedIds.find((id) => (goalsByMatch.get(id) ?? 0) === 2) ?? null;
  const hatTrickMatch = orderedPlayedIds.find((id) => (goalsByMatch.get(id) ?? 0) >= 3) ?? null;
  const firstGoalMatch = orderedPlayedIds.find((id) => (goalsByMatch.get(id) ?? 0) >= 1) ?? null;

  const checks: Promise<void>[] = [];

  if (totalGoals >= 1) checks.push(awardBadgeIfMissing(playerId, "first_goal", firstGoalMatch));
  if (braceMatch) checks.push(awardBadgeIfMissing(playerId, "first_brace", braceMatch));
  if (hatTrickMatch) checks.push(awardBadgeIfMissing(playerId, "first_hat_trick", hatTrickMatch));
  if (matchesPlayed >= 10) checks.push(awardBadgeIfMissing(playerId, "matches_10", null));
  if (matchesPlayed >= 25) checks.push(awardBadgeIfMissing(playerId, "matches_25", null));
  if (matchesPlayed >= 50) checks.push(awardBadgeIfMissing(playerId, "matches_50", null));
  if (totalAssists >= 10) checks.push(awardBadgeIfMissing(playerId, "assists_10", null));
  if (hasRedCard) checks.push(awardBadgeIfMissing(playerId, "first_red_card", null));
  if (presenceStreak >= 5) checks.push(awardBadgeIfMissing(playerId, "presence_streak_5", null));
  if (goalStreak >= 3) checks.push(awardBadgeIfMissing(playerId, "goal_streak_3", null));
  if (awardWins >= 5) checks.push(awardBadgeIfMissing(playerId, "awards_5", null));

  await Promise.all(checks);
}

export type EarnedBadge = { badgeKey: BadgeKey; label: string; earnedAt: string };

export async function getPlayerBadges(playerId: string): Promise<EarnedBadge[]> {
  const { data, error } = await supabaseAdmin
    .from("player_badges")
    .select("badge_key, earned_at")
    .eq("player_id", playerId)
    .order("earned_at", { ascending: false });

  if (error) {
    // La table player_badges peut ne pas encore exister (migration pas encore lancée) —
    // c'est une fonctionnalité secondaire, ça ne doit jamais casser la fiche joueur.
    return [];
  }

  return (data ?? []).map((b) => ({
    badgeKey: b.badge_key as BadgeKey,
    label: BADGE_LABELS[b.badge_key as BadgeKey] ?? b.badge_key,
    earnedAt: b.earned_at,
  }));
}
