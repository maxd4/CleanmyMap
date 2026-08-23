export function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((acc, value) => acc + value, 0) / values.length;
}

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const ordered = [...values].sort((a, b) => a - b);
  const middle = Math.floor(ordered.length / 2);
  if (ordered.length % 2 === 0) return (ordered[middle - 1] + ordered[middle]) / 2;
  return ordered[middle];
}

export function scoreAction(kg: number, butts: number): number {
  return kg * 10 + butts * 0.05;
}

export function distanceKm(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }): number {
  const dLat = a.latitude - b.latitude;
  const dLon = a.longitude - b.longitude;
  return Math.sqrt(dLat * dLat + dLon * dLon) * 111;
}
