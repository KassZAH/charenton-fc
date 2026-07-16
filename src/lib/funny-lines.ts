export type FunnyLineInput = {
  goals: number;
  assists: number;
  matchesPlayed: number;
  yellowCards: number;
  redCards: number;
  teamMatchesPlayed: number;
};

function pick(lines: string[]): string {
  return lines[Math.floor(Math.random() * lines.length)];
}

/**
 * Une phrase taquine générée à la volée depuis les stats du joueur — jamais
 * stockée, jamais la même à chaque visite parmi les variantes du palier atteint.
 */
export function getFunnyLine(input: FunnyLineInput): string {
  const { goals, assists, matchesPlayed, yellowCards, redCards, teamMatchesPlayed } = input;

  if (teamMatchesPlayed === 0) {
    return "La saison n'a pas encore commencé — sors les crampons.";
  }

  if (matchesPlayed === 0) {
    return pick([
      "Aucun match joué cette saison. Le canapé te dit merci.",
      "0 match cette saison. On t'a aperçu sur la photo de groupe, ça compte ?",
      "Toujours pas débuté la saison. Les autres commencent à poser des questions.",
    ]);
  }

  if (redCards >= 2) {
    return pick([
      `${redCards} cartons rouges cette saison. L'arbitre a ton numéro en favori.`,
      `${redCards} rouges au compteur — un vrai abonnement à la buvette avant la fin du match.`,
    ]);
  }

  if (redCards === 1) {
    return pick([
      "Un carton rouge cette saison. Un accident de parcours, ou une habitude qui commence ?",
      "1 rouge au compteur. On efface et on passe à autre chose.",
    ]);
  }

  if (goals >= 10) {
    return pick([
      `${goals} buts cette saison. Le Ballon d'or de Charenton, c'est toi.`,
      `${goals} buts — les défenses adverses tremblent rien qu'en lisant la feuille de match.`,
    ]);
  }

  if (goals >= 5) {
    return pick([
      `${goals} buts au compteur, ça commence à sentir bon le classement des buteurs.`,
      `${goals} buts cette saison. Pas mal du tout.`,
    ]);
  }

  if (goals >= 1) {
    return pick([
      `${goals} but${goals > 1 ? "s" : ""} cette saison. On y croit, la suite arrive.`,
      `Au moins tu as marqué — ${goals} fois, c'est déjà ça de pris.`,
    ]);
  }

  if (assists >= 5) {
    return pick([
      `${assists} passes décisives. Le cerveau discret de l'équipe.`,
      `${assists} caviars distribués. Les buteurs te doivent une bière.`,
    ]);
  }

  if (yellowCards >= 3) {
    return pick([
      `${yellowCards} cartons jaunes cette saison. L'arbitre te reconnaît de loin.`,
      `${yellowCards} jaunes au compteur — un style disons... engagé.`,
    ]);
  }

  const presenceRate = teamMatchesPlayed > 0 ? matchesPlayed / teamMatchesPlayed : 0;
  if (presenceRate >= 0.9 && goals === 0 && assists === 0) {
    return pick([
      "Présent à quasiment tous les matchs, 0 but, 0 passe. Le pilier silencieux de l'équipe.",
      "Une présence de métronome. Les stats offensives suivront peut-être un jour.",
    ]);
  }

  if (goals === 0 && assists === 0) {
    return pick([
      "0 but, 0 passe déc. cette saison — mais l'ambiance du vestiaire, ça ne se mesure pas.",
      "Toujours 0 partout aux stats perso. La discrétion a du bon.",
      "Pas de but, pas de passe, mais présent. C'est déjà ça.",
    ]);
  }

  return pick([
    "Continue comme ça, la saison est encore longue.",
    "Petit à petit, la stat fait son nid.",
  ]);
}
