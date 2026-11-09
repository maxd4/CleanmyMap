# Runbook déploiement

## Contrat d’exploitation Vercel

Ce document décrit uniquement l’exploitation du déploiement web Vercel. Les
règles Git, de publication et de validation des candidates sont définies par
la gouvernance racine du dépôt ; ce runbook ne les duplique pas.

Le projet Vercel utilise `apps/web` comme `rootDirectory`.

Le chemin canonique pour ce monorepo est l'intégration Git Vercel sur `main`.
Un `vercel deploy` lancé depuis la racine peut tenter d'envoyer tout le
monorepo et dépasser la limite d'upload des fichiers statiques ; un lancement
avec `--cwd apps/web` réapplique alors le `rootDirectory` distant et peut
résoudre `apps/web/apps/web`. Ne pas utiliser ces variantes comme
contournement. Vérifier l'intégration Git et laisser Vercel construire le
commit publié.

## Publication Git et deployment Vercel

La publication Git et le déploiement Vercel sont deux opérations distinctes.
Un commit présent sur `origin/main` ne constitue pas nécessairement un
deployment si l'intégration Git Vercel est désactivée. Vercel reste propriétaire
du lifecycle de deployment ; ce runbook ne transforme pas une publication Git
en déploiement.

Pendant un moratoire Vercel, la publication Git n'est autorisée qu'après preuve
que l'intégration Git et les autres déclencheurs automatiques sont désactivés
et vérifiés. Aucun déploiement manuel, promotion, Deploy Hook ou appel d'API de
déploiement n'est autorisé pendant cette période.

Avant une demande de déploiement Web, la voie rapide autorisée est :

```powershell
npm run checks:deploy -- --deployment-ref=<sha-production-verifie> --deployment-proof=<preuve-vercel.json>
npm run release:check -- --sha=<sha-candidat> --target=production --profile=deploy
```

Pour une campagne DEPLOY autorisée à publier automatiquement, fournir en plus
la liste complète des fichiers attribués au chantier :

```powershell
npm run checks:deploy -- --auto-publish `
  --candidate-file=<chemin-1> --candidate-file=<chemin-2> `
  --deployment-ref=<sha-production-verifie> `
  --deployment-proof=<preuve-vercel.json>
