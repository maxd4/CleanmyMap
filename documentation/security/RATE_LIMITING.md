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

## PLAN — direction de convergence

Rate limiting, AuthN/AuthZ, quotas métier et BotID restent des contrôles
distincts. Une défense anti-automation additionnelle doit être proportionnée au
risque et ne doit pas devenir automatiquement un hard gate pour toute écriture
authentifiée. Les écritures publiques doivent combiner validation stricte,
fréquence et protection anti-abus adaptée sans confondre ces garanties.

Cette section ne constitue pas une promesse de déploiement ni une preuve de
couverture globale.
