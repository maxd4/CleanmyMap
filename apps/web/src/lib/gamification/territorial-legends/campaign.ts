export function campaignYearForCivilDate(value: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`Date civile invalide: ${value}`);
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day, 12));
  if (year < 1 || parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) {
    throw new Error(`Date civile invalide: ${value}`);
  }
  return year;
}

export function campaignStartDate(campaignYear: number): string {
  if (!Number.isInteger(campaignYear) || campaignYear < 1) throw new Error(`Année de campagne invalide: ${campaignYear}`);
  return `${campaignYear.toString().padStart(4, "0")}-01-01`;
}

export function campaignEndDate(campaignYear: number): string {
  if (!Number.isInteger(campaignYear) || campaignYear < 1) throw new Error(`Année de campagne invalide: ${campaignYear}`);
  return `${campaignYear.toString().padStart(4, "0")}-12-31`;
}

export function isDateInCampaign(value: string, campaignYear: number): boolean {
  return campaignYearForCivilDate(value) === campaignYear &&
    value >= campaignStartDate(campaignYear) &&
    value <= campaignEndDate(campaignYear);
}
