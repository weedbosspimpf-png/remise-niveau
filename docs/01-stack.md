# 01 — Stack technique

> Statut : proposition à valider. Aucune ligne de code applicatif n'est écrite avant validation.

## 1. Contraintes qui dictent le choix

Le choix technique découle du public et du terrain, pas des modes techniques.

| Contrainte                                                           | Origine  | Conséquence technique                                                                                                                  |
| -------------------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Pilote Côte d'Ivoire, puis Afrique de l'Ouest                        | §4       | Smartphones Android d'entrée de gamme, 3G intermittente, données payantes → **poids et hors-ligne sont des exigences, pas du confort** |
| Utilisateurs adultes, parfois hors système scolaire                  | §3       | Pas d'installation via store obligatoire, interface sobre, français simple                                                             |
| Référentiel hiérarchique + graphe de prérequis                       | §5, §14  | Base **relationnelle** avec requêtes récursives, pas un stockage documentaire                                                          |
| Programmes versionnés et archivés                                    | §8       | Versions immuables + traçabilité de source → modèle append-only, jamais d'écrasement                                                   |
| Multi-pays dès le départ                                             | §4       | Le pays est une **donnée**, jamais une branche de code                                                                                 |
| Moteurs (diagnostic, parcours, adaptatif) déterministes et testables | §11, §14 | Logique métier **pure**, sans I/O, isolée du framework                                                                                 |
| IA uniquement pour l'ingestion, jamais pour décider                  | §7       | Pipeline d'ingestion séparé, avec état `DRAFT → validation humaine → PUBLISHED`                                                        |
| Destiné à la production                                              | §RÔLE    | Migrations versionnées, CI, tests, journalisation dès le départ                                                                        |

## 2. Stack retenue

| Couche        | Choix                                                                                                    | Justification courte                                                                                                                                                                                                                 |
| ------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Langage       | **TypeScript** partout                                                                                   | Un seul langage front/back/moteurs. Les moteurs doivent tourner **aussi côté client** (hors ligne) : les réécrire deux fois serait la principale source de bugs.                                                                     |
| Dépôt         | **Monorepo pnpm workspaces**                                                                             | Types et moteurs partagés sans publication de paquets. Pas de Turborepo tant que les temps de build ne le justifient pas.                                                                                                            |
| Domaine       | **Paquet `core` en TypeScript pur** (zéro I/O, zéro framework)                                           | Cœur du produit. Testable en millisecondes, exécutable serveur **et** navigateur.                                                                                                                                                    |
| API           | **Fastify**                                                                                              | Léger, TS natif, validation par schéma intégrée. NestJS écarté : son injection de dépendances fait doublon avec l'isolation déjà apportée par `core`, pour un coût de cérémonie élevé.                                               |
| Base          | **PostgreSQL 16**                                                                                        | Relationnel pour le référentiel, `WITH RECURSIVE` pour le graphe de prérequis, `JSONB` pour les contenus hétérogènes (leçons, exercices). Un seul moteur au lieu de deux. Extension `pgvector` disponible pour la phase d'ingestion. |
| Accès données | **Prisma**                                                                                               | Migrations versionnées (indispensable pour un référentiel qui évolue), typage généré. _Compromis assumé : Drizzle serait plus proche du SQL et plus léger ; Prisma est préféré pour la robustesse des migrations en production._     |
| Front         | **React + Vite + TypeScript + Tailwind**, en **PWA hors-ligne d'abord**                                  | Installable sans store, mise à jour immédiate, poids maîtrisé, un seul code pour web et mobile. React Native/Flutter écartés au MVP : deux fois le travail pour un public qui installe difficilement depuis un store.                |
| Hors-ligne    | **Workbox** (coquille applicative) + **Dexie/IndexedDB** (parcours, leçons, exercices, file de réponses) | Un apprenant doit pouvoir travailler sans réseau et synchroniser plus tard.                                                                                                                                                          |
| Validation    | **Zod**, schémas partagés                                                                                | Même schéma pour l'API, le front et l'import de référentiel.                                                                                                                                                                         |
| Tests         | **Vitest** (unitaires/intégration), **Playwright** (e2e, plus tard)                                      |                                                                                                                                                                                                                                      |
| Auth          | e-mail **ou téléphone** + mot de passe (argon2), JWT court + refresh                                     | Le téléphone prime sur l'e-mail en Afrique de l'Ouest. Interface `AuthProvider` prévue pour un OTP SMS ultérieur.                                                                                                                    |
| i18n          | `i18next`, français par défaut                                                                           | Clés d'emblée : rajouter une langue après coup coûte dix fois plus cher.                                                                                                                                                             |
| CI            | GitHub Actions : typecheck + lint + tests + build                                                        |                                                                                                                                                                                                                                      |

## 3. Dépendances (volontairement courtes)

**Exécution** — `fastify`, `@fastify/cors`, `@fastify/jwt`, `@prisma/client`, `zod`, `argon2`, `pino`
**Front** — `react`, `react-dom`, `react-router`, `dexie`, `i18next`, `react-i18next`, `tailwindcss`, `vite-plugin-pwa`
**Développement** — `typescript`, `vitest`, `@vitest/coverage-v8`, `eslint`, `prettier`, `tsx`, `prisma`
**Phase ingestion (plus tard)** — extraction PDF (`unpdf`), SDK IA, `pgvector`

Écartés au MVP : gestionnaire d'état global (Redux/Zustand), GraphQL, microservices, Docker Compose, moteur de recherche externe, file de messages. Aucun n'est justifié par un besoin actuel.

## 4. Ce que `core` ne doit jamais contenir

- aucune référence à la Côte d'Ivoire ou à un pays précis ;
- aucun accès réseau, base ou fichier (uniquement des _ports_ : interfaces) ;
- aucun appel à un modèle d'IA ;
- aucun `Date.now()` ni `Math.random()` direct (horloge et aléa injectés, pour des tests reproductibles).

C'est cette règle qui rend le produit portable d'un pays à l'autre et vérifiable.

## 5. Environnement vérifié (2026-09-21)

Node 22.22.2 · pnpm 10.33.0 · PostgreSQL 16 (serveur local présent, arrêté) · Python 3.11 · npm accessible.
**Démon Docker indisponible** dans cet environnement → la base de développement sera un cluster PostgreSQL local (`pg_ctlcluster`), et les tests du domaine ne dépendent d'aucune base.
