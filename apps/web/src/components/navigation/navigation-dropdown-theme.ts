import type { NavigationBlockId } from "@/lib/navigation";
import type { Locale } from "@/lib/ui/preferences";

type NavigationDropdownTitleGradient = {
  stops: string[];
};

const NAVIGATION_DROPDOWN_TITLE_GRADIENTS: Record<
  NavigationBlockId,
  NavigationDropdownTitleGradient
> = {
  home: { stops: ["#f97316", "#f59e0b", "#b45309"] },
  act: { stops: ["#10b981", "#22c55e", "#059669"] },
  visualize: { stops: ["#06b6d4", "#38bdf8", "#ef4444"] },
  impact: { stops: ["#ef4444", "#fb7185", "#e11d48"] },
  network: { stops: ["#7c3aed", "#a855f7", "#ec4899"] },
  connect: { stops: ["#db2777", "#d946ef", "#8b5cf6"] },
  learn: { stops: ["#eab308", "#f59e0b", "#d97706"] },
  pilot: { stops: ["#c2410c", "#f59e0b", "#92400e"] },
};

export function getNavigationDropdownTitleGradientStyle(spaceId: NavigationBlockId | null) {
  const gradient = NAVIGATION_DROPDOWN_TITLE_GRADIENTS[spaceId ?? "home"];

  return {
    backgroundImage: `linear-gradient(90deg, ${gradient.stops.join(", ")})`,
    WebkitBackgroundClip: "text",
    backgroundClip: "text",
    WebkitTextFillColor: "transparent",
    color: "transparent",
  } as const;
}

export function getNavigationDropdownTitleLabel(locale: Locale, label: string): string {
  return locale === "fr" ? `Bloc : ${label}` : `Block: ${label}`;
}

export function getNavigationDropdownTitlePrefix(locale: Locale): string {
  return locale === "fr" ? "Bloc :" : "Block:";
}
