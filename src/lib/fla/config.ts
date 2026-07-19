/**
 * Configuration FLA connue (roadmap V3, Lot 11.5, §1) — identifiants
 * contrôlés, jamais une valeur saisie côté client. Le classement officiel
 * est actuellement vide (championnat 13, saison 2) : état normal, jamais
 * traité comme une erreur.
 */
export const FLA_CONFIG = {
  provider: "fla",
  externalChampionshipId: "13",
  externalSeasonId: "2",
  internalTeamName: "CHARENTON FC",
} as const;
