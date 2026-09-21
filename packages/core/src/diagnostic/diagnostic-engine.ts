import type { Competence, Domain } from "../referentiel/entities.js";
import type { RandomSource } from "../ports/random-source.js";
import { shuffle } from "../ports/random-source.js";

/**
 * Plan abstrait d'une question de diagnostic : quelle compétence est testée,
 * et quelles compétences plausibles servir comme mauvaises réponses en QCM.
 *
 * Le libellé exact (énoncé, audio, image…) n'est PAS de la responsabilité de
 * `core` : c'est un contenu pédagogique fourni par le référentiel/l'API, pas
 * de la logique métier. `core` ne décide que *quoi* tester et *avec quelles
 * alternatives*, jamais le texte affiché.
 */
export interface DiagnosticQuestionPlan {
  readonly competenceId: string;
  readonly domainId: string;
  readonly distractorCompetenceIds: readonly string[];
}

export interface DiagnosticEngineOptions {
  /** Nombre maximum de compétences testées par domaine. Par défaut 3. */
  readonly maxQuestionsPerDomain?: number;
  /** Nombre de distracteurs souhaités par question à choix multiple. Par défaut 3. */
  readonly distractorCount?: number;
}

/**
 * Construit un plan de diagnostic couvrant les domaines d'une matière.
 *
 * Limitation assumée au MVP : si un domaine ne contient qu'une seule
 * compétence, la question générée n'aura aucun distracteur (le contenu ne le
 * permet pas) — la couche de présentation doit alors basculer sur une
 * question en réponse libre plutôt que d'afficher un QCM impossible.
 */
export class DiagnosticEngine {
  constructor(private readonly random: RandomSource) {}

  buildQuestionPlan(
    domains: readonly Domain[],
    competencesByDomainId: ReadonlyMap<string, readonly Competence[]>,
    options: DiagnosticEngineOptions = {},
  ): DiagnosticQuestionPlan[] {
    const maxPerDomain = options.maxQuestionsPerDomain ?? 3;
    const distractorCount = options.distractorCount ?? 3;

    const plans: DiagnosticQuestionPlan[] = [];

    for (const domain of domains) {
      const competences = competencesByDomainId.get(domain.id) ?? [];
      if (competences.length === 0) {
        continue; // domaine sans compétence encore renseignée : rien à tester
      }

      const questionCount = Math.min(maxPerDomain, competences.length);
      const selected = shuffle(competences, this.random).slice(0, questionCount);

      for (const competence of selected) {
        const pool = competences.filter((candidate) => candidate.id !== competence.id);
        const distractors = shuffle(pool, this.random).slice(
          0,
          Math.min(distractorCount, pool.length),
        );

        plans.push({
          competenceId: competence.id,
          domainId: domain.id,
          distractorCompetenceIds: distractors.map((distractor) => distractor.id),
        });
      }
    }

    return shuffle(plans, this.random);
  }
}
