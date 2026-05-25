"use client";

import type { ReactNode } from "react";
import { CmmPageShell } from "@/components/ui/cmm-card";
import { CmmButton, CmmButtonGroup } from "@/components/ui/cmm-button";
import { PageHero } from "@/components/ui/page-hero";
import { usePageFamily } from "@/lib/ui/page-families";

type TemplateAction = {
 href: string;
 label: string;
 tone?: "primary" | "secondary";
};

type PageReadingTemplateProps = {
 context?: string;
 title: string;
 objective: string;
 summary?: ReactNode;
 primaryAction: TemplateAction;
 secondaryAction?: TemplateAction;
 analysis: ReactNode;
 trace?: ReactNode;
};

export function PageReadingTemplate(props: PageReadingTemplateProps) {
 const pageFamily = usePageFamily();

 return (
  <CmmPageShell className="space-y-8" data-rubrique-report-root>
   {/* Analysis */}
   <section className="space-y-4">
    <div className="space-y-4">{props.analysis}</div>
   </section>

   {/* Header */}
   <header className="border-t border-[color:var(--border-default)] pt-5">
    <PageHero
     family={pageFamily}
     eyebrow={props.context}
     title={props.title}
     subtitle={props.objective}
     titleSize="compact"
     className="max-w-3xl"
    />
   </header>

   {/* Actions */}
   <section className="border-t border-[color:var(--border-default)] pt-6">
    <CmmButtonGroup>
     <CmmButton href={props.primaryAction.href} tone="primary" variant="default">
      {props.primaryAction.label}
     </CmmButton>
     {props.secondaryAction ? (
      <CmmButton href={props.secondaryAction.href} tone="secondary">
       {props.secondaryAction.label}
      </CmmButton>
     ) : null}
    </CmmButtonGroup>
   </section>
  </CmmPageShell>
 );
}
