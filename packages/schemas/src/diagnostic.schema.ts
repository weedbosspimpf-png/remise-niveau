import { z } from "zod";

/** Démarre une session de diagnostic pour une matière et un niveau donnés (§11). */
export const startDiagnosticSchema = z.object({
  matiereId: z.string().min(1),
  niveauId: z.string().min(1),
});

export type StartDiagnosticInput = z.infer<typeof startDiagnosticSchema>;

/** Réponse à une question de diagnostic à choix multiple. */
export const submitAnswerSchema = z.object({
  questionId: z.string().min(1),
  selectedCompetenceId: z.string().min(1),
  tempsReponseMs: z.number().int().nonnegative().optional(),
});

export type SubmitAnswerInput = z.infer<typeof submitAnswerSchema>;
