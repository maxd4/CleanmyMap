"use client";

import type { EventConversionSummary } from"@/lib/community/engagement";
import { buildConversionKpiCards } from"@/components/sections/rubriques/community/kpis";
import { StatCard } from"@/components/ui/page-structure";

type CommunityConversionKpiGridProps = {
 summary: EventConversionSummary;
};

function CommunityConversionKpiGrid(props: CommunityConversionKpiGridProps) {
 const cards = buildConversionKpiCards(props.summary);

 return (
 <div className="grid gap-3 md:grid-cols-3">
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
 );
}

export { CommunityConversionKpiGrid };
