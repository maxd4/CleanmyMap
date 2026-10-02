# DAST public passif — OWASP ZAP Baseline (`CURRENT`)

Le workflow [`dast-zap-baseline.yml`](../../.github/workflows/dast-zap-baseline.yml)
exécute chaque semaine, le lundi à 02:30 UTC, un scan OWASP ZAP Baseline sur
`https://cleanmymap.fr`. `workflow_dispatch` permet une exécution manuelle du
même contrat.

## Contrat d'exécution

- l'action officielle [`zaproxy/action-baseline`](https://github.com/zaproxy/action-baseline)
  est épinglée sur le commit complet
  `de8ad967d3548d44ef623df22cf95c3b0baf8b25` (release `v0.15.0`) ;
- le scan utilise le spider initial pendant une minute (`-m 1`) et l'analyse
  passive ZAP Baseline ; il n'active ni scan complet, ni spider AJAX (`-j`), ni
  option d'attaque ;
- `-s` conserve une sortie console courte et l'action publie le rapport lisible
  dans l'artefact `zap-baseline-report` ;
- `-I` évite qu'un avertissement passif transforme seul le workflow en échec,
  tandis qu'une erreur d'exécution du scanner reste visible dans le résultat ;
- `allow_issue_writing: false` et `token: ""` empêchent toute création
  automatique d'issue et aucun secret de production n'est fourni ;
- les permissions sont vides au niveau workflow et limitées à
  `contents: read` pour le checkout de la configuration.

Le scan est un contrôle de découverte et de configuration passive. Il ne
constitue pas une preuve d'accès authentifié, de couverture des routes privées,
de comportement métier ou de sécurité RLS. L'exécution locale n'est pas requise
pour modifier le contrat ; la preuve d'exécution DAST est le rapport du run
GitHub Actions correspondant.

## Périmètre public borné

Le contexte versionné [`zap-public.context`](../../scripts/security/zap-public.context)
inclut uniquement des surfaces publiques et stables : accueil, version anglaise,
explorer, carte des actions, ressources d'apprentissage et méthodologie, open
data, pages légales/confidentialité/cookies, contact, `robots.txt`, `sitemap.xml`
et les trois pages publiques de sections explicitement listées dans le fichier.
Les paramètres de requête sont admis pour ces routes, sans élargir les chemins
crawlés.

Les exclusions explicites couvrent :

- `/admin`, `/dashboard`, `/pilotage`, `/partners` et
  `/sponsor-portal` : surfaces d'administration ou de partenaires ;
- `/sign-in`, `/sign-up`, `/onboarding`, `/profil`, `/reglages` et
  `/messagerie` : surfaces authentifiées ou liées à une session ;
- les familles `/api/` d'administration, Actions, Chat, compte, authentification,
  communauté, contact, financement, Stripe, signalements, uploads, webhooks,
  envoi, cron, utilisateurs, gamification, rapports et autres traitements
  susceptibles de muter ou traiter des données.

Ces exclusions évitent qu'un spider anonyme suive une surface nécessitant une
identité, tente une mutation par découverte de route, traite un upload ou
atteigne un webhook/cron. Elles bornent le crawl ; elles ne suppriment aucune
alerte ZAP et ne constituent pas une allowlist globale `OUTOFSCOPE`.

Toute nouvelle route publique stable doit être ajoutée explicitement au
contexte et documentée ici. Toute route de mutation, d'upload, de webhook,
d'administration ou d'authentification reste hors de ce scan et relève de son
contrat de test ou de sécurité propre.

## Qualification CURRENT des catégories observées

Le run réel `36977345907` a produit les catégories `10017`, `10038-1`, `10098`,
`90003` et `90004-2`. Elles restent visibles dans les rapports ZAP ; ces
qualifications ne sont ni une allowlist générale ni une désactivation de règle.

- `10017` — dépendance cross-origin Clerk de confiance : `KEEP_VISIBLE`. Le
  signal est conservé pour revue, car le loader Clerk reste une dépendance
  externe de l’application.
- `10038-1` — dette transitoire CSP en `Report-Only` : à corriger dans la
  gouvernance CSP ; ce n’est pas un faux positif permanent et aucune exclusion
  durable ne doit être ajoutée.
- `10098` — `KEEP_PUBLIC_NONCREDENTIALLED_CORS` uniquement tant que le wildcard
  reste limité aux ressources publiques et qu’aucune réponse ne porte
  `Access-Control-Allow-Credentials`. Le contrat ZAP garde les API privées hors
  périmètre et le test de contrat inspecte leurs handlers pour interdire la
  combinaison wildcard + credentials.
- `90003` — risque SRI résiduel du loader Clerk : le finding reste visible et ne
  doit pas être ignoré.
- `90004-2` — `KEEP_NOT_APPLICABLE_CROSS_ORIGIN_ISOLATION` tant qu’aucun
  consumer `SharedArrayBuffer`, `crossOriginIsolated` ou besoin équivalent
  n’existe dans CleanMyMap. Cette qualification devra être réévaluée à
  l’apparition d’un tel consumer.
