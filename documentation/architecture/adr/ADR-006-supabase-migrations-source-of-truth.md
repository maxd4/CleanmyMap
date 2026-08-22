# ADR-006 — Source de vérité des migrations Supabase

**Statut : appliqué pour le workspace web — suppression du miroir historique en attente**
**Date : 11 juillet 2026**

Dernière vérification opérationnelle : 12 août 2026.

## Contexte

Deux arbres de migrations existent :

```txt
apps/web/supabase/migrations/
supabase/migrations/
```

Le workspace web possède :

```txt
apps/web/supabase/config.toml
```

et le script :

```txt
npm run backend:supabase:push -w apps/web
```

exécute Supabase avec :

```txt
--workdir .
```

depuis `apps/web`.

L’intégration GitHub Supabase du projet `supabase-vercel-codex` doit utiliser
le même périmètre :

```txt
Repository       : maxd4/CleanmyMap
Production branch: main
Working directory: apps/web
```

Le `Working directory` ne doit pas être `.` : cette valeur fait rechercher
les migrations dans le mauvais arbre lorsque Supabase clone le dépôt.

Plusieurs tests lisent également les migrations sous `apps/web/supabase/migrations/`.

## Problème

Deux arbres éditables manuellement créent un risque de divergence :

- migration ajoutée dans un seul dossier ;
- test lisant un arbre différent du CLI ;
- base distante non alignée avec la documentation ;
- agent modifiant le mauvais fichier.

## Décision proposée

Déclarer comme source canonique :

```txt
apps/web/supabase/
```

notamment :

```txt
apps/web/supabase/config.toml
apps/web/supabase/migrations/
apps/web/supabase/seed.sql
```

Le dossier racine :

```txt
supabase/migrations/
```

est traité comme miroir historique jusqu'à comparaison et suppression contrôlée.

## Conditions avant suppression du miroir

Ne supprimer aucun fichier avant :

1. comparaison exhaustive des noms ;
2. comparaison des contenus ;
3. vérification des tests ;
4. vérification des scripts ;
5. vérification des docs ;
6. reconstruction locale ;
7. vérification du projet Supabase lié ;
8. plan de rollback.

La comparaison effectuée le 12 août 2026 a confirmé que
`apps/web/supabase/migrations/` contient 85 versions, sans doublon, et que la
liste distante exposée par le projet Supabase contient les mêmes 85 versions.
Cette vérification ne justifie pas la suppression immédiate du miroir racine :
la comparaison des contenus et le plan de retrait restent à formaliser.

## Migration documentaire

Mettre à jour :

```txt
les consignes d'agent applicables au dépôt
documentation/architecture/data-governance.md
documentation/development/TESTING.md
documentation/security/*
apps/web/README.md
```

## Tests

Les tests de migration doivent lire uniquement la source canonique après bascule.

Ajouter si nécessaire un garde-fou temporaire qui détecte une divergence tant que les deux arbres coexistent.

Pour un échec d’intégration GitHub du type :

```txt
Remote migration versions not found in local migrations directory.
```

vérifier dans cet ordre :

1. le dépôt connecté ;
2. la branche de production ;
3. le `Working directory` (`apps/web`) ;
4. la présence des migrations dans `apps/web/supabase/migrations/` ;
5. le journal du workflow Supabase après une nouvelle exécution.

Ne pas utiliser `migration repair`, `db push`, `db reset` ou une modification de
`schema_migrations` pour corriger un mauvais chemin d’intégration. Une nouvelle
exécution doit être déclenchée par le mécanisme officiel Supabase après la
correction de configuration.

## Conséquences

Après application complète :

- un seul arbre éditable ;
- CLI, tests et docs alignés ;
- moins de risque d’agent sur le mauvais chemin.

Le projet Supabase est actuellement sain au niveau service, mais l’état de la
branche `main` doit être contrôlé séparément après chaque changement
d’intégration. Le plan Free ne crée pas automatiquement de branche Preview pour
chaque Pull Request ; l’absence d’une branche Preview ne constitue donc pas,
à elle seule, une preuve d’échec du code applicatif.

## Interdiction

Ne pas maintenir indéfiniment deux copies manuelles sans contrôle de synchronisation.
