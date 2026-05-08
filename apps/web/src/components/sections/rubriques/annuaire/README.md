# Annuaire Directory Seeds - Structure Modularisée

## Vue d'ensemble

Les données statiques de l'annuaire ont été modularisées pour améliorer la maintenabilité et la navigation du code.

## Structure

```
annuaire/
├── seed-associations.ts      # Entrées de type "association" (12.7 KB)
├── seed-entreprises.ts        # Entrées de type "entreprise" et "commerce" (10 KB)
├── seed-evenements.ts         # Entrées de type "evenement" (4.5 KB)
├── seed-groupes-parole.ts     # Entrées de type "groupe_parole" (0.8 KB)
└── seed-index.ts              # Point d'entrée combinant tous les seeds (0.9 KB)
```

## Utilisation

```typescript
import { INITIAL_ANNUAIRE_ENTRIES } from "@/components/sections/rubriques/annuaire/seed-index";
```

## Validation

Le fichier `seed-index.ts` inclut une validation automatique qui vérifie l'unicité des IDs à travers tous les fichiers seed. Si des doublons sont détectés, une erreur est levée au moment de l'import.

## Migration depuis l'ancien fichier

L'ancien fichier `annuaire-directory-seed.ts` (26 KB) a été supprimé. Tous les imports ont été mis à jour pour pointer vers le nouveau `seed-index.ts`.

## Prochaines étapes (Phase 4 - Kaizen)

1. **Migration vers base de données** : Envisager de migrer ces données statiques vers Supabase pour faciliter la maintenance et permettre des mises à jour dynamiques.

2. **Optimisation supplémentaire** : Les fichiers `seed-associations.ts` et `seed-entreprises.ts` pourraient être subdivisés davantage si nécessaire (par exemple, par arrondissement ou par type de contribution).

3. **Validation des données** : Ajouter des validations Zod pour garantir la cohérence des données au moment du build.
