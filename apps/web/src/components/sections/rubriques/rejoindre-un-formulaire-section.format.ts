export function formatDate(dateValue: string, locale: "fr" | "en"): string {
  const parsed = new Date(`${dateValue}T12:00:00Z`);
  if (Number.isNaN(parsed.getTime())) {
    return dateValue;
  }

  return new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(parsed);
}

export function formatCount(value: number): string {
  return new Intl.NumberFormat("fr-FR").format(Math.max(0, Math.trunc(value)));
}

export function getJoinFilterLabel(filter: "all" | "available" | "joined", fr: boolean): string {
  switch (filter) {
    case "available":
      return fr ? "À rejoindre" : "To join";
    case "joined":
      return fr ? "Confirmées" : "Confirmed";
    case "all":
    default:
      return fr ? "Tous" : "All";
  }
}
