# Rate limiting — `CURRENT` et `PLAN`

## CURRENT — runtime vérifié

Les helpers de `apps/web/src/lib/rate-limit/` résolvent l'identité depuis la
requête serveur : `authenticated:<Clerk userId>` pour une session Clerk et
`anonymous:<IP>` depuis les sources d'IP de plateforme prévues. Le header
client `x-user-id` et les clés arbitraires de payload ne sont pas des preuves.
La clé comprend la méthode et le pathname.

Quand Upstash est configuré, `verifyRateLimit()` utilise le store distribué
partagé. Le `Map` local est nettoyé périodiquement, reste limité au processus et
n'est jamais une garantie de production multi-instance. Il n'est autorisé qu'en
mode best-effort pour les lectures publiques peu coûteuses. Pour les opérations
qui exigent une garantie anti-abus, une absence de configuration, une erreur ou
un timeout Upstash refuse la requête en `503 RATE_LIMIT_UNAVAILABLE` : le
fallback mémoire ne doit pas supprimer silencieusement cette garantie. Le
journal serveur indique la politique appliquée sans secret.

La classe de protection est indépendante du profil de quota et ne modifie donc
pas les limites normales :

| Classe | Exemples | Panne/timeout du store distribué |
|---|---|---|
| `public-read` | GET/HEAD publics non coûteux | fallback mémoire best-effort, avec sa limite process-local |
| `mutation` | POST, PUT, PATCH et DELETE | `503 RATE_LIMIT_UNAVAILABLE` |
| `credential` | auth/sign/login, codes d'identité et accès d'équipe | `503 RATE_LIMIT_UNAVAILABLE` |
| `upload` | médias de signalement, imports et médias/routes SPOGOMI | `503 RATE_LIMIT_UNAVAILABLE` |
| `expensive` | IA, recommandation, géocodage, rapports et exports | `503 RATE_LIMIT_UNAVAILABLE` |

Les classes `credential`, `upload` et `expensive` s'appliquent aussi lorsque
leur méthode est GET/HEAD. Le classement est porté par le helper canonique du
répertoire `apps/web/src/lib/rate-limit/` ; il ne constitue pas une seconde
liste de quotas. Le fallback local ne doit jamais être interprété comme une
protection distribuée : deux instances peuvent chacune accepter leur première
lecture lorsque Upstash est indisponible.

Le classement est déterminé par la méthode et le pathname, avant l'exécution
du handler :

- `credential` couvre `/api/auth`, `/api/sign`, `/api/login`, les accès d'équipe
  et les routes d'émission de codes d'identité ;
- `upload` couvre les imports d'actions, les médias de signalement et les
  surfaces d'import, galerie ou route GPX SPOGOMI ;
- `expensive` couvre l'IA, la recommandation d'itinéraire, le géocodage, les
  sélecteurs Clerk paginés, l'analytics funnel, les rapports et les exports ;
- toute méthode `POST`, `PUT`, `PATCH` ou `DELETE` restante est une
  `mutation` ;
- un GET/HEAD qui ne relève d'aucune de ces catégories est une lecture
  `public-read` peu coûteuse pour la politique de panne. Cette étiquette ne
  remplace jamais AuthN/AuthZ et ne rend pas une donnée privée publique.

Les limites `limit` et `window` fournies par un handler sont conservées. La
politique de panne ajoute seulement les métadonnées de résultat suivantes :

| Résultat | HTTP | Contrat |
|---|---:|---|
| quota distribué disponible et accepté | — | le handler continue |
| quota distribué épuisé | `429` | `RATE_LIMIT_EXCEEDED`, `Retry-After` et headers de quota |
| protection distribuée indisponible sur une classe fail-closed | `503` | `RATE_LIMIT_UNAVAILABLE`, `Retry-After`, aucun handler exécuté |
| protection distribuée indisponible sur `public-read` | — | `source = local-fallback`, sans promesse multi-instance |

Les consommateurs qui utilisent `createServerRateLimitResponse()` doivent lui
passer le résultat complet de `verifyRateLimit()` ou
`enforceServerRateLimitForAuthenticatedUser()`. Le champ `failure` distingue
une indisponibilité (`distributed-unavailable`) d'un quota réellement épuisé ;
un consommateur ne doit pas convertir le premier cas en `429`.

