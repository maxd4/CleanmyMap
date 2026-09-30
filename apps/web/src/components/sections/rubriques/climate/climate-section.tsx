"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { fetchActions } from "@/lib/actions/http";
import { computeClimateContext } from "@/lib/analytics/climate-context";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { SectionShell } from "@/components/sections/rubriques/shared";
import { AnimatePresence } from "framer-motion";
import { Globe } from "lucide-react";
import { ClimateLoadError, ClimateLoading, ClimatePeriodPicker, ClimateResults } from "./climate-section-view";
import type {
  PublicSectionActionListResponse,
  PublicSectionInitialData,
} from "@/lib/sections/public-section-snapshot-contract";

export function ClimateSection({
  initialData,
}: {
  initialData?: PublicSectionInitialData["climate"];
}) {
  const { locale } = useSitePreferences();
  const fr = locale === "fr";
  const [periodDays, setPeriodDays] = useState<30 | 90 | 365>(30);
  
  const { data, isLoading, error, mutate } = useSWR<PublicSectionActionListResponse>(
    ["section-climate-v2"],
    () => fetchActions({ status: "approved", limit: 500 }),
    { fallbackData: initialData?.actions ?? undefined },
  );

  const context = useMemo(() => {
    const records = (data?.items ?? []).map((item) => ({
      observedAt: item.action_date,
      wasteKg: item.waste_kg === null ? null : Number(item.waste_kg),
      cigaretteButts: Number(item.cigarette_butts || 0),
      durationMinutes: Number(item.duration_minutes || 0),
      volunteersCount: Number(item.volunteers_count || 0),
      effectiveVolunteerUnits:
        item.contract?.metadata.volunteerParticipation?.effectiveVolunteerUnits ?? null,
      volunteerParticipation: item.contract?.metadata.volunteerParticipation ?? null,
      latitude: item.contract?.geometry?.coordinates?.[0]?.[1] ?? null,
      longitude: item.contract?.geometry?.coordinates?.[0]?.[0] ?? null,
    }));
    return computeClimateContext({ records, periodDays });
  }, [data?.items, periodDays]);

  return (
    <SectionShell
      id="climate"
      title={fr ? "Impact Climat & Biodiversité" : "Climate & Biodiversity Impact"}
      subtitle={fr ? "Analyse de la contribution environnementale et évitement carbone" : "Analysis of environmental contribution and carbon avoidance"}
      icon={Globe}
      gradient="from-blue-500/20 via-emerald-500/10 to-transparent"
    >
      <div className="space-y-16 pt-8">
        <ClimatePeriodPicker fr={fr} periodDays={periodDays} setPeriodDays={setPeriodDays} />

        {error && <ClimateLoadError fr={fr} mutate={mutate} />}

        <AnimatePresence mode="wait">
          {isLoading ? <ClimateLoading /> : <ClimateResults fr={fr} context={context} />}
        </AnimatePresence>
      </div>
    </SectionShell>
  );
}
