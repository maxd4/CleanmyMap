import Link from "next/link";
import { getCurrentUserRoleLabel } from "@/lib/authz";
import {
  getNavigationSpacesForProfile,
  type NavigationSpace,
} from "@/lib/navigation";
import { toProfile } from "@/lib/profiles";
import {
  getServerDisplayModePreference,
  getServerLocale,
} from "@/lib/server-preferences";

function getSpaceSummary(space: NavigationSpace, locale: "fr" | "en"): string {
  if (space.items.length === 0) {
    return locale === "fr"
      ? "Aucune rubrique disponible pour ce profil."
      : "No page available for this profile.";
  }

  const firstLabel = space.items[0]?.label[locale];
  const lastLabel = space.items[space.items.length - 1]?.label[locale];
  return locale === "fr"
    ? `${space.items.length} rubriques, de ${firstLabel} à ${lastLabel}.`
    : `${space.items.length} pages, from ${firstLabel} to ${lastLabel}.`;
}

export default async function ExplorerPage() {
  const locale = await getServerLocale();
  const displayModePreference = await getServerDisplayModePreference();
  const role = await getCurrentUserRoleLabel();
  const currentProfile = toProfile(role);
  const spaces = getNavigationSpacesForProfile(
    currentProfile,
    displayModePreference.displayMode,
    locale,
  );
  const totalItems = spaces.reduce((sum, space) => sum + space.items.length, 0);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 px-4 py-8 sm:px-8 lg:py-10">
      <section className="overflow-hidden rounded-[2rem] border border-white/50 bg-white/85 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <div className="space-y-4">
            <p className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700">
              {locale === "fr" ? "Plan du site" : "Site map"}
            </p>
            <div className="space-y-3">
              <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                {locale === "fr" ? "Explorer les blocs et rubriques" : "Explore blocks and pages"}
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
                {locale === "fr"
                  ? "Cette vue montre la hiérarchie utile du site pour naviguer sans garder une arborescence permanente dans le bandeau."
                  : "This view shows the useful navigation hierarchy without keeping a permanent tree in the header."}
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:justify-end">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                {locale === "fr" ? "Blocs visibles" : "Visible blocks"}
              </div>
              <div className="mt-2 text-3xl font-black text-slate-950">{spaces.length}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                {locale === "fr" ? "Rubriques visibles" : "Visible pages"}
              </div>
              <div className="mt-2 text-3xl font-black text-slate-950">{totalItems}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                {locale === "fr" ? "Profil courant" : "Current profile"}
              </div>
              <div className="mt-2 text-sm font-bold text-slate-950">
                {currentProfile}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        {spaces.map((space) => {
          const firstHref = space.items[0]?.href ?? "/dashboard";
          return (
            <article
              key={space.id}
              className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
                    <span className="text-xl leading-none">{space.icon}</span>
                    <span className="uppercase tracking-[0.14em]">
                      {locale === "fr" ? "Bloc" : "Block"}
                    </span>
                  </div>
                  <h2 className="text-2xl font-black tracking-tight text-slate-950">
                    {space.label[locale]}
                  </h2>
                  <p className="max-w-lg text-sm leading-6 text-slate-600">
                    {getSpaceSummary(space, locale)}
                  </p>
                </div>

                <Link
                  href={firstHref}
                  className="shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 transition hover:border-emerald-300 hover:bg-emerald-100"
                >
                  {locale === "fr" ? "Ouvrir" : "Open"}
                </Link>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {space.items.map((item) => (
                  <Link
                    key={item.id}
                    href={item.href}
                    title={item.description[locale]}
                    className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800"
                  >
                    {item.label[locale]}
                  </Link>
                ))}
                {space.items.length === 0 ? (
                  <span className="inline-flex items-center rounded-full border border-dashed border-slate-300 px-3 py-1.5 text-sm text-slate-500">
                    {locale === "fr"
                      ? "Aucune rubrique disponible"
                      : "No page available"}
                  </span>
                ) : null}
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
