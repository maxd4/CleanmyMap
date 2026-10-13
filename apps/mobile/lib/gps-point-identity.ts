export function createGpsPointId(): string {
  const randomUUID = globalThis.crypto?.randomUUID;
  if (randomUUID) return randomUUID.call(globalThis.crypto);

  return `gps-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 14)}`;
}

export function ensureGpsPointIdentity<T extends { client_point_id?: string | null }>(
  point: T,
): T & { client_point_id: string } {
  const existing = point.client_point_id?.trim();
  return existing ? ({ ...point, client_point_id: existing } as T & { client_point_id: string }) : {
    ...point,
    client_point_id: createGpsPointId(),
  };
}
