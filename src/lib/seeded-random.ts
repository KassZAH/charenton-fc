/**
 * Générateur pseudo-aléatoire déterministe (mulberry32) — jamais Math.random() pour un dataset
 * qui doit rester reproductible. Version TS de scripts/isolated-env/seeded-random.js (dupliquée
 * volontairement : ce fichier est importé par du code applicatif bundlé par Next.js, l'autre par
 * des scripts Node autonomes — deux systèmes de modules différents, pas de partage direct sûr).
 */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type SeededRandom = () => number;

export function createSeededRandom(seed: number): SeededRandom {
  return mulberry32(seed);
}

export function randInt(rng: SeededRandom, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

export function pick<T>(rng: SeededRandom, array: T[]): T {
  return array[randInt(rng, 0, array.length - 1)];
}
