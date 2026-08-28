# Garde-fou pré-push

Objectif: aucun push GitHub ne doit partir sans validation locale stricte.

## Commande standard

```powershell
npm run prepush:guard
```

La commande doit être lancée depuis la racine du repo.

Pour automatiser le contrôle avant commit et push dans ce clone, installe les hooks Git versionnés une seule fois :

```powershell
npm run hooks:install
```

Ensuite :

- `.githooks/pre-commit` (hook extensionless, shell, LF) exécute
  `npm run precommit:guard`
- `.githooks/pre-push` (hook extensionless, shell, LF) exécute
  `npm run prepush:guard`

Les deux scripts CI résolvent la racine du dépôt depuis
`$PSScriptRoot/../..`, puis exécutent le garde-fou depuis cette racine.
La détection Vercel porte donc sur les chemins relatifs à la racine réelle :
`.vercel/project.json` et `apps/web/.vercel/project.json`.

Le garde-fou exécute actuellement, dans l'ordre:

1. `npm run check:root-files`
2. `npm run check:gitnexus-hygiene`
3. `npm run check:9c-public-facades`
4. `npm run check:doc-governance`
5. `npm run audit:vercel-quota`
6. `npm run test:regression-gates`
7. `npm run lint`
8. `npm run typecheck`
9. `npm run build`
10. `npx vercel build --yes` si au moins un fichier de liaison Vercel est présent

L'étape Vercel peut être explicitement ignorée pour un contrôle local avec :

```powershell
npm run prepush:guard -- -SkipVercel
```

Si une étape échoue, le push doit être bloqué.

## Protocole avant chaque push GitHub

1. Vérifier les fichiers modifiés:

```powershell
git status --short
```

2. Lancer le garde-fou complet:

```powershell
npm run prepush:guard
```

3. Si `vercel build` échoue pour une raison d'authentification ou d'environnement, corriger la configuration locale ou récupérer les logs du déploiement Vercel avant de pousser.

4. Pousser uniquement si toutes les étapes sont vertes:

```powershell
git push
```

## Cas Vercel

Le repo est considéré comme lié à Vercel si au moins un de ces fichiers existe
à partir de la racine résolue par le script:

- `.vercel/project.json`
- `apps/web/.vercel/project.json`

Dans ce cas, le contrôle local attendu est:

```powershell
npx vercel build --yes
```

Si un déploiement Vercel existe déjà et qu'il faut analyser ses logs, utiliser l'URL du déploiement concerné:

```powershell
npx vercel inspect <deployment-url> --logs
```

Note Windows: si `vercel build --yes` échoue avec `EPERM: operation not permitted, symlink ...`, le garde-fou doit rester bloquant. Le build applicatif peut être valide, mais l'empaquetage Vercel local n'est pas validé. À résoudre avant push via un environnement qui autorise les symlinks, par exemple terminal administrateur, Developer Mode Windows ou environnement Linux/WSL configuré.

## Exception document-only

Pour une modification strictement documentaire, le build peut être inutile pour travailler localement, mais il reste obligatoire avant un push GitHub si le changement est destiné à être publié.
