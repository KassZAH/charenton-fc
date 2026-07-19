#!/usr/bin/env node
/**
 * Roadmap V3, Macro-release B — dataset de démonstration riche pour la preview des Lots 19 à 24.
 *
 * Distinct de reset-and-seed.js (seed minimal, utilisé par tous les tests techniques
 * unitaires/intégration/E2E existants — jamais modifié par ce fichier pour ne rien casser).
 * Celui-ci sert uniquement à préparer une preview manuelle riche et compréhensible.
 *
 * Déterministe : toutes les variations utilisent le générateur pseudo-aléatoire à graine fixe
 * de seeded-random.js, jamais Math.random(). Les dates sont calculées en décalage (jours) par
 * rapport à la date réelle d'exécution — le dataset reste cohérent (passé/futur) quel que soit
 * le jour où la preview est réellement déployée, tout en gardant une structure identique à
 * chaque exécution.
 *
 * Usage : node scripts/isolated-env/seed-demo.js
 * Variables requises : identiques à reset-and-seed.js (voir .env.integration.local.example).
 */
const { assertIsolatedProjectEnv } = require("./guard");
assertIsolatedProjectEnv();

const { createClient } = require("@supabase/supabase-js");
const bcrypt = require("bcryptjs");
const { wipe } = require("./reset-and-seed");
const { createSeededRandom, randInt, pick } = require("./seeded-random");

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Graine fixe : ne jamais faire varier ce nombre d'une exécution à l'autre.
const SEED = 20260719;
const rng = createSeededRandom(SEED);

const DAY_MS = 86_400_000;
/** Date (YYYY-MM-DD) décalée de `days` par rapport à l'exécution réelle du script. */
function dateOffset(days) {
  return new Date(Date.now() + days * DAY_MS).toISOString().slice(0, 10);
}
/** Timestamp ISO complet décalé de `days` (et éventuellement d'heures/minutes). */
function timestampOffset(days, hours = 12, minutes = 0) {
  const d = new Date(Date.now() + days * DAY_MS);
  d.setUTCHours(hours, minutes, 0, 0);
  return d.toISOString();
}

// ============================================================================
// Configuration déterministe du dataset
// ============================================================================

/**
 * 14 comptes au total (1 Propriétaire + 2 Coachs + 11 Joueurs). PIN volontairement simples et
 * documentés ici pour la checklist de validation manuelle — jamais utilisés en production.
 */
const PEOPLE = [
  { key: "owner", first_name: "Amine", last_name: "Propriétaire", role: "coach", pin: "919191", pin_length: 6, shirt_number: null, primary_position: null },
  { key: "coach2", first_name: "Sofiane", last_name: "Coach", role: "coach", pin: "828282", pin_length: 6, shirt_number: null, primary_position: null },
  { key: "coach3", first_name: "Nadia", last_name: "Coach Gardiens", role: "coach", pin: "838383", pin_length: 6, shirt_number: null, primary_position: null },
  { key: "p1", first_name: "Bilal", last_name: "Gardien Un", role: "player", pin: "1111", pin_length: 4, shirt_number: 1, primary_position: "Gardien", profile: "gk1" },
  { key: "p2", first_name: "Karim", last_name: "Gardien Deux", role: "player", pin: "2222", pin_length: 4, shirt_number: 12, primary_position: "Gardien", profile: "gk2" },
  { key: "p3", first_name: "Yanis", last_name: "Défenseur Un", role: "player", pin: "3333", pin_length: 4, shirt_number: 2, primary_position: "Défenseur", profile: "regular" },
  { key: "p4", first_name: "Marc", last_name: "Défenseur Deux", role: "player", pin: "4444", pin_length: 4, shirt_number: 3, primary_position: "Défenseur", profile: "rare" },
  { key: "p5", first_name: "Hugo", last_name: "Milieu Un", role: "player", pin: "5555", pin_length: 4, shirt_number: 4, primary_position: "Milieu", profile: "reliable" },
  { key: "p6", first_name: "Rayan", last_name: "Milieu Deux", role: "player", pin: "6666", pin_length: 4, shirt_number: 5, primary_position: "Milieu", profile: "late" },
  { key: "p7", first_name: "Idris", last_name: "Milieu Trois", role: "player", pin: "7777", pin_length: 4, shirt_number: 6, primary_position: "Milieu", profile: "overlooked" },
  { key: "p8", first_name: "Théo", last_name: "Attaquant Un", role: "player", pin: "8888", pin_length: 4, shirt_number: 7, primary_position: "Attaquant", profile: "absent" },
  { key: "p9", first_name: "Malik", last_name: "Attaquant Deux", role: "player", pin: "9999", pin_length: 4, shirt_number: 8, primary_position: "Attaquant", profile: "progressive_return" },
  { key: "p10", first_name: "Enzo", last_name: "Défenseur Trois", role: "player", pin: "1212", pin_length: 4, shirt_number: 9, primary_position: "Défenseur", profile: "restricted" },
  { key: "p11", first_name: "Adam", last_name: "Milieu Quatre", role: "player", pin: "3434", pin_length: 4, shirt_number: 10, primary_position: "Milieu", profile: "restriction_ended" },
];

