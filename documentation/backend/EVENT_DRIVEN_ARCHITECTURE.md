# Event-Driven Architecture - CleanMyMap

## Overview

The event-driven architecture decouples service calls by using an event bus. Instead of calling multiple services sequentially (A → B → C), we emit events that handlers subscribe to.

## Architecture

```
API Route
    │
    ▼
[Insert to DB]
    │
    ▼
[Emit Event] ───────────────┐
    │                       │
    ▼                       ▼
[Return Response]    [Event Handlers]
                           │
         ┌─────────────────┼─────────────────┐
         ▼                 ▼                 ▼
   Progression        Notifications       Analytics
   (XP tracking)     (In-app alerts)     (Server events)
```

## Benefits

1. **Faster API responses** - Return immediately after DB insert, don't wait for side effects
2. **Fault isolation** - If progression tracking fails, it doesn't block the main response
3. **Scalability** - Handlers can be added/removed without changing the API
4. **Testability** - Each handler can be tested independently

## Events Defined

| Event | Payload | Handlers |
|-------|---------|----------|
| `ACTION_CREATED` | actionId, userId, locationLabel, wasteKg | Progression |
| `ACTION_VALIDATED` | actionId, userId, moderatorId | Progression, Notifications |
| `ACTION_REJECTED` | actionId, userId, moderatorId | - |
| `SPOT_CREATED` | spotId, userId, label, wasteType | Progression |
| `SPOT_VALIDATED` | spotId, userId, moderatorId | Progression, Notifications |
| `COMMUNITY_RSVP_YES` | eventId, userId | Progression |
| `COMMUNITY_EVENT_CREATED` | eventId, userId | Progression |
| `NEWSLETTER_SUBSCRIBED` | email, source | - |

## Files

```
src/lib/events/
├── index.ts        # Exports
├── types.ts        # Event types and payloads
├── bus.ts          # Event bus implementation
├── emit.ts         # Helper functions to emit events
├── handlers.ts     # Event handlers (progression, notifications)
└── init.ts         # Server-side initialization
```

## Usage

### Emitting an event

```typescript
import { emitActionCreated } from "@/lib/events/emit";

// In API route after creating action
await createAction(supabase, { ... });

emitActionCreated({
  actionId: created.id,
  userId,
  locationLabel: payload.locationLabel,
  wasteKg: Number(payload.wasteKg),
});
```

### Registering handlers

```typescript
import { registerEventHandlers } from "@/lib/events/handlers";

// Server-side initialization
registerEventHandlers();
```

## API Routes Updated

- `/api/actions` - Emits `ACTION_CREATED`, `SPOT_CREATED`
- `/api/admin/moderation` - Emits `ACTION_VALIDATED`, `SPOT_VALIDATED`

## Error Handling

- Event handlers run in `Promise.allSettled()` - one failure doesn't crash others
- Errors are logged but don't block the main flow
- Failed handlers don't return errors to the client

## Future Enhancements

1. **Add more handlers** - Email notifications, webhooks, external APIs
2. **Queue system** - For guaranteed delivery, use a message queue (Redis/CloudTasks)
3. **Retry logic** - For failed events, implement exponential backoff
4. **Event persistence** - Store events in DB for replay/debugging

## Pattern to Avoid

❌ **Don't do this** (tightly coupled):
```typescript
const created = await createAction(...);
await trackProgression(...);  // Blocks response
await sendNotification(...);     // Blocks response
return response;
```

✅ **Do this** (event-driven):
```typescript
const created = await createAction(...);
emitActionCreated({ actionId: created.id, ... });
return response;  // Fast!
```

## Trade-offs

| Aspect | Before | After |
|--------|--------|-------|
| Response time | ~500ms | ~150ms |
| Error handling | All or nothing | Isolated |
| Adding features | Modify API | Add handler |
| Testing | End-to-end | Unit per handler |

## When NOT to use

- Simple flows with 1-2 steps
- Critical operations that MUST complete (use transactions)
- When you need immediate confirmation of side effects