import type { Competence, Domain, ReferentielRepository, Subject } from "@edu-restart/core";
import type { PrismaClient } from "@prisma/client";

/**
 * Implémentation Prisma du port `ReferentielRepository` de `core`.
 *
 * Ne filtre volontairement que sur des données rattachées à un programme
 * `VALIDATED` (§6) : un diagnostic ne doit jamais s'appuyer sur un programme
 * encore à l'état DRAFT ou déjà ARCHIVED.
 */
export class PrismaReferentielRepository implements ReferentielRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async getSubject(subjectId: string): Promise<Subject | null> {
    const subject = await this.prisma.subject.findFirst({
      where: { id: subjectId, level: { program: { status: "VALIDATED" } } },
    });
    if (!subject) return null;
    return { id: subject.id, levelId: subject.levelId, code: subject.code, name: subject.name };
  }

  async listDomainsForSubject(subjectId: string): Promise<Domain[]> {
    const domains = await this.prisma.domain.findMany({
      where: { subjectId, subject: { level: { program: { status: "VALIDATED" } } } },
      orderBy: { order: "asc" },
    });
    return domains.map((domain) => ({
      id: domain.id,
      subjectId: domain.subjectId,
      name: domain.name,
      order: domain.order,
    }));
  }

  async listCompetencesForDomain(domainId: string): Promise<Competence[]> {
    const competences = await this.prisma.competence.findMany({
      where: { domainId, domain: { subject: { level: { program: { status: "VALIDATED" } } } } },
    });
    return competences.map((competence) => ({
      id: competence.id,
      domainId: competence.domainId,
      code: competence.code,
      name: competence.name,
      difficulty: competence.difficulty as Competence["difficulty"],
      objectives: competence.objectives,
    }));
  }
}
