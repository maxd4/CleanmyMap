export function extractArrondissement(label: string): string {
 const normalized = label.toLowerCase();
 const matched = normalized.match(/\b([1-9]|1[0-9]|20)(?:eme|er|e)?\b/);
 if (!matched) {
 return"Hors arrondissement";
 }
 return `${matched[1]}e`;
}

export function formatSigned(value: number, digits = 1): string {
 const fixed = value.toFixed(digits);
 return `${value >= 0 ?"+" :""}${fixed}`;
}

export function formatDateShort(value: string): string {
 const parsed = new Date(value);
 if (Number.isNaN(parsed.getTime())) {
 return value;
 }
 return parsed.toLocaleDateString("fr-FR", {
 day:"2-digit",
 month:"2-digit",
 });
}

export function formatDateTimeShort(value: string): string {
 const parsed = new Date(value);
 if (Number.isNaN(parsed.getTime())) {
 return value;
 }
 return parsed.toLocaleString("fr-FR", {
 day:"2-digit",
 month:"2-digit",
 hour:"2-digit",
 minute:"2-digit",
 });
}
