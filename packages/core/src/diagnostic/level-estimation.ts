/**
 * Distinction niveau déclaré / niveau estimé (§12).
 *
 * Limitation assumée au MVP : l'estimation part d'un score de maîtrise déjà
 * agrégé par niveau (calculé en amont, hors de `core`, à partir des scores de
 * compétences d'un diagnostic couvrant plusieurs niveaux). La génération
 * automatique d'un diagnostic multi-niveaux ("placement test") n'est pas
 * implémentée au MVP — seul le diagnostic à un niveau donné l'est
 * (`DiagnosticEngine.buildQuestionPlan`).
 */
export interface LevelMasteryInput {
  readonly levelId: string;
  /** Ordre croissant = niveau scolaire plus avancé. */
  readonly order: number;
  readonly masteryPct: number; // 0-100
}

/**
 * Retourne le niveau réellement maîtrisé : le plus avancé parmi une chaîne
 * ininterrompue de niveaux maîtrisés en partant du plus bas testé.
 *
 * Exemple (§12) : Mathématiques testées de 5e à 3e, maîtrise 5e=92%, 4e=55%,
 * 3e=90%, seuil=70 → niveau estimé = 5e : la chaîne s'arrête dès le premier
 * niveau sous le seuil (4e), la réussite en 3e ne compense pas une lacune en 4e.
 */
export function estimateSubjectLevel(
  levels: readonly LevelMasteryInput[],
  masteryThresholdPct = 70,
): string | null {
  if (levels.length === 0) return null;

  const sorted = [...levels].sort((a, b) => a.order - b.order);
  let estimatedLevelId = sorted[0]!.levelId;

  for (const level of sorted) {
    if (level.masteryPct < masteryThresholdPct) break;
    estimatedLevelId = level.levelId;
  }

  return estimatedLevelId;
}
