import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase/server";
import { createSeededRandom, randInt, pick } from "@/lib/seeded-random";
import { getDemoSeason } from "./demo-scope";

const untypedDb = supabaseAdmin as unknown as SupabaseClient;

export const DEMO_SEASON_NAME = "Saison 2025-2026 · Démo été";
/** Graine fixe — le dataset Démo doit toujours être identique à structure de joueurs égale. */
const DEMO_SEED = 20250726;

const DAY_MS = 86_400_000;
function dateOffset(days: number): string {
  return new Date(Date.now() + days * DAY_MS).toISOString().slice(0, 10);
}
function timestampOffset(days: number, hours = 12, minutes = 0): string {
  const d = new Date(Date.now() + days * DAY_MS);
  d.setUTCHours(hours, minutes, 0, 0);
  return d.toISOString();
}

const OPPONENTS = ["Étoile d'Été FC", "AS Vacances", "Racing Plage", "FC Tournoi Été", "Olympique Estival", "US Beach Soccer"];

const VENUES = [
  { name: "Stade d'Été (Démo)", address: "Terrain fictif — mode Démo", surface_type: "Synthétique", lighting: true },
  { name: "Complexe Estival (Démo)", address: "Terrain fictif — mode Démo", surface_type: "Herbe", lighting: false },
];

const TEMPLATES = [
  { name: "Session été (Démo)", kickoff_time: "19:00:00", meeting_offset_minutes: 30, match_type: "amical", home_or_away: "home", max_players: 16 },
  { name: "Tournoi estival (Démo)", kickoff_time: "10:00:00", meeting_offset_minutes: 45, match_type: "tournoi", home_or_away: "away", max_players: 12 },
];

type PurgeResult = {
  season_found: boolean;
  matches_deleted: number;
  restrictions_deleted: number;
  venues_deleted: number;
  templates_deleted: number;
  checklist_templates_deleted: number;
  season_deleted: boolean;
};

async function purgeDemoDataset(demoSeasonId: string, deleteSeason: boolean, requestedByPlayerId: string | null, requestedByName: string): Promise<PurgeResult> {
  const { data, error } = await untypedDb.rpc("purge_demo_dataset", {
    p_demo_season_id: demoSeasonId,
    p_delete_season: deleteSeason,
    p_requested_by_player_id: requestedByPlayerId,
    p_requested_by_name: requestedByName,
  });
  if (error) throw new Error(`purge_demo_dataset: ${error.message}`);
  return data as PurgeResult;
}

async function getOrCreateDemoSeason(): Promise<string> {
  const existing = await getDemoSeason();
  if (existing) return existing.id;

  const { data, error } = await untypedDb
    .from("seasons")
    .insert({ name: DEMO_SEASON_NAME, is_demo: true, is_active: false, start_date: dateOffset(-60), end_date: dateOffset(60) })
    .select("id")
    .single();
  if (error) throw new Error(`création saison Démo: ${error.message}`);
  return data.id;
}

async function getRealActivePlayerIds(): Promise<string[]> {
  const { data, error } = await untypedDb.from("players").select("id").eq("status", "active").order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  const ids = (data ?? []).map((p: { id: string }) => p.id);
  if (ids.length < 3) throw new Error("Au moins 3 joueurs actifs réels sont nécessaires pour construire le dataset Démo.");
  return ids;
}

export type DemoDatasetSummary = {
  demoSeasonId: string;
  playersUsed: number;
  matchesCreated: number;
  purge: PurgeResult;
};

/**
 * Construit l'intégralité du dataset Démo (idempotent : purge d'abord, puis recrée). Référence
 * les VRAIS player_id actifs (jamais de faux compte créé) — jamais leurs attributs réels modifiés
 * (rôle, PIN, session_version, statut, poste, authentification). Toute restriction fictive porte
 * season_id = saison Démo, jamais NULL (sinon elle apparaîtrait comme une restriction réelle).
 */