const OPPONENTS = ["FC Ivry", "AS Vitry", "Olympique Créteil", "US Maisons-Alfort", "Racing Bercy", "Étoile Gentilly", "FC Bois-Le-Roi", "AS Nogent"];

const VENUES = [
  {
    key: "v1", name: "Stade Municipal de Charenton", address: "12 Quai des Carrières, 94220 Charenton-le-Pont",
    maps_url: "https://maps.google.com/?q=Stade+Municipal+Charenton", parking_info: "Parking gratuit sur place",
    changing_rooms_info: "Vestiaires A et B, prévoir un cadenas", access_code: "1234#", surface_type: "Synthétique",
    lighting: true, notes: "Entrée par le portail nord",
  },
  {
    key: "v2", name: "Complexe Sportif du Bois", address: "5 Avenue du Bois, 94700 Maisons-Alfort",
    maps_url: "https://maps.google.com/?q=Complexe+Sportif+du+Bois", parking_info: "Rue adjacente uniquement",
    changing_rooms_info: "Vestiaire unique, arriver tôt", access_code: null, surface_type: "Herbe naturelle",
    lighting: false, notes: "Terrain parfois boueux en hiver",
  },
  {
    key: "v3", name: "Gymnase Jean Moulin", address: "8 Rue Jean Moulin, 94270 Le Kremlin-Bicêtre",
    maps_url: "https://maps.google.com/?q=Gymnase+Jean+Moulin", parking_info: "Parking du gymnase",
    changing_rooms_info: "Vestiaires chauffés", access_code: "5678", surface_type: "Parquet",
    lighting: true, notes: "Chaussures en salle obligatoires",
  },
  {
    key: "v4", name: "Terrain des Carrières", address: "20 Rue des Carrières, 94000 Créteil",
    maps_url: "https://maps.google.com/?q=Terrain+des+Carrieres", parking_info: "Aucun parking dédié",
    changing_rooms_info: "Pas de vestiaire, se changer sur place", access_code: null, surface_type: "Synthétique ancien",
    lighting: false, notes: "Éclairage absent, prévoir des matchs en journée",
  },
];

const TEMPLATES = [
  {
    key: "t1", name: "Vendredi soir à Charenton", venueKey: "v1", kickoff_time: "20:00:00", meeting_offset_minutes: 30,
    match_type: "amical", home_or_away: "home", max_players: 16,
    default_equipment_items: ["Ballons", "Chasubles", "Trousse de secours"], notes: "Créneau habituel du vendredi soir",
  },
  {
    key: "t2", name: "Déplacement du dimanche", venueKey: "v2", kickoff_time: "15:00:00", meeting_offset_minutes: 45,
    match_type: "championnat", home_or_away: "away", max_players: 16,
    default_equipment_items: ["Chasubles", "Ballons"], notes: "Prévoir le covoiturage, terrain excentré",
  },
  {
    key: "t3", name: "Session five", venueKey: "v3", kickoff_time: "21:00:00", meeting_offset_minutes: 15,
    match_type: "autre", home_or_away: "home", max_players: 10,
    default_equipment_items: ["Ballon futsal"], notes: "Format réduit, moins de joueurs nécessaires",
  },
];

