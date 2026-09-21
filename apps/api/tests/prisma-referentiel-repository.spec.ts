import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "../src/infra/prisma-client.js";
import { PrismaReferentielRepository } from "../src/infra/prisma-referentiel-repository.js";
import { getSeededMathSubject } from "./fixtures.js";

describe("PrismaReferentielRepository (intégration, base réelle)", () => {
  const repository = new PrismaReferentielRepository(prisma);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("retourne la matière semée si son programme est VALIDATED", async () => {
    const { subject } = await getSeededMathSubject();
    const found = await repository.getSubject(subject.id);
    expect(found?.name).toBe("Mathématiques");
  });

  it("retourne null pour une matière inconnue", async () => {
    const found = await repository.getSubject("id-inexistant");
    expect(found).toBeNull();
  });

  it("liste les domaines d'une matière, triés par ordre", async () => {
    const { subject } = await getSeededMathSubject();
    const domains = await repository.listDomainsForSubject(subject.id);

    expect(domains.map((d) => d.name)).toEqual(["Nombres", "Calculs algébriques"]);
  });

  it("liste les compétences d'un domaine", async () => {
    const { subject } = await getSeededMathSubject();
    const domains = await repository.listDomainsForSubject(subject.id);
    const calculs = domains.find((d) => d.name === "Calculs algébriques")!;

    const competences = await repository.listCompetencesForDomain(calculs.id);
    expect(new Set(competences.map((c) => c.code))).toEqual(new Set(["FRACTIONS", "OPERATIONS"]));
  });
});