Le middleware applique la même distinction. Il conserve les chemins techniques
explicitement exclus (`/api/health`, `/api/uptime`, `/api/email/test`, fichiers
statiques) ; cette exclusion ne constitue pas une garantie anti-abus pour une
route métier et ne doit pas être étendue sans contrat séparé.

Profils par défaut :

| Profil | Limite | Fenêtre | Stratégie |
|---|---:|---:|---|
| `default` | 100 | 60 s | sliding window |
| `auth` | 10 | 60 s | sliding window |
| `api` | 50 | 60 s | token bucket |
| `read` | 50 | 60 s | token bucket |
| `ai` | 20 | 60 s | sliding window |
| `write` | 10 | 60 s | sliding window |

Les dépassements réels de quota renvoient `429`, `RATE_LIMIT_EXCEEDED`,
`Retry-After` et, si disponibles, les headers de quota. Une protection
distribuée indisponible renvoie `503`, `RATE_LIMIT_UNAVAILABLE` et
`Retry-After`; ce statut ne signifie pas que le quota normal est épuisé. Les
options spécifiques d'un handler peuvent être plus strictes que ces profils,
mais ne changent pas la politique de panne de la classe de route.

Les handlers actuellement concernés incluent les POST d'actions, chat,
signalements, événements, contact, métriques pédagogiques, newsletter et
onboarding partenaires, ainsi que le GET authentifié
`/api/actions/account-options` utilisé par les sélecteurs d'organisateurs et de
membres. Cette route applique `verifyRateLimit()` à 60 requêtes par minute,
borne sa recherche et sa pagination, et ne renvoie qu'une projection Clerk
publique minimale. Les GET de chat et d'événements ne passent pas par
`verifyRateLimit()` dans le runtime décrit ici. BotID reste une protection
anti-automation navigateur distincte sur les routes explicitement configurées ;
il ne remplace ni AuthN/AuthZ ni le rate limit.

Les formulaires publics conservent leurs contrôles `honeypot` et `submittedAt`
lorsqu'ils sont prévus par leur contrat. Les wrappers génériques ne prouvent
pas qu'une route les utilise.

## CURRENT — tests de non-régression

La suite ciblée `apps/web/src/lib/rate-limit/` couvre :

- le profil et la classe de protection des lectures, mutations, credentials,
  uploads, exports et traitements coûteux ;
- l'absence de configuration Upstash, l'erreur réseau et le timeout ;
- la réponse `503 RATE_LIMIT_UNAVAILABLE` du serveur et du middleware ;
- la conservation du `429 RATE_LIMIT_EXCEEDED` lorsque le quota distribué est
  réellement épuisé ;
- l'atomicité des consommations concurrentes dans un même processus ;
- la simulation de deux instances : le store distribué partage le compteur,
  tandis que le fallback mémoire est explicitement limité à chaque processus.

Ces tests sont des tests applicatifs simulés. Ils ne constituent pas une preuve
de disponibilité d'Upstash, de configuration Vercel ni de comportement sur une
production réelle multi-instance.

## CURRENT — exploitation et panne

La production doit fournir `UPSTASH_REDIS_REST_URL` et
`UPSTASH_REDIS_REST_TOKEN` côté serveur. Une absence de configuration est une
erreur d'exploitation pour les mutations, credentials, uploads et traitements
coûteux : elle doit être diagnostiquée, pas contournée par une nouvelle variable
d'environnement ou un élargissement du fallback mémoire.

Les alertes peuvent suivre les réponses `503` portant le code
`RATE_LIMIT_UNAVAILABLE` et les logs bornés indiquant `not_configured` ou
`unavailable`. Les logs ne doivent contenir ni token Upstash, ni cookie, ni
identifiant de session, ni payload utilisateur. Une reprise côté client doit
respecter le `Retry-After` et ne doit pas transformer une indisponibilité en
rafale de retries.

## Audit réseau et quotas — règles durables

La classification suivante est la référence de revue pour les flux qui peuvent
consommer une ressource externe ou déclencher une écriture répétable. Elle
décrit le coût du runtime, pas une promesse de quota fournisseur.

