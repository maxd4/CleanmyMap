"use client";

import type { EventConversionSummary } from"@/lib/community/engagement";
import { buildConversionKpiCards } from"@/components/sections/rubriques/community/kpis";

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
 <p className="cmm-text-caption uppercase tracking-wide cmm-text-muted">
 {card.title}
 </p>
 <p className="mt-1 text-2xl font-semibold cmm-text-primary">
 {card.value}
 </p>
 <p className="mt-1 cmm-text-caption cmm-text-secondary">{card.subtitle}</p>
 </article>
 ))}
 </div>
 );
}

export { CommunityConversionKpiGrid };
