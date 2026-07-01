# Apprendre

Contenus pédagogiques et guides de compréhension.

## Routes canoniques

| Route | Fiche | Type de page | Statut | Scope | Capture disponible | Priorité | Fichier source principal |
|---|---|---|---|---|:---:|---|---|
| `/learn/bonnes-pratiques` | [Bonnes pratiques](./learn-bonnes-pratiques/learn-bonnes-pratiques-README.md) | page éducative | public | à corriger | non | moyenne | apps/web/src/app/learn/bonnes-pratiques/page.tsx |
| `/learn/comprendre` | [Ordres de grandeur](./learn-comprendre/learn-comprendre-README.md) | page éducative | public | à corriger | non | moyenne | apps/web/src/app/learn/comprendre/page.tsx |
| `/learn/sentrainer` | [S'entraîner](./learn-sentrainer/learn-sentrainer-README.md) | page éducative | public | à corriger | non | moyenne | apps/web/src/app/learn/sentrainer/page.tsx |
| `/learn/ecole` | Mode École du quiz (fiche à créer) | page éducative | public | à documenter | non | moyenne | `apps/web/src/app/learn/ecole/page.tsx` |

## Surfaces intégrées

| Surface | Fiche | Statut | Détail | Source principale |
|---|---|---|---|---|
| Point de départ | [Point de départ](./learn-hub/learn-hub-README.md) | intégré | Plus de `page.tsx` dédié, l'orientation est répartie dans les trois pages canoniques. | `apps/web/src/components/learn/learn-block-journey-section.tsx` |
| Ressources | [Ressources](./learn-ressources/learn-ressources-README.md) | intégré | Plus de `page.tsx` dédié, les ressources sont intégrées à `bonnes-pratiques`. | `apps/web/src/components/learn/learn-ressources-client.tsx` |
| Mode École | Banque de quiz | intégré | La page `learn/ecole` réutilise le kit de quiz école et reste la porte d'entrée scolaire. | `apps/web/src/app/learn/ecole/page.tsx` |

## Notes

- Les fiches de cette famille suivent le format d'audit standard du dossier `pages_site`.
- Les captures officielles, quand elles existent, vivent dans le dossier central `photo/` du bloc et sont en `WebP`.
