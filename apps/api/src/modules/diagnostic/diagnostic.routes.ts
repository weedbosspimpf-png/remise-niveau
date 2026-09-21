import {
  computeCompetenceScores,
  DiagnosticEngine,
  estimateSubjectLevel,
  mergeCompetenceMap,
  shuffle,
  type CompetenceScore,
  type DiagnosticAnswer as CoreDiagnosticAnswer,
} from "@edu-restart/core";
import { startDiagnosticSchema, submitAnswerSchema } from "@edu-restart/schemas";
import type { FastifyInstance } from "fastify";
import { cryptoRandomSource } from "../../infra/crypto-random-source.js";
import { prisma } from "../../infra/prisma-client.js";
import { PrismaReferentielRepository } from "../../infra/prisma-referentiel-repository.js";
import { HttpError } from "../../plugins/error-handler.js";

const NIVEAU_MASTERY_THRESHOLD_PCT = 70;

export async function registerDiagnosticRoutes(app: FastifyInstance): Promise<void> {
  const repository = new PrismaReferentielRepository(prisma);

  // ── Démarrage d'une session (§11) ─────────────────────────────────────
  app.post("/diagnostic/sessions", { preHandler: app.authenticate }, async (request, reply) => {
    const userId = request.user.userId;
    const input = startDiagnosticSchema.parse(request.body);

    const subject = await repository.getSubject(input.matiereId);
    if (!subject || subject.levelId !== input.niveauId) {
      throw new HttpError(
        404,
        "Matière introuvable pour ce niveau dans un programme validé",
        "SUBJECT_NOT_FOUND",
      );
    }

    const domains = await repository.listDomainsForSubject(input.matiereId);
    const competencesByDomainId = new Map(
      await Promise.all(
        domains.map(
          async (domain) =>
            [domain.id, await repository.listCompetencesForDomain(domain.id)] as const,
        ),
      ),
    );
    const allCompetences = new Map(
      [...competencesByDomainId.values()].flat().map((competence) => [competence.id, competence]),
    );

    const engine = new DiagnosticEngine(cryptoRandomSource);
    const plan = engine.buildQuestionPlan(domains, competencesByDomainId);

    if (plan.length === 0) {
      throw new HttpError(
        422,
        "Aucune compétence disponible pour générer un diagnostic sur cette matière",
        "EMPTY_REFERENTIEL",
      );
    }

    const session = await prisma.diagnosticSession.create({
      data: { userId, matiereId: input.matiereId, niveauId: input.niveauId, status: "IN_PROGRESS" },
    });

    const questions = await Promise.all(
      plan.map((questionPlan, index) => {
        const targetCompetence = allCompetences.get(questionPlan.competenceId)!;
        // Contenu volontairement minimal au MVP (voir docs/02-architecture.md §"core"):
        // pas de banque de questions rédigées, l'énoncé s'appuie sur le premier
        // objectif pédagogique de la compétence.
        const prompt = targetCompetence.objectives[0] ?? targetCompetence.name;
        // Mélangé : la bonne réponse ne doit jamais être devinable par sa position.
        const choiceIds = shuffle(
          [questionPlan.competenceId, ...questionPlan.distractorCompetenceIds],
          cryptoRandomSource,
        );

        return prisma.diagnosticQuestion.create({
          data: {
            sessionId: session.id,
            competenceId: questionPlan.competenceId,
            ordrePresentation: index,
            choix: { prompt, choiceCompetenceIds: choiceIds },
          },
        });
      }),
    );

    reply.status(201).send({
      sessionId: session.id,
      questions: questions.map((question) => {
        const choix = question.choix as { prompt: string; choiceCompetenceIds: string[] };
        return {
          questionId: question.id,
          prompt: choix.prompt,
          choices: choix.choiceCompetenceIds.map((competenceId) => ({
            competenceId,
            label: allCompetences.get(competenceId)?.name ?? competenceId,
          })),
        };
      }),
    });
  });

  // ── Réponse à une question (§11 : "vérifier la réponse", "enregistrer le résultat") ──
  app.post(
    "/diagnostic/sessions/:sessionId/answers",
    { preHandler: app.authenticate },
    async (request, reply) => {
      const userId = request.user.userId;
      const { sessionId } = request.params as { sessionId: string };
      const input = submitAnswerSchema.parse(request.body);

      const session = await prisma.diagnosticSession.findFirst({
        where: { id: sessionId, userId },
      });
      if (!session) {
        throw new HttpError(404, "Session de diagnostic introuvable", "SESSION_NOT_FOUND");
      }
      if (session.status !== "IN_PROGRESS") {
        throw new HttpError(409, "Cette session de diagnostic est déjà terminée", "SESSION_CLOSED");
      }

      const question = await prisma.diagnosticQuestion.findFirst({
        where: { id: input.questionId, sessionId },
        include: { answer: true },
      });
      if (!question) {
        throw new HttpError(404, "Question introuvable dans cette session", "QUESTION_NOT_FOUND");
      }
      if (question.answer) {
        throw new HttpError(409, "Cette question a déjà reçu une réponse", "ALREADY_ANSWERED");
      }

      const estCorrecte = input.selectedCompetenceId === question.competenceId;
      await prisma.diagnosticAnswer.create({
        data: {
          questionId: question.id,
          reponseUtilisateur: { selectedCompetenceId: input.selectedCompetenceId },
          estCorrecte,
          tempsReponseMs: input.tempsReponseMs,
        },
      });

      reply.send({ estCorrecte, correctCompetenceId: question.competenceId });
    },
  );

  // ── Clôture et calcul des résultats (§11-§13) ─────────────────────────
  app.post(
    "/diagnostic/sessions/:sessionId/complete",
    { preHandler: app.authenticate },
    async (request, reply) => {
      const userId = request.user.userId;
      const { sessionId } = request.params as { sessionId: string };

      const session = await prisma.diagnosticSession.findFirst({
        where: { id: sessionId, userId },
        include: { questions: { include: { answer: true } } },
      });
      if (!session) {
        throw new HttpError(404, "Session de diagnostic introuvable", "SESSION_NOT_FOUND");
      }
      if (session.status !== "IN_PROGRESS") {
        throw new HttpError(409, "Cette session de diagnostic est déjà terminée", "SESSION_CLOSED");
      }

      const answers: CoreDiagnosticAnswer[] = session.questions
        .filter((question) => question.answer)
        .map((question) => ({
          competenceId: question.competenceId,
          isCorrect: question.answer!.estCorrecte,
        }));

      const newScores = computeCompetenceScores(answers);

      const existingStatuses = await prisma.userCompetenceStatus.findMany({
        where: { userId, competenceId: { in: newScores.map((s) => s.competenceId) } },
      });
      const existingMap = new Map<string, CompetenceScore>(
        existingStatuses.map((status) => [
          status.competenceId,
          {
            competenceId: status.competenceId,
            scorePct: status.scorePct ?? 0,
            status: status.status,
          },
        ]),
      );

      const mergedMap = mergeCompetenceMap(existingMap, newScores);

      await prisma.$transaction(
        newScores.map((score) => {
          const merged = mergedMap.get(score.competenceId)!;
          return prisma.userCompetenceStatus.upsert({
            where: { userId_competenceId: { userId, competenceId: score.competenceId } },
            update: {
              status: merged.status,
              scorePct: merged.scorePct,
              lastEvaluatedAt: new Date(),
            },
            create: {
              userId,
              competenceId: score.competenceId,
              status: merged.status,
              scorePct: merged.scorePct,
              lastEvaluatedAt: new Date(),
            },
          });
        }),
      );

      // Estimation de niveau (§12) — limitation MVP assumée : cette session ne
      // teste qu'un seul niveau, donc `estimateSubjectLevel` ne peut ici que
      // confirmer ou non la maîtrise du niveau testé, pas situer précisément
      // un niveau réel plus bas ou plus haut (cela demande un diagnostic
      // multi-niveaux, non implémenté au MVP — voir docs/04-risques-et-tests.md).
      const aggregateScorePct = newScores.length
        ? Math.round(newScores.reduce((sum, s) => sum + s.scorePct, 0) / newScores.length)
        : 0;
      const niveauConfirme = estimateSubjectLevel(
        [{ levelId: session.niveauId, order: 0, masteryPct: aggregateScorePct }],
        NIVEAU_MASTERY_THRESHOLD_PCT,
      );
      const niveauMaitrise = aggregateScorePct >= NIVEAU_MASTERY_THRESHOLD_PCT;

      await prisma.userSubjectLevel.upsert({
        where: { userId_matiereId: { userId, matiereId: session.matiereId } },
        update: niveauMaitrise ? { niveauEstimeId: niveauConfirme } : {},
        create: {
          userId,
          matiereId: session.matiereId,
          niveauDeclareId: session.niveauId,
          niveauEstimeId: niveauMaitrise ? niveauConfirme : null,
        },
      });

      await prisma.diagnosticSession.update({
        where: { id: session.id },
        data: { status: "COMPLETED", completedAt: new Date() },
      });

      reply.send({
        aggregateScorePct,
        niveauMaitrise,
        competenceScores: newScores.map((score) => ({
          ...score,
          status: mergedMap.get(score.competenceId)!.status,
        })),
      });
    },
  );
}
