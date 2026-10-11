# Pre-release Security Check

## Objet

Ce document formalise le lot `securite publication` demande par le backlog actif :

- inventaire des variables sensibles ;
- checks pre-release ;
- verification des variables potentiellement exposees au client.

Pour le cadre de revue et les regles de correction appliquees sur ce repo, voir aussi [documentation/security/CODEX_SECURITY_PLAYBOOK.md](../security/CODEX_SECURITY_PLAYBOOK.md).

## Commandes de controle

- Check pre-release bloquant :
  - `npm run pre-release:check`
- Audit secrets complementaire :
  - `npm run security:secrets`
- Suite de tests securite :
  - `npm run test:security`

## Inventaire des variables d'environnement

### Variables publiques attendues cote client

Ces variables sont autorisees cote navigateur et doivent rester prefixees `NEXT_PUBLIC_` :

- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_POSTHOG_KEY`
- `NEXT_PUBLIC_POSTHOG_TOKEN`
- `NEXT_PUBLIC_POSTHOG_HOST`
- `NEXT_PUBLIC_POSTHOG_REGION`
- `NEXT_PUBLIC_SENTRY_DSN`

Règle d'exploitation:

- aucune valeur de production ne doit être recopiée en dur dans `apps/web/src/lib/env.ts` ;
- si une variable manque, le build ou le boot doit l'exposer clairement plutôt que de se rabattre sur une prod distante ;
- les clés publiques Supabase doivent suivre le projet lié au dépôt, pas un projet voisin ou ancien.

### Variables strictement serveur

Ces variables ne doivent jamais etre envoyees au client :

- `CLERK_SECRET_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY` (only for local Supabase Studio AI; keep server-side and out of `NEXT_PUBLIC_*`)
- `RESEND_API_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `PINECONE_API_KEY`
- `UPSTASH_REDIS_REST_TOKEN`
- `QSTASH_TOKEN`
- `UPTIMEROBOT_API_KEY`
- `CLOUDFLARE_API_TOKEN`
- `SENTRY_AUTH_TOKEN` (only if source-map upload is enabled through the build plugin)

Règle d'exploitation:

- les clés `service_role` et similaires doivent rester côté serveur ;
- toute exposition dans `NEXT_PUBLIC_*` doit être considérée comme publique par défaut ;
- les synchronisations Vercel ne doivent pousser les secrets qu'avec une action explicite et revue.

## Controles implementes

### 1. Script pre-release

Le script `scripts/ci/pre-release-check.mjs` verifie :

- la presence de fichiers interdits a la racine (`.env.production`, `service-account.json`, `secrets.json`) ;
- la presence de mots-cles sensibles uniquement dans les fichiers susceptibles d'entrer dans le bundle client (`use client`, pages/layouts/templates client) ;
- l'echec explicite de la commande si `--exit-on-error` est utilise et qu'un probleme est detecte.

### 2. Hygiene des templates et de la gouvernance

Le template de pull request impose deja :

- une revue humaine des sorties IA ;
- un controle du poids numerique.

### 3. Verification des expositions

Source de verite :

- schema env : `apps/web/src/lib/env.ts`

Regle de lecture :

- toute variable `NEXT_PUBLIC_*` est presumee exposable ;
- toute variable non prefixee `NEXT_PUBLIC_*` doit rester en contexte serveur ;
- toute nouvelle cle de secret doit etre ajoutee a cet inventaire et couverte par les checks pre-release si le risque d'exposition cote client est realiste.

### 4. Verifications Supabase/Vercel

- Projet Supabase de référence pour CleanMyMap : `supabase-vercel-codex`.
  Vérifier le `project ref` dans `apps/web/supabase/config.toml` et dans le
  Dashboard avant toute commande liée ; ne pas utiliser un projet voisin.
- `npm run backend:doctor` doit passer avant toute publication.
- `npm run backend:supabase:advisors` est la commande autonome et canonique pour les advisories sécurité : elle utilise uniquement le projet distant explicitement lié. `npm run backend:supabase:advisors:linked` est conservée comme alias de compatibilité.
- Une commande CLI authentifiée réussie établit `CLI_AUTH=PASS`, même si
  `SUPABASE_ACCESS_TOKEN` n'est pas dans l'environnement ; rapporter
  `CLI_AUTH_SOURCE` séparément. L'authentification CLI et celle du plugin/MCP
  sont indépendantes.
