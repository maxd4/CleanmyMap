# ADR-006 — Source de vérité des migrations Supabase

**Statut : proposé — à valider après comparaison complète**  
**Date : 11 juillet 2026**

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

## Conséquences

Après application complète :

- un seul arbre éditable ;
- CLI, tests et docs alignés ;
- moins de risque d'agent sur le mauvais chemin.

## Interdiction

Ne pas maintenir indéfiniment deux copies manuelles sans contrôle de synchronisation.
