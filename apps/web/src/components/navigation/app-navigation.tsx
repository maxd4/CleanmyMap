"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import {
  trackNavigationClick,
  trackRoleCtaClick,
} from "@/lib/analytics/navigation-client";
import type { CtaSlot } from "@/lib/domain-language";
import { isFeatureEnabled } from "@/lib/feature-flags";
import {
  getActiveSpaceForPath,
  getNavigationCategoriesForProfile,
  getNavigationLabels,
  getNavigationProfileOverview,
  getPilotFallbackItems,
  getNavigationSpacesForProfile,
  getProfileNavigationEntries,
} from "@/lib/navigation";
import type { AppProfile } from "@/lib/profiles";

function isActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

type AppNavigationProps = {
  currentProfile: AppProfile;
  isAdmin: boolean;
};

export function AppNavigation({ currentProfile, isAdmin }: AppNavigationProps) {
  const pathname = usePathname();
  const { locale, displayMode } = useSitePreferences();
  const parcoursNavV2Enabled = isFeatureEnabled("parcoursNavV2");
  const labels = getNavigationLabels(locale, currentProfile, {
    isAdmin,
    displayMode,
  });
  const spaces = getNavigationSpacesForProfile(currentProfile, displayMode);
  const categories = getNavigationCategoriesForProfile(
    currentProfile,
    displayMode,
  );
  const profileEntries = getProfileNavigationEntries({ currentProfile, isAdmin });
  const profileOverview = getNavigationProfileOverview(
    currentProfile,
    displayMode,
  );
  const activeSpace = getActiveSpaceForPath(
    currentProfile,
    pathname,
    displayMode,
  );
  const secondaryCTA = profileOverview.secondaryCTA;
  const compactMode = displayMode !== "exhaustif";
  const renderedSpaces =
    displayMode === "minimaliste"
      ? spaces.map((space) => ({ ...space, items: space.items.slice(0, 2) }))
      : spaces;
  const getRenderedSpaceItems = (space: (typeof renderedSpaces)[number]) =>
    space.id === "pilot" && space.items.length === 0
      ? getPilotFallbackItems(locale)
      : space.items;

  function onTrackNavigation(
    href: string,
    label: string,
    spaceId: string | null,
  ) {
    trackNavigationClick({
      profile: currentProfile,
      spaceId,
      href,
      label,
    });
  }

  function onTrackCta(href: string, label: string, ctaType: CtaSlot) {
    trackRoleCtaClick({
      profile: currentProfile,
      ctaType,
      href,
      label,
    });
  }

  return (
    <nav className="mt-4 space-y-3">
      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
          {labels.navTitle}
        </p>
        <p className="text-xs text-slate-500">{labels.summary}</p>
        {parcoursNavV2Enabled ? (
          <div className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-xs text-emerald-900">
            <p>
              Profil actif:{" "}
              <span className="font-semibold">
                {profileEntries.find((item) => item.id === currentProfile)
                  ?.label[locale] ?? currentProfile}
              </span>
            </p>
            <p>
              Bloc actif:{" "}
              <span className="font-semibold">
                {activeSpace
                  ? (renderedSpaces.find((space) => space.id === activeSpace)
                      ?.label[locale] ?? activeSpace)
                  : locale === "fr"
                    ? "Aucun"
                    : "None"}
              </span>
            </p>
            <p>
              {locale === "fr" ? "Mode d'affichage" : "Display mode"}:{" "}
              <span className="font-semibold">{displayMode}</span>
            </p>
          </div>
        ) : null}

        {!compactMode ? (
          <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {profileEntries.map((profile) => {
              const active =
                profile.id === currentProfile ||
                pathname.startsWith(`${profile.href}/`) ||
                pathname === profile.href;
              return (
                <Link
                  key={profile.id}
                  href={profile.href}
                  onClick={() =>
                    onTrackNavigation(profile.href, profile.label[locale], null)
                  }
                  className={`rounded-lg border px-3 py-2 text-left transition ${
                    active
                      ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                      : "border-slate-200 bg-white text-slate-700 hover:border-emerald-200 hover:bg-emerald-50"
                  }`}
                >
                  <p className="text-sm font-semibold">
                    {profile.label[locale]}
                  </p>
                  <p className="text-xs text-slate-500">
                    {profile.description[locale]}
                  </p>
                </Link>
              );
            })}
          </div>
        ) : null}

        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href={profileOverview.primaryCTA.href}
            onClick={() =>
              onTrackCta(
                profileOverview.primaryCTA.href,
                profileOverview.primaryCTA.label[locale],
                "primary",
              )
            }
            className="inline-flex rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-900 hover:bg-emerald-100"
          >
            {profileOverview.primaryCTA.label[locale]}
          </Link>
          {secondaryCTA ? (
            <Link
              href={secondaryCTA.href}
              onClick={() =>
                onTrackCta(
                  secondaryCTA.href,
                  secondaryCTA.label[locale],
                  "secondary",
                )
              }
              className="inline-flex rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              {secondaryCTA.label[locale]}
            </Link>
          ) : null}
        </div>
      </div>

      {parcoursNavV2Enabled ? (
        <>
          <div className="hidden gap-3 lg:grid lg:grid-cols-2">
            {renderedSpaces.map((space) => (
              <section
                key={space.id}
                className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
              >
                <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  {space.label[locale]}
                </h2>
                <ul className="mt-2 space-y-2">
                  {getRenderedSpaceItems(space).map((item) => {
                    const active = isActive(pathname, item.href);
                    return (
                      <li key={item.id}>
                        <Link
                          href={item.href}
                          onClick={() =>
                            onTrackNavigation(
                              item.href,
                              item.label[locale],
                              space.id,
                            )
                          }
                          className={`block rounded-lg border px-3 py-2 transition ${
                            active
                              ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                              : "border-slate-200 bg-white text-slate-700 hover:border-emerald-200 hover:bg-emerald-50"
                          }`}
                        >
                          <p className="text-sm font-semibold">
                            {item.label[locale]}
                          </p>
                          {displayMode === "exhaustif" ? (
                            <p className="text-xs text-slate-500">
                              {item.description[locale]}
                            </p>
                          ) : null}
                        </Link>
                      </li>
                    );
                  })}
                  {space.items.length === 0 && space.id !== "pilot" ? (
                    <li className="rounded-lg border border-dashed border-slate-300 px-3 py-2 text-xs text-slate-500">
                      {locale === "fr"
                        ? "Aucune page rattachee a ce bloc."
                        : "No page assigned to this block."}
                    </li>
                  ) : null}
                </ul>
              </section>
            ))}
          </div>

          <div className="space-y-2 lg:hidden">
            {renderedSpaces.map((space) => (
              <details
                key={space.id}
                className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
              >
                <summary className="cursor-pointer text-sm font-semibold text-slate-800">
                  {space.label[locale]}
                </summary>
                <ul className="mt-2 space-y-2">
                  {getRenderedSpaceItems(space).map((item) => {
                    const active = isActive(pathname, item.href);
                    return (
                      <li key={item.id}>
                        <Link
                          href={item.href}
                          onClick={() =>
                            onTrackNavigation(
                              item.href,
                              item.label[locale],
                              space.id,
                            )
                          }
                          className={`block rounded-lg border px-3 py-2 transition ${
                            active
                              ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                              : "border-slate-200 bg-white text-slate-700 hover:border-emerald-200 hover:bg-emerald-50"
                          }`}
                        >
                          <p className="text-sm font-semibold">
                            {item.label[locale]}
                          </p>
                          {displayMode === "exhaustif" ? (
                            <p className="text-xs text-slate-500">
                              {item.description[locale]}
                            </p>
                          ) : null}
                        </Link>
                      </li>
                    );
                  })}
                  {space.items.length === 0 && space.id !== "pilot" ? (
                    <li className="rounded-lg border border-dashed border-slate-300 px-3 py-2 text-xs text-slate-500">
                      {locale === "fr"
                        ? "Aucune page rattachee a ce bloc."
                        : "No page assigned to this block."}
                    </li>
                  ) : null}
                </ul>
              </details>
            ))}
          </div>
        </>
      ) : (
        <div className="hidden gap-3 lg:grid lg:grid-cols-2">
          {categories.map((category) => (
            <section
              key={category.id}
              className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
            >
              <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                {category.label[locale]}
              </h2>
              <ul className="mt-2 space-y-2">
                {category.items.map((item) => {
                  const active = isActive(pathname, item.href);
                  return (
                    <li key={item.id}>
                      <Link
                        href={item.href}
                        onClick={() =>
                          onTrackNavigation(item.href, item.label[locale], null)
                        }
                        className={`block rounded-lg border px-3 py-2 transition ${
                          active
                            ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                            : "border-slate-200 bg-white text-slate-700 hover:border-emerald-200 hover:bg-emerald-50"
                        }`}
                      >
                        <p className="text-sm font-semibold">
                          {item.label[locale]}
                        </p>
                        {displayMode === "exhaustif" ? (
                          <p className="text-xs text-slate-500">
                            {item.description[locale]}
                          </p>
                        ) : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </nav>
  );
}
