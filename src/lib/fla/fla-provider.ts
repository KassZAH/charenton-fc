import "server-only";
import * as cheerio from "cheerio";
import { normalizeTeamName } from "./normalize";
import type { LeagueStandingsProvider, StandingRow, FetchStandingsResult, CompetitionMetadata } from "./types";

/**
 * FlaStandingsProvider (roadmap V3, Lot 11.5) — implémentation
 * LeagueStandingsProvider pour la FLA (Football Loisir Amateur),
 * autorisation obtenue par le propriétaire du club (voir
 * docs/fla-integration.md). Parsing HTML côté serveur exclusivement, aucune
 * API/endpoint JSON n'existant sur le site source (audit documenté).
 *
 * Sécurité (obligatoire, jamais assouplie) :
 * - domaine strictement limité à ALLOWED_HOST ;
 * - URL construite uniquement depuis des identifiants contrôlés (jamais une
 *   URL libre reçue du navigateur) ;
 * - redirections refusées (mode "manual", aucune suivie, même même domaine) ;
 * - timeout court ;
 * - taille de réponse plafonnée (lecture en flux, arrêt au dépassement) ;
 * - pas de navigateur automatisé (fetch HTTP simple uniquement) ;
 * - aucun contenu brut journalisé.
 */

const ALLOWED_HOST = "football-loisir-amateur.fr";
const FETCH_TIMEOUT_MS = 8000;
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024; // 2 Mo — une page de classement ne dépasse jamais ~200 Ko en pratique.
const EMPTY_MARKER_TEXT = "Aucune équipe dans ce championnat pour cette saison";

function buildSourceUrl(championshipId: string, seasonId: string): string {
  // Identifiants toujours passés par un appelant contrôlé (jamais une chaîne arbitraire du client) —
  // encodeURIComponent par défense en profondeur supplémentaire, jamais une concaténation de confiance seule.
  const url = `https://${ALLOWED_HOST}/championships/${encodeURIComponent(championshipId)}/rankings?season=${encodeURIComponent(seasonId)}`;
  const parsed = new URL(url);
  if (parsed.hostname !== ALLOWED_HOST) {
    // Ne devrait jamais se produire vu la construction ci-dessus — filet de sécurité explicite.
    throw new Error("URL construite hors du domaine autorisé — refusé.");
  }
  return url;
}

/** Lit la réponse en flux, s'arrête et refuse si la taille dépasse la limite — jamais un body illimité en mémoire. */
async function readBodyWithSizeLimit(response: Response): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) return response.text();

  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_RESPONSE_BYTES) {
      await reader.cancel();
      throw new Error(`Réponse trop volumineuse (> ${MAX_RESPONSE_BYTES} octets) — refusée.`);
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks.map((c) => Buffer.from(c))).toString("utf8");
}

async function fetchRankingsHtml(url: string): Promise<string> {
  const parsed = new URL(url);
  if (parsed.hostname !== ALLOWED_HOST) {
    throw new Error("Domaine non autorisé — refusé avant toute requête.");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: "manual", // Aucune redirection suivie, même vers le même domaine — voir audit (aucune redirection observée en conditions normales).
      headers: { "User-Agent": "CharentonFC-Sync/1.0 (+https://charenton-fc.vercel.app)" },
    });

    if (response.type === "opaqueredirect" || (response.status >= 300 && response.status < 400)) {
      throw new Error("Redirection refusée — la source ne doit jamais rediriger vers une autre page/domaine.");
    }
    if (!response.ok) {
      throw new Error(`Réponse HTTP ${response.status}`);
    }
    return await readBodyWithSizeLimit(response);
  } finally {
    clearTimeout(timeoutId);
  }
}

/** Analyse un <td> de statistique : "-" => null (information absente), sinon un entier. Jamais 0 par défaut. */
function parseStatCell(text: string): number | null {
  const trimmed = text.trim();
  if (trimmed === "" || trimmed === "-") return null;
  const n = Number(trimmed.replace(/^\+/, ""));
  return Number.isFinite(n) ? n : null;
}

