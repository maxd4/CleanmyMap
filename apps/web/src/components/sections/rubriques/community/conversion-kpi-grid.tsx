"use client";

import type { EventConversionSummary } from "@/lib/community/engagement";
import { buildConversionKpiCards } from "@/components/sections/rubriques/community/kpis";

type CommunityConversionKpiGridProps = {
  summary: EventConversionSummary;
};

function CommunityConversionKpiGrid(props: CommunityConversionKpiGridProps) {
  const cards = buildConversionKpiCards(props.summary);

  return (
    <div className="grid gap-3 md:grid-cols-3">
      {cards.map((card) => (
        <article
          key={card.id}
          className="rounded-xl border border-slate-200 bg-white p-4"
        >
          <p className="text-xs uppercase tracking-wide text-slate-500">
            {card.title}
          </p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">
            {card.value}
          </p>
          <p className="mt-1 text-xs text-slate-600">{card.subtitle}</p>
        </article>
      ))}
    </div>
  );
}

export { CommunityConversionKpiGrid };
