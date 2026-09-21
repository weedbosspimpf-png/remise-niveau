import type { FastifyInstance } from "fastify";
import { prisma } from "../../infra/prisma-client.js";

/**
 * Carte de compétences de l'utilisateur courant (§13, écran "Ma progression").
 */
export async function registerProfileRoutes(app: FastifyInstance): Promise<void> {
  app.get("/profile/competence-map", { preHandler: app.authenticate }, async (request, reply) => {
    const userId = request.user.userId;
    const { matiereId } = request.query as { matiereId?: string };

    const statuses = await prisma.userCompetenceStatus.findMany({
      where: {
        userId,
        ...(matiereId ? { competence: { domain: { subjectId: matiereId } } } : {}),
      },
      include: { competence: { include: { domain: true } } },
    });

    reply.send(
      statuses.map((entry) => ({
        competenceId: entry.competenceId,
        competenceName: entry.competence.name,
        domainId: entry.competence.domainId,
        domainName: entry.competence.domain.name,
        status: entry.status,
        scorePct: entry.scorePct,
        lastEvaluatedAt: entry.lastEvaluatedAt,
      })),
    );
  });

  app.get("/profile/subject-levels", { preHandler: app.authenticate }, async (request, reply) => {
    const userId = request.user.userId;
    const levels = await prisma.userSubjectLevel.findMany({
      where: { userId },
      include: { matiere: true, niveauDeclare: true, niveauEstime: true },
    });

    reply.send(
      levels.map((entry) => ({
        matiereId: entry.matiereId,
        matiereName: entry.matiere.name,
        niveauDeclare: entry.niveauDeclare.code,
        niveauEstime: entry.niveauEstime?.code ?? null,
      })),
    );
  });
}
