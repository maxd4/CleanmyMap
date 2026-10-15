import { createLocalIdentifier } from './local-identifier';

export function createGpsPointId(): string {
  return createLocalIdentifier();
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
