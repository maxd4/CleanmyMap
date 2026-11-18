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
};

type PageReadingTemplateProps = {
 title: string;
 objective: string;
 primaryAction: TemplateAction;
 secondaryAction?: TemplateAction;
 analysis: ReactNode;
};

/**
 * Gabarit de lecture : `PageHeader` (titre, sous-titre, actions utiles) puis
 * le contenu analytique. Aucun bloc de synthèse ou de contexte décoratif.
 */
export function PageReadingTemplate(props: PageReadingTemplateProps) {
 const pageFamily = usePageFamily();

 return (
  <div data-rubrique-report-root>
   <CmmPageLayout>
    <CmmSectionGroup>
     <PageHeader
      family={pageFamily}
      title={props.title}
      subtitle={props.objective}
      action={
       <CTAGroup>
        <CmmButton href={props.primaryAction.href} tone="primary">
         {props.primaryAction.label}
        </CmmButton>
        {props.secondaryAction ? (
         <CmmButton href={props.secondaryAction.href} tone="secondary">
          {props.secondaryAction.label}
         </CmmButton>
        ) : null}
       </CTAGroup>
      }
     />
     <section className="space-y-4">{props.analysis}</section>
    </CmmSectionGroup>
   </CmmPageLayout>
  </div>
 );
}
