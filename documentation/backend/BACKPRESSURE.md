# Backpressure Handling - CleanMyMap

## Overview

Backpressure prevents system overload when the rate of incoming requests exceeds processing capacity. It provides graceful degradation instead of crashes.

## Implementation

### Configuration by Operation Type

| Type | Max Concurrent | Queue Size | Timeout | Policy |
|------|---------------|------------|----------|---------|
| `import` | 2 | 10 | 5 min | drop-newest |
| `batch` | 5 | 20 | 1 min | delay |
| `event` | 10 | 100 | 30 sec | delay |
| `default` | 10 | 50 | 30 sec | delay |

## Usage

### Acquire Backpressure

```typescript
import { acquireBackpressure, releaseBackpressure } from "@/lib/backpressure";

export async function POST(request: Request) {
  const bp = acquireBackpressure("import", operationId);
  if (!bp.allowed) {
    return NextResponse.json(
      { error: bp.reason, retryAfter: bp.retryAfter },
      { status: 429 }
    );
  }

  try {
    // ... operation
  } finally {
    releaseBackpressure("import");
  }
}
```

## Applied To

### Routes with Backpressure
- `POST /api/actions/import` - Batch import (max 2 concurrent)

### Protected Operations
- Heavy imports (2000 items max)
- Batch operations
- Event processing

## Error Responses

When backpressure triggers:
```json
{
  "error": "System busy",
  "code": "backpressure",
  "hint": "Retry after 30 seconds",
  "details": {
    "position": 5,
    "retryAfter": 30
  }
}
```

## Monitoring

Le backpressure reste un mécanisme interne côté serveur. Il n'expose plus d'endpoint
de supervision UI dédié dans le dépôt courant.

Conserver les contrôles au plus près des routes qui exécutent les opérations lourdes.
Si un suivi devient nécessaire, l'implémenter au niveau de la route ou du tableau de
bord concerné, sans polling de fond générique.

## Future Enhancements

1. **Redis-backed queue** - For distributed systems
2. **Adaptive limits** - Auto-adjust based on server load
3. **Priority queue** - VIP users get priority
4. **Notification** - Alert when queue is backed up
