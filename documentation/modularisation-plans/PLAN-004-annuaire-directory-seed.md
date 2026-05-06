# Plan de Modularisation : Annuaire Directory Seed

**Fichier Cible** : `apps/web/src/components/sections/rubriques/annuaire-directory-seed.ts`
**Taille Actuelle** : ~659 lignes, 26 KB
**Objectif** : Aucun fichier > 8 KB. Séparation des données par type d'acteur.

Ce plan est relativement simple car il ne s'agit que de données statiques (configuration), mais il faut conserver l'API publique pour ne pas casser la carte ou l'annuaire.

Validez chaque phase avec `npm run typecheck` et `npm run lint`.

---

## Phase 1 : Extraction des types (si nécessaire)

**Instructions pour l'agent** :
```markdown
1. Vérifie d'où provient le type `AnnuaireEntry` (actuellement importé depuis `./annuaire-map-canvas`). S'il est lourdement imbriqué, crée un fichier `apps/web/src/components/sections/rubriques/annuaire/annuaire.types.ts` et déplaces-y cette interface, puis mets à jour les imports. Si le type est déjà bien isolé, ignore cette étape.
```

## Phase 2 : Découpage des données par catégories

**Instructions pour l'agent** :
```markdown
1. Crée le dossier `apps/web/src/components/sections/rubriques/annuaire/`.
2. Inspecte le grand tableau `INITIAL_ANNUAIRE_ENTRIES`.
3. Crée `seed-associations.ts` et déplaces-y toutes les entrées dont le `kind` est `"association"` ou `"groupe_parole"`.
4. Crée `seed-entreprises.ts` et déplaces-y toutes les entrées dont le `kind` est `"entreprise"` ou `"commerce"`.
5. Crée `seed-evenements.ts` et déplaces-y toutes les entrées dont le `kind` est `"evenement"`.
6. Si tu trouves d'autres catégories (ex: `"collectivite"`), crée le fichier correspondant.
7. Dans chaque nouveau fichier `seed-*.ts`, exporte le tableau partiel (ex: `export const ASSOCIATIONS_ENTRIES: AnnuaireEntry[] = [...]`).
```

## Phase 3 : Reconstruction de l'index combiné

Pour ne pas casser l'application, l'import originel doit continuer à fournir le tableau complet.

**Instructions pour l'agent** :
```markdown
1. Crée le fichier `apps/web/src/components/sections/rubriques/annuaire/seed-index.ts`.
2. Importes-y tous les tableaux partiels (`ASSOCIATIONS_ENTRIES`, `ENTREPRISES_ENTRIES`, etc.).
3. Combine-les et exporte-les sous le même nom qu'avant :
   ```typescript
   export const INITIAL_ANNUAIRE_ENTRIES: AnnuaireEntry[] = [
     ...ASSOCIATIONS_ENTRIES,
     ...ENTREPRISES_ENTRIES,
     ...EVENEMENTS_ENTRIES,
   ];
   ```
4. Dans toute l'application (utilise la recherche globale), remplace l'import pointant vers `annuaire-directory-seed.ts` par le nouvel import pointant vers le dossier `annuaire/seed-index.ts`.
5. Supprime l'ancien fichier `annuaire-directory-seed.ts`.
```
**Validation** : L'application compile, la carte affiche toujours tous les points, et chaque fichier source fait moins de 8 KB.

---

## Phase 4 : Améliorations Kaizen (Data Management)

Bien qu'il s'agisse de data statique, la structure peut être optimisée.

**Instructions pour l'agent (Analyse & Suggestions)** :
```markdown
1. **Cohérence des données** : Vérifie que tous les `id` sont uniques à travers tous les fichiers seed. Suggère l'ajout d'une fonction utilitaire qui `throw Error` si des doublons d'IDs sont détectés au moment de la fusion dans `seed-index.ts`.
2. **Maintenance future** : Suggère un court script ou une routine d'administration permettant à terme de migrer ces "seeds" en dur vers une vraie base de données (Supabase / Postgres), vu que le fichier devenait beaucoup trop lourd.
```

## Résultat Attendu
Une source de données statiques propre et facilement navigable par les futurs développeurs, sans casser le fonctionnement de l'annuaire existant.
