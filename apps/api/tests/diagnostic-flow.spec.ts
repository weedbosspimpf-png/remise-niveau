import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../src/app.js";
import { prisma } from "../src/infra/prisma-client.js";
import { getSeededMathSubject } from "./fixtures.js";

/**
 * Test de bout en bout du "premier critère de réussite" du MVP :
 * l'application joue un diagnostic, l'utilisateur répond, l'application
 * indique si la réponse est correcte, le résultat est enregistré, la
 * statistique de compétence est mise à jour.
 */
describe("Parcours de diagnostic (intégration, base réelle)", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  async function registerUser(): Promise<{ userId: string; token: string }> {
    const response = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email: `test-${randomUUID()}@example.com`, password: "motdepasse123" },
    });
    expect(response.statusCode).toBe(201);
    return response.json();
  }

  it("répondre correctement à toutes les questions fait passer les compétences en MASTERED", async () => {
    const { token } = await registerUser();
    const { subject, level } = await getSeededMathSubject();
    const authHeader = { authorization: `Bearer ${token}` };

    const startResponse = await app.inject({
      method: "POST",
      url: "/diagnostic/sessions",
      headers: authHeader,
      payload: { matiereId: subject.id, niveauId: level.id },
    });
    expect(startResponse.statusCode).toBe(201);
    const { sessionId, questions } = startResponse.json();
    expect(questions.length).toBeGreaterThan(0);

    const dbQuestions = await prisma.diagnosticQuestion.findMany({
      where: { id: { in: questions.map((q: { questionId: string }) => q.questionId) } },
    });
    const correctByQuestionId = new Map(dbQuestions.map((q) => [q.id, q.competenceId]));

    for (const question of questions) {
      const answerResponse = await app.inject({
        method: "POST",
        url: `/diagnostic/sessions/${sessionId}/answers`,
        headers: authHeader,
        payload: {
          questionId: question.questionId,
          selectedCompetenceId: correctByQuestionId.get(question.questionId),
        },
      });
      expect(answerResponse.statusCode).toBe(200);
      expect(answerResponse.json().estCorrecte).toBe(true);
    }

    const completeResponse = await app.inject({
      method: "POST",
      url: `/diagnostic/sessions/${sessionId}/complete`,
      headers: authHeader,
    });
    expect(completeResponse.statusCode).toBe(200);
    const result = completeResponse.json();

    expect(result.aggregateScorePct).toBe(100);
    expect(result.niveauMaitrise).toBe(true);
    for (const score of result.competenceScores) {
      expect(score.status).toBe("MASTERED");
    }

    const mapResponse = await app.inject({
      method: "GET",
      url: `/profile/competence-map?matiereId=${subject.id}`,
      headers: authHeader,
    });
    expect(mapResponse.statusCode).toBe(200);
    expect(
      mapResponse.json().every((entry: { status: string }) => entry.status === "MASTERED"),
    ).toBe(true);

    const levelsResponse = await app.inject({
      method: "GET",
      url: "/profile/subject-levels",
      headers: authHeader,
    });
    const subjectLevel = levelsResponse
      .json()
      .find((entry: { matiereId: string }) => entry.matiereId === subject.id);
    expect(subjectLevel.niveauEstime).toBe("6e");
  });

  it("répondre incorrectement laisse les compétences testées sous le seuil de maîtrise", async () => {
    const { token } = await registerUser();
    const { subject, level } = await getSeededMathSubject();
    const authHeader = { authorization: `Bearer ${token}` };

    const startResponse = await app.inject({
      method: "POST",
      url: "/diagnostic/sessions",
      headers: authHeader,
      payload: { matiereId: subject.id, niveauId: level.id },
    });
    const { sessionId, questions } = startResponse.json();

    let answeredWrongAtLeastOnce = false;
    for (const question of questions as {
      questionId: string;
      choices: { competenceId: string }[];
    }[]) {
      // Une question sans distracteur (une seule compétence dans son domaine)
      // ne peut pas être répondue incorrectement — on la laisse sans réponse.
      if (question.choices.length < 2) continue;

      const dbQuestion = await prisma.diagnosticQuestion.findUniqueOrThrow({
        where: { id: question.questionId },
      });
      const wrongChoice = question.choices.find((c) => c.competenceId !== dbQuestion.competenceId)!;

      const answerResponse = await app.inject({
        method: "POST",
        url: `/diagnostic/sessions/${sessionId}/answers`,
        headers: authHeader,
        payload: {
          questionId: question.questionId,
          selectedCompetenceId: wrongChoice.competenceId,
        },
      });
      expect(answerResponse.json().estCorrecte).toBe(false);
      answeredWrongAtLeastOnce = true;
    }
    expect(answeredWrongAtLeastOnce).toBe(true);

    const completeResponse = await app.inject({
      method: "POST",
      url: `/diagnostic/sessions/${sessionId}/complete`,
      headers: authHeader,
    });
    const result = completeResponse.json();

    expect(result.niveauMaitrise).toBe(false);
    expect(result.competenceScores.some((s: { status: string }) => s.status === "WEAK")).toBe(true);
  });

  it("rejette une réponse à une session déjà terminée", async () => {
    const { token } = await registerUser();
    const { subject, level } = await getSeededMathSubject();
    const authHeader = { authorization: `Bearer ${token}` };

    const startResponse = await app.inject({
      method: "POST",
      url: "/diagnostic/sessions",
      headers: authHeader,
      payload: { matiereId: subject.id, niveauId: level.id },
    });
    const { sessionId } = startResponse.json();

    await app.inject({
      method: "POST",
      url: `/diagnostic/sessions/${sessionId}/complete`,
      headers: authHeader,
    });

    const lateAnswer = await app.inject({
      method: "POST",
      url: `/diagnostic/sessions/${sessionId}/answers`,
      headers: authHeader,
      payload: { questionId: "peu-importe", selectedCompetenceId: "peu-importe" },
    });

    expect(lateAnswer.statusCode).toBe(409);
  });

  it("refuse l'accès sans jeton d'authentification", async () => {
    const response = await app.inject({ method: "POST", url: "/diagnostic/sessions", payload: {} });
    expect(response.statusCode).toBe(401);
  });
});