// Les 10 matchs terminés — variés en résultat, lieu, adversaire ; du plus ancien au plus récent.
const PAST_MATCHES = [
  { offset: -84, opponent: 0, venue: "v2", home_or_away: "away", match_type: "championnat", teamScore: 2, opponentScore: 1, completion: "validated" },
  { offset: -77, opponent: 1, venue: "v1", home_or_away: "home", match_type: "amical", teamScore: 1, opponentScore: 1, completion: "validated" },
  { offset: -70, opponent: 2, venue: "v4", home_or_away: "away", match_type: "championnat", teamScore: 0, opponentScore: 2, completion: "validated" },
  { offset: -63, opponent: 3, venue: "v1", home_or_away: "home", match_type: "championnat", teamScore: 3, opponentScore: 0, completion: "validated" },
  { offset: -56, opponent: 4, venue: "v2", home_or_away: "away", match_type: "amical", teamScore: 2, opponentScore: 2, completion: "validated" },
  { offset: -49, opponent: 5, venue: "v1", home_or_away: "home", match_type: "championnat", teamScore: 4, opponentScore: 1, completion: "validated" },
  { offset: -42, opponent: 6, venue: "v3", home_or_away: "home", match_type: "autre", teamScore: 5, opponentScore: 3, completion: "validated" },
  { offset: -35, opponent: 7, venue: "v4", home_or_away: "away", match_type: "championnat", teamScore: 1, opponentScore: 3, completion: "incomplete" },
  { offset: -28, opponent: 0, venue: "v1", home_or_away: "home", match_type: "championnat", teamScore: 2, opponentScore: 0, completion: "validated" },
  { offset: -21, opponent: 1, venue: "v2", home_or_away: "away", match_type: "amical", teamScore: 1, opponentScore: 1, completion: "under_review" },
];

// Présence (réponse "présent") par joueur, indexée sur les 10 matchs passés (0 = plus ancien).
const PRESENT_INDEXES = {
  p1: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  p2: [1, 3, 5, 7, 9],
  p3: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  p4: [2, 7],
  p5: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  p6: [0, 1, 2, 3, 4, 6, 7, 8],
  p7: [3, 4, 5, 6, 7, 8, 9],
  p8: [0, 2, 4],
  p9: [7, 8, 9],
  p10: [5, 6, 7, 8, 9],
  p11: [0, 1, 4, 5, 6, 7, 8, 9],
};
// Absence explicite (status='absent', distincte d'une non-réponse) — surtout p8, "souvent absent".
const ABSENT_INDEXES = {
  p8: [1, 3, 5, 6, 7, 8, 9],
};
// Présence réelle (match_players.was_present) — toujours un sous-ensemble de PRESENT_INDEXES.
// p7 est délibérément très en retrait de sa propre disponibilité : "disponible mais non retenu".
const PLAYED_INDEXES = {
  p1: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  p2: [1, 3, 5, 7, 9],
  p3: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  p4: [2, 7],
  p5: [0, 1, 2, 3, 4, 6, 7, 8, 9],
  p6: [0, 1, 2, 3, 4, 6, 7, 8],
  p7: [4, 7],
  p8: [0, 2, 4],
  p9: [8, 9],
  p10: [6, 8],
  p11: [0, 1, 4, 5, 6, 7, 8, 9],
};
// Réponses tardives (late_response=true) — surtout p6, "répond souvent en retard".
const LATE_RESPONSE_INDEXES = {
  p6: [0, 1, 3, 4, 6, 8],
  p4: [7],
};

const GOAL_SCORER_KEYS = ["p3", "p5", "p6", "p7", "p8", "p9", "p11"];
const CARD_TARGET_INDEXES = [1, 4, 6, 8];

