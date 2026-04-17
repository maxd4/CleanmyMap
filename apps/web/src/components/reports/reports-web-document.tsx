"use client";

import { CHAPTERS } from "@/components/reports/web-document/constants";
import { ReportsWebSections } from "@/components/reports/web-document/sections";
import { useReportsWebDocumentModel } from "@/components/reports/web-document/use-reports-web-document-model";

export function ReportsWebDocument() {
  const model = useReportsWebDocumentModel();

  return (
    <section className="rounded-3xl border border-slate-200 bg-gradient-to-b from-white via-[#f7fafd] to-white shadow-sm">
      <header className="border-b border-slate-200 bg-white/90 p-6 backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#21506f]">
          Rapport web integre
        </p>
        <h2 className="mt-2 text-3xl font-semibold text-slate-900">
          Rapport institutionnel web - version exhaustive
        </h2>
        <p className="mt-2 max-w-4xl text-sm text-slate-600">
          Version web complete branchee a la rubrique{" "}
          <span className="font-semibold">Reporting</span>, fidele au fond du
          PDF et optimisee pour une double lecture: operationnelle terrain et
          pilotage strategique.
        </p>
        <div className="mt-4 grid max-w-md gap-1">
          <label
            htmlFor="report-web-association-filter"
            className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500"
          >
            Perimetre
          </label>
          <select
            id="report-web-association-filter"
            value={model.associationFilter}
            onChange={(event) => model.setAssociationFilter(event.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-emerald-500"
          >
            <option value="all">Global (toutes associations)</option>
            {model.associationOptions.map((association) => (
              <option key={association} value={association}>
                {association}
              </option>
            ))}
          </select>
        </div>
        <p className="mt-2 text-xs text-slate-600">
          Contexte du rapport:{" "}
          <span className="font-semibold">Perimetre: {model.activeScopeLabel}</span>
        </p>
        <p className="mt-2 text-xs text-slate-500">
          Derniere generation: {model.report.generatedAt}
        </p>
      </header>

      <div className="grid gap-5 p-4 lg:grid-cols-[18rem_minmax(0,1fr)] lg:p-6">
        <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-4 lg:sticky lg:top-24">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Sommaire cliquable
          </p>
          <nav className="mt-3 space-y-1.5 text-sm text-slate-700">
            {CHAPTERS.map((chapter) => (
              <a
                key={chapter.id}
                href={`#${chapter.id}`}
                className="block rounded-lg px-2 py-1.5 transition hover:bg-slate-100 hover:text-slate-900"
              >
                <span className="text-xs text-slate-500">{chapter.kicker}</span>
                <span className="block font-medium">{chapter.title}</span>
              </a>
            ))}
          </nav>
          <div className="mt-4 rounded-xl border border-[#c7d3e4] bg-[#f5f8fd] p-3 text-xs text-slate-600">
            Navigation rapide: clique un chapitre pour y aller instantanement.
          </div>
        </aside>

        <ReportsWebSections
          report={model.report}
          weather={model.weather.data ?? {}}
          weatherAdvice={model.weatherAdvice}
          isLoading={model.isLoading}
          hasError={model.hasError}
        />
      </div>
    </section>
  );
}
