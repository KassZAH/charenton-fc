#!/usr/bin/env node
/**
 * Roadmap V3, Lot 9 — remise à zéro et seed reproductible de l'environnement
 * Supabase isolé (charenton-fc-lot7-test). Idempotent : peut être relancé
 * autant de fois que nécessaire, converge toujours vers le même dataset
 * fictif. Ne touche jamais de donnée réelle du club — refuse de s'exécuter
 * si l'environnement ne pointe pas exactement vers le projet isolé
 * autorisé (voir guard.js).
 *
 * Usage : node scripts/isolated-env/reset-and-seed.js
 * Variables requises : NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 * SUPABASE_PROJECT_REF (voir .env.integration.local.example).
 */
const { assertIsolatedProjectEnv } = require("./guard");
assertIsolatedProjectEnv();

const { createClient } = require("@supabase/supabase-js");
const bcrypt = require("bcryptjs");

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Ordre de suppression : tables dépendantes avant les tables référencées, jamais l'inverse.
const DELETE_ORDER = [
  "backup_artifacts",
  "backups",
  "audit_log",
  "opponent_external_mappings",
  "external_standings",
  "external_competitions",
  "votes",
  "match_awards",
  "goals",
  "cards",
  "match_players",
  "match_lineups",
  "match_equipment_items",
  "availability",
  "reinforcement_calls",
  "dues",
  "player_measurements",
  "player_badges",
  "player_goals",
  "injuries",
  "season_trophies",
  "monthly_mvp_votes",
  "hall_of_fame_entries",
  "jersey_history_entries",
  "club_quotes",
  "matches",
  "seasons",
  "opponents",
  "awards",
  // checklist_templates n'a aucune clé étrangère (ni vers players, ni vers seasons/matches) — sans
  // cette ligne, les lignes créées par un run de test s'accumulent silencieusement d'un run à
  // l'autre (trouvé par le gate complet de la Macro-release B, Lot 24 : provoquait une violation
  // de contrainte unique sur match_checklist_items en générant plusieurs fois le même item de
  // modèle pour un même joueur/match).
  "checklist_templates",
  // Même raison : match_templates/venues (Lot 22) n'ont aucune clé étrangère qui les ferait
  // cascader depuis players/matches — sans ces deux lignes, les fixtures E2E (terrains, modèles)
  // s'accumulent d'un run à l'autre. match_templates d'abord (référence venues).
  "match_templates",
  "venues",
];
const NEVER_MATCHING_UUID = "00000000-0000-0000-0000-000000000000";

async function wipe() {
  // team_settings est un singleton (id=1) : jamais supprimé, seul owner_player_id est détaché
  // avant de vider players (la contrainte de clé étrangère l'exige).
  await supabase.from("team_settings").update({ owner_player_id: null }).eq("id", 1);

  for (const table of DELETE_ORDER) {
    const { error } = await supabase.from(table).delete().neq("id", NEVER_MATCHING_UUID);
    if (error) throw new Error(`wipe ${table}: ${error.message}`);
  }
  const { error: playersError } = await supabase.from("players").delete().neq("id", NEVER_MATCHING_UUID);
  if (playersError) throw new Error(`wipe players: ${playersError.message}`);
}