- Pour un inventaire Advisors exhaustif, utiliser MCP security + performance ou
  le CLI avec `--level info --fail-on none --output-format json` pour chaque
  catégorie. Le garde CLI existant reste limité à son contrat RLS/security.
- Un scoped PAT doit seulement disposer de la permission minimale : `Advisors
  Read` pour les advisors, `Logs Read` pour les logs et `Migrations Read-write`
  pour appliquer une migration ; Owner/Admin n'est pas intrinsèquement requis.
- `SUPABASE_ACCESS_TOKEN` reste un secret de tooling CLI, jamais
  `NEXT_PUBLIC_*`, jamais runtime applicatif et jamais documenté avec sa valeur.
- Le runtime Supabase local ou conteneurisé ne fait plus partie de l'environnement de développement et de validation locale supporté sur le poste utilisateur : ne pas demander à Codex d'installer, démarrer ou sonder Docker/WSL localement. `supabase start`, `supabase status` et `supabase db reset` sont exclus du workflow local canonique ; ils peuvent uniquement être utilisés dans une CI hébergée et éphémère explicitement dédiée au replay Supabase. Une preuve locale qui en dépend est classée `UNSUPPORTED_CONTAINER_RUNTIME`.
- `npm run backend:vercel:env:sync` doit rester public par défaut et ne pousser les secrets qu'avec `--include-secrets`.
- `npm run backend:supabase:push` doit être accompagné d'une revue des policies, fonctions SQL et advisors Supabase.
- Les helpers SQL exposés doivent être relus avec la règle: pas de `SECURITY DEFINER` public sans justification et sans `REVOKE/GRANT` explicites.

### 5. Dégel et pré-release mobile

`apps/mobile` reste `CURRENT / ACTIVE DEVELOPMENT`. Un APK Android
EAS `preview` signé a été construit le 11 octobre 2026 :
[build `beef5909-cd36-4ce9-971e-d3930680ee79`](https://expo.dev/accounts/maxdie/projects/clean-my-map/builds/beef5909-cd36-4ce9-971e-d3930680ee79)
au SHA `fff2ce58a55dc36df7c791e4884f0fd937151bd5`.
Ce n'est ni une release store ni un artefact déjà audité MobSF.
Aucun scan MobSF permanent n'est activé en CI ordinaire.

Lorsqu'une pré-release mobile est explicitement autorisée, toute pré-release
Android ou iOS doit d'abord conserver la preuve du SHA, des versions Expo/RN,
du projet EAS et des credentials utilisés, puis ajouter une étape MobSF sur
l'artefact réel destiné à la distribution
(`.apk`, `.aab` ou `.ipa`). Un scan du seul dépôt source, d'un mock ou d'un
bundle de développement ne constitue pas cette preuve. Le rapport associé à
l'artefact doit être archivé selon la procédure de release ; les findings
bloquants doivent être traités ou acceptés explicitement avant publication.
La validation appareil, les permissions de localisation background, les liens
de domaine, Data Safety/App Privacy et le parcours de suppression de compte
restent obligatoires avant toute qualification store.

L'existence de ce premier APK de test ne lève aucun gate de
pré-release distribuée : le rapport MobSF sur l'artefact destiné
à la diffusion est toujours requis avant toute autorisation.
Aucun package ou workflow permanent MobSF ne doit être ajouté
pour la seule CI ordinaire.

L'initialisation Clerk Android a été débloquée après le refus
`native_api_disabled` : écran de connexion observé, mais pas
de connexion complète ni de retour navigateur validés.
Restent à démontrer JWT/RLS, GPS en premier plan et arrière-plan,
offline/replay, finalisation serveur, cartes, permissions,
sécurité, confidentialité, iOS et stores. Les mots de passe
du premier keystore EAS ont été exposés : rotation avant toute
publication puis mise à jour SHA-256 chez Clerk et SHA-1
pour Maps Android ; distinguer Google Play App Signing.
Voir `apps/mobile/README.md`.

## Limites

- le scan repose sur des mots-cles et ne remplace pas un audit de flux complet ;
- il ne detecte pas toutes les fuites indirectes via serialisation, logs ou payloads externes ;
- les endpoints API doivent continuer a etre verifies par tests et revue humaine.

## Suite recommandee

- ajouter un test dedie sur la liste des variables publiques autorisees ;
- brancher `npm run pre-release:check` dans le workflow CI si le bruit est acceptable ;
- etendre l'inventaire aux services operationnels ajoutes apres mai 2026.
