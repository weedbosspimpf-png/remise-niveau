# 04 — Risques techniques et premiers tests

## 1. Risques techniques identifiés

| Risque | Impact | Mitigation dès le MVP |
|---|---|---|
| **Confusion pays/programme codée en dur** | Réécriture complète pour ajouter un pays | Règle stricte : `core` ne référence jamais de pays. Test d'architecture qui échoue si un littéral de pays apparaît dans `packages/core`. |
| **Cycle dans le graphe de prérequis** | Le calcul de parcours boucle à l'infini ou devient incohérent | Détection de cycle obligatoire à l'écriture (`core` rejette l'ajout d'une arête qui en crée un) + test dédié. |
| **Contenu non officiel confondu avec un programme validé** | Élève évalué sur un référentiel erroné, perte de confiance | Statut de source obligatoire (§6) ; l'API de diagnostic ne peut lire que des programmes `VALIDATED`, jamais `DRAFT`. |
| **IA d'ingestion qui "invente" une structuration** (Phase 2) | Compétences ou prérequis fantaisistes publiés comme officiels | Le pipeline d'ingestion écrit uniquement dans `curriculum_ingestion_job` (statut `PENDING_REVIEW`), jamais directement dans les tables du référentiel ; une validation humaine explicite fait la copie. |
| **Diagnostic biaisé par le niveau déclaré** | Le système ne détecte jamais un niveau réel très différent | Le calcul du niveau estimé (`core/diagnostic`) ignore volontairement `niveau_declare_id` en entrée ; il ne s'en sert qu'en sortie pour comparer. |
| **Perte de connexion pendant un diagnostic (terrain 3G)** | Réponses perdues, session corrompue | Réponses écrites en file locale (IndexedDB/Dexie) au fur et à mesure, synchronisées dès que possible ; `diagnostic_session.status = IN_PROGRESS` tolère une reprise. |
| **Poids de l'application sur téléphone d'entrée de gamme** | Abandon à l'installation | PWA, pas de framework mobile natif au MVP, budget de poids surveillé en CI (à ajouter quand le front existe). |
| **Ambiguïté d'identité (email vs téléphone)** | Comptes dupliqués, perte d'accès | Contrainte "au moins un identifiant" posée dès le schéma (§3), pas ajoutée après coup. |
| **Dérive entre `core` (logique) et la base (état)** | Le résultat calculé et l'état persistant divergent après une évolution de l'algorithme | `diagnostic_answer` reste la source de vérité brute ; `user_competence_status` est un résultat recalculable, jamais modifié à la main. |
| **Environnement de développement sans Docker** (constaté ce jour) | Impossible de lancer une base via `docker-compose` | Utilisation du cluster PostgreSQL local déjà installé (`pg_ctlcluster 16 main start`) ; aucune dépendance dure à Docker au MVP. |

## 2. Ce que le MVP ne couvre pas encore (assumé, pas oublié)

- Curriculum Discovery Engine (ingestion automatique) — seule l'interface de données existe (§7).
- Moteur de parcours adaptatif complet (§15, section tronquée dans la demande) — uniquement l'interface `PathEngine`.
- Multi-pays réellement peuplé — seule la Côte d'Ivoire est semée en base ; le schéma est prêt pour les autres.

## 3. Premiers tests (paquet `core`, Vitest)

### `referentiel/prerequisites-graph.spec.ts`
- construit un graphe simple A → B → C et vérifie l'ordre topologique ;
- rejette l'ajout d'une arête qui créerait un cycle (A→B→C→A) ;
- retourne la liste des prérequis directs et transitifs d'une compétence ;
- gère une compétence sans aucun prérequis.

### `referentiel/entities.spec.ts`
- une compétence appartient toujours à un domaine, qui appartient toujours à une matière, qui appartient toujours à un niveau d'un programme donné (invariants de construction) ;
- deux versions du même programme (`ARCHIVED` et `VALIDATED`) coexistent sans collision d'identifiants.

### `diagnostic/diagnostic-engine.spec.ts`
- génère un jeu de questions couvrant chaque domaine d'une matière donnée, sans doublon de compétence à l'excès ;
- calcule un score par domaine à partir de réponses simulées (mock de `RandomSource` et `Clock` injectés — déterministe) ;
- assigne correctement les statuts `WEAK` (<50%), `DEVELOPING`, `MASTERED` (≥90%) selon les seuils configurables ;
- produit un niveau estimé différent du niveau déclaré quand les réponses simulées le justifient (reproduit l'exemple §12 : maths faibles → niveau estimé inférieur).
- gère un diagnostic avec zéro réponse (session abandonnée) sans lever d'exception.

### `diagnostic/competence-map.spec.ts`
- fusionne un nouveau résultat de diagnostic avec une carte de compétences existante sans écraser les compétences non testées cette fois-ci ;
- fait passer une compétence de `MASTERED` à `REQUIRES_REVIEW` si une régression est détectée (score qui chute significativement).

Ces tests sont écrits et doivent passer **avant** de brancher l'API (étape suivante), conformément à la règle « ne pas passer à l'étape suivante tant que la précédente n'est pas fonctionnelle et testée ».
