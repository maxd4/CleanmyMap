import Link from "next/link";
import { ArrowRight, ChevronRight } from "lucide-react";
import { getCurrentUserRoleLabel } from "@/lib/authz";
import {
  getNavigationSpacesForProfile,
  type NavigationItem,
  type NavigationBlockId,
} from "@/lib/navigation";
import { getProfileLabel, toProfile } from "@/lib/profiles";
import {
  getServerDisplayModePreference,
  getServerLocale,
} from "@/lib/server-preferences";

const BLOCK_PREVIEW_PRIORITY: Record<
  NavigationBlockId,
  Partial<Record<NavigationItem["id"], number>>
> = {
  home: {
    dashboard: 1,
    explorer: 2,
    profile: 3,
  },
  act: {
    new: 1,
    route: 2,
    "trash-spotter": 3,
  },
  visualize: {
    map: 1,
    sandbox: 2,
    weather: 3,
  },
  impact: {
    reports: 1,
    gamification: 2,
  },
  network: {
    network: 1,
    annuaire: 2,
    community: 3,
    "open-data": 5,
  },
  connect: {
    messagerie: 1,
    dm: 2,
  },
  learn: {
    hub: 1,
    guide: 2,
    climate: 3,
    recycling: 4,
  },
  pilot: {
    admin: 1,
    sponsor: 2,
    elus: 3,
    godmode: 4,
  },
};

function getOrderedPreviewItems(
  blockId: NavigationBlockId,
  items: NavigationItem[],
): NavigationItem[] {
  const blockPriority = BLOCK_PREVIEW_PRIORITY[blockId];
  return [...items].sort((a, b) => {
    const pa = blockPriority[a.id] ?? 99;
    const pb = blockPriority[b.id] ?? 99;
    if (pa !== pb) {
      return pa - pb;
    }
    return a.label.fr.localeCompare(b.label.fr, "fr");
  });
}

function getBlockAccent(blockId: NavigationBlockId) {
  const byBlock = {
    home: { bar: "bg-[#27C3D9]", glow: "shadow-[#27C3D9]/20", tint: "from-[#2C5F77]/78 via-[#356B73]/64 to-[#417C84]/72", hover: "hover:border-[#27C3D9]/40", ring: "focus-visible:ring-[#27C3D9]/50", text: "text-white", badge: "bg-white/12 text-white border-white/16" },
    act: { bar: "bg-[#2F80C3]", glow: "shadow-[#2F80C3]/20", tint: "from-[#2C5F77]/78 via-[#356B73]/64 to-[#417C84]/72", hover: "hover:border-[#2F80C3]/40", ring: "focus-visible:ring-[#2F80C3]/50", text: "text-white", badge: "bg-white/12 text-white border-white/16" },
    visualize: { bar: "bg-[#27C3D9]", glow: "shadow-[#27C3D9]/20", tint: "from-[#2C5F77]/78 via-[#356B73]/64 to-[#417C84]/72", hover: "hover:border-[#27C3D9]/40", ring: "focus-visible:ring-[#27C3D9]/50", text: "text-white", badge: "bg-white/12 text-white border-white/16" },
    impact: { bar: "bg-[#18B68F]", glow: "shadow-[#18B68F]/20", tint: "from-[#2C5F77]/78 via-[#356B73]/64 to-[#417C84]/72", hover: "hover:border-[#18B68F]/40", ring: "focus-visible:ring-[#18B68F]/50", text: "text-white", badge: "bg-white/12 text-white border-white/16" },
    network: { bar: "bg-[#5B5FCF]", glow: "shadow-[#5B5FCF]/20", tint: "from-[#2C5F77]/78 via-[#356B73]/64 to-[#417C84]/72", hover: "hover:border-[#5B5FCF]/40", ring: "focus-visible:ring-[#5B5FCF]/50", text: "text-white", badge: "bg-white/12 text-white border-white/16" },
    connect: { bar: "bg-[#27C3D9]", glow: "shadow-[#27C3D9]/20", tint: "from-[#2C5F77]/78 via-[#356B73]/64 to-[#417C84]/72", hover: "hover:border-[#27C3D9]/40", ring: "focus-visible:ring-[#27C3D9]/50", text: "text-white", badge: "bg-white/12 text-white border-white/16" },
    learn: { bar: "bg-[#4E9A51]", glow: "shadow-[#4E9A51]/20", tint: "from-[#2C5F77]/78 via-[#356B73]/64 to-[#417C84]/72", hover: "hover:border-[#4E9A51]/40", ring: "focus-visible:ring-[#4E9A51]/50", text: "text-white", badge: "bg-white/12 text-white border-white/16" },
    pilot: { bar: "bg-[#5B5FCF]", glow: "shadow-[#5B5FCF]/20", tint: "from-[#2C5F77]/78 via-[#356B73]/64 to-[#417C84]/72", hover: "hover:border-[#5B5FCF]/40", ring: "focus-visible:ring-[#5B5FCF]/50", text: "text-white", badge: "bg-white/12 text-white border-white/16" },
  } as const;
  return byBlock[blockId];
}

