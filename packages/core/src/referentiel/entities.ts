/**
 * Entités du référentiel pédagogique.
 *
 * Règle absolue de ce fichier (voir docs/01-stack.md §4) : aucune référence à un pays,
 * une langue ou un programme précis. Le référentiel est une structure générique
 * capable de représenter n'importe quel système éducatif.
 *
 * Hiérarchie : Country → EducationSystem → CurriculumProgram (versionné) → Level →
 * Subject → Domain → Competence → Prerequisite (arête du graphe, voir prerequisites-graph.ts).
 */

export type SourceType = "OFFICIAL" | "VERIFIED" | "SECONDARY" | "UNVERIFIED" | "OUTDATED";

export interface CurriculumSource {
  readonly id: string;
  readonly type: SourceType;
  readonly organisme: string;
  readonly url?: string;
}

export type ProgramStatus = "DRAFT" | "VALIDATED" | "ARCHIVED";

export interface Country {
  readonly id: string;
  readonly isoCode: string;
  readonly name: string;
  readonly languages: readonly string[];
}

export interface EducationSystem {
  readonly id: string;
  readonly countryId: string;
  readonly name: string;
}

/**
 * Une version datée et sourcée d'un programme scolaire. Un programme ne se modifie
 * jamais en place : une nouvelle version est créée et l'ancienne passe à ARCHIVED.
 */
export interface CurriculumProgram {
  readonly id: string;
  readonly educationSystemId: string;
  readonly schoolYear: string; // ex. "2025-2026"
  readonly versionLabel: string;
  readonly sourceId: string;
  readonly status: ProgramStatus;
  readonly validatedAt?: Date;
}

export interface Level {
  readonly id: string;
  readonly programId: string;
  readonly code: string; // ex. "6e"
  readonly order: number;
}

export interface Subject {
  readonly id: string;
  readonly levelId: string;
  readonly code: string;
  readonly name: string;
}

export interface Domain {
  readonly id: string;
  readonly subjectId: string;
  readonly name: string;
  readonly order: number;
}

export interface Competence {
  readonly id: string;
  readonly domainId: string;
  readonly code: string;
  readonly name: string;
  /** 1 (plus simple) à 5 (plus complexe). Utilisé par le moteur de diagnostic pour ordonner les questions. */
  readonly difficulty: 1 | 2 | 3 | 4 | 5;
  readonly objectives: readonly string[];
}

/** Un programme ne peut être utilisé pour évaluer ou enseigner que s'il est validé. */
export function isUsableProgram(program: CurriculumProgram): boolean {
  return program.status === "VALIDATED";
}

/**
 * Un référentiel utilisable ne peut s'appuyer que sur une source dont le statut
 * garantit une origine officielle ou vérifiée (voir docs/03-schema-donnees.md §6).
 * Les sources SECONDARY/UNVERIFIED/OUTDATED peuvent exister (traçabilité) mais ne
 * doivent jamais alimenter un diagnostic ou une leçon.
 */
export function isTrustedSource(source: CurriculumSource): boolean {
  return source.type === "OFFICIAL" || source.type === "VERIFIED";
}
