export const SCORE_SCALE = 100;

export function formatScorePercent(
  value: number,
  fractionDigits?: number,
): string {
  const safeValue = Number.isFinite(value) ? value : 0;
  const formatter = new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: fractionDigits ?? 20,
    minimumFractionDigits: fractionDigits ?? 0,
    useGrouping: false,
  });

  return `${formatter.format(safeValue)} %`;
}
