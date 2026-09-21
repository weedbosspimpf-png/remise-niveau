import { z } from "zod";

/**
 * Inscription : au moins un identifiant (email ou téléphone) est requis (§9 —
 * le téléphone doit pouvoir suffire pour un public qui n'a pas toujours d'e-mail).
 */
export const registerSchema = z
  .object({
    email: z.string().email().optional(),
    phone: z.string().min(6).optional(),
    password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères"),
  })
  .refine((data) => Boolean(data.email) || Boolean(data.phone), {
    message: "Un email ou un numéro de téléphone est requis",
    path: ["email"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z
  .object({
    email: z.string().email().optional(),
    phone: z.string().min(6).optional(),
    password: z.string().min(1),
  })
  .refine((data) => Boolean(data.email) || Boolean(data.phone), {
    message: "Un email ou un numéro de téléphone est requis",
    path: ["email"],
  });

export type LoginInput = z.infer<typeof loginSchema>;
