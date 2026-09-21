import { PrismaClient } from "@prisma/client";

/** Instance unique de PrismaClient partagée par toute l'application. */
export const prisma = new PrismaClient();
