import { prisma } from "../src/infra/prisma-client.js";

/**
 * Localise le référentiel semé par `prisma/seed.ts` (Côte d'Ivoire, 6e,
 * Mathématiques) sans dépendre d'identifiants générés (cuid). Les tests
 * d'intégration s'appuient sur ces données réelles plutôt que sur des mocks,
 * conformément à docs/04-risques-et-tests.md.
 */
export async function getSeededMathSubject() {
  const country = await prisma.country.findUniqueOrThrow({ where: { isoCode: "CI" } });
  const level = await prisma.level.findFirstOrThrow({
    where: { code: "6e", program: { educationSystem: { countryId: country.id } } },
  });
  const subject = await prisma.subject.findUniqueOrThrow({
    where: { levelId_code: { levelId: level.id, code: "MATH" } },
  });
  return { country, level, subject };
}
