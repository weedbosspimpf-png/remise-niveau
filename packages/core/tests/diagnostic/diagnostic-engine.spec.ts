import { describe, expect, it } from "vitest";
import type { Competence, Domain } from "../../src/referentiel/entities.js";
import { DiagnosticEngine } from "../../src/diagnostic/diagnostic-engine.js";
import type { RandomSource } from "../../src/ports/random-source.js";

/**
 * RandomSource déterministe pour les tests : rejoue une séquence fixe de
 * valeurs dans [0, 1), puis boucle. Évite tout Math.random() dans les specs.
 */
class SequenceRandomSource implements RandomSource {
  private index = 0;
  constructor(private readonly sequence: number[]) {}
  next(): number {
    const value = this.sequence[this.index % this.sequence.length]!;
    this.index += 1;
    return value;
  }
}

function makeCompetence(id: string, domainId: string): Competence {
  return {
    id,
    domainId,
    code: id,
    name: id,
    difficulty: 1,
    objectives: [],
  };
}

function makeDomain(id: string, subjectId = "matiere-maths"): Domain {
  return { id, subjectId, name: id, order: 0 };
}

describe("DiagnosticEngine.buildQuestionPlan", () => {
  it("couvre chaque domaine d'une matière sans excès de doublons de compétence", () => {
    const domaines = [makeDomain("nombres"), makeDomain("fractions"), makeDomain("geometrie")];
    const competencesByDomainId = new Map([
      ["nombres", [makeCompetence("n1", "nombres"), makeCompetence("n2", "nombres")]],
      ["fractions", [makeCompetence("f1", "fractions"), makeCompetence("f2", "fractions")]],
      ["geometrie", [makeCompetence("g1", "geometrie")]],
    ]);

    const engine = new DiagnosticEngine(new SequenceRandomSource([0, 0.5, 0.99, 0.1, 0.7]));
    const plan = engine.buildQuestionPlan(domaines, competencesByDomainId, {
      maxQuestionsPerDomain: 2,
    });

    const domainesCouverts = new Set(plan.map((question) => question.domainId));
    expect(domainesCouverts).toEqual(new Set(["nombres", "fractions", "geometrie"]));

    // Une compétence donnée n'est jamais planifiée deux fois dans la même session.
    const competenceIds = plan.map((question) => question.competenceId);
    expect(new Set(competenceIds).size).toBe(competenceIds.length);
  });

  it("ne propose jamais la compétence testée elle-même comme distracteur", () => {
    const domaines = [makeDomain("fractions")];
    const competencesByDomainId = new Map([
      [
        "fractions",
        [
          makeCompetence("f1", "fractions"),
          makeCompetence("f2", "fractions"),
          makeCompetence("f3", "fractions"),
        ],
      ],
    ]);

    const engine = new DiagnosticEngine(new SequenceRandomSource([0.2, 0.4, 0.6, 0.8]));
    const plan = engine.buildQuestionPlan(domaines, competencesByDomainId);

    for (const question of plan) {
      expect(question.distractorCompetenceIds).not.toContain(question.competenceId);
    }
  });

  it("ignore un domaine sans aucune compétence renseignée, sans lever d'exception", () => {
    const domaines = [makeDomain("vide"), makeDomain("nombres")];
    const competencesByDomainId = new Map([["nombres", [makeCompetence("n1", "nombres")]]]);

    const engine = new DiagnosticEngine(new SequenceRandomSource([0]));
    const plan = engine.buildQuestionPlan(domaines, competencesByDomainId);

    expect(plan).toHaveLength(1);
    expect(plan[0]!.domainId).toBe("nombres");
  });

  it("gère un domaine à compétence unique en renvoyant une liste de distracteurs vide plutôt que d'échouer", () => {
    const domaines = [makeDomain("geometrie")];
    const competencesByDomainId = new Map([["geometrie", [makeCompetence("g1", "geometrie")]]]);

    const engine = new DiagnosticEngine(new SequenceRandomSource([0]));
    const plan = engine.buildQuestionPlan(domaines, competencesByDomainId);

    expect(plan).toEqual([
      { competenceId: "g1", domainId: "geometrie", distractorCompetenceIds: [] },
    ]);
  });
});
