# 05 — Déploiement (API sur Render, front sur Vercel)

> Ce document décrit comment mettre le MVP en ligne pour de vrai, au-delà des vérifications
> locales. Il part du principe qu'un déploiement Vercel du dossier `apps/web` existe déjà
> (par exemple via une intégration GitHub automatique), et qu'il faut désormais héberger
> l'API + la base de données quelque part de joignable.

## 1. Pourquoi Vercel seul ne suffit pas

`apps/web` est une SPA statique : Vercel peut la construire et la servir sans problème.
Mais elle a besoin de parler à l'API Fastify + PostgreSQL (auth, référentiel, diagnostic),
qui est un **serveur persistant**, pas une fonction serverless — Vercel seul ne l'héberge
pas tel quel. D'où l'utilisation de Render pour l'API et sa base.

## 2. Déployer l'API + PostgreSQL sur Render

Le fichier [`render.yaml`](../render.yaml) à la racine du dépôt décrit tout :
un service web (l'API) et une base PostgreSQL, reliés automatiquement.

Étapes :

1. Sur [render.com](https://render.com), **New → Blueprint**.
2. Connecter le dépôt GitHub `weedbosspimpf-png/remise-niveau`.
3. Render détecte `render.yaml` et propose de créer les deux ressources
   (`edu-restart-db` et `edu-restart-api`). Vérifier la branche indiquée dans
   `render.yaml` (`branch:`) — l'adapter si le code a été fusionné ailleurs.
4. **Apply**. Le premier déploiement :
   - installe les dépendances (`pnpm install`) ;
   - génère le client Prisma ;
   - au démarrage, applique les migrations (`prisma migrate deploy`) puis lance
     le serveur (`tsx src/server.ts` — voir §4 pour le choix de ne pas
     compiler l'API en JS pour le déploiement).
5. Une fois "Live", noter l'URL publique du service (ex.
   `https://edu-restart-api.onrender.com`).
6. **Semer le référentiel de test** : dans le dashboard Render, onglet _Shell_
   du service `edu-restart-api`, exécuter :
   ```bash
   pnpm --filter @edu-restart/api run prisma:seed
   ```
   Sans cette étape, la base est vide (migrations appliquées mais aucune
   donnée) et l'onboarding ne proposera aucun pays/niveau/matière.

`JWT_SECRET` est généré automatiquement par Render (`generateValue: true`) —
ne pas le committer, ne pas le deviner.

## 3. Brancher le front Vercel sur cette API

Dans les paramètres du projet Vercel (`web-jcvq` ou équivalent) :

1. **Settings → Environment Variables** → ajouter :
   - `VITE_API_BASE_URL` = l'URL Render obtenue à l'étape précédente
     (ex. `https://edu-restart-api.onrender.com`, **sans** slash final).
2. **Important** : Vite intègre les variables `VITE_*` au moment du _build_,
   pas à l'exécution. Un changement de variable d'environnement exige donc un
   **redéploiement** (Vercel → Deployments → ⋯ → Redeploy), pas seulement une
   sauvegarde des settings.
3. Vérifier que **Root Directory** du projet Vercel est bien `apps/web`
   (sinon Vercel essaiera de builder tout le monorepo depuis la racine).

Sans `VITE_API_BASE_URL` définie, le front retombe sur `/api` (chemin relatif
au domaine Vercel), qui n'existe pas → c'est la cause du bouton "Créer mon
compte" qui ne fait rien : la requête part vers une route inexistante et
échoue silencieusement côté réseau.

## 4. Pourquoi l'API tourne via `tsx` en production et pas un `node dist/...` compilé

`packages/core` et `packages/schemas` sont des paquets TypeScript **non
compilés** (consommés directement en source, y compris depuis `apps/web`, pour
qu'un même moteur de diagnostic puisse tourner côté serveur et plus tard côté
client sans duplication — voir docs/01-stack.md). Une tentative de compiler
uniquement `apps/api` avec `tsc` puis de l'exécuter avec `node dist/server.js`
échoue au runtime : Node ne sait pas charger les paquets workspace non compilés
qu'il importe. Plutôt que de complexifier prématurément le pipeline de build
(compiler aussi `core` et `schemas`, gérer deux jeux d'exports par paquet),
le MVP exécute l'API avec `tsx` aussi bien en développement qu'en production
— une pratique courante et déjà validée par un test de démarrage réel. Ce
choix est réversible : si le besoin d'un build compilé apparaît, seule la
configuration de `apps/api` change, pas le reste de l'architecture.

## 5. Limitations connues de ce déploiement

- Plan gratuit Render : le service peut se mettre en veille après inactivité
  (première requête plus lente le temps du réveil).
- Pas de CORS restreint : l'API accepte actuellement toute origine
  (`origin: true`) — à resserrer avant une vraie mise en production (limiter
  à l'origine Vercel exacte).
- Le référentiel semé est un jeu de données de développement (§6 du cahier
  des charges : statut `UNVERIFIED`), pas un programme scolaire officiel.
