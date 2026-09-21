/**
 * Types partagés du moteur de diagnostic (voir cahier des charges §11-§13 et
 * docs/03-schema-donnees.md §5-§6).
 */

export type CompetenceStatus =
  "NOT_ASSESSED" | "WEAK" | "LEARNING" | "DEVELOPING" | "MASTERED" | "REQUIRES_REVIEW";

/** Réponse brute à une question de diagnostic, telle que soumise par l'utilisateur. */
export interface DiagnosticAnswer {
  readonly competenceId: string;
  readonly isCorrect: boolean;
}

/** Résultat calculé pour une compétence après un diagnostic. */
export interface CompetenceScore {
  readonly competenceId: string;
  readonly scorePct: number; // 0-100
  readonly status: CompetenceStatus;
}

/**
 * Seuils de maîtrise (§13 : "le seuil de maîtrise doit être configurable").
 * `regressionDropPct` : chute de score (en points de %) par rapport au meilleur
 * score déjà atteint qui fait basculer une compétence en REQUIRES_REVIEW plutôt
 * que de simplement refléter le nouveau score brut.
 */
export interface MasteryThresholds {
  readonly masteredMinPct: number;
  readonly developingMinPct: number;
  readonly learningMinPct: number;
  readonly regressionDropPct: number;
}

export const DEFAULT_MASTERY_THRESHOLDS: MasteryThresholds = {
  masteredMinPct: 90,
  developingMinPct: 70,
  learningMinPct: 50,
  regressionDropPct: 20,
};
