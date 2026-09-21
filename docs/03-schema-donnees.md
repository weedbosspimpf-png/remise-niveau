# 03 — Schéma de données

> Vue logique. La traduction Prisma exacte (types, index, contraintes) est produite à l'étape 7 (`apps/api/prisma/schema.prisma`).

## 1. Principe directeur : append-only sur le référentiel

Un programme scolaire ne s'édite jamais en place (§8). On **archive** l'ancienne version et on **crée** la nouvelle. Aucune table du référentiel n'a de colonne modifiée après publication autre que `status`.

## 2. Référentiel pédagogique

```
country                    système_educatif            programme (versionné)
──────────                 ──────────────────           ───────────────────────
id (pk)                    id (pk)                       id (pk)
code_iso ("CI","SN"...)    country_id (fk)                education_system_id (fk)
nom                        nom ("Système ivoirien")       annee_scolaire ("2025-2026")
langues[]                                                 version_label ("Version DPFC v3")
                                                           source_id (fk) → source
                                                           status: DRAFT|VALIDATED|ARCHIVED
                                                           validated_at, validated_by
                                                           created_at

source                                          niveau                       matiere
──────                                          ───────                      ─────────
id (pk)                                         id (pk)                      id (pk)
type: OFFICIAL|VERIFIED|SECONDARY|              programme_id (fk)            niveau_id (fk)
      UNVERIFIED|OUTDATED                       code ("6e")                  nom ("Mathématiques")
url / reference_document                        ordre (int, tri)            code
organisme ("Ministère...", "DPFC"...)
recupere_le

domaine                    competence                        prerequisite (arête du graphe)
─────────                  ───────────                       ──────────────────────────────
id (pk)                    id (pk)                            id (pk)
matiere_id (fk)             domaine_id (fk)                    competence_id (fk)   -- dépend de
nom ("Calculs               nom ("Comparaison de               requires_competence_id (fk)
 algébriques")               fractions")                       -- contrainte: pas de cycle (vérifié en base ET dans core)
ordre                       code
                            niveau_difficulte (1..5)
                            objectifs[] (texte)
```

Contrainte clé : `prerequisite` interdit `competence_id = requires_competence_id`, et l'absence de cycle est vérifiée applicativement par `core` (le graphe est petit — pas besoin de CTE récursive pour la détection, seulement pour l'affichage de l'ordre topologique en lecture, via `WITH RECURSIVE`).

## 3. Utilisateurs et profil pédagogique

```
user                              user_profile                        user_objective
──────                            ─────────────                       ───────────────
id (pk)                           user_id (fk, 1-1)                   id (pk)
email (nullable, unique)          country_id (fk)                     user_id (fk)
phone (nullable, unique)          langue                              type: RESUME_SCOLARITE|
password_hash                     age_range                                 REMISE_A_NIVEAU|
created_at                        niveau_declare_id (fk → niveau)           PREPARER_EXAMEN|
last_login_at                     objectif_libre (texte, optionnel)         RENFORCER_MATIERE|
                                                                              ATTEINDRE_NIVEAU|
                                                                              APPRENDRE_DEPUIS_BASES
                                                                        matiere_id (fk, nullable)
                                                                        niveau_cible_id (fk, nullable)
```

email et phone sont tous deux nullables mais un `CHECK` impose qu'au moins l'un des deux soit renseigné (§9 — le téléphone doit pouvoir suffire).

## 4. Niveau réel par matière (déclaré vs estimé)

```
user_subject_level
────────────────────
id (pk)
user_id (fk)
matiere_id (fk)
niveau_declare_id (fk → niveau)     -- copié depuis onboarding, informatif
niveau_estime_id (fk → niveau, nullable)   -- rempli après diagnostic
updated_at
```

Une ligne par (utilisateur, matière) — c'est ce qui permet un niveau estimé différent par matière (§12 : 3e déclarée, maths estimées 5e, français estimé 3e...).

## 5. Carte de compétences

```
user_competence_status
────────────────────────
id (pk)
user_id (fk)
competence_id (fk)
status: NOT_ASSESSED|WEAK|LEARNING|DEVELOPING|MASTERED|REQUIRES_REVIEW
score_pct (0-100, nullable)
last_evaluated_at
consecutive_reviews (int)         -- utilisé plus tard par le moteur de parcours
UNIQUE(user_id, competence_id)
```

Une ligne par (utilisateur, compétence), mise à jour après chaque diagnostic ou exercice — jamais recréée.

## 6. Sessions de diagnostic

```
diagnostic_session                     diagnostic_question              diagnostic_answer
─────────────────────                  ──────────────────────           ────────────────────
id (pk)                                id (pk)                          id (pk)
user_id (fk)                           session_id (fk)                  question_id (fk)
matiere_id (fk)                        competence_id (fk)               reponse_utilisateur (jsonb)
niveau_id (fk)                         enonce (jsonb)                   est_correcte (bool)
started_at / completed_at              choix (jsonb, si QCM)            temps_reponse_ms
status: IN_PROGRESS|COMPLETED|         ordre_presentation                answered_at
        ABANDONED
```

Le résultat agrégé (carte de compétences, niveau estimé) est **calculé** par `core` à partir de `diagnostic_answer`, puis persisté dans `user_competence_status` et `user_subject_level` — jamais l'inverse : les tables de résultat ne sont pas la source de vérité, `diagnostic_answer` l'est, ce qui permet de rejouer le calcul si l'algorithme du moteur évolue.

## 7. Table technique de statut d'ingestion (prépare la Phase 2, non alimentée au MVP)

```
curriculum_ingestion_job
──────────────────────────
id (pk)
source_id (fk)
status: DISCOVERED|DOWNLOADED|EXTRACTED|ANALYZED|
        STRUCTURED|PENDING_REVIEW|VALIDATED|REJECTED
raw_document_url
extracted_payload (jsonb, nullable)
reviewed_by (fk user, nullable)
created_at / updated_at
```

Cette table existe dès le MVP (schéma seulement, aucun job créé) pour que l'arrivée du _Curriculum Discovery Engine_ en Phase 2 n'exige pas de migration structurelle lourde — seulement de nouveaux workers qui y écrivent.

## 8. Index et contraintes notables

- `programme` : index unique `(education_system_id, annee_scolaire, version_label)`.
- `user_competence_status` : index sur `(user_id, status)` pour la vue "à travailler".
- `prerequisite` : index sur `requires_competence_id` (traversée du graphe dans les deux sens).
- Toutes les FK vers le référentiel sont `ON DELETE RESTRICT` — un programme validé ne se supprime jamais, seulement `ARCHIVED`.
