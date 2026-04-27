"use client";

import Link from"next/link";
import { useSitePreferences } from"@/components/ui/site-preferences-provider";
import { formatFrDate } from"./community/helpers";
import {
 getTotalUpcomingAcademieClimatWorkshops,
 getVisibleAcademieClimatWorkshops,
} from"./academie-climat-workshops";

const TONE_STYLES: Record<"rose" |"amber" |"emerald", string> = {
 rose:"border-rose-200 bg-rose-50/80 text-rose-900",
 amber:"border-amber-200 bg-amber-50/80 text-amber-900",
 emerald:"border-emerald-200 bg-emerald-50/80 text-emerald-900",
};

export function AcademieClimatWorkshopsPanel() {
 const { locale } = useSitePreferences();
 const fr = locale ==="fr";
 const visibleCategories = getVisibleAcademieClimatWorkshops();
 const totalWorkshops = getTotalUpcomingAcademieClimatWorkshops();

 if (visibleCategories.length === 0) {
 return null;
 }

 return (
 <section className="space-y-4 rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-md">
 <div className="flex flex-wrap items-start justify-between gap-3">
 <div>
 <p className="cmm-text-caption font-semibold uppercase tracking-[0.14em] text-emerald-700">
 {fr ?"Académie du Climat" :"Climate Academy"}
 </p>
 <h2 className="mt-1 text-lg font-semibold cmm-text-primary">
 {fr ?"Prochains ateliers" :"Upcoming workshops"}
 </h2>
 <p className="mt-1 max-w-2xl cmm-text-small cmm-text-secondary">
 {fr
 ?"Les catégories vides sont masquées automatiquement. Les dates sont maintenues depuis les sources officielles de l’Académie du Climat."
 :"Empty categories are hidden automatically. Dates are kept in sync with the official Académie du Climat sources."}
 </p>
 </div>
 <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 cmm-text-caption cmm-text-secondary">
 <p className="font-semibold uppercase tracking-[0.14em] cmm-text-muted">
 {fr ?"Ateliers à venir" :"Upcoming"}
 </p>
 <p className="mt-1 text-lg font-bold text-slate-950">{totalWorkshops}</p>
 </div>
 </div>

 <div className="grid gap-4">
 {visibleCategories.map((category) => (
 <article
 key={category.id}
 className={`rounded-2xl border p-4 ${TONE_STYLES[category.tone]}`}
 >
 <div className="flex flex-wrap items-center justify-between gap-2">
 <div>
 <h3 className="cmm-text-small font-bold uppercase tracking-[0.18em]">
 {category.label[locale]}
 </h3>
 <p className="cmm-text-caption opacity-80">
 {category.workshops.length}{""}
 {fr ?"atelier(s) à venir" :"upcoming workshop(s)"}
 </p>
 </div>
 <span className="rounded-full border border-current/15 bg-white/60 px-3 py-1 cmm-text-caption font-semibold">
 {fr ?"Catégorie active" :"Active category"}
 </span>
 </div>

 <div className="mt-4 grid gap-3">
 {category.workshops.map((workshop) => (
 <div
 key={workshop.id}
 className="rounded-xl border border-white/70 bg-white/80 p-4 shadow-sm"
 >
 <div className="flex flex-wrap items-start justify-between gap-3">
 <div className="space-y-1">
 <p className="cmm-text-caption font-semibold uppercase tracking-[0.14em] cmm-text-muted">
 {formatFrDate(workshop.eventDate)} · {workshop.timeLabel}
 </p>
 <h4 className="text-base font-semibold text-slate-950">
 {workshop.title}
 </h4>
 </div>
 <Link
 href={workshop.sourceUrl}
 target="_blank"
 rel="noopener noreferrer"
 className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1.5 cmm-text-caption font-semibold cmm-text-secondary transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800"
 >
 {fr ?"Voir la source" :"Open source"}
 </Link>
 </div>
 <p className="mt-2 cmm-text-small leading-6 cmm-text-secondary">
 {workshop.summary}
 </p>
 <div className="mt-3 flex flex-wrap items-center gap-2 cmm-text-caption cmm-text-muted">
 <span>{workshop.locationLabel}</span>
 <span>•</span>
 <span>
 {fr ?"Mise à jour officielle" :"Official update"}{""}
 {formatFrDate(workshop.sourceUpdatedAt)}
 </span>
 </div>
 </div>
 ))}
 </div>
 </article>
 ))}
 </div>
 </section>
 );
}