| Surface | Vercel | Supabase DB/Storage/egress | Email / tiers | Automatisation et garde-fous |
|---|---|---|---|---|
| Sélecteurs de comptes Clerk des actions | invocation serveur + attente Clerk, réponse bornée | aucun stockage métier | Clerk `getUserList` | AuthN, 60 requêtes/minute, recherche 120 caractères, offset borné à 100000, 10 comptes/page, projection publique minimale et `private, no-store` |
| Géocodage adresse, reverse et reconstruction de route | temps CPU + attente réseau | aucun stockage métier direct | Geoplateforme, Nominatim ou routage selon le planner | URL de fournisseur construite côté serveur, coordonnées/requête bornées, timeout et limite serveur par IP/identité |
| Recommandation d'itinéraire et météo planner | CPU + appels réseau | lectures de contexte et suivi de progression | fournisseur météo/routage | AuthN, rate limit dédié et entrées bornées ; aucune URL de fournisseur reçue du navigateur |
| Actions, signalements, médias et Chat | CPU + traitement de requête | écritures, pièces jointes Storage et lectures privées | aucun preview de lien Chat | AuthZ domaine, payloads/MIME/tailles bornés, rate limits par identité/IP ; upload Chat direct navigateur → Storage |
| Événements, RSVP et formulaires communautaires | requête + invalidation/cache | écritures et notifications | email créateur sur certains formulaires | AuthN pour les mutations, quotas métier, rate limit serveur ; formulaires publics avec BotID/honeypot/timestamp lorsqu'ils le prévoient |
| Contact, newsletter et onboarding partenaire | requête | file de demande ou abonnement | email créateur/partenaire | destinataires fixes côté serveur ou `replyTo` issu du formulaire validé ; fréquence, BotID et contrôles de formulaire |
| Analytics funnel et métriques pédagogiques | requête | lignes d'événement/progression | aucun | consentement serveur, rate limit, batch et payload bornés ; aucune métadonnée librement imbriquée |
| Exports et snapshots de rapports | CPU + temps de sérialisation | historique/snapshot et lectures de rapport | aucun | AuthN, quota par compte et taille maximale de payload ; `429` pour le quota épuisé, `413` pour un corps trop volumineux |
| Stripe webhooks et crons | invocation Vercel planifiée | RPC/lectures/écritures privilégiées | Stripe | signature Stripe vérifiée sur le corps brut avant parsing métier ; secret cron obligatoire ; RPC d'application idempotentes par identifiant d'événement |
| Synchronisation Clerk/avatar | temps d'attente réseau + upload éventuel | Storage avatar et profil | image Clerk uniquement | fetch serveur limité à des hôtes Clerk exacts, HTTPS, pas de redirection, timeout et taille d'image bornée ; aucune URL arbitraire ne devient une cible SSRF |

Une URL provenant d'un utilisateur ne doit jamais être passée directement à
`fetch` côté serveur. Un flux qui doit contacter un fournisseur utilise une
origine allowlistée, le protocole `https:`, une taille et un délai bornés, et
refuse les redirections si la cible initiale est sensible. Les URLs de contenu
Chat restent du texte rendu au navigateur : le serveur ne les précharge,
proxyfie ni ne les enrichit.

Les dépassements de quota utilisent `429`, `Retry-After` et le contrat
`RATE_LIMIT_EXCEEDED`. Une protection distribuée indisponible utilise `503`,
`Retry-After` et `RATE_LIMIT_UNAVAILABLE`. Une limite de taille de corps utilise
`413` avant toute écriture ou appel tiers. Un quota métier distinct peut
également renvoyer `429`; il ne remplace pas le rate limit réseau.

## PLAN — direction de convergence

Rate limiting, AuthN/AuthZ, quotas métier et BotID restent des contrôles
distincts. Une défense anti-automation additionnelle doit être proportionnée au
risque et ne doit pas devenir automatiquement un hard gate pour toute écriture
authentifiée. Les écritures publiques doivent combiner validation stricte,
fréquence et protection anti-abus adaptée sans confondre ces garanties.

Cette section ne constitue pas une promesse de déploiement ni une preuve de
couverture globale.
