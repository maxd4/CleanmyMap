---
name: cleanmymap-ui-testing
description: "Utiliser quand une tâche CleanMyMap exige une vérification navigateur, Playwright, capture, comparaison visuelle, parcours protégé ou reproduction UI locale."
category: repository
risk: safe
source: local
tags: "[ui, browser, playwright, screenshots, clerk, regression]"
---

# CleanMyMap — validation UI et navigateur

## But

Choisir le bon harness d'authentification et produire une preuve visuelle/comportementale correspondant réellement à la surface testée.

## Classifier la surface avant le test

```text
PUBLIC
PROTECTED_SERVER_ONLY
PROTECTED_CLERK_CLIENT
PROD_SMOKE
E2E_MUTABLE_SUPABASE
```

### PUBLIC

Aucune AuthN. Utiliser le navigateur ou Playwright sans bypass.

### PROTECTED_SERVER_ONLY

AuthN/AuthZ côté serveur uniquement. Utiliser le lanceur local canonique avec le bypass de développement et le **rôle minimal** requis.

### PROTECTED_CLERK_CLIENT

La surface dépend de `useUser`, `useAuth`, `SignedIn/SignedOut`, UI Clerk ou d'une vraie session navigateur. Le bypass serveur ne suffit pas. Utiliser le harness Clerk Development prévu par le dépôt, sur `localhost:3000` lorsque le contrat l'impose.

### PROD_SMOKE

Utiliser uniquement le protocole production documenté ; aucun bypass local.

### E2E_MUTABLE_SUPABASE

Uniquement dans la lane CI éphémère prévue. Ne pas installer ni démarrer un Supabase local/Docker pour contourner cette frontière.

## Annonce minimale

Avant une validation navigateur, expliciter :

```text
AUTH_SURFACE: PUBLIC | PROTECTED_SERVER_ONLY | PROTECTED_CLERK_CLIENT | PROD_SMOKE | E2E_MUTABLE_SUPABASE
BROWSER_HARNESS: integrated browser | Playwright | Clerk Development
AUTH_MODE: NONE | DEV_BYPASS | CLERK_DEVELOPMENT
HOST_URL: actual URL used
ROLE: actual or simulated role
PERSISTENCE: NONE | REMOTE_READONLY | CI_EPHEMERAL
```

## Règles

- Ne jamais injecter de clés Clerk Production dans localhost.
- Pour la lane Clerk officielle, utiliser `CMM_DISABLE_DEV_AUTH_BYPASS=1`.
- Le bypass ne doit modifier ni les permissions métier ni les contrôles centraux AuthN/AuthZ.
- Distinguer problème de session, boot Clerk, AuthZ, permission navigateur et environnement hôte.
- Tester les états pertinents : chargement, vide, erreur, accès refusé, succès et responsive selon le changement.
- Pour une cible UI fournie, comparer réellement le rendu aux largeurs pertinentes ; ne pas substituer une interprétation libre à la référence visuelle.
- Une capture est une preuve visuelle, pas une preuve d'AuthZ ou de persistence.

## Validation finale

Rapporter ce qui a été réellement vérifié, l'URL/harness utilisé et les éventuels écarts restants. Ne jamais présenter un bypass serveur comme preuve d'une session Clerk client réelle.
