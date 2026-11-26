export type ScreenPoint = { x: number; y: number };

/** Mercator coordinates and MapLibre's column-major view/projection matrix. */
export function projectNetworkPoint(matrix: ArrayLike<number>, point: { x: number; y: number; z: number }, width: number, height: number): ScreenPoint | null {
  const { x, y, z } = point;
  const w = matrix[3]*x + matrix[7]*y + matrix[11]*z + matrix[15];
  if (!Number.isFinite(w) || w <= 0 || width <= 0 || height <= 0) return null;
  const sx = (matrix[0]*x + matrix[4]*y + matrix[8]*z + matrix[12]) / w;
  const sy = (matrix[1]*x + matrix[5]*y + matrix[9]*z + matrix[13]) / w;
  if (!Number.isFinite(sx) || !Number.isFinite(sy)) return null;
  return { x: (sx+1)*width/2, y: (1-sy)*height/2 };
}
