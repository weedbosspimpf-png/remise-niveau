import type { FastifyInstance } from "fastify";
import { prisma } from "../../infra/prisma-client.js";

/**
 * Lecture du référentiel pour alimenter l'onboarding et le choix d'une
 * matière/niveau avant un diagnostic. Ne renvoie jamais rien issu d'un
 * programme non VALIDATED (§6).
 */
export async function registerReferentielRoutes(app: FastifyInstance): Promise<void> {
  app.get("/referentiel/countries", async (_request, reply) => {
    const countries = await prisma.country.findMany({ orderBy: { name: "asc" } });
    reply.send(countries);
  });

  app.get("/referentiel/countries/:countryId/levels", async (request, reply) => {
    const { countryId } = request.params as { countryId: string };

    const levels = await prisma.level.findMany({
      where: {
        program: {
          status: "VALIDATED",
          educationSystem: { countryId },
        },
      },
      orderBy: { order: "asc" },
    });
    reply.send(levels);
  });

  app.get("/referentiel/levels/:levelId/subjects", async (request, reply) => {
    const { levelId } = request.params as { levelId: string };

    const subjects = await prisma.subject.findMany({
      where: { levelId, level: { program: { status: "VALIDATED" } } },
      orderBy: { name: "asc" },
    });
    reply.send(subjects);
  });
}
