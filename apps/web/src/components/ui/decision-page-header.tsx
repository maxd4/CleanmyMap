"use client";

import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmPill, CmmPillGroup } from "@/components/ui/cmm-pill";
import { CTAGroup } from "@/components/ui/page-structure";
import { PageHeader } from "@/components/ui/page-header";

type HeaderAction = {
  href: string;
  label: string;
  tone?: "primary" | "secondary";
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
  const isFrench = locale === "fr";

  return (
    <header className="space-y-4 border-b border-[color:var(--border-default)] pb-6">
      <PageHeader
        align="left"
        tone="emerald"
        eyebrow={isFrench ? "Pourquoi" : "Why"}
        title={title}
        subtitle={objective}
        badge={<CmmPill tone="slate" size="sm">{context}</CmmPill>}
      />

      <CmmPillGroup className="mt-4">
        <CmmPill tone="slate" size="sm">
          {isFrench ? "Agir" : "Act"}
        </CmmPill>
        <CmmPill tone="slate" size="sm">
          {isFrench ? "Analyser" : "Analyze"}
        </CmmPill>
        <CmmPill tone="slate" size="sm">
          {isFrench ? "Tracer" : "Trace"}
        </CmmPill>
      </CmmPillGroup>

      {actions.length > 0 ? (
        <CTAGroup className="mt-4">
          {actions.map((action) => (
            <CmmButton
              key={`${action.href}-${action.label}`}
              href={action.href}
              tone={action.tone === "primary" ? "primary" : "secondary"}
            >
              {action.label}
            </CmmButton>
          ))}
        </CTAGroup>
      ) : null}
    </header>
  );
}
