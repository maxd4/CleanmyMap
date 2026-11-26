"use client";

import { useState } from "react";
import { GitBranch, Medal } from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmCard } from "@/components/ui/cmm-card";
import { SystemStateRetryButton } from "@/components/ui/system-state-retry-button";
import { ReferralInviteBadge } from "@/components/gamification/referral-invite-badge";
import { ReferralLineagePanel } from "@/components/gamification/referral-lineage-panel";
import type { ReferralSummary } from "@/lib/gamification/referrals/referrals";
import type { ReferralLineageView } from "@/lib/gamification/referrals/referral-lineage";

type ReferralProfileTabsProps = {
  summary: ReferralSummary | null;
  lineageView: ReferralLineageView | null;
  lineageError?: string | null;
  emptyCtaHref: string;
  locale?: "fr" | "en";
};

type TabKey = "badge" | "tree";

export function ReferralProfileTabs({
  summary,
  lineageView,
  lineageError,
  emptyCtaHref,
  locale = "fr",
}: ReferralProfileTabsProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("badge");
  const isEn = locale === "en";

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
          {isEn ? "Tree" : "Arbre"}
        </CmmButton>
      </div>

      <div className="pt-1">
        {activeTab === "badge" ? (
          summary ? (
            <ReferralInviteBadge summary={summary} />
          ) : (
            <CmmCard className="space-y-3">
              <p role="status" className="text-sm cmm-text-secondary">
                {isEn
                  ? "Referral badge temporarily unavailable."
                  : "Badge de parrainage momentanément indisponible."}
              </p>
              <SystemStateRetryButton label={isEn ? "Retry" : "Réessayer"} />
            </CmmCard>
          )
        ) : (
          <ReferralLineagePanel
            view={lineageView}
            errorMessage={lineageError}
            emptyCtaHref={emptyCtaHref}
            emptyCtaLabel={isEn ? "Create my referral link" : "Créer mon lien de parrainage"}
          />
        )}
      </div>
    </div>
  );
}