function parseRankingsHtml(html: string): { standings: StandingRow[] | null; isEmpty: boolean; competitionName: string | null } {
  const $ = cheerio.load(html);

  const title = $("title").first().text().trim();
  // "Classement - Foot à 11 - Week-end - 2ème division" -> "Foot à 11 - Week-end - 2ème division"
  const competitionName = title.replace(/^Classement\s*-\s*/i, "").trim() || null;

  const bodyText = $("tbody").first().text();
  if (bodyText.includes(EMPTY_MARKER_TEXT)) {
    return { standings: null, isEmpty: true, competitionName };
  }

  const rows: StandingRow[] = [];
  $("tbody tr[data-team-name]").each((_, el) => {
    const $row = $(el);
    const teamName = $row.attr("data-team-name")?.trim() || $row.find("td").eq(1).find("a").first().text().trim();
    if (!teamName) return;

    const cells = $row.find("td");
    // Ordre exact vérifié en direct sur le site (docs/fla-integration.md) :
    // Position, Équipe, Points, Pénalité, J, G, N, P, BP, BC, Diff, Forf.
    const positionText = cells.eq(0).find("span").last().text().trim();
    const teamHref = $row.find("td").eq(1).find("a").first().attr("href") ?? null;
    const externalTeamId = teamHref ? (teamHref.match(/\/teams\/(\w+)/)?.[1] ?? null) : null;

    rows.push({
      externalTeamId,
      teamName,
      normalizedTeamName: normalizeTeamName(teamName),
      position: parseStatCell(positionText),
      points: parseStatCell(cells.eq(2).text()),
      // Pénalité (cells.eq(3)) volontairement non conservée — hors du modèle de données demandé.
      played: parseStatCell(cells.eq(4).text()),
      wins: parseStatCell(cells.eq(5).text()),
      draws: parseStatCell(cells.eq(6).text()),
      losses: parseStatCell(cells.eq(7).text()),
      goalsFor: parseStatCell(cells.eq(8).text()),
      goalsAgainst: parseStatCell(cells.eq(9).text()),
      goalDifference: parseStatCell(cells.eq(10).text()),
    } as StandingRow);
  });

  return { standings: rows, isEmpty: rows.length === 0, competitionName };
}

async function fetchCompetitionMetadata(championshipId: string, seasonId: string): Promise<CompetitionMetadata> {
  const html = await fetchRankingsHtml(buildSourceUrl(championshipId, seasonId));
  const { competitionName } = parseRankingsHtml(html);
  return { competitionName };
}

async function fetchStandings(championshipId: string, seasonId: string): Promise<FetchStandingsResult> {
  let html: string;
  try {
    html = await fetchRankingsHtml(buildSourceUrl(championshipId, seasonId));
  } catch (e) {
    // Jamais le contenu brut dans le message — uniquement une description technique courte.
    return { status: "unavailable", errorMessage: e instanceof Error ? e.message : "Erreur réseau inconnue." };
  }

  let parsed: ReturnType<typeof parseRankingsHtml>;
  try {
    parsed = parseRankingsHtml(html);
  } catch (e) {
    return { status: "invalid_payload", errorMessage: e instanceof Error ? e.message : "Réponse HTML inattendue." };
  }

  const metadata: CompetitionMetadata = { competitionName: parsed.competitionName };

  if (parsed.isEmpty || parsed.standings === null) {
    return { status: "empty", metadata };
  }
  // goal_difference recalculé côté application uniquement si absent — jamais fabriqué si les deux termes manquent.
  const standings = parsed.standings.map((row) => ({
    ...row,
    goalDifference:
      row.goalDifference ?? (row.goalsFor !== null && row.goalsAgainst !== null ? row.goalsFor - row.goalsAgainst : null),
  }));
  return { status: "success", standings, metadata };
}

export const FlaStandingsProvider: LeagueStandingsProvider = {
  provider: "fla",
  buildSourceUrl,
  fetchCompetitionMetadata,
  fetchStandings,
};
