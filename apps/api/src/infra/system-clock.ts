import type { Clock } from "@edu-restart/core";

/** Implémentation système du port Clock de `core`. */
export const systemClock: Clock = {
  now: () => new Date(),
};