async function seedPeopleAndSeason() {
  const { error: tsError } = await supabase.from("team_settings").upsert({
    id: 1,
    name: "Charenton FC (démo isolée)",
    short_name: "CFC-DEMO",
    primary_color: "#1c3762",
    gold_color: "#e8b53a",
  });
  if (tsError) throw new Error("team_settings: " + tsError.message);

  const ids = {};
  const pins = {};
  for (const p of PEOPLE) {
    const pin_hash = await bcrypt.hash(p.pin, 10);
    const { data, error } = await supabase
      .from("players")
      .insert({
        first_name: p.first_name,
        last_name: p.last_name,
        nickname: p.first_name,
        role: p.role,
        pin_hash,
        pin_length: p.pin_length,
        status: "active",
        session_version: 1,
        shirt_number: p.shirt_number,
        primary_position: p.primary_position ?? null,
      })
      .select("id")
      .single();
    if (error) throw new Error(`player ${p.key}: ${error.message}`);
    ids[p.key] = data.id;
    pins[p.key] = p.pin;
  }

  const { error: ownerError } = await supabase.from("team_settings").update({ owner_player_id: ids.owner }).eq("id", 1);
  if (ownerError) throw new Error("owner_player_id: " + ownerError.message);

  const { data: season, error: seasonError } = await supabase
    .from("seasons")
    .insert({ name: "Saison Démo Macro B", start_date: dateOffset(-120), is_active: true, is_locked: false })
    .select("id")
    .single();
  if (seasonError) throw new Error("season: " + seasonError.message);
  ids.season = season.id;

  const opponentIds = [];
  for (const name of OPPONENTS) {
    const { data, error } = await supabase.from("opponents").insert({ name }).select("id").single();
    if (error) throw new Error(`opponent ${name}: ${error.message}`);
    opponentIds.push(data.id);
  }
  ids.opponents = opponentIds;

  const { data: award, error: awardError } = await supabase
    .from("awards")
    .insert({ name: "Homme du match (démo)", emoji: "⭐", is_active: true })
    .select("id")
    .single();
  if (awardError) throw new Error("award: " + awardError.message);
  ids.award = award.id;

  // Cotisations variées — p3 volontairement partiel (déclenche le rappel contextuel "Cotisation
  // restante" dans la checklist du scénario principal).
  await supabase.from("dues").insert([
    { player_id: ids.p1, season_id: ids.season, amount_due: 60, amount_paid: 60 },
    { player_id: ids.p2, season_id: ids.season, amount_due: 60, amount_paid: 60 },
    { player_id: ids.p3, season_id: ids.season, amount_due: 60, amount_paid: 30 },
    { player_id: ids.p4, season_id: ids.season, amount_due: 60, amount_paid: 0 },
    { player_id: ids.p5, season_id: ids.season, amount_due: 60, amount_paid: 60 },
    { player_id: ids.p6, season_id: ids.season, amount_due: 60, amount_paid: 40 },
  ]);

  return { ids, pins };
}

async function seedVenuesAndTemplates(ids) {
  ids.venues = {};
  for (const v of VENUES) {
    const { data, error } = await supabase
      .from("venues")
      .insert({
        name: v.name, address: v.address, maps_url: v.maps_url, parking_info: v.parking_info,
        changing_rooms_info: v.changing_rooms_info, access_code: v.access_code, surface_type: v.surface_type,
        lighting: v.lighting, notes: v.notes,
      })
      .select("id")
      .single();
    if (error) throw new Error(`venue ${v.key}: ${error.message}`);
    ids.venues[v.key] = data.id;
  }

  ids.templates = {};
  for (const t of TEMPLATES) {
    const { data, error } = await supabase
      .from("match_templates")
      .insert({
        name: t.name, venue_id: ids.venues[t.venueKey], kickoff_time: t.kickoff_time,
        meeting_offset_minutes: t.meeting_offset_minutes, match_type: t.match_type, home_or_away: t.home_or_away,
        max_players: t.max_players, default_equipment_items: t.default_equipment_items, notes: t.notes,
      })
      .select("id")
      .single();
    if (error) throw new Error(`template ${t.key}: ${error.message}`);
    ids.templates[t.key] = data.id;
  }
}

/** Insère une réponse de disponibilité, avec ponctualité et éventuel changement d'avis. */
async function insertAvailability(matchId, playerId, status, { deadline, lateResponse = false, changedMind = false } = {}) {
  const firstRespondedAt = deadline
    ? new Date(new Date(deadline).getTime() + (lateResponse ? 1 : -1) * (randInt(rng, 1, 6) * 3600_000)).toISOString()
    : new Date(Date.now() - randInt(rng, 1, 5) * DAY_MS).toISOString();
  const lastChangedAt = changedMind
    ? new Date(new Date(firstRespondedAt).getTime() + randInt(rng, 2, 20) * 3600_000).toISOString()
    : firstRespondedAt;

  const { error } = await supabase.from("availability").insert({
    match_id: matchId, player_id: playerId, status,
    first_responded_at: firstRespondedAt, last_changed_at: lastChangedAt, late_response: lateResponse,
  });
  if (error) throw new Error(`availability ${playerId}/${matchId}: ${error.message}`);
}

