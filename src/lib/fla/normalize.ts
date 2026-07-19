/**
 * Normalisation prudente d'un nom d'équipe (roadmap V3, Lot 11.5), utilisée
 * à la fois pour stocker `normalized_team_name`/`normalized_app_opponent_name`
 * et pour comparer un adversaire de l'app à une équipe du classement externe.
 * Volontairement conservatrice : minuscules, accents neutralisés, ponctuation
 * neutralisée, espaces multiples réduits — jamais de résolution de synonymes
 * ou d'abréviations, qui produirait de faux positifs.
 */
export function normalizeTeamName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // accents
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ") // ponctuation -> espace
    .replace(/\s+/g, " ")
    .trim();
}
