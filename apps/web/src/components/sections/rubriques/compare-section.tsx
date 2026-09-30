"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { BarChart3, AlertTriangle } from "lucide-react";

import { fetchActions } from "@/lib/actions/http";
import { computeZoneCompare } from "@/lib/analytics/compare-zones";
import { dashboardPeriodStorage } from "@/lib/storage/ui-state-storage";
import { SectionShell } from "@/components/sections/rubriques/shared";
import { CompareLoading, ComparePeriodPicker, CompareSectionResults } from "./compare-section-view";

export function CompareSection() {
  const [periodDays, setPeriodDays] = useState<30 | 90 | 365>(() => dashboardPeriodStorage.read() ?? 90);
  useEffect(() => { dashboardPeriodStorage.write(periodDays); }, [periodDays]);
  const { data, isLoading, error } = useSWR(["section-compare-v3"], () => fetchActions({ status: "approved", limit: 1000 }));
  const comparison = useMemo(() => computeZoneCompare({
    records: (data?.items ?? []).map((item) => ({
      observedAt: item.action_date,
      locationLabel: item.location_label || "Hors arrondissement",
      wasteKg: item.waste_kg === null ? null : Number(item.waste_kg),
      butts: Number(item.cigarette_butts || 0),
      volunteersCount: Number(item.volunteers_count || 0),
    })),
    periodDays,
  }), [data?.items, periodDays]);
  const topRows = comparison.rows.slice(0, 10);

  return <SectionShell id="compare-zones" title="Benchmark Territorial" subtitle="Analyse comparative et performance relative des zones d'intervention." icon={BarChart3} headingLevel="h2" gradient="from-indigo-500/20 via-slate-500/10 to-transparent"><div className="space-y-12 pt-8"><ComparePeriodPicker periodDays={periodDays} setPeriodDays={setPeriodDays} />{isLoading ? <CompareLoading /> : error ? <div className="rounded-[3rem] border border-white/5 bg-slate-900/20 p-20 text-center backdrop-blur-xl"><AlertTriangle className="mx-auto mb-6 text-rose-500" size={48} /><h3 className="mb-2 text-2xl font-black text-white">Erreur de chargement</h3><p className="cmm-text-body">Impossible de générer le benchmark territorial.</p></div> : <CompareSectionResults comparison={comparison} topRows={topRows} />}</div></SectionShell>;
}
