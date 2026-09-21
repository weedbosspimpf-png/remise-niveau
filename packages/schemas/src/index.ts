// Schémas Zod partagés entre l'API, le web et le futur pipeline d'ingestion.
// Peuplé au fil des étapes du MVP — pas de duplication des règles de
// validation entre back et front.
export * from "./auth.schema.js";
export * from "./onboarding.schema.js";
export * from "./diagnostic.schema.js";