export default async function ExplorerPage() {
  const locale = await getServerLocale();
  const displayModePreference = await getServerDisplayModePreference();
  const role = await getCurrentUserRoleLabel();
  const currentProfile = toProfile(role);
  const profileLabel = getProfileLabel(currentProfile, locale);
  const spaces = getNavigationSpacesForProfile(
    currentProfile,
    displayModePreference.displayMode,
    locale,
  );
  const visibleSpaces = spaces.map((space) => ({
    ...space,
    items: space.items.filter((item) => item.routeId !== "explorer"),
  }));
  const totalItems = visibleSpaces.reduce((sum, space) => sum + space.items.length, 0);

  return (
    <div className="space-y-3 sm:space-y-5">
      <div className="relative mx-auto min-h-full w-full max-w-[1600px] space-y-3 px-3 py-4 sm:space-y-5 sm:px-8 sm:py-8 lg:py-12">
          <section className="relative overflow-hidden rounded-[1.8rem] border border-white/14 bg-[linear-gradient(135deg,rgba(65,124,132,0.72),rgba(44,95,119,0.78),rgba(91,95,207,0.42))] p-4 shadow-[0_28px_70px_-38px_rgba(19,52,63,0.34)] backdrop-blur-xl sm:rounded-[2.2rem] sm:p-6 lg:p-7">
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/25 to-transparent" />
              <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-cyan-400/12 blur-3xl" />
              <div className="absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-emerald-400/12 blur-3xl" />
            </div>
            <div className="relative grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.95fr)] lg:items-end">
              <div className="space-y-2.5 sm:space-y-4">
                <p className="inline-flex rounded-full border border-white/14 bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-white sm:text-[12px]">
                  {locale === "fr" ? "Navigation utilitaire" : "Utility navigation"}
                </p>
                <h1 className="max-w-3xl text-[clamp(2rem,7vw,3.6rem)] font-black tracking-tight leading-[0.94] text-white sm:text-[clamp(2.25rem,4vw,3.6rem)]">
                  {locale === "fr" ? "Plan du site" : "Site map"}
                </h1>
                <p className="max-w-2xl text-sm leading-[1.65] text-white/82 sm:text-base">
                  {locale === "fr"
                    ? "Vue compacte des rubriques accessibles pour votre profil, avec un accès direct à la bonne page."
                    : "Compact view of the sections available for your profile, with direct access to the right page."}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
                <div className="rounded-2xl border border-white/14 bg-white/10 px-3 py-3 shadow-[0_12px_28px_-24px_rgba(19,52,63,0.34)] backdrop-blur-sm sm:px-4 sm:py-4">
                  <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/78 sm:text-[11px] sm:tracking-[0.18em]">
                    {locale === "fr" ? "Sections" : "Sections"}
                  </div>
                  <div className="mt-1 text-xl font-black tracking-tight text-white sm:text-2xl">
                    {spaces.length}
                  </div>
                </div>
                <div className="rounded-2xl border border-white/14 bg-white/10 px-3 py-3 shadow-[0_12px_28px_-24px_rgba(19,52,63,0.34)] backdrop-blur-sm sm:px-4 sm:py-4">
                  <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/78 sm:text-[11px] sm:tracking-[0.18em]">
                    {locale === "fr" ? "Rubriques" : "Sections"}
                  </div>
                  <div className="mt-1 text-xl font-black tracking-tight text-white sm:text-2xl">
                    {totalItems}
                  </div>
                </div>
                <div className="col-span-2 rounded-2xl border border-white/14 bg-[rgba(24,182,143,0.18)] px-3 py-3 shadow-[0_12px_28px_-24px_rgba(19,52,63,0.34)] backdrop-blur-sm sm:col-span-1 sm:px-4 sm:py-4">
                  <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/82 sm:text-[11px] sm:tracking-[0.18em]">
                    {locale === "fr" ? "Profil actif" : "Active profile"}
                  </div>
                  <div className="mt-1 text-sm font-semibold tracking-tight text-white sm:text-base">
                    {profileLabel}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-6 sm:space-y-10">
            {visibleSpaces.map((space) => {
              const orderedItems = getOrderedPreviewItems(space.id, space.items);
              const firstHref = orderedItems[0]?.href ?? "/dashboard";
              const accent = getBlockAccent(space.id);
              return (
                <article
                  key={space.id}
                  id={`bloc-${space.id}`}
                  className={`scroll-mt-28 overflow-hidden rounded-[2rem] border border-white/14 bg-gradient-to-br ${accent.tint} p-4 shadow-2xl ${accent.glow} transition-all duration-500 hover:border-white/22 hover:shadow-black/20 sm:rounded-[2.5rem] sm:p-7 lg:p-8`}
                >
                  <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-white/14 pb-5 sm:mb-8 sm:pb-6">
                    <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                      <div className="relative">
                        <div className={`absolute -inset-2 rounded-2xl ${accent.bar} opacity-12 blur-xl transition-opacity group-hover:opacity-24`} />
                        <span className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-white/12 text-xl shadow-2xl ring-1 ring-white/14 sm:h-14 sm:w-14 sm:text-2xl">
                          {space.icon}
                        </span>
                        <span className={`absolute -bottom-1.5 -right-1.5 h-3.5 w-3.5 rounded-full ${accent.bar} border-2 border-[#2C5F77] shadow-sm`} />
                      </div>
                      <Link
                        href={firstHref}
                        className={`group inline-flex min-h-11 items-center justify-center gap-2.5 rounded-2xl border border-white/14 bg-white/12 px-5 py-2.5 text-sm font-bold text-white transition-all duration-300 hover:border-white/22 hover:bg-white/16 active:scale-95 shadow-lg sm:min-h-14 sm:px-6 sm:py-3 sm:text-base`}
                      >
                        <span className="relative flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/10 transition-colors group-hover:bg-white/20 sm:h-6 sm:w-6">
                          <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
                        </span>
                        {locale === "fr"
                          ? `Visiter la section ${space.label[locale]}`
                          : `Visit the ${space.label[locale]} section`}
                      </Link>
                    </div>
                  </div>

                  {orderedItems.length > 0 ? (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
                      {orderedItems.map((item) => (
                        <Link
                          key={item.id}
                          href={item.href}
                          title={item.description[locale]}
                          className={`group flex min-w-0 items-center justify-between gap-3 rounded-2xl border border-white/14 bg-white/10 p-3 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-white/22 hover:bg-white/16 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 ${accent.ring} sm:p-4`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                              <h3 className="block text-[15px] font-bold leading-tight text-white transition-colors group-hover:text-white sm:text-base">
                                {item.label[locale]}
                              </h3>
                              <p className="line-clamp-1 text-[12px] leading-snug text-white/86 transition-colors group-hover:text-white sm:text-[13px]">
                                {item.description[locale]}
                              </p>
                            </div>
                          </div>
                          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/14 bg-white/12 text-white/70 shadow-inner transition-all duration-300 group-hover:scale-110 ${accent.hover} group-hover:text-white`}>
                            <ChevronRight size={18} className="transition-transform group-hover:translate-x-0.5" />
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-white/14 bg-white/10 px-4 py-3 cmm-text-caption font-semibold uppercase tracking-wider text-white/82">
                      {locale === "fr"
                        ? "Cette section ne contient pas encore de rubrique accessible pour votre profil"
                        : "This section does not yet contain a page available for your profile"}
                    </div>
                  )}
                </article>
              );
            })}
          </section>
        </div>
    </div>
  );
}
