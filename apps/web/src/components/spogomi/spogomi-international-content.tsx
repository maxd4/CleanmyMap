"use client";

import { useMemo, useState } from "react";
import { CalendarDays, ExternalLink, Globe2, Megaphone, SlidersHorizontal } from "lucide-react";
import { CmmCard } from "@/components/ui/cmm-card";
import { CmmDisclosure } from "@/components/ui/cmm-disclosure";
import { CmmIcon } from "@/components/ui/cmm-icon";
import { filterSpogomiExternalEvents, type SpogomiExternalEvent, type SpogomiInternationalNews, type SpogomiInternationalSource } from "@/lib/spogomi/international-content";
import type { Locale } from "@/lib/ui/preferences";

type Props = {
  locale: Locale;
  sources: SpogomiInternationalSource[];
  news: SpogomiInternationalNews[];
  externalEvents: SpogomiExternalEvent[];
  copy: {
    worldTitle: string;
    worldDescription: string;
    cleanMyMapRole: string;
    officialSources: string;
    verifiedOn: string;
    newsTitle: string;
    confirmed: string;
    planned: string;
    internationalEvents: string;
    year: string;
    country: string;
    allYears: string;
    allCountries: string;
    externalEvent: string;
    source: string;
    noExternalEvents: string;
    newsDetails: string;
    filtersDetails: string;
    worldDetails: string;
  };
};

function formatDate(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-US", { dateStyle: "long" }).format(new Date(value));
}

export function SpogomiInternationalContent({ locale, sources, news, externalEvents, copy }: Props) {
  const [year, setYear] = useState<number | null>(null);
  const [country, setCountry] = useState<string | null>(null);
  const years = useMemo(() => [...new Set(externalEvents.map((event) => event.year))].sort(), [externalEvents]);
  const countries = useMemo(() => [...new Set(externalEvents.map((event) => event.country.fr))].sort((left, right) => left.localeCompare(right, locale)), [externalEvents, locale]);
  const filteredEvents = useMemo(() => filterSpogomiExternalEvents(externalEvents, { year, country }), [externalEvents, year, country]);

  return (
    <section className="space-y-4" aria-label="Informations internationales">
      <CmmCard tone="indigo" variant="glass" className="space-y-5 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <CmmIcon icon={Globe2} className="mt-1 text-indigo-700" />
          <div>
            <h2 className="text-xl font-black text-indigo-950">{copy.worldTitle}</h2>
            <p className="cmm-text-caption mt-1 text-slate-700">{copy.worldDescription}</p>
          </div>
        </div>
        <CmmDisclosure summary={copy.worldDetails} tone="indigo" size="sm">
          <div className="space-y-3">
            <p className="text-sm leading-6 text-indigo-950">{copy.cleanMyMapRole}</p>
            <div className="space-y-2">
          {sources.map((source) => (
            <div key={source.id} className="rounded-xl border border-indigo-100 bg-white/60 p-3">
              <a href={source.href} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-2 font-bold text-indigo-800 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
                {source.label[locale]} <ExternalLink size={15} aria-hidden="true" />
              </a>
              <p className="cmm-text-caption mt-1 text-slate-700">{source.description[locale]} · {copy.verifiedOn} {source.verifiedAt}</p>
            </div>
          ))}
            </div>
          </div>
        </CmmDisclosure>
      </CmmCard>

      <div className="grid gap-4 lg:grid-cols-3">
        <CmmCard tone="indigo" variant="glass" className="space-y-4 p-5">
          <div className="flex items-start gap-3">
            <CmmIcon icon={Megaphone} className="mt-1 text-indigo-700" />
            <div>
              <h2 className="text-xl font-black text-indigo-950">{copy.newsTitle}</h2>
              <p className="cmm-text-caption mt-1 text-slate-700">{copy.officialSources}</p>
            </div>
          </div>
          <CmmDisclosure summary={copy.newsDetails} tone="indigo" size="sm">
          <div className="space-y-3">
            {news.map((item) => (
              <article key={item.id} className="rounded-2xl border border-indigo-100 bg-white/70 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold uppercase tracking-[0.12em] text-indigo-700">
                  <span>{item.state === "planned" ? copy.planned : copy.confirmed}</span>
                  <time dateTime={item.publishedAt}>{formatDate(item.publishedAt, locale)}</time>
                </div>
                <h3 className="mt-2 font-black text-slate-950">{item.title[locale]}</h3>
                <a href={item.href} target="_blank" rel="noreferrer" className="mt-2 inline-flex min-h-10 items-center gap-2 text-sm font-bold text-indigo-800 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
                  {item.sourceLabel} <ExternalLink size={14} aria-hidden="true" />
                </a>
              </article>
            ))}
          </div>
          </CmmDisclosure>
        </CmmCard>

        <CmmCard tone="indigo" variant="glass" className="space-y-4 p-5">
          <div className="flex items-start gap-3">
            <CmmIcon icon={SlidersHorizontal} className="mt-1 text-indigo-700" />
            <div>
              <h2 className="text-xl font-black text-indigo-950">{copy.internationalEvents}</h2>
              <p className="cmm-text-caption mt-1 text-slate-700">{copy.externalEvent}</p>
            </div>
          </div>
          <CmmDisclosure summary={copy.filtersDetails} tone="indigo" size="sm">
          <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2" aria-label={`${copy.internationalEvents} filters`}>
            <label className="space-y-1 text-sm font-bold text-slate-900">
              <span>{copy.year}</span>
              <select value={year ?? ""} onChange={(event) => setYear(event.target.value ? Number(event.target.value) : null)} className="min-h-11 w-full rounded-xl border border-indigo-200 bg-white px-3 text-sm font-semibold text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
                <option value="">{copy.allYears}</option>
                {years.map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            </label>
            <label className="space-y-1 text-sm font-bold text-slate-900">
              <span>{copy.country}</span>
              <select value={country ?? ""} onChange={(event) => setCountry(event.target.value || null)} className="min-h-11 w-full rounded-xl border border-indigo-200 bg-white px-3 text-sm font-semibold text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
                <option value="">{copy.allCountries}</option>
                {countries.map((value) => <option key={value} value={value}>{locale === "fr" ? value : externalEvents.find((event) => event.country.fr === value)?.country.en ?? value}</option>)}
              </select>
            </label>
          </div>
          {filteredEvents.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-indigo-200 p-4 text-sm text-slate-700">{copy.noExternalEvents}</p>
          ) : (
            <div className="space-y-3">
              {filteredEvents.map((event) => (
                <article key={event.id} className="rounded-2xl border border-indigo-100 bg-white/70 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-black text-slate-950">{event.name[locale]}</h3>
                    <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-800">{event.state === "planned" ? copy.planned : copy.confirmed}</span>
                  </div>
                  <p className="mt-2 flex items-center gap-2 text-sm text-slate-800"><CalendarDays size={15} className="text-indigo-700" aria-hidden="true" />{event.period[locale]} · {event.place[locale]}</p>
                  <a href={event.sourceUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex min-h-10 items-center gap-2 text-sm font-bold text-indigo-800 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
                    {copy.source}: {event.sourceLabel} <ExternalLink size={14} aria-hidden="true" />
                  </a>
                </article>
              ))}
            </div>
          )}
          </div>
          </CmmDisclosure>
        </CmmCard>
      </div>
    </section>
  );
}
