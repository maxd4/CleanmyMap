export function extractArrondissement(label: string): string {
  const normalized = label.toLowerCase();
  const matched = normalized.match(/\b([1-9]|1[0-9]|20)(?:e|eme|er)?\b/);
  if (!matched) {
    return "Hors arrondissement";
  }
  return `${matched[1]}e`;
}

export function monthKey(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value.slice(0, 7) || "n/a";
  }
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function formatSigned(value: number, digits = 1): string {
  const fixed = value.toFixed(digits);
  return `${value >= 0 ? "+" : ""}${fixed}`;
}

export function formatDeltaLine(
  current: number,
  previous: number,
  unit: string,
  digits = 1,
): {
  text: string;
  tone: string;
} {
  const abs = current - previous;
  const pct =
    previous === 0 ? (current === 0 ? 0 : 100) : (abs / previous) * 100;
  const tone =
    abs > 0 ? "text-emerald-700" : abs < 0 ? "text-rose-700" : "text-slate-600";
  return {
    text: `${formatSigned(abs, digits)} ${unit} (${formatSigned(pct, 1)}%)`,
    tone,
  };
}

export function formatDateShort(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
  });
}

export function formatDateTimeShort(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