export async function createOrResetDemoDataset(requestedByPlayerId: string | null, requestedByName: string): Promise<DemoDatasetSummary> {
  const demoSeasonId = await getOrCreateDemoSeason();
  const purge = await purgeDemoDataset(demoSeasonId, false, requestedByPlayerId, requestedByName);

  const playerIds = await getRealActivePlayerIds();
  const rng = createSeededRandom(DEMO_SEED);
  const at = (offset: number) => playerIds[offset % playerIds.length];

  // === Terrains et modèles fictifs ===
  const venueIds: string[] = [];
  for (const v of VENUES) {
    const { data, error } = await untypedDb.from("venues").insert({ ...v, is_demo: true }).select("id").single();
    if (error) throw new Error(`venue démo: ${error.message}`);
    venueIds.push(data.id);
  }
  for (const t of TEMPLATES) {
    const { error } = await untypedDb.from("match_templates").insert({ ...t, venue_id: venueIds[0], is_demo: true });
    if (error) throw new Error(`modèle démo: ${error.message}`);
  }
  const { error: checklistTemplateError } = await untypedDb
    .from("checklist_templates")
    .insert({ label: "Arriver 15 minutes avant (Démo)", is_demo: true });
  if (checklistTemplateError) throw new Error(`checklist_template démo: ${checklistTemplateError.message}`);

  // === Restrictions fictives (toujours season_id = saison Démo, jamais NULL) ===
  await untypedDb.from("player_restrictions").insert([
    {
      player_id: at(8), season_id: demoSeasonId, starts_at: dateOffset(-10), status: "active",
      restriction_types: ["progressive_return"], visibility: "coaches",
      comment: "Retour progressif fictif — démonstration uniquement.",
    },
    {
      player_id: at(9), season_id: demoSeasonId, starts_at: dateOffset(-5), status: "active",
      restriction_types: ["no_intense_running"], visibility: "team",
      comment: "Restriction fictive — démonstration uniquement.",
    },
  ]);

  const opponentNames = OPPONENTS;
  let matchesCreated = 0;

  // === 10 matchs terminés (variés) ===
  const pastOffsets = [-60, -53, -46, -39, -32, -25, -18, -14, -10, -7];
  const pastMatchIds: string[] = [];
  for (let i = 0; i < pastOffsets.length; i++) {
    const teamScore = randInt(rng, 0, 5);
    const opponentScore = randInt(rng, 0, 4);
    const { data: match, error } = await untypedDb
      .from("matches")
      .insert({
        season_id: demoSeasonId, match_date: dateOffset(pastOffsets[i]),
        venue_id: venueIds[i % venueIds.length], home_or_away: i % 2 === 0 ? "home" : "away",
        match_type: "amical", status: "completed", team_score: teamScore, opponent_score: opponentScore,
        completion_status: "validated", response_deadline: timestampOffset(pastOffsets[i] - 2, 18),
        description: `vs ${pick(rng, opponentNames)} (démonstration).`,
      })
      .select("id")
      .single();
    if (error) throw new Error(`match démo passé ${i}: ${error.message}`);
    pastMatchIds.push(match.id);
    matchesCreated++;

    // Présence variée : p0/p2 souvent, p1 rarement, reste variable et déterministe.
    const playedIndexes = [0, 2, 3, 4, 5, 6].filter((_, idx) => (i + idx) % 3 !== 0 || idx < 2);
    const played = new Set(playedIndexes.map((k) => at(k)));
    const rows = [];
    for (let k = 0; k < Math.min(playerIds.length, 8); k++) {
      const playerId = at(k);
      const isPresent = played.has(playerId) || k === 0 || k === 2;
      const isLate = (k + i) % 4 === 0;
      const respondedAt = timestampOffset(pastOffsets[i] - 2 + (isLate ? 1 : -1), 18);
      rows.push({
        match_id: match.id, player_id: playerId, status: isPresent ? "present" : k % 5 === 0 ? "absent" : "uncertain",
        first_responded_at: respondedAt, last_changed_at: respondedAt, late_response: isLate,
      });
    }
    await untypedDb.from("availability").insert(rows);

    const playedRows = [...played].map((playerId, idx) => ({ match_id: match.id, player_id: playerId, was_present: true, goalkeeper: idx === 0 }));
    if (playedRows.length > 0) await untypedDb.from("match_players").insert(playedRows);

    const scorers = [...played];
    const goalRows = [];
    for (let g = 0; g < teamScore && scorers.length > 0; g++) goalRows.push({ match_id: match.id, scorer_player_id: pick(rng, scorers), credited_to: "charenton", goal_type: "classique", minute: randInt(rng, 1, 90) });
    for (let g = 0; g < opponentScore; g++) goalRows.push({ match_id: match.id, credited_to: "opponent", goal_type: "classique", minute: randInt(rng, 1, 90) });
    if (goalRows.length > 0) await untypedDb.from("goals").insert(goalRows);
  }

  // === 1 match live ===
  {
    const { data: match, error } = await untypedDb
      .from("matches")
      .insert({
        season_id: demoSeasonId, match_date: dateOffset(0), venue_id: venueIds[0], home_or_away: "home",
        match_type: "amical", status: "live", team_score: 1, opponent_score: 0,
        description: `vs ${pick(rng, opponentNames)} (démonstration, en direct).`,
      })
      .select("id")
      .single();
    if (error) throw new Error(`match démo live: ${error.message}`);
    matchesCreated++;
    await untypedDb.from("match_players").insert([
      { match_id: match.id, player_id: at(0), was_present: true, goalkeeper: true },
      { match_id: match.id, player_id: at(1), was_present: true },
      { match_id: match.id, player_id: at(2), was_present: true },
    ]);
    await untypedDb.from("goals").insert({ match_id: match.id, scorer_player_id: at(2), credited_to: "charenton", goal_type: "classique", minute: 23 });
  }

  // === 2 annulés + 1 reporté ===
  const cancelSpecs: { offset: number; status: "cancelled" | "postponed" }[] = [
    { offset: -20, status: "cancelled" },
    { offset: -3, status: "cancelled" },
    { offset: 4, status: "postponed" },
  ];
  for (const s of cancelSpecs) {
    const { error } = await untypedDb.from("matches").insert({
      season_id: demoSeasonId, match_date: dateOffset(s.offset), venue_id: venueIds[0], home_or_away: "home",
      match_type: "amical", status: s.status, description: "Match fictif (démonstration).",
    });
    if (error) throw new Error(`match démo ${s.status}: ${error.message}`);
    matchesCreated++;
  }

  // === 6 matchs futurs (dont 1 avec deadline dépassée, 1 scénario principal complet) ===
  const futureOffsets = [3, 6, 9, 13, 17, 21];
  for (let i = 0; i < futureOffsets.length; i++) {
    const offset = futureOffsets[i];
    const isDeadlinePassed = i === 1;
    const isMain = i === 0;
    const { data: match, error } = await untypedDb
      .from("matches")
      .insert({
        season_id: demoSeasonId, match_date: dateOffset(offset), venue_id: venueIds[i % venueIds.length],
        home_or_away: i % 2 === 0 ? "home" : "away", match_type: "amical", status: "scheduled",
        response_deadline: isDeadlinePassed ? timestampOffset(-1, 18) : timestampOffset(offset - 1, 18),
        captain_player_id: isMain ? at(0) : null,
        description: `vs ${pick(rng, opponentNames)} (démonstration).`,
      })
      .select("id")
      .single();
    if (error) throw new Error(`match démo futur ${i}: ${error.message}`);
    matchesCreated++;

    await untypedDb.from("availability").insert([
      { match_id: match.id, player_id: at(0), status: "present" },
      { match_id: match.id, player_id: at(1), status: "present", can_drive: true, available_seats: 2, departure_point: "Point de RDV fictif", departure_time: "18:00" },
      { match_id: match.id, player_id: at(2), status: "present", needs_ride: true },
      { match_id: match.id, player_id: at(3), status: isDeadlinePassed ? "uncertain" : "uncertain" },
    ]);
    if (isMain) {
      await untypedDb.from("carpool_assignments").insert({ match_id: match.id, driver_player_id: at(1), passenger_player_id: at(2) });
      await untypedDb.from("match_equipment_items").insert([
        { match_id: match.id, label: "Ballons (Démo)", assigned_player_id: at(0), status: "confirmed" },
        { match_id: match.id, label: "Chasubles (Démo)", status: "unassigned" },
      ]);
      await untypedDb.from("match_checklist_items").insert([
        { match_id: match.id, player_id: at(0), label: "Être capitaine", source: "contextual", checked: true },
        { match_id: match.id, player_id: at(0), label: "Arriver 15 minutes avant (Démo)", source: "template", checked: false },
      ]);
      await untypedDb.from("match_squad_entries").insert([
        { match_id: match.id, player_id: at(0), squad_status: "called_up", is_planned_goalkeeper: true },
        { match_id: match.id, player_id: at(1), squad_status: "called_up", is_planned_goalkeeper: false },
        { match_id: match.id, player_id: at(2), squad_status: "called_up", is_planned_goalkeeper: false },
        { match_id: match.id, player_id: at(3), squad_status: "waitlist", is_planned_goalkeeper: false },
      ]);
    }
  }

  return { demoSeasonId, playersUsed: playerIds.length, matchesCreated, purge };
}

export async function resetDemoDataset(requestedByPlayerId: string, requestedByName: string): Promise<DemoDatasetSummary> {
  return createOrResetDemoDataset(requestedByPlayerId, requestedByName);
}

export async function deleteDemoDatasetEntirely(requestedByPlayerId: string, requestedByName: string): Promise<PurgeResult> {
  const existing = await getDemoSeason();
  if (!existing) {
    return {
      season_found: false, matches_deleted: 0, restrictions_deleted: 0,
      venues_deleted: 0, templates_deleted: 0, checklist_templates_deleted: 0, season_deleted: false,
    };
  }
  return purgeDemoDataset(existing.id, true, requestedByPlayerId, requestedByName);
}
