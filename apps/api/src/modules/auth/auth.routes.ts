import { loginSchema, registerSchema } from "@edu-restart/schemas";
import * as argon2 from "argon2";
import type { FastifyInstance } from "fastify";
import { prisma } from "../../infra/prisma-client.js";
import { HttpError } from "../../plugins/error-handler.js";

export async function registerAuthRoutes(app: FastifyInstance): Promise<void> {
  app.post("/auth/register", async (request, reply) => {
    const input = registerSchema.parse(request.body);

    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          input.email ? { email: input.email } : undefined,
          input.phone ? { phone: input.phone } : undefined,
        ].filter((clause): clause is { email: string } | { phone: string } => Boolean(clause)),
      },
    });
    if (existing) {
      throw new HttpError(
        409,
        "Un compte existe déjà avec cet email ou ce téléphone",
        "USER_EXISTS",
      );
    }

    const passwordHash = await argon2.hash(input.password);
    const user = await prisma.user.create({
      data: { email: input.email, phone: input.phone, passwordHash },
    });

    const token = app.jwt.sign({ userId: user.id });
    reply.status(201).send({ userId: user.id, token });
  });

  app.post("/auth/login", async (request, reply) => {
    const input = loginSchema.parse(request.body);

    const user = await prisma.user.findFirst({
      where: input.email ? { email: input.email } : { phone: input.phone },
    });
    if (!user) {
      throw new HttpError(401, "Identifiants invalides", "INVALID_CREDENTIALS");
    }

    const valid = await argon2.verify(user.passwordHash, input.password);
    if (!valid) {
      throw new HttpError(401, "Identifiants invalides", "INVALID_CREDENTIALS");
    }

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    const token = app.jwt.sign({ userId: user.id });
    reply.send({ userId: user.id, token });
  });
}
