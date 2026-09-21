import cors from "@fastify/cors";
import Fastify, { type FastifyInstance } from "fastify";
import { registerAuthRoutes } from "./modules/auth/auth.routes.js";
import { registerDiagnosticRoutes } from "./modules/diagnostic/diagnostic.routes.js";
import { registerOnboardingRoutes } from "./modules/onboarding/onboarding.routes.js";
import { registerProfileRoutes } from "./modules/profile/profile.routes.js";
import { registerReferentielRoutes } from "./modules/referentiel/referentiel.routes.js";
import { registerAuthPlugin } from "./plugins/auth.js";
import { registerErrorHandler } from "./plugins/error-handler.js";

/**
 * Construit l'instance Fastify sans l'écouter sur un port — permet aux tests
 * d'utiliser `app.inject(...)` sans ouvrir de socket réseau.
 */
export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: process.env.NODE_ENV !== "test" });

  await app.register(cors, { origin: true });
  await registerAuthPlugin(app);
  registerErrorHandler(app);

  app.get("/health", async () => ({ status: "ok" }));

  await registerAuthRoutes(app);
  await registerOnboardingRoutes(app);
  await registerReferentielRoutes(app);
  await registerDiagnosticRoutes(app);
  await registerProfileRoutes(app);

  return app;
}
