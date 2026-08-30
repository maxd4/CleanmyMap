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

Le garde-fou détermine le périmètre à partir des changements de travail, de
l'index, des fichiers non suivis et des commits locaux situés entre
`origin/main` et `HEAD` lorsque cette référence est disponible.

Il exécute toujours les contrôles de gouvernance et de sécurité pertinents,
puis applique la matrice suivante:

| Périmètre détecté | Contrôles bloquants |
| --- | --- |
| Documentation | gouvernance documentaire et contrôle des visuels |
| `apps/web/supabase/` | audit de l'arbre de migrations, gates web statiques et Vitest ciblé |
| Scripts | `npm run test:scripts` |
| TypeScript/source web | lint, typecheck, audit Vercel, politique des fichiers lourds et Vitest ciblé |
| Configuration Vercel ou code nécessitant un build | build de production ; `npx vercel build --yes` seulement si un lien Vercel existe |

Les contrôles hors périmètre sont affichés explicitement comme `[skip]`. Un
changement documentaire ne déclenche donc pas les gates web, scripts,
Supabase ou build. Si aucun changement ne peut être déterminé, le garde-fou
utilise la validation complète séparée `npm run checks:full`.

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

## Validation complète release/transversale

Pour une release ou un changement transversal, utiliser explicitement la voie
complète:

```powershell
npm run checks:full
```

La variante `npm run checks:full:e2e` ajoute Playwright lorsque cette preuve
est requise. `prepush:guard` reste la validation proportionnelle au périmètre
du push courant.
