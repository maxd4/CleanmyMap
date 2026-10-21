# Backpressure web : contrat local

Statut : `CURRENT` pour le code observé ; propriétaire : `apps/web/src/lib/backpressure/index.ts` ; consommateur identifié : `apps/web/src/app/api/actions/import/route.ts`.

## Contrat runtime (ne pas extrapoler)

- `acquireBackpressure(operationType, operationId)` retourne `{ allowed: true }` ou `{ allowed: false, reason?, retryAfter?, position? }`.
- `releaseBackpressure(operationType)` décrémente le compteur dans un `finally` chez l'appelant.
- Configurations *in-process* actuelles, **non distribuées** entre instances Vercel :

| Type | `maxConcurrent` | `queueSize` | `timeoutMs` configuré | Politique |
|---|---:|---:|---:|---|
| `import` | 2 | 10 | 300000 | `drop-newest` |
| `batch` | 5 | 20 | 60000 | `delay` |
| `event` | 10 | 100 | 30000 | `delay` |
| `default` | 10 | 50 | 30000 | `delay` |

**Limites de l'implémentation** : le compteur et la file sont des Maps mémoire locales au processus ; le `timeoutMs` configuré n'est pas utilisé comme mécanisme d'interruption dans `index.ts` ; le timer de `releaseBackpressure` retire une entrée de file mais **n'exécute pas** une requête HTTP différée. Un élément en file n'est donc pas une tâche asynchrone prise en charge par un worker. Le consommateur doit retourner une réponse de refus/retry selon son propre contrat.

## Points à vérifier lors d'une modification

1. `apps/web/src/app/api/actions/import/route.ts` : garde admin et validation avant mutation ; acquisition et libération symétriques.
2. `apps/web/src/app/api/actions/import/route.test.ts` : scénario refus, statut, audit et absence de mutation interdite.
3. Exécution multi-instances : **ne jamais présenter les limites mémoire par processus comme quota distribué global**.
4. Aucune API de monitoring générique ou file Redis n'est décrite comme CURRENT sans code effectif.
