# Garde-fou pré-push

Le hook automatique protège chaque push courant avec des contrôles rapides du
candidat Git exact. Un push courant n'est pas une release et ne remplace pas
les validations lourdes de fin de chantier, de release ou de déploiement.

## Commande manuelle du garde-fou rapide

```powershell
npm run prepush:guard
```

La commande doit être lancée depuis la racine du repo. Sans protocole Git, elle
utilise le fallback `origin/main...HEAD`, affiché comme `manual-fallback`, et
les contrôles statiques lisent `HEAD` plutôt que le WORKTREE.

Pour automatiser le contrôle avant commit et push dans ce clone, installe les hooks Git versionnés une seule fois :

```powershell
npm run hooks:install
```

Ensuite :

- `.githooks/pre-commit` (hook extensionless, shell, LF) exécute
  `npm run precommit:guard`
- `.githooks/pre-push` (hook extensionless, shell, LF) exécute
  `npm run prepush:guard` sur le `PUSH_CANDIDATE` fourni par Git.

Le chemin automatique est bloquant et conserve uniquement :

- le protocole pre-push et la vérification fast-forward ;
- `git diff --check` sur les ranges réellement envoyés ;
- l'audit des secrets du candidat ;
- les contrôles statiques critiques de sécurité et de gouvernance sur le SHA
  candidat exact.

Il ne lit ni le WORKTREE dirty, ni l'index, ni les fichiers untracked pour
définir le candidat et n'installe aucune dépendance.

La validation complète existante reste disponible explicitement avec :

```powershell
npm run prepush:guard -- -Full
```

Pour une release ou un changement transversal, préférer les commandes
canoniques `npm run checks:full`, `npm run pre-release:check` et les builds
explicitement requis.

Les deux scripts CI résolvent la racine du dépôt depuis
`$PSScriptRoot/../..`, puis exécutent le garde-fou depuis cette racine.
La détection Vercel porte donc sur les chemins relatifs à la racine réelle :
`.vercel/project.json` et `apps/web/.vercel/project.json`.

Le garde-fou détermine le périmètre uniquement à partir des lignes du
protocole pre-push et applique la matrice rapide suivante :

| Candidat Git | Contrôles bloquants rapides |
| --- | --- |
| Toute ref non supprimée | diff check, audit secrets, contrat d'environnement, hygiène des fichiers racine, sentinelles workspace, sécurité GitHub Actions, politique lockfile |

Les contrôles statiques utilisent `run-static-candidate-check.mjs` et
`--ref=<local-sha>`. Les checks dynamiques, lint, typecheck, Vitest, build et
Vercel sont exclus du chemin normal.

Si une étape rapide échoue, le push est bloqué jusqu'à résolution.

## Protocole de validation lourde explicite

1. Vérifier les fichiers modifiés:

```powershell
git status --short
```

2. Pour une validation candidate complète volontaire, lancer :

```powershell
npm run prepush:guard -- -Full
```

3. Pour une validation de release, lancer plutôt `npm run checks:full` et
`npm run pre-release:check` selon le périmètre.

4. Pousser après les validations requises pour le contexte :

```powershell
git push
```

## Cas Vercel

Le repo est considéré comme lié à Vercel si au moins un de ces fichiers existe
à partir de la racine résolue par le script:

- `.vercel/project.json`
- `apps/web/.vercel/project.json`

Dans ce cas, un build Vercel est une validation explicite, pas une étape du
hook courant :

```powershell
npx vercel build --yes
```

Si un déploiement Vercel existe déjà et qu'il faut analyser ses logs, utiliser l'URL du déploiement concerné :

```powershell
npx vercel inspect <deployment-url> --logs
```

Note Windows : si `vercel build --yes` échoue avec `EPERM: operation not permitted, symlink ...`, la validation Vercel est bloquée. Le build applicatif peut être valide, mais l'empaquetage Vercel local n'est pas validé.

## Validation complète release/transversale

Pour une release ou un changement transversal, utiliser explicitement la voie
complète :

```powershell
npm run checks:full
```

La variante `npm run checks:full:e2e` ajoute Playwright lorsque cette preuve
est requise. `prepush:guard` reste la validation rapide proportionnelle au
push courant ; `-Full` est une voie manuelle de compatibilité et de diagnostic,
pas une étape automatique du push.
