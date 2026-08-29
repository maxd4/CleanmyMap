"use client";

import type { ReactNode } from "react";
import { CmmPageLayout, CmmSectionGroup } from "@/components/ui/cmm-section";
import { CmmButton } from "@/components/ui/cmm-button";
import { CTAGroup } from "@/components/ui/page-structure";
import { PageHeader } from "@/components/ui/page-header";
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
  <div data-rubrique-report-root>
   <CmmPageLayout>
    <CmmSectionGroup>
   {/* Analysis */}
   <section className="space-y-4">
    <div className="space-y-4">{props.analysis}</div>
   </section>

   {/* Header */}
   <header className="border-t border-[color:var(--border-default)] pt-5">
    <PageHeader
     family={pageFamily}
     title={props.title}
     subtitle={props.objective}
     action={props.context ? <span className="text-sm font-medium text-slate-600">{props.context}</span> : undefined}
    />
   </header>

   {/* Actions */}
   <section className="border-t border-[color:var(--border-default)] pt-6">
    <CTAGroup>
     <CmmButton href={props.primaryAction.href} tone="primary" variant="default">
      {props.primaryAction.label}
     </CmmButton>
     {props.secondaryAction ? (
      <CmmButton href={props.secondaryAction.href} tone="secondary">
       {props.secondaryAction.label}
      </CmmButton>
     ) : null}
    </CTAGroup>
   </section>
    </CmmSectionGroup>
   </CmmPageLayout>
  </div>
 );
}
