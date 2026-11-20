/** Validates and rounds a physical result without overflowing during scaling. */
export function roundPhysicalOutput(value: number, label = "output"): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`Résultat physique invalide (${label}) : un nombre fini >= 0 est attendu.`);
  }
  if (value === 0) return 0;
  if (value < Number.MAX_SAFE_INTEGER / 1_000_000 && value >= 0.001) {
    return Math.round(value * 1_000_000) / 1_000_000;
  }
  return Number(value.toPrecision(6));
}
