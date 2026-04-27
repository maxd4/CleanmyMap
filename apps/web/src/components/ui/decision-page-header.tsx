"use client";

import { useSitePreferences } from"@/components/ui/site-preferences-provider";
import { CmmCard } from"@/components/ui/cmm-card";
import { CmmButton, CmmButtonGroup } from"@/components/ui/cmm-button";
import { CmmPill, CmmPillGroup } from"@/components/ui/cmm-pill";

type HeaderAction = {
 href: string;
 label: string;
 tone?:"primary" |"secondary";
};

type DecisionPageHeaderProps = {
 context: string;
 title: string;
 objective: string;
 actions?: HeaderAction[];
};

export function DecisionPageHeader({
 context,
 title,
 objective,
 actions = [],
}: DecisionPageHeaderProps) {
 const { locale } = useSitePreferences();
 const isFrench = locale ==="fr";

 return (
 <CmmCard tone="slate" variant="elevated" size="lg">
 <p className="cmm-text-caption font-semibold uppercase tracking-[0.14em] cmm-text-muted">
 {isFrench ?"Pourquoi" :"Why"}
 </p>
 <p className="mt-1 cmm-text-caption font-semibold uppercase tracking-[0.14em] text-emerald-700">
 {context}
 </p>
 <h1 className="mt-2 text-2xl font-semibold cmm-text-primary">{title}</h1>
 <p className="mt-2 cmm-text-small cmm-text-secondary">{objective}</p>

 <CmmPillGroup className="mt-4">
 <CmmPill tone="slate" size="sm">
 {isFrench ?"Agir" :"Act"}
 </CmmPill>
 <CmmPill tone="slate" size="sm">
 {isFrench ?"Analyser" :"Analyze"}
 </CmmPill>
 <CmmPill tone="slate" size="sm">
 {isFrench ?"Tracer" :"Trace"}
 </CmmPill>
 </CmmPillGroup>

 {actions.length > 0 ? (
 <CmmButtonGroup className="mt-4">
 {actions.map((action) => (
 <CmmButton
 key={`${action.href}-${action.label}`}
 href={action.href}
 tone={action.tone ==="primary" ?"primary" :"secondary"}
 >
 {action.label}
 </CmmButton>
 ))}
 </CmmButtonGroup>
 ) : null}
 </CmmCard>
 );
}
