import {
  DEFAULT_MASTERY_THRESHOLDS,
  type CompetenceScore,
  type CompetenceStatus,
  type DiagnosticAnswer,
  type MasteryThresholds,
} from "./types.js";

/** Statut dérivé d'un score brut, sans tenir compte de l'historique (voir mergeCompetenceMap pour REQUIRES_REVIEW). */
export function statusFromScore(
  scorePct: number,
  thresholds: MasteryThresholds = DEFAULT_MASTERY_THRESHOLDS,
): Exclude<CompetenceStatus, "NOT_ASSESSED" | "REQUIRES_REVIEW"> {
  if (scorePct >= thresholds.masteredMinPct) return "MASTERED";
  if (scorePct >= thresholds.developingMinPct) return "DEVELOPING";
  if (scorePct >= thresholds.learningMinPct) return "LEARNING";
  return "WEAK";
}

/**
 * Agrège des réponses brutes en un score par compétence (§11 : "calculer la
 * précision"). Une compétence sans aucune réponse n'apparaît pas dans le
 * résultat (elle reste NOT_ASSESSED, géré par mergeCompetenceMap).
 */
export function computeCompetenceScores(
  answers: readonly DiagnosticAnswer[],
  thresholds: MasteryThresholds = DEFAULT_MASTERY_THRESHOLDS,
): CompetenceScore[] {
  const byCompetence = new Map<string, { correct: number; total: number }>();

  for (const answer of answers) {
    const bucket = byCompetence.get(answer.competenceId) ?? { correct: 0, total: 0 };
    bucket.total += 1;
    if (answer.isCorrect) bucket.correct += 1;
    byCompetence.set(answer.competenceId, bucket);
  }

  const scores: CompetenceScore[] = [];
  for (const [competenceId, { correct, total }] of byCompetence) {
    const scorePct = Math.round((correct / total) * 100);
    scores.push({ competenceId, scorePct, status: statusFromScore(scorePct, thresholds) });
  }
  return scores;
}

/**
 * Fusionne un nouveau résultat de diagnostic dans une carte de compétences
 * existante (§13). Règles :
 *  - une compétence non testée cette fois-ci conserve son statut précédent ;
 *  - une régression significative depuis MASTERED déclenche REQUIRES_REVIEW
 *    plutôt que le simple statut recalculé (§13 : statut "REQUIRES_REVIEW").
 */
export function mergeCompetenceMap(
  existing: ReadonlyMap<string, CompetenceScore>,
  newScores: readonly CompetenceScore[],
  thresholds: MasteryThresholds = DEFAULT_MASTERY_THRESHOLDS,
): Map<string, CompetenceScore> {
  const merged = new Map(existing);

  for (const newScore of newScores) {
    const previous = existing.get(newScore.competenceId);

    if (previous?.status === "MASTERED" && newScore.status !== "MASTERED") {
      const drop = previous.scorePct - newScore.scorePct;
      if (drop >= thresholds.regressionDropPct) {
        merged.set(newScore.competenceId, {
          competenceId: newScore.competenceId,
          scorePct: newScore.scorePct,
          status: "REQUIRES_REVIEW",
        });
        continue;
      }
    }

    merged.set(newScore.competenceId, newScore);
  }

  return merged;
}
