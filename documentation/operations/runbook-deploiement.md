# Runbook déploiement

## Contrat d’exploitation Vercel

Ce document décrit uniquement l’exploitation du déploiement web Vercel. Les
règles Git, de publication et de validation des candidates sont définies par
la gouvernance racine du dépôt ; ce runbook ne les duplique pas.

Le projet Vercel utilise `apps/web` comme `rootDirectory`.

## Flux normal

1. Effectuer la publication Git conformément à la gouvernance racine.
2. Laisser Vercel construire et déployer automatiquement le commit publié.
3. Inspecter le deployment, son état, son projet, son environnement et ses
   alias.
4. Vérifier `/api/health` et `/api/uptime` sur le domaine actif.
5. Exécuter un smoke ciblé des parcours concernés si le changement le justifie
   (authentification, action, administration ou API métier).

## Préflight applicatif et environnement

- Vérifier les validations applicatives pertinentes : typecheck, lint et tests
  ciblés.
- Vérifier la présence et la cohérence des variables critiques Clerk/Supabase
  sans afficher leurs valeurs.
- Si le changement touche le build ou les routes Vercel, exécuter d'abord
  `npm run build -w apps/web` et `npm run audit:vercel-quota` selon le périmètre.
- Si `vercel build` échoue sur Windows avec
  `EPERM: operation not permitted, symlink`, arrêter les retries et corriger
  l'environnement Windows (shell élevé ou Developer Mode) avant de relancer.

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
