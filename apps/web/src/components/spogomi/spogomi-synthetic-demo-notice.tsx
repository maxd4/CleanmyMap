import type { ReactNode } from "react";
import { CmmCard } from "@/components/ui/cmm-card";
import { SPOGOMI_CACHAN_DEMO_NOTICE } from "@/lib/spogomi/demo-scenario";

export function SpogomiSyntheticDemoNotice({ children }: { children?: ReactNode }) {
  return (
    <div role="note" data-testid="spogomi-synthetic-demo-notice">
      <CmmCard tone="amber" variant="glass" className="space-y-2 border-amber-300 bg-amber-50/80 p-4">
        <p className="font-black text-amber-950">{SPOGOMI_CACHAN_DEMO_NOTICE}</p>
        {children ? <div className="text-sm leading-6 text-amber-950">{children}</div> : null}
      </CmmCard>
    </div>
  );
}
