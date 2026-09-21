/**
 * Port d'horloge : `core` ne doit jamais appeler `Date.now()`/`new Date()`
 * directement, pour que les moteurs restent déterministes et testables.
 * L'adaptateur `apps/api` fournit une implémentation système ; les tests
 * fournissent une horloge fixe.
 */
export interface Clock {
  now(): Date;
}
