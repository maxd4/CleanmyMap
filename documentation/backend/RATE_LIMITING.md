# Rate Limiting - CleanMyMap

## Implémentation

### Stratégie
- **Token Bucket** pour les API générales
- **Sliding Window** pour les opérations sensibles (auth, write, AI)

### Limites par route

| Route | Limite | Fenêtre |
|-------|--------|---------|
| `/api/auth/*` | 10 req | 60s |
| `/api/ai/*` | 20 req | 60s |
| `/api/*` (write) | 10 req | 60s |
| `/api/*` (general) | 50 req | 60s |
| Default | 100 req | 60s |

### Identification
- **Authentifié** : userId (prioritaire)
- **Non-authentifié** : IP client (x-forwarded-for ou x-real-ip)

### Headers de réponse

```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1714567890
Retry-After: 45
```

### Routes protégées

| Route | Limite | Notes |
|-------|--------|-------|
| POST /api/actions | 10/min | Création d'actions |
| POST /api/newsletter/subscribe | 5/min | Abonnement |
| POST /api/community/* | existant | Discussion rate limit |

### Fichiers

```
src/lib/rate-limit/
├── index.ts           # Exports
├── types.ts           # Types et config
├── store.ts           # In-memory token bucket
├── utils.ts           # Helpers (IP, key)
├── server.ts          # API route helpers
├── middleware.ts     # Middleware pour Edge/API
└── api-wrapper.ts    # Wrapper pour handlers
```

### Page d'erreur

- `/error/429` - UI pour les utilisateurs bloqués

### Logs d'abus

Les patterns d'abus sont loggués avec:
- Identifiant (userId/IP)
- Route
- Compteur
- Fenêtre de temps

Au-delà de 50 requêtes, la clé est lockée temporairement.

### Limitations

- **In-memory store** : Les limites sont perdues au restart du serveur
- **Pour production** : Utiliser Redis (Upstash) pour persistance

### À faire pour production

1. Remplacer le store in-memory par Redis
2. Ajouter des limites par IP plus strictes
3. Implémenter un système de whitelist pour les webhooks internes