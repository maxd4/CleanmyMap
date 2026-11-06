/** Shared ceiling for routing operations performed by one nearest-relevant search. */
export type RouteRoutingOperationBudget = {
  readonly limit: number;
  consumed: number;
  tryConsume: (operations?: number) => boolean;
  remaining: () => number;
};

export function createRouteRoutingOperationBudget(input: {
  limit: number;
  consumed?: number;
}): RouteRoutingOperationBudget {
  const limit = Math.max(0, Math.floor(input.limit));
  let consumed = Math.max(0, Math.floor(input.consumed ?? 0));
  return {
    limit,
    get consumed() { return consumed; },
    set consumed(value: number) { consumed = Math.max(0, Math.floor(value)); },
    tryConsume(operations = 1) {
      const count = Math.max(0, Math.floor(operations));
      if (consumed + count > limit) return false;
      consumed += count;
      return true;
    },
    remaining: () => Math.max(0, limit - consumed),
  };
}
