import { describe, expect, it } from "vitest";
import {
  computeCompetenceScores,
  mergeCompetenceMap,
  statusFromScore,
} from "../../src/diagnostic/competence-map.js";
import type { CompetenceScore, DiagnosticAnswer } from "../../src/diagnostic/types.js";

describe("statusFromScore", () => {
  it.each([
    [95, "MASTERED"],
    [90, "MASTERED"],
    [89, "DEVELOPING"],
    [71, "DEVELOPING"],
    [70, "DEVELOPING"],
    [62, "LEARNING"],
    [50, "LEARNING"],
    [49, "WEAK"],
    [0, "WEAK"],
  ] as const)("un score de %i%% donne le statut %s (seuils par défaut)", (score, expected) => {
    expect(statusFromScore(score)).toBe(expected);
  });

  it("respecte des seuils personnalisés (§13 : seuil configurable)", () => {
    const seuilsStricts = {
      masteredMinPct: 95,
      developingMinPct: 80,
      learningMinPct: 60,
      regressionDropPct: 20,
    };
    expect(statusFromScore(92, seuilsStricts)).toBe("DEVELOPING");
    expect(statusFromScore(96, seuilsStricts)).toBe("MASTERED");
  });
});

describe("computeCompetenceScores", () => {
  it("calcule le pourcentage de réussite par compétence à partir de réponses brutes", () => {
    const answers: DiagnosticAnswer[] = [
      { competenceId: "fractions", isCorrect: true },
      { competenceId: "fractions", isCorrect: false },
      { competenceId: "fractions", isCorrect: false },
      { competenceId: "geometrie", isCorrect: true },
      { competenceId: "geometrie", isCorrect: true },
    ];

    const scores = computeCompetenceScores(answers);
    const parCompetence = new Map(scores.map((s) => [s.competenceId, s]));

    expect(parCompetence.get("fractions")).toEqual({
      competenceId: "fractions",
      scorePct: 33,
      status: "WEAK",
    });
    expect(parCompetence.get("geometrie")).toEqual({
      competenceId: "geometrie",
      scorePct: 100,
      status: "MASTERED",
    });
  });

  it("ne produit aucun score pour une liste de réponses vide (session abandonnée, §11)", () => {
    expect(computeCompetenceScores([])).toEqual([]);
  });
});

describe("mergeCompetenceMap", () => {
  it("ne modifie pas les compétences non testées lors de cette fusion", () => {
    const existant = new Map<string, CompetenceScore>([
      ["fractions", { competenceId: "fractions", scorePct: 62, status: "LEARNING" }],
      ["geometrie", { competenceId: "geometrie", scorePct: 87, status: "DEVELOPING" }],
    ]);

    const fusion = mergeCompetenceMap(existant, [
      { competenceId: "fractions", scorePct: 95, status: "MASTERED" },
    ]);

    expect(fusion.get("fractions")).toEqual({
      competenceId: "fractions",
      scorePct: 95,
      status: "MASTERED",
    });
    // "geometrie" n'a pas été retesté : elle reste strictement inchangée.
    expect(fusion.get("geometrie")).toEqual(existant.get("geometrie"));
  });

  it("fait basculer une compétence de MASTERED à REQUIRES_REVIEW en cas de régression significative", () => {
    const existant = new Map<string, CompetenceScore>([
      ["fa", { competenceId: "fa", scorePct: 95, status: "MASTERED" }],
    ]);

    const fusion = mergeCompetenceMap(existant, [
      { competenceId: "fa", scorePct: 60, status: "LEARNING" },
    ]);

    expect(fusion.get("fa")).toEqual({
      competenceId: "fa",
      scorePct: 60,
      status: "REQUIRES_REVIEW",
    });
  });

  it("ne déclenche pas REQUIRES_REVIEW pour une légère baisse sous le seuil de régression", () => {
    const existant = new Map<string, CompetenceScore>([
      ["fa", { competenceId: "fa", scorePct: 95, status: "MASTERED" }],
    ]);

    // Chute de 10 points, seuil de régression par défaut = 20 : reste MASTERED.
    const fusion = mergeCompetenceMap(existant, [
      { competenceId: "fa", scorePct: 85, status: "DEVELOPING" },
    ]);

    expect(fusion.get("fa")).toEqual({ competenceId: "fa", scorePct: 85, status: "DEVELOPING" });
  });

  it("ajoute une compétence jamais évaluée auparavant", () => {
    const fusion = mergeCompetenceMap(new Map(), [
      { competenceId: "nouvelle", scorePct: 40, status: "WEAK" },
    ]);
    expect(fusion.get("nouvelle")).toEqual({
      competenceId: "nouvelle",
      scorePct: 40,
      status: "WEAK",
    });
  });
});
