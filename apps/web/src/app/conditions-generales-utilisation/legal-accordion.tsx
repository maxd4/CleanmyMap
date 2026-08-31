import type { ReactNode } from "react";
import { CmmDisclosure } from "@/components/ui/cmm-disclosure";

type LegalAccordionProps = {
  children: ReactNode;
  title: string;
};

export function LegalAccordion({ children, title }: LegalAccordionProps) {
  return (
    <CmmDisclosure
      summary={
        <span
          role="heading"
          aria-level={2}
          className="text-base font-bold tracking-[-0.015em] text-slate-900 sm:text-lg"
        >
          {title}
        </span>
      }
      tone="slate"
      size="lg"
    >
      {children}
    </CmmDisclosure>
  );
}
