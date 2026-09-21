import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.spec.ts"],
    setupFiles: ["./tests/setup.ts"],
    // Intégration réelle contre PostgreSQL: pas de parallélisation pour
    // éviter les conflits d'état entre fichiers de test.
    fileParallelism: false,
  },
});