async function seed() {
  const { error: tsError } = await supabase.from("team_settings").upsert({
    id: 1,
    name: "Charenton FC (test isolé)",
    short_name: "CFC-TEST",
    primary_color: "#1c3762",
    gold_color: "#e8b53a",
  });
  if (tsError) throw new Error("team_settings: " + tsError.message);

  const players = [
    { key: "owner", first_name: "Proprio", last_name: "Test", role: "coach", pin: "919191", pin_length: 6 },
    { key: "coach2", first_name: "Coach", last_name: "Test", role: "coach", pin: "828282", pin_length: 6 },
    { key: "p1", first_name: "Joueur", last_name: "Un", role: "player", pin: "1111", pin_length: 4 },
    { key: "p2", first_name: "Joueur", last_name: "Deux", role: "player", pin: "2222", pin_length: 4 },
    { key: "p3", first_name: "Joueur", last_name: "Trois", role: "player", pin: "3333", pin_length: 4 },
  ];

  const ids = {};
  for (const p of players) {
    const pin_hash = await bcrypt.hash(p.pin, 10);
    const { data, error } = await supabase
      .from("players")
      .insert({
        first_name: p.first_name,
        last_name: p.last_name,
        role: p.role,
        pin_hash,
        pin_length: p.pin_length,
        status: "active",
        session_version: 1,
      })
      .select("id")
      .single();
    if (error) throw new Error(`player ${p.key}: ${error.message}`);
    ids[p.key] = data.id;
  }

  const { error: ownerError } = await supabase.from("team_settings").update({ owner_player_id: ids.owner }).eq("id", 1);
  if (ownerError) throw new Error("owner_player_id: " + ownerError.message);

  const { data: season, error: seasonError } = await supabase
    .from("seasons")
    .insert({ name: "Saison Test A", start_date: "2026-08-01", is_active: true, is_locked: false })
    .select("id")
    .single();
  if (seasonError) throw new Error("season: " + seasonError.message);
  ids.season = season.id;

  const { data: opponent, error: opponentError } = await supabase
    .from("opponents")
    .insert({ name: "Adversaire Test" })
    .select("id")
    .single();
  if (opponentError) throw new Error("opponent: " + opponentError.message);
  ids.opponent = opponent.id;

  const { data: award, error: awardError } = await supabase
    .from("awards")
    .insert({ name: "Homme du match (test)", is_active: true })
    .select("id")
    .single();
  if (awardError) throw new Error("award: " + awardError.message);
  ids.award = award.id;

  const { data: m1, error: m1Error } = await supabase
    .from("matches")
    .insert({
      season_id: ids.season, opponent_id: ids.opponent, match_date: "2026-08-10",
      match_type: "amical", home_or_away: "home", team_score: 3, opponent_score: 1, status: "completed",
      completion_status: "validated",
    })
    .select("id")
    .single();
  if (m1Error) throw new Error("match1: " + m1Error.message);
  ids.match1 = m1.id;

  await supabase.from("match_players").insert([
    { match_id: ids.match1, player_id: ids.p1, was_present: true },
    { match_id: ids.match1, player_id: ids.p2, was_present: true },
    { match_id: ids.match1, player_id: ids.p3, was_present: true },
  ]);
  await supabase.from("goals").insert([
    { match_id: ids.match1, scorer_player_id: ids.p1, credited_to: "charenton", goal_type: "classique" },
    { match_id: ids.match1, scorer_player_id: ids.p1, credited_to: "charenton", goal_type: "classique" },
    { match_id: ids.match1, scorer_player_id: ids.p3, credited_to: "charenton", goal_type: "classique" },
  ]);
  await supabase.from("votes").insert([{ match_id: ids.match1, award_id: ids.award, voter_player_id: ids.p1, voted_player_id: ids.p3 }]);

  const { data: m2, error: m2Error } = await supabase
    .from("matches")
    .insert({
      season_id: ids.season, opponent_id: ids.opponent, match_date: "2026-08-17",
      match_type: "championnat", home_or_away: "away", team_score: 2, opponent_score: 2, status: "completed",
      completion_status: "incomplete",
    })
    .select("id")
    .single();
  if (m2Error) throw new Error("match2: " + m2Error.message);
  ids.match2 = m2.id;

  await supabase.from("match_players").insert([
    { match_id: ids.match2, player_id: ids.p1, was_present: true },
    { match_id: ids.match2, player_id: ids.p2, was_present: true },
  ]);
  await supabase.from("goals").insert([
    { match_id: ids.match2, scorer_player_id: ids.p2, credited_to: "charenton", goal_type: "classique" },
    { match_id: ids.match2, scorer_player_id: ids.p2, credited_to: "charenton", goal_type: "classique" },
  ]);
  // Volontairement aucun vote -> match incomplet.

  const { data: m3, error: m3Error } = await supabase
    .from("matches")
    .insert({ season_id: ids.season, opponent_id: ids.opponent, match_date: "2026-09-05", match_type: "amical", home_or_away: "home", status: "scheduled" })
    .select("id")
    .single();
  if (m3Error) throw new Error("match3: " + m3Error.message);
  ids.match3 = m3.id;

  await supabase.from("dues").insert([
    { player_id: ids.p1, season_id: ids.season, amount_due: 50, amount_paid: 20 },
    { player_id: ids.p2, season_id: ids.season, amount_due: 50, amount_paid: 50 },
  ]);

  // Configuration FLA connue (roadmap V3, Lot 11.5, §1) — état "réel vide" par défaut :
  // la compétition existe, aucun classement encore synchronisé. Voir load-fla-demo-fixtures.js
  // pour basculer vers un classement fictif de démonstration.
  const { data: flaCompetition, error: flaError } = await supabase
    .from("external_competitions")
    .insert({
      provider: "fla",
      external_championship_id: "13",
      external_season_id: "2",
      internal_season_id: ids.season,
      competition_name: "Foot à 11 - Week-end - 2ème division",
      internal_team_name: "CHARENTON FC",
      source_url: "https://football-loisir-amateur.fr/championships/13/rankings?season=2",
      sync_enabled: true,
    })
    .select("id")
    .single();
  if (flaError) throw new Error("external_competitions: " + flaError.message);
  ids.flaCompetition = flaCompetition.id;

  return { ids, pins: Object.fromEntries(players.map((p) => [p.key, p.pin])) };
}

async function resetAndSeed() {
  await wipe();
  return seed();
}

module.exports = { resetAndSeed, wipe, seed };

if (require.main === module) {
  resetAndSeed()
    .then((result) => {
      console.log("RESET_AND_SEED_OK");
      console.log(JSON.stringify(result, null, 2));
    })
    .catch((e) => {
      console.error("RESET_AND_SEED_FAILED:", e.message);
      process.exit(1);
    });
}
