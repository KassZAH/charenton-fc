/**
 * Roadmap V3, Macro-release B (amélioration du dataset de démonstration) — générateur
 * pseudo-aléatoire déterministe (mulberry32). Toujours utilisé à la place de Math.random()
 * dans les scripts de seed : à graine fixe, produit exactement la même séquence à chaque
 * exécution, sur n'importe quelle machine.
 */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** rng() renvoie un flottant dans [0, 1) — jamais Math.random(). */
function createSeededRandom(seed) {
  return mulberry32(seed);
}

/** Entier dans [min, max] inclus. */
function randInt(rng, min, max) {
  return min + Math.floor(rng() * (max - min + 1));
}

/** Élément choisi dans un tableau non vide. */
function pick(rng, array) {
  return array[randInt(rng, 0, array.length - 1)];
}

/** Copie mélangée (Fisher-Yates) — ne mute jamais le tableau d'origine. */
function shuffle(rng, array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = randInt(rng, 0, i);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

module.exports = { createSeededRandom, randInt, pick, shuffle };
