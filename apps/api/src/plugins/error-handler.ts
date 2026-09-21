import type { FastifyInstance } from "fastify";
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
  app.setErrorHandler((error, _request, reply) => {
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

    app.log.error(error);
    reply.status(500).send({ error: "INTERNAL_ERROR", message: "Erreur interne" });
  });
}
