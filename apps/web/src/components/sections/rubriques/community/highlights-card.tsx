"use client";

import type { CommunityHighlightItem } from"@/components/sections/rubriques/community/types";

type CommunityHighlightsCardProps = {
 loading: boolean;
 errorMessage: string | null;
 highlights: CommunityHighlightItem[];
};

function CommunityHighlightsCard(props: CommunityHighlightsCardProps) {
 const { loading, errorMessage, highlights } = props;

 return (
 <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
 <h2 className="cmm-text-small font-semibold cmm-text-primary">
 Mobilisation recente
 </h2>
 {loading ? (
 <p className="mt-2 cmm-text-small cmm-text-muted">
 Chargement des rendez-vous communautaires...
 </p>
 ) : null}
 {errorMessage ? (
 <p className="mt-2 cmm-text-small text-rose-700">{errorMessage}</p>
 ) : null}
 {!loading && !errorMessage ? (
 <ul className="mt-2 space-y-1 cmm-text-small cmm-text-secondary">
 {highlights.map((item) => (
 <li key={item.date}>
 {item.date}: {item.actions} action(s), {item.volunteers}{""}
 benevole(s)
 </li>
 ))}
 {highlights.length === 0 ? (
 <li>Aucune action validee sur la periode.</li>
 ) : null}
 </ul>
 ) : null}
 </div>
 );
}

export { CommunityHighlightsCard };