```

Le runner capture staged, unstaged et non suivis non ignorés dans un index
temporaire, refuse tout fichier étranger, secret ou artefact généré, valide
l'arbre exact, puis commit et pousse uniquement l'allowlist attribuée après
les guards et la release gate. Un changement concurrent, une preuve manquante,
un contrôle non vert, une divergence distante ou un échec du push bloque la
publication. Il vérifie enfin `HEAD = origin/main` et la divergence `0/0`.

Cette preuve DEPLOY est distincte de FULL, ne couvre que la portée Web
détectée cumulativement depuis le SHA de Production Vercel effectivement
vérifié. La preuve JSON doit confirmer le projet `web`, la racine `apps/web`,
la cible `production`, le commit Git et la méthode de vérification. Une base
Git arbitraire ou une référence Production non vérifiable bloque la campagne
et ne peut pas produire `RELEASE_READY: YES`. Cette validation ne déclenche
aucun deployment.
Pour une candidate mixte Web/Mobile/E2E, le plan DEPLOY ajoute les contrôles
correspondant aux chemins affectés ; un changement Web reste nécessaire pour
qu'une publication DEPLOY soit exploitable. Les périmètres Python, workflows
GitHub ou autres surfaces non couvertes restent bloquants et doivent suivre la
procédure appropriée. Cette validation ne déclenche aucun deployment et ne
modifie pas Supabase.

## Flux normal

1. Exécuter le préflight local :

   ```powershell
   npm run vercel:deploy:preflight -w apps/web -- --mode=source
   ```

2. Effectuer la publication Git conformément à la gouvernance racine.
3. Lorsque l'intégration Git Vercel est active et qu'aucun moratoire ne
   l'interdit, laisser Vercel construire et déployer automatiquement le commit
   publié.
4. Inspecter le deployment, son état, son projet, son environnement et ses
   alias.
5. Vérifier `/api/health` et `/api/uptime` sur le domaine actif.
6. Exécuter un smoke ciblé des parcours concernés si le changement le justifie
   (authentification, action, administration ou API métier).

## Préflight du prebuilt

Le prebuilt n'est pas le chemin nominal sur le poste Windows. Après un
`vercel build --prod`, le CLI peut produire des liens symboliques dans
`.vercel/output`; l'upload distant peut alors échouer avec `ENOENT`. Le
préflight les détecte sans les matérialiser ni modifier les sources :

```powershell
npm run vercel:deploy:preflight -w apps/web -- --mode=prebuilt --plan=hobby
```

Un résultat rouge doit arrêter la publication. Utiliser l'intégration Git ou
un runner Linux pour un prebuilt ; ne pas committer `.vercel/output` et ne pas
transformer manuellement ses liens en fichiers comme procédure normale.

Le préflight compte aussi les fonctions produites. Le déploiement actuel
génère plus de 12 fonctions ; le plan Hobby ne peut donc pas accepter ce
prebuilt. Les limites officielles sont décrites par [Vercel](https://vercel.com/docs/limits)
et [les runtimes Vercel](https://vercel.com/docs/functions/runtimes). Les
choix humains sont soit de conserver le déploiement Git compatible avec le
plan actuel, soit de passer l'équipe en Pro, soit de réduire explicitement la
surface serveur dans un chantier séparé.

## Préflight applicatif et environnement

- Vérifier les validations applicatives pertinentes : typecheck, lint et tests
  ciblés.
- Vérifier la présence et la cohérence des variables critiques Clerk/Supabase
  sans afficher leurs valeurs.
- Si le changement touche le build ou les routes Vercel, exécuter d'abord
  `npm run build -w apps/web` et `npm run audit:vercel-quota` selon le périmètre.
- `vercel pull --environment=production` peut écrire `[SENSITIVE]` à la place
  des valeurs secrètes. Ce fichier est un modèle redacted, pas un
  environnement utilisable pour un prebuilt local. Ne jamais remplacer les
  secrets par des valeurs inventées ni committer ce fichier ; pour un build
  local ponctuel, injecter des valeurs de développement dans l'environnement
  du processus ou utiliser le build Vercel distant.
- Le préflight est disponible via `apps/web/scripts/vercel-deploy-preflight.mjs`
  et échoue volontairement lorsqu'un risque de packaging ou de quota est
  détecté.

## Incident et récupération

Privilégier le rollback ou la promotion d'un deployment Vercel existant et
déjà vérifié. Après l'opération, refaire l'inspection, les contrôles de santé et
le smoke ciblé.

Pour un SHA historique sans deployment réutilisable, ne matérialiser ni copie
ni environnement ad hoc. Utiliser uniquement le mécanisme canonique de
candidate Git `prepush-candidate/<sha>`, lorsque le workflow de validation le
supporte. Si aucun workflow supporté par le dépôt ne permet l'opération, faire
STOP et signaler le blocage.

Si Vercel répond `TEAM_ACCESS_REQUIRED` ou indique que l'auteur Git n'a pas
accès à l'équipe, arrêter les retries. Corriger l'accès ou l'identité de
publication conformément à la gouvernance racine ; aucun amend, réécriture
d'historique ou force-push n'est autorisé.

## Vérifications post-déploiement et preuves

Vérifier d'abord le deployment et ses alias :

```powershell
npx vercel inspect <deployment-url> --json --non-interactive
Invoke-WebRequest -Uri https://cleanmymap.fr/ -Method Head -UseBasicParsing
```

Pour un incident de persistance ou d'écriture fichier, lire uniquement une
fenêtre bornée des logs runtime, sans requête d'écriture :

```powershell
npx vercel logs --project <project-id> --environment production --since 15m --query '/api/contact' --limit 100 --json --non-interactive
npx vercel logs --project <project-id> --environment production --since 15m --query '/api/legal-content-reports' --limit 100 --json --non-interactive
npx vercel logs --project <project-id> --environment production --since 15m --query 'EROFS' --limit 100 --json --non-interactive
```

Une sortie vide signifie qu'aucune ligne correspondante n'a été observée dans
la fenêtre demandée ; elle ne prouve pas qu'une route a reçu du trafic. Le
compte rendu doit distinguer ces deux faits.
