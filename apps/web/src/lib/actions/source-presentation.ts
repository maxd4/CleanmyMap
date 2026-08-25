import type { Locale } from "@/lib/ui/preferences";

export type ActionSourcePresentationKind =
  | "actions"
  | "signalements"
  | "local"
  | "unknown";

export function normalizeActionSourceForPresentation(
  source: string,
): ActionSourcePresentationKind {
  if (source === "actions") {
    return "actions";
  }
  if (source === "spots" || source === "trash_spotter_spots") {
    return "signalements";
  }
  if (source === "local") {
    return "local";
  }
  return "unknown";
}

export function formatActionSourceLabel(source: string, locale: Locale): string {
  switch (normalizeActionSourceForPresentation(source)) {
    case "actions":
      return locale === "fr" ? "Actions terrain" : "Field actions";
    case "signalements":
      return locale === "fr" ? "Signalements" : "Reports";
    case "local":
      return locale === "fr" ? "Import local" : "Local import";
    case "unknown":
      return source;
  }
}
