import type {
  EnvironmentalPolicyRecord,
  EnvironmentalPolicyFilters,
  LocalizedText,
  PolicyDate,
  PolicyMilestone,
} from "./environmental-policy-registry";

const dateValue = (date: PolicyDate): string => date.value ?? "";

export function getPolicyThemeKey(theme: LocalizedText): string {
  return theme.fr
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function getEnvironmentalPolicyThemeOptions(
  records: EnvironmentalPolicyRecord[],
  locale: keyof LocalizedText,
): Array<{ value: string; label: string }> {
  const themes = new Map<string, LocalizedText>();
  records.flatMap((record) => record.themes).forEach((theme) => themes.set(getPolicyThemeKey(theme), theme));
  return Array.from(themes.entries())
    .sort((left, right) => left[1][locale].localeCompare(right[1][locale], locale))
    .map(([value, theme]) => ({ value, label: theme[locale] }));
}

export function getPolicyTimeline(record: EnvironmentalPolicyRecord): PolicyMilestone[] {
  return [...record.milestones]
    .sort((a, b) => dateValue(a.date).localeCompare(dateValue(b.date)) || a.id.localeCompare(b.id))
}

export function filterEnvironmentalPolicies(records: EnvironmentalPolicyRecord[], filters: EnvironmentalPolicyFilters): EnvironmentalPolicyRecord[] {
  const query = filters.query.trim().toLocaleLowerCase();
  return [...records]
    .filter((record) => filters.view === "world" ? record.collection === "international" : record.collection === "france")
    .filter((record) => filters.territory === "all" || record.territory.scope === filters.territory)
    .filter((record) => filters.theme === "all" || record.themes.some((theme) => getPolicyThemeKey(theme) === filters.theme))
    .filter((record) => filters.year === "all" || getPolicyTimeline(record).some((milestone) => milestone.date.value?.startsWith(filters.year)))
    .filter((record) => filters.legalStatus === "all" || record.legalStatus === filters.legalStatus)
    .filter((record) => !query || [record.title.fr, record.title.en, record.measure.fr, record.measure.en, record.institution.fr, record.institution.en, ...record.territories.flatMap((territory) => [territory.label.fr, territory.label.en])].join(" ").toLocaleLowerCase().includes(query))
    .sort((a, b) => {
      const primaryA = a.milestones.find((milestone) => milestone.category === "adoption" && milestone.date.value) ?? getPolicyTimeline(a).find((milestone) => milestone.date.value) ?? a.milestones[0];
      const primaryB = b.milestones.find((milestone) => milestone.category === "adoption" && milestone.date.value) ?? getPolicyTimeline(b).find((milestone) => milestone.date.value) ?? b.milestones[0];
      return dateValue(primaryB.date).localeCompare(dateValue(primaryA.date)) || a.id.localeCompare(b.id);
    });
}

export function formatPolicyDate(date: PolicyDate | null, locale: "fr" | "en"): string {
  if (!date || !date.value || date.precision === "unknown") return locale === "fr" ? "Non précisée" : "Not specified";
  if (date.precision === "year") return date.value;
  if (date.precision === "month") {
    const [year, month] = date.value.split("-").map(Number);
    return new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-GB", { month: "long", year: "numeric" }).format(new Date(Date.UTC(year, month - 1, 1)));
  }
  return new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-GB", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${date.value}T00:00:00Z`));
}
