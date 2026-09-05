export type ParisPressureCorePoint = {
  latitude: number;
  longitude: number;
};

export type ParisPressureCoreGeometry = {
  type: "Polygon" | "MultiPolygon";
  coordinates: readonly unknown[];
};

export function isValidParisPressureGeometry(
  geometry: unknown,
): geometry is ParisPressureCoreGeometry;
export function pointInParisPressureGeometry(
  point: ParisPressureCorePoint,
  geometry: ParisPressureCoreGeometry | null | undefined,
): boolean;
export function parisPressureGeometryAreaKm2(
  geometry: ParisPressureCoreGeometry | null | undefined,
): number | null;
