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
- [`docs/05-deploiement.md`](docs/05-deploiement.md) — déployer l'API + PostgreSQL sur Render et brancher un front Vercel

## Structure

```
packages/core      domaine métier pur (référentiel, moteur de diagnostic)
packages/schemas   schémas de validation partagés
apps/api           API Fastify + Prisma/PostgreSQL
apps/web           interface web (React/Vite, PWA offline-first)
tools/ingestion    (Phase 2, non implémenté) — futur pipeline d'ingestion des programmes
```

## Démarrage rapide (tester le MVP en local)

Prérequis : Node ≥ 20, pnpm, et Docker (pour la base) — ou un PostgreSQL 16 déjà installé.

```bash
git clone https://github.com/weedbosspimpf-png/remise-niveau.git
cd remise-niveau
git checkout claude/hopeful-meitner-g1jx8y   # ou main une fois la branche fusionnée
pnpm install

# 1. Base de données
docker compose up -d postgres
# (sans Docker : créez une base "edu_restart" sur un PostgreSQL 16 local et
#  adaptez DATABASE_URL dans apps/api/.env en conséquence)

# 2. API
cp apps/api/.env.example apps/api/.env
pnpm --filter @edu-restart/api run prisma:migrate   # crée les tables
pnpm --filter @edu-restart/api run prisma:seed      # référentiel de test (Côte d'Ivoire, 6e, Maths)
pnpm --filter @edu-restart/api run dev              # http://localhost:3000

# 3. Front (dans un second terminal)
pnpm --filter @edu-restart/web run dev              # http://localhost:5173
```

Ouvrez ensuite **http://localhost:5173**, créez un compte (email + mot de passe),
suivez l'onboarding, puis lancez un diagnostic sur "Mathématiques".

## Mise en ligne (API + base sur Render, front sur Vercel)

Voir [`docs/05-deploiement.md`](docs/05-deploiement.md) — le fichier
[`render.yaml`](render.yaml) à la racine permet un déploiement en un clic
(Blueprint Render) de l'API et de sa base PostgreSQL.

## Tests automatisés

```bash
pnpm --filter @edu-restart/core test     # 41 tests, domaine pur, sans base de données
pnpm --filter @edu-restart/api test      # 8 tests d'intégration, nécessite la base ci-dessus
pnpm typecheck && pnpm lint              # sur tout le monorepo
```

## Structure des dossiers de code

Voir `apps/api/README.md` pour les détails spécifiques à l'API.
