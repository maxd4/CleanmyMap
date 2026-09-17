import { StatCard } from "@/components/ui/page-structure";
import { buildConversionKpiCards } from "@/lib/community/engagement/conversion-kpis";
import type { EventConversionSummary } from "@/lib/community/engagement";

export function ReportsCommunityConversionKpis({
  summary,
}: {
  summary: EventConversionSummary;
}) {
  const cards = buildConversionKpiCards(summary);

  return (
    <section
      className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5"
      aria-labelledby="reports-community-conversion-title"
    >
      <div>
        <h2 id="reports-community-conversion-title" className="text-lg font-black text-red-700">
          Engagement des événements communautaires
        </h2>
        <p className="mt-1 cmm-text-small cmm-text-secondary">
          Calculs issus des événements communautaires et des actions liées, sans métrique parallèle.
        </p>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {cards.map((card) => (
          <StatCard
            key={card.id}
            label={card.title}
            value={card.value}
            description={card.subtitle}
            size="sm"
          />
        ))}
      </div>
    </section>
  );
}
