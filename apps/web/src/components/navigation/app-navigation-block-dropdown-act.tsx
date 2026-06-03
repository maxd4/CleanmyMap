"use client";

import { BookOpen, CloudRainWind, FilePenLine, Route, Trash2 } from "lucide-react";
import type { NavigationSpace } from "@/lib/navigation";
import { getLocalizedText } from "@/lib/navigation";
import type { Locale } from "@/lib/ui/preferences";
import { getNavigationDropdownCardBorderTokens } from "./navigation-dropdown-border-theme";
import { getNavigationDropdownCardGeometry } from "./navigation-dropdown-card-theme";
import { NavigationDropdownItemCard } from "./navigation-dropdown-item-card";
import {
  getNavigationDropdownTitleGradientStyle,
  getNavigationDropdownTitlePrefix,
} from "./navigation-dropdown-theme";

type AppNavigationBlockDropdownActProps = {
  locale: Locale;
  onTrackNavigation: (href: string, label: string, spaceId: string | null) => void;
  pathname: string;
  space: NavigationSpace;
};

function getActItemIcon(routeId: string) {
  switch (routeId) {
    case "new":
      return FilePenLine;
    case "route":
      return Route;
    case "weather":
      return CloudRainWind;
    case "guide":
      return BookOpen;
    case "trash-spotter":
      return Trash2;
    default:
      return FilePenLine;
  }
}

export function AppNavigationBlockDropdownAct({
  locale,
  onTrackNavigation,
  pathname,
  space,
}: AppNavigationBlockDropdownActProps) {
  const cardBorderTokens = getNavigationDropdownCardBorderTokens(space.id);
  const cardGeometry = getNavigationDropdownCardGeometry(space.id);

  return (
    <div className="px-3 pb-2.5 pt-2.5 sm:px-3.5 sm:pt-3">
      <header className="flex items-center justify-center">
        <h3 className="w-full whitespace-nowrap text-center text-[0.92rem] font-black leading-tight tracking-[-0.03em] sm:text-[1rem]">
          <span className="text-black">{getNavigationDropdownTitlePrefix(locale)} </span>
          <span className="inline-block" style={getNavigationDropdownTitleGradientStyle(space.id)}>
            {getLocalizedText(space.label, locale, space.id)}
          </span>
        </h3>
      </header>

      <nav className="mt-2" aria-label={getLocalizedText(space.label, locale, space.id)}>
        <ul className="space-y-1">
          {space.items.length > 0 ? (
            space.items.map((item) => {
              const Icon = getActItemIcon(item.routeId);
              return (
                <NavigationDropdownItemCard
                  key={item.id}
                  item={item}
                  locale={locale}
                  pathname={pathname}
                  spaceId={space.id}
                  onTrackNavigation={onTrackNavigation}
                  Icon={Icon}
                  iconClassName="bg-gradient-to-br from-emerald-50 via-white to-green-50 shadow-[0_0_0_2px_rgba(16,185,129,0.08)]"
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
