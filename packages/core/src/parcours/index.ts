/**
 * Moteur de parcours adaptatif (§15 du cahier des charges — section tronquée
 * dans la demande initiale). Non implémenté au MVP : seule l'interface est
 * posée pour que `apps/api` puisse être écrit contre un contrat stable sans
 * bloquer l'extensibilité future (introduction de nouvelles compétences,
 * révision, dosage faiblesses/consolidation).
 */
import type { Competence } from "../referentiel/entities.js";

export interface PathEngine {
  /** Prochaines compétences à travailler pour un utilisateur donné, dans l'ordre. */
  nextCompetences(userId: string): Promise<Competence[]>;
}
