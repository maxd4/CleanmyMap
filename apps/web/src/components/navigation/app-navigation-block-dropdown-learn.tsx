"use client";

import { BookOpen, Briefcase, Dumbbell, ShieldCheck, Target } from "lucide-react";
import type { NavigationSpace } from "@/lib/navigation";
import { getLocalizedText } from "@/lib/navigation";
import type { Locale } from "@/lib/ui/preferences";
import { getNavigationDropdownCardBorderTokens } from "./navigation-dropdown-border-theme";
import { getNavigationDropdownCardGeometry } from "./navigation-dropdown-card-theme";
import { NavigationDropdownItemCard } from "./navigation-dropdown-item-card";
import {
  NAVIGATION_DROPDOWN_PANEL_CONTENT_CLASS_NAME,
  NAVIGATION_DROPDOWN_PANEL_LIST_CLASS_NAME,
  NAVIGATION_DROPDOWN_TITLE_CLASS_NAME,
} from "./navigation-dropdown-size-theme";
import {
  getNavigationDropdownTitleGradientStyle,
  getNavigationDropdownTitlePrefix,
} from "./navigation-dropdown-theme";

type AppNavigationBlockDropdownLearnProps = {
  locale: Locale;
  onTrackNavigation: (href: string, label: string, spaceId: string | null) => void;
  pathname: string;
  space: NavigationSpace;
};

function getLearnItemIcon(routeId: string) {
  switch (routeId) {
    case "hub":
      return BookOpen;
    case "learn-comprendre":
      return Target;
    case "learn-sentrainer":
      return Dumbbell;
    case "learn-bonnes-pratiques":
      return ShieldCheck;
    case "learn-ressources":
      return Briefcase;
    default:
      return BookOpen;
  }
}

export function AppNavigationBlockDropdownLearn({
  locale,
  onTrackNavigation,
  pathname,
  space,
}: AppNavigationBlockDropdownLearnProps) {
  const cardBorderTokens = getNavigationDropdownCardBorderTokens(space.id);
  const cardGeometry = getNavigationDropdownCardGeometry(space.id);

  return (
    <div className={NAVIGATION_DROPDOWN_PANEL_CONTENT_CLASS_NAME}>
      <header className="flex items-center justify-center">
        <h3 className={NAVIGATION_DROPDOWN_TITLE_CLASS_NAME}>
          <span className="text-black">{getNavigationDropdownTitlePrefix(locale)} </span>
          <span className="inline-block" style={getNavigationDropdownTitleGradientStyle(space.id)}>
            {getLocalizedText(space.label, locale, space.id)}
          </span>
        </h3>
      </header>

      <nav className={NAVIGATION_DROPDOWN_PANEL_LIST_CLASS_NAME} aria-label={getLocalizedText(space.label, locale, space.id)}>
        <ul className="space-y-1">
          {space.items.length > 0 ? (
            space.items.map((item) => {
              const Icon = getLearnItemIcon(item.routeId);
              return (
                <NavigationDropdownItemCard
                  key={item.id}
                  item={item}
                  locale={locale}
                  pathname={pathname}
                  spaceId={space.id}
                  onTrackNavigation={onTrackNavigation}
                  Icon={Icon}
                  iconClassName="bg-gradient-to-br from-amber-100 via-white to-orange-100 shadow-[0_0_0_2px_rgba(245,158,11,0.10)]"
                  iconStrokeWidth={2.05}
                  cardGeometry={cardGeometry}
                  cardBorderTokens={cardBorderTokens}
                />
              );
            })
          ) : (
            <li className="rounded-2xl border border-dashed border-black/16 px-3 py-3 text-[12px] text-black/80">
              {locale === "fr"
                ? "Aucune rubrique accessible pour ce bloc."
                : "No accessible pages for this block."}
            </li>
          )}
        </ul>
      </nav>
    </div>
  );
}
