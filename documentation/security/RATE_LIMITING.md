# Rate limiting — `CURRENT` et `PLAN`

## CURRENT — runtime vérifié

Les helpers de `apps/web/src/lib/rate-limit/` résolvent l'identité depuis la
requête serveur : `authenticated:<Clerk userId>` pour une session Clerk et
`anonymous:<IP>` depuis les sources d'IP de plateforme prévues. Le header
client `x-user-id` et les clés arbitraires de payload ne sont pas des preuves.
La clé comprend la méthode et le pathname.

Quand Upstash est configuré, `verifyRateLimit()` utilise le store distribué
partagé. Le `Map` local est un fallback best-effort, nettoyé périodiquement ;
il n'est ni distribué ni une garantie de production multi-instance. Une panne
Upstash est journalisée sans secret puis bascule sur ce fallback conformément au
contrat runtime.

Profils par défaut :

| Profil | Limite | Fenêtre | Stratégie |
|---|---:|---:|---|
| `default` | 100 | 60 s | sliding window |
| `auth` | 10 | 60 s | sliding window |
| `api` | 50 | 60 s | token bucket |
| `read` | 50 | 60 s | token bucket |
| `ai` | 20 | 60 s | sliding window |
| `write` | 10 | 60 s | sliding window |

Les dépassements renvoient `429`, `RATE_LIMIT_EXCEEDED`, `Retry-After` et,
si disponibles, les headers de quota. Les options spécifiques d'un handler
peuvent être plus strictes que ces profils.

Les handlers actuellement concernés incluent les POST d'actions, chat,
signalements, événements, contact, métriques pédagogiques, newsletter et
onboarding partenaires. Les GET de chat et d'événements ne passent pas par
`verifyRateLimit()` dans le runtime décrit ici. BotID reste une protection
anti-automation navigateur distincte sur les routes explicitement configurées ;
il ne remplace ni AuthN/AuthZ ni le rate limit.

Les formulaires publics conservent leurs contrôles `honeypot` et `submittedAt`
lorsqu'ils sont prévus par leur contrat. Les wrappers génériques ne prouvent
pas qu'une route les utilise.

## Audit réseau et quotas — règles durables

La classification suivante est la référence de revue pour les flux qui peuvent
consommer une ressource externe ou déclencher une écriture répétable. Elle
décrit le coût du runtime, pas une promesse de quota fournisseur.

| Surface | Vercel | Supabase DB/Storage/egress | Email / tiers | Automatisation et garde-fous |
|---|---|---|---|---|
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

Les réponses de fréquence utilisent `429`, `Retry-After` et le contrat
`RATE_LIMIT_EXCEEDED`. Une limite de taille de corps utilise `413` avant toute
écriture ou appel tiers. Un quota métier distinct peut également renvoyer
`429`; il ne remplace pas le rate limit réseau.

## PLAN — direction de convergence

Rate limiting, AuthN/AuthZ, quotas métier et BotID restent des contrôles
distincts. Une défense anti-automation additionnelle doit être proportionnée au
risque et ne doit pas devenir automatiquement un hard gate pour toute écriture
authentifiée. Les écritures publiques doivent combiner validation stricte,
fréquence et protection anti-abus adaptée sans confondre ces garanties.

Cette section ne constitue pas une promesse de déploiement ni une preuve de
couverture globale.
