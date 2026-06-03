"use client";

import { useState } from "react";
import { GitBranch, Medal } from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";
import { ReferralInviteBadge } from "@/components/gamification/referral-invite-badge";
import { ReferralLineagePanel } from "@/components/gamification/referral-lineage-panel";
import type { ReferralSummary } from "@/lib/gamification/referrals";
import type { ReferralLineageView } from "@/lib/gamification/referral-lineage";

type ReferralProfileTabsProps = {
  summary: ReferralSummary;
  lineageView: ReferralLineageView | null;
  emptyCtaHref: string;
};

type TabKey = "badge" | "tree";

export function ReferralProfileTabs({
  summary,
  lineageView,
  emptyCtaHref,
}: ReferralProfileTabsProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("badge");

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2 rounded-[1.4rem] border border-amber-200/14 bg-black/15 p-2">
        <CmmButton
          type="button"
          tone={activeTab === "badge" ? "primary" : "secondary"}
          variant="pill"
          onClick={() => setActiveTab("badge")}
          className="h-10 gap-2 px-4 text-[11px] font-black uppercase tracking-[0.18em]"
        >
          <Medal size={14} />
          Badge
        </CmmButton>
        <CmmButton
          type="button"
          tone={activeTab === "tree" ? "primary" : "secondary"}
          variant="pill"
          onClick={() => setActiveTab("tree")}
          className="h-10 gap-2 px-4 text-[11px] font-black uppercase tracking-[0.18em]"
        >
          <GitBranch size={14} />
          Arbre
        </CmmButton>
      </div>

      <div className="pt-1">
        {activeTab === "badge" ? (
          <ReferralInviteBadge summary={summary} />
        ) : (
          <ReferralLineagePanel
            view={lineageView}
            emptyCtaHref={emptyCtaHref}
            emptyCtaLabel="Créer mon lien de parrainage"
          />
        )}
      </div>
    </div>
  );
}
