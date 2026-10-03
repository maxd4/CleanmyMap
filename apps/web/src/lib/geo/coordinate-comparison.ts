export type CoordinatePair = readonly [number, number];

/** Compare latitude/longitude pairs with an explicit owner for tolerance semantics. */
export function areCoordinatesClose(
  left: CoordinatePair | undefined,
  right: CoordinatePair | undefined,
  tolerance: number,
): boolean {
  return Boolean(
    left &&
      right &&
      Math.abs(left[0] - right[0]) < tolerance &&
      Math.abs(left[1] - right[1]) < tolerance,
  );
}
