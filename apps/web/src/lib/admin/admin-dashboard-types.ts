export type AdminOperationalMetricAvailability = "available" | "partial" | "unavailable";

export type AdminOperationalMetricItem = {
  id: string;
  label: string;
  value: number | null;
  availability: AdminOperationalMetricAvailability;
  description: string;
};
