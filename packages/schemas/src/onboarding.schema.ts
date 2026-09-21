import { z } from "zod";

/** Objectifs possibles (§10). */
export const objectiveTypeSchema = z.enum([
  "RESUME_SCOLARITE",
  "REMISE_A_NIVEAU",
  "PREPARER_EXAMEN",
  "RENFORCER_MATIERE",
  "ATTEINDRE_NIVEAU",
  "APPRENDRE_DEPUIS_BASES",
]);

/** Renseignements collectés lors de la première utilisation (§9). */
export const onboardingSchema = z.object({
  countryId: z.string().min(1),
  langue: z.string().min(2).default("fr"),
  ageRange: z.string().optional(),
  niveauDeclareId: z.string().min(1),
  objectif: z.object({
    type: objectiveTypeSchema,
    matiereId: z.string().optional(),
    niveauCibleId: z.string().optional(),
  }),
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;
