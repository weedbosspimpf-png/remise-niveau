import { describe, expect, it } from "vitest";
import {
  CyclicPrerequisiteError,
  PrerequisitesGraph,
  SelfPrerequisiteError,
  UnknownCompetenceError,
} from "../../src/referentiel/prerequisites-graph.js";

describe("PrerequisitesGraph", () => {
  it("calcule un ordre topologique valide pour une chaîne simple A <- B <- C", () => {
    // C requiert B, B requiert A : A doit être enseigné avant B, lui-même avant C.
    const graph = new PrerequisitesGraph();
    graph.addPrerequisite("B", "A");
    graph.addPrerequisite("C", "B");

    const order = graph.topologicalOrder();

    expect(order.indexOf("A")).toBeLessThan(order.indexOf("B"));
    expect(order.indexOf("B")).toBeLessThan(order.indexOf("C"));
    expect(order).toHaveLength(3);
  });

  it("rejette l'ajout d'une arête qui créerait un cycle", () => {
    const graph = new PrerequisitesGraph();
    graph.addPrerequisite("B", "A"); // A prérequis de B
    graph.addPrerequisite("C", "B"); // B prérequis de C

    // Fermer le cycle : A requiert C, alors que C dépend déjà de A via B.
    expect(() => graph.addPrerequisite("A", "C")).toThrow(CyclicPrerequisiteError);
  });

  it("rejette une compétence déclarée comme son propre prérequis", () => {
    const graph = new PrerequisitesGraph();
    expect(() => graph.addPrerequisite("equations", "equations")).toThrow(SelfPrerequisiteError);
  });

  it("retourne les prérequis directs et transitifs d'une compétence (exemple équations §14)", () => {
    const graph = new PrerequisitesGraph();
    graph.addPrerequisite("equations", "calcul-litteral");
    graph.addPrerequisite("calcul-litteral", "nombres-relatifs");
    graph.addPrerequisite("equations", "operations");

    expect(new Set(graph.getDirectPrerequisites("equations"))).toEqual(
      new Set(["calcul-litteral", "operations"]),
    );
    expect(new Set(graph.getAllPrerequisites("equations"))).toEqual(
      new Set(["calcul-litteral", "operations", "nombres-relatifs"]),
    );
  });

  it("gère une compétence sans aucun prérequis", () => {
    const graph = new PrerequisitesGraph();
    graph.addCompetence("addition");

    expect(graph.getDirectPrerequisites("addition")).toEqual([]);
    expect(graph.getAllPrerequisites("addition")).toEqual([]);
    expect(graph.topologicalOrder()).toEqual(["addition"]);
  });

  it("lève une erreur explicite pour une compétence inconnue du graphe", () => {
    const graph = new PrerequisitesGraph();
    expect(() => graph.getDirectPrerequisites("inconnue")).toThrow(UnknownCompetenceError);
  });
});
