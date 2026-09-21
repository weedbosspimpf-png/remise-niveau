import { describe, expect, it } from "vitest";
import { estimateSubjectLevel } from "../../src/diagnostic/level-estimation.js";

describe("estimateSubjectLevel", () => {
  it("estime un niveau inférieur au niveau déclaré quand une lacune est détectée (§12, exemple Mathématiques)", () => {
    // Niveau déclaré : 3e. Diagnostic couvrant 5e, 4e, 3e.
    const niveauEstime = estimateSubjectLevel([
      { levelId: "5e", order: 1, masteryPct: 92 },
      { levelId: "4e", order: 2, masteryPct: 55 }, // lacune détectée en 4e
      { levelId: "3e", order: 3, masteryPct: 90 },
    ]);

    // La réussite en 3e ne compense pas la lacune en 4e : la chaîne s'arrête en 5e.
    expect(niveauEstime).toBe("5e");
  });

  it("estime un niveau égal ou proche du niveau déclaré quand tout est maîtrisé (§12, exemple Français)", () => {
    const niveauEstime = estimateSubjectLevel([
      { levelId: "4e", order: 1, masteryPct: 91 },
      { levelId: "3e", order: 2, masteryPct: 88 },
    ]);

    expect(niveauEstime).toBe("3e");
  });

  it("retourne le niveau le plus bas testé si même celui-ci n'est pas maîtrisé", () => {
    const niveauEstime = estimateSubjectLevel([
      { levelId: "5e", order: 1, masteryPct: 30 },
      { levelId: "4e", order: 2, masteryPct: 20 },
    ]);

    expect(niveauEstime).toBe("5e");
  });

  it("respecte un seuil de maîtrise personnalisé", () => {
    const niveaux = [
      { levelId: "5e", order: 1, masteryPct: 65 },
      { levelId: "4e", order: 2, masteryPct: 65 },
    ];

    expect(estimateSubjectLevel(niveaux, 70)).toBe("5e"); // 65% < 70%: la chaîne s'arrête en 5e
    expect(estimateSubjectLevel(niveaux, 60)).toBe("4e"); // 65% >= 60%: les deux niveaux sont validés
  });

  it("retourne null si aucun niveau n'a été testé", () => {
    expect(estimateSubjectLevel([])).toBeNull();
  });

  it("fonctionne indépendamment de l'ordre de la liste fournie", () => {
    const dansLeDesordre = estimateSubjectLevel([
      { levelId: "3e", order: 3, masteryPct: 90 },
      { levelId: "5e", order: 1, masteryPct: 92 },
      { levelId: "4e", order: 2, masteryPct: 55 },
    ]);

    expect(dansLeDesordre).toBe("5e");
  });
});
