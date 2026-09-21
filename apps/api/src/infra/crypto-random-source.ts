import { randomInt } from "node:crypto";
import type { RandomSource } from "@edu-restart/core";

const PRECISION = 1_000_000;

/**
 * Implémentation système du port RandomSource de `core`, adossée à
 * `crypto.randomInt` (plutôt que `Math.random`) pour un tirage de meilleure
 * qualité — notamment pour le choix des distracteurs de diagnostic.
 */
export const cryptoRandomSource: RandomSource = {
  next: () => randomInt(0, PRECISION) / PRECISION,
};
