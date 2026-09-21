import type { Competence, Domain, Subject } from "../referentiel/entities.js";

/**
 * Port de lecture du référentiel. `core` définit ce dont il a besoin ;
 * `apps/api` fournit l'implémentation concrète (Prisma/PostgreSQL).
 *
 * Toute implémentation DOIT ne retourner que des données issues d'un programme
 * `VALIDATED` (voir isUsableProgram) — ce n'est pas au moteur de diagnostic de
 * refaire ce filtrage.
 */
export interface ReferentielRepository {
  listDomainsForSubject(subjectId: string): Promise<Domain[]>;
  listCompetencesForDomain(domainId: string): Promise<Competence[]>;
  getSubject(subjectId: string): Promise<Subject | null>;
}
