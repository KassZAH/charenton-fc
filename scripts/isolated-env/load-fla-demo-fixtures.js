#!/usr/bin/env node
/**
 * Roadmap V3, Lot 11.5, §15 — bascule le dataset isolé de "classement réel
 * vide" (état par défaut de reset-and-seed.js) vers "classement fictif de
 * démonstration", pour tester l'affichage complet sans dépendre de l'état
 * réel (actuellement vide) du site FLA. Données clairement fictives
 * (préfixe "FICTIF"), jamais appliquées ni déployées ailleurs que sur le
 * projet isolé. Idempotent.
 *
 * Usage : node scripts/isolated-env/load-fla-demo-fixtures.js
 * Retour à l'état réel vide : node scripts/isolated-env/reset-and-seed.js
 */
const { assertIsolatedProjectEnv } = require("./guard");
assertIsolatedProjectEnv();

const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const DEMO_TEAMS = [
  { name: "AS FICTIF PARIS", position: 1, played: 8, wins: 7, draws: 1, losses: 0, gf: 24, ga: 6 },
  { name: "FICTIF FC NORD", position: 2, played: 8, wins: 6, draws: 1, losses: 1, gf: 20, ga: 9 },
  { name: "UNION FICTIVE SUD", position: 3, played: 8, wins: 5, draws: 2, losses: 1, gf: 18, ga: 10 },
  { name: "CHARENTON FC", position: 4, played: 8, wins: 4, draws: 2, losses: 2, gf: 15, ga: 12 },
  { name: "OLYMPIQUE FICTIF", position: 5, played: 8, wins: 3, draws: 2, losses: 3, gf: 13, ga: 13 },
  { name: "RACING TEST DEMO", position: 6, played: 8, wins: 2, draws: 2, losses: 4, gf: 10, ga: 16 },
  { name: "STADE FICTIF EST", position: 7, played: 8, wins: 1, draws: 1, losses: 6, gf: 8, ga: 20 },
  { name: "ENTENTE FICTIVE OUEST", position: 8, played: 8, wins: 0, draws: 1, losses: 7, gf: 5, ga: 24 },
];

function normalize(name) {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

(async () => {
  const { data: competition, error: competitionError } = await supabase
    .from("external_competitions")
    .select("*")
    .eq("provider", "fla")
    .eq("external_championship_id", "13")
    .eq("external_season_id", "2")
    .maybeSingle();
  if (competitionError) throw new Error(competitionError.message);
  if (!competition) {
    throw new Error("Aucune compétition FLA trouvée — lance d'abord node scripts/isolated-env/reset-and-seed.js");
  }

  await supabase.from("external_standings").delete().eq("external_competition_id", competition.id);

  const rows = DEMO_TEAMS.map((t, i) => ({
    external_competition_id: competition.id,
    external_team_id: `demo-${i + 1}`,
    team_name: t.name,
    normalized_team_name: normalize(t.name),
    position: t.position,
    played: t.played,
    wins: t.wins,
    draws: t.draws,
    losses: t.losses,
    goals_for: t.gf,
    goals_against: t.ga,
    goal_difference: t.gf - t.ga,
    points: t.wins * 3 + t.draws,
    fetched_at: new Date().toISOString(),
  }));
  const { error: insertError } = await supabase.from("external_standings").insert(rows);
  if (insertError) throw new Error("external_standings: " + insertError.message);

  const { error: competitionUpdateError } = await supabase
    .from("external_competitions")
    .update({ last_sync_status: "success", last_synced_at: new Date().toISOString(), last_error_message: null })
    .eq("id", competition.id);
  if (competitionUpdateError) throw new Error(competitionUpdateError.message);

  // Trois associations de démonstration : automatique (l'opposant seedé "Adversaire Test" ne
  // correspond à aucune équipe fictive -> ambiguous par construction ici), une confirmée
  // manuellement, une sans correspondance — jamais une correspondance faible validée automatiquement.
  await supabase.from("opponent_external_mappings").delete().eq("external_competition_id", competition.id);
  const { error: mappingsError } = await supabase.from("opponent_external_mappings").insert([
    {
      external_competition_id: competition.id,
      app_opponent_name: "AS FICTIF PARIS",
      normalized_app_opponent_name: normalize("AS FICTIF PARIS"),
      external_team_id: "demo-1",
      external_team_name: "AS FICTIF PARIS",
      mapping_status: "automatic",
    },
    {
      external_competition_id: competition.id,
      app_opponent_name: "FC Fictif Nord (variante)",
      normalized_app_opponent_name: normalize("FC Fictif Nord (variante)"),
      external_team_id: "demo-2",
      external_team_name: "FICTIF FC NORD",
      mapping_status: "ambiguous",
    },
    {
      external_competition_id: competition.id,
      app_opponent_name: "Adversaire totalement inconnu",
      normalized_app_opponent_name: normalize("Adversaire totalement inconnu"),
      external_team_id: null,
      external_team_name: null,
      mapping_status: "unmatched",
    },
  ]);
  if (mappingsError) throw new Error("opponent_external_mappings: " + mappingsError.message);

  console.log("DEMO_FIXTURES_LOADED_OK");
  console.log(JSON.stringify({ competitionId: competition.id, teams: rows.length }, null, 2));
})().catch((e) => {
  console.error("DEMO_FIXTURES_FAILED:", e.message);
  process.exit(1);
});
