/**
 * Graphe de prérequis entre compétences (voir docs/03-schema-donnees.md §2 et
 * cahier des charges §14).
 *
 * Une arête `requiresCompetenceId -> competenceId` signifie : "competenceId ne
 * peut être considérée acquise que si requiresCompetenceId l'est aussi" —
 * autrement dit requiresCompetenceId doit être enseignée/évaluée avant.
 *
 * Le graphe interdit toute création de cycle au moment de l'ajout d'une arête :
 * un cycle rendrait l'ordre d'enseignement incalculable.
 */

export class SelfPrerequisiteError extends Error {
  constructor(competenceId: string) {
    super(`Une compétence ne peut pas être son propre prérequis: ${competenceId}`);
    this.name = "SelfPrerequisiteError";
  }
}

export class CyclicPrerequisiteError extends Error {
  constructor(competenceId: string, requiresCompetenceId: string) {
    super(
      `Ajouter "${requiresCompetenceId}" comme prérequis de "${competenceId}" créerait un cycle`,
    );
    this.name = "CyclicPrerequisiteError";
  }
}

export class UnknownCompetenceError extends Error {
  constructor(competenceId: string) {
    super(`Compétence inconnue du graphe: ${competenceId}`);
    this.name = "UnknownCompetenceError";
  }
}

export class PrerequisitesGraph {
  /** Ensemble de toutes les compétences déclarées dans le graphe. */
  private readonly nodes = new Set<string>();
  /** prerequisiteId -> ensemble des compétences qui le requièrent directement. */
  private readonly forward = new Map<string, Set<string>>();
  /** competenceId -> ensemble de ses prérequis directs. */
  private readonly backward = new Map<string, Set<string>>();

  addCompetence(competenceId: string): void {
    if (!this.nodes.has(competenceId)) {
      this.nodes.add(competenceId);
      this.forward.set(competenceId, new Set());
      this.backward.set(competenceId, new Set());
    }
  }

  hasCompetence(competenceId: string): boolean {
    return this.nodes.has(competenceId);
  }

  /**
   * Déclare que `requiresCompetenceId` est un prérequis direct de `competenceId`.
   * Ajoute automatiquement les deux compétences au graphe si elles n'y sont pas déjà.
   *
   * @throws {SelfPrerequisiteError} si les deux identifiants sont identiques.
   * @throws {CyclicPrerequisiteError} si l'arête créerait un cycle.
   */
  addPrerequisite(competenceId: string, requiresCompetenceId: string): void {
    if (competenceId === requiresCompetenceId) {
      throw new SelfPrerequisiteError(competenceId);
    }

    this.addCompetence(competenceId);
    this.addCompetence(requiresCompetenceId);

    // Un cycle apparaîtrait si `requiresCompetenceId` dépend déjà,
    // directement ou transitivement, de `competenceId` — auquel cas en faire
    // aussi un prérequis de `competenceId` boucle.
    if (this.hasPath(competenceId, requiresCompetenceId)) {
      throw new CyclicPrerequisiteError(competenceId, requiresCompetenceId);
    }

    this.forward.get(requiresCompetenceId)!.add(competenceId);
    this.backward.get(competenceId)!.add(requiresCompetenceId);
  }

  /**
   * Existe-t-il déjà un chemin de `fromId` vers `toId` en suivant les arêtes
   * "doit être appris avant" (forward, de prérequis vers dépendant) ?
   * Utilisé pour détecter un cycle avant d'ajouter l'arête inverse.
   */
  private hasPath(fromId: string, toId: string): boolean {
    if (!this.nodes.has(fromId) || !this.nodes.has(toId)) {
      return false;
    }
    const visited = new Set<string>();
    const stack = [fromId];
    while (stack.length > 0) {
      const current = stack.pop()!;
      if (current === toId) return true;
      if (visited.has(current)) continue;
      visited.add(current);
      for (const dependent of this.forward.get(current) ?? []) {
        stack.push(dependent);
      }
    }
    return false;
  }

  /** Prérequis directs d'une compétence (ordre non garanti). */
  getDirectPrerequisites(competenceId: string): string[] {
    this.assertKnown(competenceId);
    return Array.from(this.backward.get(competenceId) ?? []);
  }

  /** Compétences qui requièrent directement `competenceId`. */
  getDirectDependents(competenceId: string): string[] {
    this.assertKnown(competenceId);
    return Array.from(this.forward.get(competenceId) ?? []);
  }

  /** Prérequis directs et transitifs d'une compétence, sans doublon. */
  getAllPrerequisites(competenceId: string): string[] {
    this.assertKnown(competenceId);
    const visited = new Set<string>();
    const stack = [...(this.backward.get(competenceId) ?? [])];
    while (stack.length > 0) {
      const current = stack.pop()!;
      if (visited.has(current)) continue;
      visited.add(current);
      for (const prereq of this.backward.get(current) ?? []) {
        stack.push(prereq);
      }
    }
    return Array.from(visited);
  }

  /**
   * Ordre topologique de toutes les compétences du graphe (tri de Kahn) :
   * chaque compétence apparaît après tous ses prérequis directs et transitifs.
   * L'ordre entre compétences indépendantes n'est pas garanti mais est stable
   * (ordre d'insertion des nœuds prêts).
   */
  topologicalOrder(): string[] {
    const inDegree = new Map<string, number>();
    for (const node of this.nodes) {
      inDegree.set(node, this.backward.get(node)!.size);
    }

    const ready: string[] = Array.from(this.nodes).filter((n) => inDegree.get(n) === 0);
    const result: string[] = [];

    while (ready.length > 0) {
      const node = ready.shift()!;
      result.push(node);
      for (const dependent of this.forward.get(node) ?? []) {
        const remaining = inDegree.get(dependent)! - 1;
        inDegree.set(dependent, remaining);
        if (remaining === 0) {
          ready.push(dependent);
        }
      }
    }

    // Ne peut arriver si addPrerequisite a correctement empêché les cycles,
    // mais reste une garde utile si le graphe est construit autrement (import en masse).
    if (result.length !== this.nodes.size) {
      throw new Error("Le graphe de prérequis contient un cycle non détecté à l'insertion");
    }

    return result;
  }

  private assertKnown(competenceId: string): void {
    if (!this.nodes.has(competenceId)) {
      throw new UnknownCompetenceError(competenceId);
    }
  }
}
