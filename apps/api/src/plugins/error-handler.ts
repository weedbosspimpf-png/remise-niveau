import type { FastifyError, FastifyInstance } from "fastify";
import { ZodError } from "zod";

/** Erreur métier explicite, mappée sur un code HTTP précis par le gestionnaire ci-dessous. */
export class HttpError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code: string = "HTTP_ERROR",
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error: FastifyError, _request, reply) => {
    if (error instanceof ZodError) {
      reply.status(400).send({
        error: "VALIDATION_ERROR",
        message: "Requête invalide",
        issues: error.issues,
      });
      return;
    }

    if (error instanceof HttpError) {
      reply.status(error.statusCode).send({ error: error.code, message: error.message });
      return;
    }

    // Erreurs Fastify natives (corps JSON malformé/vide, en-têtes invalides…) :
    // ce sont des erreurs de requête du client, pas des erreurs serveur.
    if (typeof error.statusCode === "number" && error.statusCode < 500) {
      reply
        .status(error.statusCode)
        .send({ error: error.code ?? "BAD_REQUEST", message: error.message });
      return;
    }

    app.log.error(error);
    reply.status(500).send({ error: "INTERNAL_ERROR", message: "Erreur interne" });
  });
}