async function seedPastMatches(ids) {
  ids.pastMatches = [];
  const playerKeys = PEOPLE.filter((p) => p.role === "player").map((p) => p.key);

  for (let i = 0; i < PAST_MATCHES.length; i++) {
    const m = PAST_MATCHES[i];
    const matchDate = dateOffset(m.offset);
    const deadline = timestampOffset(m.offset - 3, 18, 0);

    const { data: match, error } = await supabase
      .from("matches")
      .insert({
        season_id: ids.season, opponent_id: ids.opponents[m.opponent], venue_id: ids.venues[m.venue],
        match_date: matchDate, home_or_away: m.home_or_away, match_type: m.match_type,
        team_score: m.teamScore, opponent_score: m.opponentScore, status: "completed",
        completion_status: m.completion, response_deadline: deadline,
      })
      .select("id")
      .single();
    if (error) throw new Error(`past match ${i}: ${error.message}`);
    ids.pastMatches.push(match.id);

    const availabilityRows = [];
    const playedRows = [];
    for (const key of playerKeys) {
      const isPresent = (PRESENT_INDEXES[key] ?? []).includes(i);
      const isAbsent = (ABSENT_INDEXES[key] ?? []).includes(i);
      const isLate = (LATE_RESPONSE_INDEXES[key] ?? []).includes(i);
      if (isPresent) {
        await insertAvailability(match.id, ids[key], "present", { deadline, lateResponse: isLate, changedMind: isLate });
      } else if (isAbsent) {
        await insertAvailability(match.id, ids[key], "absent", { deadline, lateResponse: isLate });
      }
      if ((PLAYED_INDEXES[key] ?? []).includes(i)) {
        playedRows.push({ match_id: match.id, player_id: ids[key], was_present: true, goalkeeper: key === "p1" || key === "p2" });
      }
    }
    if (playedRows.length > 0) {
      const { error: mpError } = await supabase.from("match_players").insert(playedRows);
      if (mpError) throw new Error(`match_players ${i}: ${mpError.message}`);
    }

    // Buts : côté Charenton dérivés des joueurs ayant réellement joué (jamais un but d'un joueur absent).
    const scorersAvailable = GOAL_SCORER_KEYS.filter((k) => (PLAYED_INDEXES[k] ?? []).includes(i));
    const goalRows = [];
    for (let g = 0; g < m.teamScore; g++) {
      const scorerKey = scorersAvailable.length > 0 ? pick(rng, scorersAvailable) : "p3";
      goalRows.push({ match_id: match.id, scorer_player_id: ids[scorerKey], credited_to: "charenton", goal_type: "classique", minute: randInt(rng, 1, 90) });
    }
    for (let g = 0; g < m.opponentScore; g++) {
      goalRows.push({ match_id: match.id, credited_to: "opponent", goal_type: "classique", minute: randInt(rng, 1, 90) });
    }
    if (goalRows.length > 0) {
      const { error: goalsError } = await supabase.from("goals").insert(goalRows);
      if (goalsError) throw new Error(`goals ${i}: ${goalsError.message}`);
    }

    if (CARD_TARGET_INDEXES.includes(i) && scorersAvailable.length > 0) {
      await supabase.from("cards").insert({
        match_id: match.id, player_id: ids[pick(rng, scorersAvailable)],
        card_type: i % 2 === 0 ? "yellow" : "red", minute: randInt(rng, 10, 85),
      });
    }

    // Votes / récompense sur un match sur deux, pour varier sans surcharger.
    if (i % 2 === 0 && scorersAvailable.length > 1) {
      const [voter, voted] = [pick(rng, scorersAvailable), pick(rng, scorersAvailable)];
      await supabase.from("votes").insert({ match_id: match.id, award_id: ids.award, voter_player_id: ids[voter], voted_player_id: ids[voted] });
      await supabase.from("match_awards").insert({ match_id: match.id, award_id: ids.award, player_id: ids[voted], assigned_directly: false });
    }
  }
}

async function seedCancelledAndPostponed(ids) {
  ids.cancelledMatches = [];
  const specs = [
    { offset: -14, opponent: 2, venue: "v1", status: "cancelled", reason: "météo" },
    { offset: -10, opponent: 3, venue: "v2", status: "postponed", reason: "terrain indisponible" },
    { offset: 2, opponent: 4, venue: "v1", status: "postponed", reason: "adversaire indisponible, reporté" },
  ];
  for (const s of specs) {
    const { data, error } = await supabase
      .from("matches")
      .insert({
        season_id: ids.season, opponent_id: ids.opponents[s.opponent], venue_id: ids.venues[s.venue],
        match_date: dateOffset(s.offset), home_or_away: "home", match_type: "championnat",
        status: s.status, description: `Match ${s.status === "cancelled" ? "annulé" : "reporté"} (${s.reason}) — dataset de démonstration.`,
      })
      .select("id")
      .single();
    if (error) throw new Error(`cancelled/postponed ${s.offset}: ${error.message}`);
    ids.cancelledMatches.push(data.id);
  }
}

