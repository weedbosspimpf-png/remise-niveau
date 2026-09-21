/**
 * Seed du référentiel pilote : Côte d'Ivoire, 6e, Mathématiques (§5, exemple du
 * cahier des charges). Volontairement minimal — juste assez de compétences et
 * de prérequis pour faire fonctionner un diagnostic de bout en bout.
 *
 * Ne représente PAS un programme officiel réel : à remplacer par les données
 * issues d'une source validée (§6) avant toute mise en production.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const source = await prisma.curriculumSource.upsert({
    where: { id: "seed-source-dev" },
    update: {},
    create: {
      id: "seed-source-dev",
      type: "UNVERIFIED",
      organisme: "Seed de développement (à remplacer par une source officielle)",
    },
  });

  const country = await prisma.country.upsert({
    where: { isoCode: "CI" },
    update: {},
    create: {
      isoCode: "CI",
      name: "Côte d'Ivoire",
      languages: ["fr"],
    },
  });

  const educationSystem = await prisma.educationSystem.upsert({
    where: { id: "seed-system-ci" },
    update: {},
    create: {
      id: "seed-system-ci",
      countryId: country.id,
      name: "Système éducatif ivoirien",
    },
  });

  const program = await prisma.curriculumProgram.upsert({
    where: {
      educationSystemId_schoolYear_versionLabel: {
        educationSystemId: educationSystem.id,
        schoolYear: "2025-2026",
        versionLabel: "Seed de développement v1",
      },
    },
    update: {},
    create: {
      educationSystemId: educationSystem.id,
      schoolYear: "2025-2026",
      versionLabel: "Seed de développement v1",
      sourceId: source.id,
      status: "VALIDATED",
      validatedAt: new Date(),
      validatedBy: "seed-script",
    },
  });

  const niveau6e = await prisma.level.upsert({
    where: { programId_code: { programId: program.id, code: "6e" } },
    update: {},
    create: { programId: program.id, code: "6e", order: 1 },
  });

  const maths = await prisma.subject.upsert({
    where: { levelId_code: { levelId: niveau6e.id, code: "MATH" } },
    update: {},
    create: { levelId: niveau6e.id, code: "MATH", name: "Mathématiques" },
  });

  const domaineCalculs = await prisma.domain.upsert({
    where: { id: "seed-domain-calculs" },
    update: {},
    create: {
      id: "seed-domain-calculs",
      subjectId: maths.id,
      name: "Calculs algébriques",
      order: 1,
    },
  });

  const domaineNombres = await prisma.domain.upsert({
    where: { id: "seed-domain-nombres" },
    update: {},
    create: { id: "seed-domain-nombres", subjectId: maths.id, name: "Nombres", order: 0 },
  });

  const compNombresEntiers = await prisma.competence.upsert({
    where: { domainId_code: { domainId: domaineNombres.id, code: "NOMBRES_ENTIERS" } },
    update: {},
    create: {
      domainId: domaineNombres.id,
      code: "NOMBRES_ENTIERS",
      name: "Nombres entiers",
      difficulty: 1,
      objectives: ["Lire, écrire et comparer des nombres entiers"],
    },
  });

  const compFractions = await prisma.competence.upsert({
    where: { domainId_code: { domainId: domaineCalculs.id, code: "FRACTIONS" } },
    update: {},
    create: {
      domainId: domaineCalculs.id,
      code: "FRACTIONS",
      name: "Comparaison de fractions",
      difficulty: 2,
      objectives: ["Comparer deux fractions de même dénominateur"],
    },
  });

  const compOperations = await prisma.competence.upsert({
    where: { domainId_code: { domainId: domaineCalculs.id, code: "OPERATIONS" } },
    update: {},
    create: {
      domainId: domaineCalculs.id,
      code: "OPERATIONS",
      name: "Quatre opérations",
      difficulty: 1,
      objectives: ["Additionner, soustraire, multiplier et diviser des nombres entiers"],
    },
  });

  // Prérequis (§14) : les fractions requièrent la maîtrise des nombres entiers
  // et des quatre opérations.
  await prisma.prerequisite.upsert({
    where: {
      competenceId_requiresCompetenceId: {
        competenceId: compFractions.id,
        requiresCompetenceId: compNombresEntiers.id,
      },
    },
    update: {},
    create: { competenceId: compFractions.id, requiresCompetenceId: compNombresEntiers.id },
  });

  await prisma.prerequisite.upsert({
    where: {
      competenceId_requiresCompetenceId: {
        competenceId: compFractions.id,
        requiresCompetenceId: compOperations.id,
      },
    },
    update: {},
    create: { competenceId: compFractions.id, requiresCompetenceId: compOperations.id },
  });

  // eslint-disable-next-line no-console -- script CLI, la sortie est le but de la fonction
  console.log("Seed terminé :", {
    pays: country.name,
    programme: `${program.versionLabel} (${program.schoolYear})`,
    niveau: niveau6e.code,
    matiere: maths.name,
    competences: [compNombresEntiers.name, compOperations.name, compFractions.name],
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
