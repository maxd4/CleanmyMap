import type { Event, EventType, EventHandler, EventPayload } from "./types";

type AsyncEventHandler = (event: Event) => Promise<void>;

const subscriptions = new Map<EventType, AsyncEventHandler[]>();

export function subscribe<T extends EventType>(
  eventType: T,
  handler: EventHandler<T>
): () => void {
  const handlers = subscriptions.get(eventType) || [];
  handlers.push(handler as AsyncEventHandler);
  subscriptions.set(eventType, handlers);

  return () => {
    const existing = subscriptions.get(eventType) || [];
    const index = existing.indexOf(handler as AsyncEventHandler);
    if (index > -1) {
      existing.splice(index, 1);
      subscriptions.set(eventType, existing);
    }
  };
}

export async function emit<T extends EventType>(
  event: Event<T>
): Promise<{ delivered: number; failed: number }> {
  const handlers = subscriptions.get(event.type) || [];
  
  if (handlers.length === 0) {
    return { delivered: 0, failed: 0 };
  }

  let delivered = 0;
  let failed = 0;

  const results = await Promise.allSettled(
    handlers.map((handler) => handler(event))
  );

  results.forEach((result) => {
    if (result.status === "fulfilled") {
      delivered++;
    } else {
      failed++;
      console.error(`[EventBus] Handler failed for ${event.type}:`, result.reason);
    }
  });

  return { delivered, failed };
}

export function createEvent<T extends EventType>(
  type: T,
  payload: EventPayload[T],
  source?: string
): Event<T> {
  return {
    id: crypto.randomUUID(),
    type,
    payload,
    timestamp: Date.now(),
    source,
  };
}

export function getSubscriptionCount(eventType: EventType): number {
  return subscriptions.get(eventType)?.length || 0;
}

export function clearSubscriptions(): void {
  subscriptions.clear();
}

export function listEventTypes(): EventType[] {
  return Array.from(subscriptions.keys());
}