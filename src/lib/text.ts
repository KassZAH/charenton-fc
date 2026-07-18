/** Insensible à la casse et aux accents — pour une recherche joueur tolérante ("etienne" trouve "Étienne"). */
export function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}
