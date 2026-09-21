/**
 * Port d'aléa : `core` ne doit jamais appeler `Math.random()` directement,
 * pour que le tirage des questions de diagnostic reste reproductible en test.
 */
export interface RandomSource {
  /** Nombre flottant dans [0, 1), comme Math.random(). */
  next(): number;
}

/** Pioche un élément uniformément dans `items` à l'aide d'une RandomSource. */
export function pick<T>(items: readonly T[], random: RandomSource): T {
  if (items.length === 0) {
    throw new Error("Impossible de piocher dans une liste vide");
  }
  const index = Math.floor(random.next() * items.length);
  return items[Math.min(index, items.length - 1)]!;
}

/** Mélange `items` (Fisher-Yates) à l'aide d'une RandomSource, sans muter l'entrée. */
export function shuffle<T>(items: readonly T[], random: RandomSource): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random.next() * (i + 1));
    [result[i], result[j]] = [result[j]!, result[i]!];
  }
  return result;
}