async function seedFutureOpenMatches(ids) {
  ids.futureOpenMatches = {};
  // open1 et open2 reprennent volontairement la structure des modèles t1/t2 (terrain, coup
  // d'envoi, type, domicile/extérieur) — "plusieurs matchs utilisant ces modèles" (aucune clé
  // étrangère match→modèle dans le schéma ; la démonstration se fait par la structure identique).
  const specs = [
    { key: "open1", offset: 5, opponent: 5, venue: "v1", home_or_away: "home", match_type: "amical", kickoff_time: "20:00:00", deadlineOffset: 4 },
    { key: "open2", offset: 8, opponent: 6, venue: "v2", home_or_away: "away", match_type: "championnat", kickoff_time: "15:00:00", deadlineOffset: 7 },
    { key: "open3", offset: 12, opponent: 7, venue: "v3", home_or_away: "home", match_type: "autre", kickoff_time: "21:00:00", deadlineOffset: null },
    { key: "open4", offset: 16, opponent: 0, venue: "v4", home_or_away: "away", match_type: "championnat", kickoff_time: null, deadlineOffset: 15 },
    { key: "open5", offset: 20, opponent: 1, venue: "v1", home_or_away: "home", match_type: "championnat", kickoff_time: null, deadlineOffset: 19 },
  ];

  for (const s of specs) {
    const { data, error } = await supabase
      .from("matches")
      .insert({
        season_id: ids.season, opponent_id: ids.opponents[s.opponent], venue_id: ids.venues[s.venue],
        match_date: dateOffset(s.offset), home_or_away: s.home_or_away, match_type: s.match_type,
        kickoff_time: s.kickoff_time, status: "scheduled",
        response_deadline: s.deadlineOffset != null ? timestampOffset(s.deadlineOffset, 18, 0) : null,
      })
      .select("id")
      .single();
    if (error) throw new Error(`future open ${s.key}: ${error.message}`);
    ids.futureOpenMatches[s.key] = data.id;
  }

  // open1 : quelques réponses mêlées (présent/incertain/absent) — "conducteur avec places
  // disponibles" (3 places, 1 passager affecté, 2 restantes).
  const open1 = ids.futureOpenMatches.open1;
  await supabase.from("availability").insert([
    { match_id: open1, player_id: ids.p3, status: "present" },
    { match_id: open1, player_id: ids.p5, status: "present", can_drive: true, available_seats: 3, departure_point: "Métro Charenton-Écoles", departure_time: "18:15" },
    { match_id: open1, player_id: ids.p6, status: "uncertain" },
    { match_id: open1, player_id: ids.p8, status: "absent" },
    { match_id: open1, player_id: ids.p11, status: "present", needs_ride: true },
  ]);
  await supabase.from("carpool_assignments").insert({ match_id: open1, driver_player_id: ids.p5, passenger_player_id: ids.p11 });

  // open2 : voiture complète (2 places, 2 passagers assignés, 0 restante).
  const open2 = ids.futureOpenMatches.open2;
  await supabase.from("availability").insert([
    { match_id: open2, player_id: ids.p6, status: "present", can_drive: true, available_seats: 2, departure_point: "Parking Mairie", departure_time: "13:30" },
    { match_id: open2, player_id: ids.p9, status: "present", needs_ride: true },
    { match_id: open2, player_id: ids.p10, status: "present", needs_ride: true },
    { match_id: open2, player_id: ids.p4, status: "uncertain" },
  ]);
  await supabase.from("carpool_assignments").insert([
    { match_id: open2, driver_player_id: ids.p6, passenger_player_id: ids.p9 },
    { match_id: open2, driver_player_id: ids.p6, passenger_player_id: ids.p10 },
  ]);
  // Matériel complet sur ce match : tout est confirmé/apporté.
  await supabase.from("match_equipment_items").insert([
    { match_id: open2, label: "Ballons", assigned_player_id: ids.p3, status: "confirmed" },
    { match_id: open2, label: "Chasubles", assigned_player_id: ids.p5, status: "confirmed" },
  ]);

  // open3 : match sans covoiturage configuré du tout, réponses simples.
  const open3 = ids.futureOpenMatches.open3;
  await supabase.from("availability").insert([
    { match_id: open3, player_id: ids.p3, status: "present" },
    { match_id: open3, player_id: ids.p7, status: "present" },
    { match_id: open3, player_id: ids.p8, status: "absent" },
  ]);

  // open4 : demande de covoiturage sans place disponible (déficit) — aucun conducteur.
  const open4 = ids.futureOpenMatches.open4;
  await supabase.from("availability").insert([
    { match_id: open4, player_id: ids.p8, status: "present", needs_ride: true },
    { match_id: open4, player_id: ids.p3, status: "present" },
  ]);

  // open5 : passager déjà affecté, prêt pour un test manuel de "retrait d'un passager".
  const open5 = ids.futureOpenMatches.open5;
  await supabase.from("availability").insert([
    { match_id: open5, player_id: ids.p3, status: "present", can_drive: true, available_seats: 2, departure_point: "Place du marché", departure_time: "10:00" },
    { match_id: open5, player_id: ids.p7, status: "present", needs_ride: true },
  ]);
  await supabase.from("carpool_assignments").insert({ match_id: open5, driver_player_id: ids.p3, passenger_player_id: ids.p7 });
}

