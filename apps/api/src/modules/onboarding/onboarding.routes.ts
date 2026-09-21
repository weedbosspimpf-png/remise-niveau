import { onboardingSchema } from "@edu-restart/schemas";
import type { FastifyInstance } from "fastify";
import { prisma } from "../../infra/prisma-client.js";
import { HttpError } from "../../plugins/error-handler.js";

/**
 * Onboarding (§9-§10) : renseigne le pays, la langue, le niveau déclaré et
 * l'objectif de l'utilisateur. Rejouable — un utilisateur peut revenir
 * ajuster son profil, chaque appel met à jour `user_profile` et ajoute un
 * nouvel objectif (l'historique des objectifs est conservé).
 */
export async function registerOnboardingRoutes(app: FastifyInstance): Promise<void> {
  app.post("/onboarding", { preHandler: app.authenticate }, async (request, reply) => {
    const userId = request.user.userId;
    const input = onboardingSchema.parse(request.body);

    const country = await prisma.country.findUnique({ where: { id: input.countryId } });
    if (!country) {
      throw new HttpError(404, "Pays inconnu du référentiel", "COUNTRY_NOT_FOUND");
    }

    const niveau = await prisma.level.findUnique({ where: { id: input.niveauDeclareId } });
    if (!niveau) {
      throw new HttpError(404, "Niveau inconnu du référentiel", "LEVEL_NOT_FOUND");
    }

    const profile = await prisma.userProfile.upsert({
      where: { userId },
      update: {
        countryId: input.countryId,
        langue: input.langue,
        ageRange: input.ageRange,
        niveauDeclareId: input.niveauDeclareId,
        objectifLibre: undefined,
      },
      create: {
        userId,
        countryId: input.countryId,
        langue: input.langue,
        ageRange: input.ageRange,
        niveauDeclareId: input.niveauDeclareId,
      },
    });

    const objectif = await prisma.userObjective.create({
      data: {
        userId,
        type: input.objectif.type,
        matiereId: input.objectif.matiereId,
        niveauCibleId: input.objectif.niveauCibleId,
      },
    });

    reply.status(201).send({ profile, objectif });
  });
}
