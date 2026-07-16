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
 * Une vanne générée à la volée depuis les stats du joueur — jamais stockée,
 * jamais la même à chaque visite parmi les variantes du palier atteint.
 * Ton chambrage/vestiaire assumé, jamais méchant.
 */
export function getFunnyLine(input: FunnyLineInput): string {
  const { goals, assists, matchesPlayed, yellowCards, redCards, teamMatchesPlayed } = input;

  if (teamMatchesPlayed === 0) {
    return pick([
      "La saison n'a pas encore commencé — range le trash-talk pour plus tard, ou pas.",
      "Aucun match encore joué. Le temps de bien préparer tes excuses pour la suite.",
    ]);
  }

  if (matchesPlayed === 0) {
    return pick([
      "0 match cette saison. Ton canapé a un meilleur taux de présence que toi.",
      "T'existes en vrai ou juste sur la photo de groupe ?",
      "Toujours pas vu sur le terrain. On a vérifié, t'es bien inscrit dans l'effectif.",
      "0 apparition cette saison. Même le kiné te connaît pas.",
    ]);
  }

  if (redCards >= 2) {
    return pick([
      `${redCards} cartons rouges cette saison. L'arbitre a ton portrait dans son portefeuille.`,
      `${redCards} rouges au compteur. Tu joues au foot ou tu règles des comptes ?`,
      `${redCards} expulsions. La buvette te connaît mieux que la pelouse.`,
    ]);
  }

  if (redCards === 1) {
    return pick([
      "1 carton rouge cette saison. Petit accident de parcours... ou avant-goût ?",
      "1 rouge au compteur. On dira que c'était un cadeau pour l'arbitre.",
      "1 expulsion cette saison. Les copains n'ont pas encore fini d'en rire.",
    ]);
  }

  if (goals >= 10) {
    return pick([
      `${goals} buts cette saison. Prépare le discours pour le Ballon d'or de Charenton.`,
      `${goals} buts. Les défenses adverses préviennent leurs familles avant de te croiser.`,
      `${goals} buts au compteur — à ce niveau, autant vendre des autographes après le match.`,
    ]);
  }

  if (goals >= 5) {
    return pick([
      `${goals} buts. Tu commences à faire de l'ombre aux vrais attaquants de l'équipe.`,
      `${goals} buts cette saison. Les défenses notent ton nom sur leur carnet, doucement.`,
      `${goals} buts au compteur. Pas mal, pour quelqu'un qui rate encore les passements de jambe.`,
    ]);
  }

  if (goals >= 1) {
    return pick([
      `${goals} but${goals > 1 ? "s" : ""} cette saison. Petit, mais on l'a vu, promis.`,
      `${goals} but${goals > 1 ? "s" : ""} au compteur. On applaudit, discrètement, sans se lever.`,
      `Au moins tu as marqué — ${goals} fois. Ça fait toujours ${goals} de plus que certains.`,
    ]);
  }

  if (assists >= 5) {
    return pick([
      `${assists} passes déc. Le cerveau de l'équipe, celui qu'on félicite jamais assez.`,
      `${assists} caviars distribués. Les buteurs te doivent une tournée entière, pas juste une bière.`,
      `${assists} passes décisives. Tu fais le travail, les autres prennent les photos.`,
    ]);
  }

  if (yellowCards >= 3) {
    return pick([
      `${yellowCards} cartons jaunes cette saison. L'arbitre te tutoie déjà.`,
      `${yellowCards} jaunes au compteur. Un style de jeu qu'on qualifiera d'« engagé ».`,
      `${yellowCards} avertissements cette saison. Encore un et on t'appelle boucher officieux du club.`,
    ]);
  }

  const presenceRate = teamMatchesPlayed > 0 ? matchesPlayed / teamMatchesPlayed : 0;
  if (presenceRate >= 0.9 && goals === 0 && assists === 0) {
    return pick([
      "Présent à quasiment tous les matchs, 0 but, 0 passe. Le meuble du vestiaire, increvable.",
      "T'as jamais manqué un match, mais t'as jamais touché un but non plus. Constance admirable.",
      "Présence parfaite, stats offensives à zéro. Au moins t'es fiable pour compter les maillots.",
    ]);
  }

  if (goals === 0 && assists === 0) {
    return pick([
      "0 but, 0 passe déc. cette saison. Mais l'ambiance du vestiaire, ça ne se mesure pas — heureusement pour toi.",
      "Toujours 0 partout aux stats perso. On va dire que c'est du style, pas du niveau.",
      "0-0 côté stats. Une reconversion coach est peut-être à envisager sérieusement.",
      "Pas de but, pas de passe, mais présent. On garde le positif, difficilement.",
    ]);
  }

  return pick([
    "Ni exceptionnel, ni ridicule. Le juste milieu, celui dont personne ne parle au bar.",
    "Ça avance. Doucement. Très doucement.",
    "Des stats correctes, sans plus. On te met ni sur l'affiche, ni sur le banc.",
  ]);
}