async function seedDeadlinePassedMatch(ids) {
  const { data, error } = await supabase
    .from("matches")
    .insert({
      season_id: ids.season, opponent_id: ids.opponents[2], venue_id: ids.venues.v2,
      match_date: dateOffset(9), home_or_away: "away", match_type: "championnat", status: "scheduled",
      response_deadline: timestampOffset(-1, 18, 0),
    })
    .select("id")
    .single();
  if (error) throw new Error("deadline passed match: " + error.message);
  ids.deadlinePassedMatch = data.id;

  // Deux joueurs ont répondu après la deadline déjà dépassée ; un troisième n'a toujours pas répondu.
  await insertAvailability(data.id, ids.p6, "present", { deadline: timestampOffset(-1, 18, 0), lateResponse: true });
  await insertAvailability(data.id, ids.p4, "uncertain", { deadline: timestampOffset(-1, 18, 0), lateResponse: true });
}

async function seedMainScenarioMatch(ids) {
  const deadline = timestampOffset(2, 18, 0);
  const { data: match, error } = await supabase
    .from("matches")
    .insert({
      season_id: ids.season, opponent_id: ids.opponents[3], venue_id: ids.venues.v1,
      match_date: dateOffset(3), kickoff_time: "20:00:00", meeting_time: "19:30:00",
      home_or_away: "home", match_type: "amical", status: "scheduled",
      response_deadline: deadline, captain_player_id: ids.p3,
    })
    .select("id")
    .single();
  if (error) throw new Error("main scenario match: " + error.message);
  ids.mainScenarioMatch = match.id;

  const calledUp = ["p1", "p3", "p5", "p6", "p7", "p9", "p10", "p11"];
  const waitlist = ["p4", "p8"];
  await supabase.from("match_squad_entries").insert([
    ...calledUp.map((k) => ({ match_id: match.id, player_id: ids[k], squad_status: "called_up", is_planned_goalkeeper: k === "p1" })),
    ...waitlist.map((k) => ({ match_id: match.id, player_id: ids[k], squad_status: "waitlist", is_planned_goalkeeper: false })),
  ]);
  await supabase.from("matches").update({ squad_published_at: new Date().toISOString(), squad_locked_at: new Date().toISOString() }).eq("id", match.id);

  await supabase.from("availability").insert([
    { match_id: match.id, player_id: ids.p1, status: "present", first_responded_at: timestampOffset(0, 9), last_changed_at: timestampOffset(0, 9), late_response: false },
    { match_id: match.id, player_id: ids.p3, status: "present", first_responded_at: timestampOffset(0, 10), last_changed_at: timestampOffset(0, 10), late_response: false },
    { match_id: match.id, player_id: ids.p5, status: "present", first_responded_at: timestampOffset(0, 11), last_changed_at: timestampOffset(0, 11), late_response: false, can_drive: true, available_seats: 0 },
    { match_id: match.id, player_id: ids.p6, status: "present", first_responded_at: timestampOffset(1, 20), last_changed_at: timestampOffset(1, 20), late_response: false },
    { match_id: match.id, player_id: ids.p7, status: "present", first_responded_at: timestampOffset(0, 14), last_changed_at: timestampOffset(0, 14), late_response: false },
    { match_id: match.id, player_id: ids.p9, status: "present", first_responded_at: timestampOffset(0, 15), last_changed_at: timestampOffset(0, 15), late_response: false, needs_ride: true },
    { match_id: match.id, player_id: ids.p10, status: "present", first_responded_at: timestampOffset(0, 16), last_changed_at: timestampOffset(0, 16), late_response: false },
    { match_id: match.id, player_id: ids.p11, status: "uncertain", first_responded_at: timestampOffset(0, 17), last_changed_at: timestampOffset(0, 17), late_response: false },
    { match_id: match.id, player_id: ids.p4, status: "absent", first_responded_at: timestampOffset(0, 8), last_changed_at: timestampOffset(0, 8), late_response: false },
  ]);
  await supabase.from("availability").update({ can_drive: true, available_seats: 2, departure_point: "Métro Charenton-Écoles", departure_time: "19:00" }).eq("match_id", match.id).eq("player_id", ids.p3);
  await supabase.from("carpool_assignments").insert({ match_id: match.id, driver_player_id: ids.p3, passenger_player_id: ids.p9 });

  // Matériel volontairement incomplet : "Trousse de secours" reste non assignée (déclenche
  // l'alerte readiness "Personne n'apporte : Trousse de secours").
  await supabase.from("match_equipment_items").insert([
    { match_id: match.id, label: "Ballons", assigned_player_id: ids.p5, status: "confirmed" },
    { match_id: match.id, label: "Chasubles", assigned_player_id: ids.p6, status: "brought" },
    { match_id: match.id, label: "Trousse de secours", status: "unassigned" },
    { match_id: match.id, label: "Filets de but", assigned_player_id: ids.p9, status: "assigned" },
  ]);

  // Checklist du capitaine (p3), partiellement remplie — modèle d'équipe + personnel + contextuel.
  await supabase.from("checklist_templates").insert({ label: "Arriver 15 minutes avant le coup d'envoi" });
  await supabase.from("player_checklist_preferences").insert({ player_id: ids.p3, label: "Prendre les clés du local" });
  await supabase.from("match_checklist_items").insert([
    { match_id: match.id, player_id: ids.p3, label: "Arriver 15 minutes avant le coup d'envoi", source: "template", checked: true },
    { match_id: match.id, player_id: ids.p3, label: "Prendre les clés du local", source: "personal", checked: false },
    { match_id: match.id, player_id: ids.p3, label: "Être capitaine", source: "contextual", checked: true },
    { match_id: match.id, player_id: ids.p3, label: "Cotisation restante", source: "contextual", checked: false },
  ]);
  // Checklist complète pour un autre joueur du même match, pour montrer les deux états.
  await supabase.from("match_checklist_items").insert([
    { match_id: match.id, player_id: ids.p6, label: "Arriver 15 minutes avant le coup d'envoi", source: "template", checked: true },
    { match_id: match.id, player_id: ids.p6, label: "Apporter : Chasubles", source: "contextual", checked: true },
  ]);
}

