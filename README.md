# EDU RESTART

Plateforme de remise à niveau et d'apprentissage adaptatif. Elle détermine le niveau réel
d'un apprenant matière par matière, identifie ses lacunes et ses prérequis manquants, et
construit un parcours personnalisé — au lieu de l'obliger à reprendre un niveau scolaire
entier.

Projet pilote : Côte d'Ivoire. Architecture conçue dès le départ pour être multi-pays
(le pays est une donnée du référentiel, jamais une branche de code).

## Documentation d'architecture

- [`docs/01-stack.md`](docs/01-stack.md) — stack technique et justification
- [`docs/02-architecture.md`](docs/02-architecture.md) — arborescence et responsabilité des modules
- [`docs/03-schema-donnees.md`](docs/03-schema-donnees.md) — schéma de données
- [`docs/04-risques-et-tests.md`](docs/04-risques-et-tests.md) — risques techniques et plan de tests

## Structure

```
packages/core      domaine métier pur (référentiel, moteur de diagnostic)
packages/schemas   schémas de validation partagés
apps/api           API Fastify + Prisma/PostgreSQL
apps/web           interface web (React/Vite, PWA offline-first)
tools/ingestion    (Phase 2, non implémenté) — futur pipeline d'ingestion des programmes
```

## Démarrage (développement)

```bash
pnpm install
pnpm --filter @edu-restart/core test     # tests du domaine, sans base de données
```

L'API et le front sont documentés dans leurs dossiers respectifs au fur et à mesure de
leur mise en place.
