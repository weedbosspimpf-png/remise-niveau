# 02 — Arborescence et modules

## 1. Arborescence du monorepo

```
remise-niveau/
├── docs/                          # documents d'architecture (ce dossier)
├── packages/
│   ├── core/                      # domaine métier pur — zéro I/O, zéro framework
│   │   ├── src/
│   │   │   ├── referentiel/       # Pays, Programme, Niveau, Matiere, Domaine, Competence
│   │   │   │   ├── entities.ts
│   │   │   │   ├── prerequisites-graph.ts   # résolution, cycles, ordre topologique
│   │   │   │   └── index.ts
│   │   │   ├── diagnostic/        # DiagnosticEngine
│   │   │   │   ├── diagnostic-engine.ts
│   │   │   │   ├── competence-map.ts        # carte de compétences (WEAK/LEARNING/...)
│   │   │   │   └── index.ts
│   │   │   ├── parcours/          # PathEngine (moteur de parcours) — squelette Phase 2
│   │   │   │   └── index.ts
│   │   │   ├── ports/             # interfaces que l'extérieur doit implémenter
│   │   │   │   ├── clock.ts       # Clock (injection du temps)
│   │   │   │   ├── random-source.ts
│   │   │   │   └── referentiel-repository.ts
│   │   │   └── index.ts
│   │   └── tests/
│   │       ├── referentiel/
│   │       ├── diagnostic/
│   │       └── parcours/
│   │
│   ├── schemas/                   # schémas Zod partagés API ↔ Web ↔ ingestion
│   │   └── src/
│   │       ├── referentiel.schema.ts
│   │       ├── utilisateur.schema.ts
│   │       └── diagnostic.schema.ts
│   │
│   └── config/                    # tsconfig, eslint, prettier partagés
│       ├── tsconfig.base.json
│       └── eslint-preset.cjs
│
├── apps/
│   ├── api/                       # Fastify — adapte core à HTTP + Postgres
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   ├── migrations/
│   │   │   └── seed.ts
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   │   ├── auth/
│   │   │   │   ├── onboarding/
│   │   │   │   ├── referentiel/   # lecture du référentiel (pays, niveaux, matières)
│   │   │   │   └── diagnostic/    # démarrage, réponses, résultats
│   │   │   ├── infra/
│   │   │   │   ├── prisma-referentiel-repository.ts  # implémente le port de core
│   │   │   │   ├── system-clock.ts
│   │   │   │   └── crypto-random-source.ts
│   │   │   ├── plugins/           # cors, jwt, error-handler, logger
│   │   │   └── server.ts
│   │   └── tests/
│   │
│   └── web/                       # React + Vite + Tailwind, PWA hors-ligne
│       ├── src/
│       │   ├── screens/
│       │   │   ├── onboarding/
│       │   │   ├── diagnostic/
│       │   │   └── competence-map/
│       │   ├── offline/           # Dexie (file locale), sync
│       │   ├── i18n/
│       │   └── app.tsx
│       └── tests/
│
├── tools/
│   └── ingestion/                 # Curriculum Discovery Engine — Phase 2, squelette d'interfaces seulement
│       └── README.md              # décrit le pipeline §7 sans l'implémenter
│
├── pnpm-workspace.yaml
├── package.json
├── .github/workflows/ci.yml
└── README.md
```

## 2. Responsabilité de chaque module

### `packages/core` — le cœur pédagogique, indépendant de tout pays et de tout framework
- **`referentiel/`** : modélise la hiérarchie Pays → Système éducatif → Programme (versionné) → Niveau → Matière → Domaine → Compétence → Prérequis (§5, §8, §14). Le graphe de prérequis détecte les cycles et calcule un ordre d'enseignement valide.
- **`diagnostic/`** : `DiagnosticEngine` sélectionne des questions couvrant les compétences d'un niveau/matière, calcule un score par domaine et produit une carte de compétences avec les statuts `NOT_ASSESSED / WEAK / LEARNING / DEVELOPING / MASTERED / REQUIRES_REVIEW` (§11, §13).
- **`parcours/`** : squelette d'interface pour le futur moteur de parcours (§15, tronqué dans le cahier des charges — non implémenté au MVP, seule l'interface `PathEngine` est posée pour ne pas bloquer l'extensibilité).
- **`ports/`** : interfaces (`Clock`, `RandomSource`, `ReferentielRepository`) que les adaptateurs (`apps/api`) doivent implémenter. `core` ne connaît jamais Postgres, HTTP ou Node.

### `packages/schemas` — contrat de données partagé
Schémas Zod utilisés à la fois par l'API (validation des requêtes), le front (formulaires) et, plus tard, par le pipeline d'ingestion. Évite la duplication de règles de validation.

### `apps/api` — adaptateur HTTP + persistance
- **`prisma/`** : schéma relationnel, migrations versionnées, seed du référentiel pilote (Côte d'Ivoire).
- **`modules/onboarding`** : création de profil, choix pays/niveau déclaré/objectif/matières (§9, §10).
- **`modules/referentiel`** : exposition en lecture du référentiel pour alimenter les écrans.
- **`modules/diagnostic`** : démarre une session de diagnostic (délègue à `core`), enregistre les réponses, retourne la carte de compétences.
- **`infra/`** : implémentations concrètes des ports de `core` (ex. `PrismaReferentielRepository`), seul endroit qui parle à la base de données.

### `apps/web` — interface utilisateur
Écrans onboarding, diagnostic, carte de compétences. `core` est aussi importé côté client (même paquet TypeScript) pour permettre un diagnostic hors-ligne dès que le référentiel est mis en cache localement (Dexie).

### `tools/ingestion` — non implémenté au MVP
Dossier réservé au futur *Curriculum Discovery Engine* (§7). Contient uniquement un README décrivant le pipeline et les statuts de source (`OFFICIAL/VERIFIED/SECONDARY/UNVERIFIED/OUTDATED`, §6) pour que le schéma de données en tienne compte dès maintenant, sans coder l'automatisation.

## 3. Pourquoi cette séparation

Le pays, le programme et la langue sont des **données** lues par `core`, jamais des branches de code (§4). Un nouveau pays s'ajoute par une ligne dans le référentiel et un seed, sans toucher à `packages/core`, `apps/api` ou `apps/web`. C'est ce découplage — testé indépendamment — qui garantit l'extensibilité vers le parcours adaptatif, l'ingestion automatique et le multi-pays sans réécriture.