async function seedRestrictions(ids) {
  await supabase.from("player_restrictions").insert([
    {
      player_id: ids.p9, starts_at: dateOffset(-10), status: "active", restriction_types: ["progressive_return"],
      visibility: "coaches", comment: "Reprise après une longue coupure, montée en charge progressive.",
      created_by_player_id: ids.coach2,
    },
    {
      player_id: ids.p10, starts_at: dateOffset(-5), status: "active", restriction_types: ["no_intense_running", "limited_play_time"],
      visibility: "team", comment: "Ménager les efforts explosifs cette semaine.", created_by_player_id: ids.coach2,
    },
    {
      player_id: ids.p11, starts_at: dateOffset(-60), ends_at: dateOffset(-20), status: "ended",
      restriction_types: ["no_goalkeeper"], visibility: "coaches",
      comment: "Contre-indication temporaire, levée depuis.", created_by_player_id: ids.coach3,
      ended_at: timestampOffset(-20, 12),
    },
  ]);
}

async function seedDemo() {
  await wipe();

  const { ids, pins } = await seedPeopleAndSeason();
  await seedVenuesAndTemplates(ids);
  await seedPastMatches(ids);
  await seedCancelledAndPostponed(ids);
  await seedFutureOpenMatches(ids);
  await seedDeadlinePassedMatch(ids);
  await seedMainScenarioMatch(ids);
  await seedRestrictions(ids);

  return { ids, pins };
}

module.exports = { seedDemo, SEED };

if (require.main === module) {
  seedDemo()
    .then((result) => {
      console.log("SEED_DEMO_OK");
      console.log(
        JSON.stringify(
          {
            pins: result.pins,
            counts: {
              players: PEOPLE.length,
              pastMatches: result.ids.pastMatches.length,
              cancelledOrPostponed: result.ids.cancelledMatches.length,
              futureOpen: Object.keys(result.ids.futureOpenMatches).length,
              deadlinePassedMatch: !!result.ids.deadlinePassedMatch,
              mainScenarioMatch: result.ids.mainScenarioMatch,
            },
          },
          null,
          2
        )
      );
    })
    .catch((e) => {
      console.error("SEED_DEMO_FAILED:", e.message);
      process.exit(1);
    });
}
