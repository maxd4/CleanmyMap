"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckCircle2, ChevronRight, Leaf } from "lucide-react";
import { SectionShell } from "@/components/sections/rubriques/shared";
import { PageHeader } from "@/components/ui/page-header";
import { JoinFormExplorer } from "./rejoindre-un-formulaire-section.explorer";
import { JoinFormSidebar } from "./rejoindre-un-formulaire-section.sidebar";
import { HeroIllustration } from "./rejoindre-un-formulaire-section.shared";
import { JoinFormConfirmationDialog } from "./rejoindre-un-formulaire-section-dialog";
import { useJoinFormSectionController } from "./rejoindre-un-formulaire-section.controller";
import { PastActionsPanel } from "./rejoindre-une-action.past-actions";
import { JoinActionTabs } from "./rejoindre-une-action.tabs";
import { ChatActionShareDialog } from "@/components/chat/chat-action-share-dialog";

export function JoinActionSection() {
  const controller = useJoinFormSectionController();
  const [shareActionId, setShareActionId] = useState<string | null>(null);
  const {
    fr,
    items,
    pendingJoinActionId,
    pendingLeaveActionId,
    closePendingActions,
    confirmPendingJoin,
    confirmPendingLeave,
  } = controller;

  return (
    <SectionShell id="rejoindre-une-action" hideHeader gradient="from-emerald-500/18 via-emerald-500/6 to-transparent">
      <div className="space-y-6 pt-4 text-slate-900">
        <section className="overflow-hidden rounded-[2.1rem] border border-emerald-100 bg-[linear-gradient(180deg,#f8fbf5_0%,#edf7e6_100%)] shadow-[0_20px_56px_-42px_rgba(15,23,42,0.28)]">
          <div className="grid gap-4 px-5 py-3.5 md:px-6 md:py-4 lg:grid-cols-[minmax(0,1.12fr)_minmax(260px,0.88fr)] lg:items-center">
            <div className="relative z-10 space-y-2.5">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
                <Link href="/sections/route" className="inline-flex items-center gap-2 text-emerald-800 transition hover:text-emerald-900">
                  <Leaf size={16} />
                  {fr ? "Agir" : "Act"}
                </Link>
                <ChevronRight size={14} className="text-slate-300" />
                <span>{fr ? "Rejoindre une action" : "Join an action"}</span>
              </div>

              <PageHeader
                title={fr ? "Rejoindre une action" : "Join an action"}
                subtitle={
                  fr
                    ? "Rejoignez une action future ou consultez les résultats publics des actions terminées."
                    : "Join a future action or review public results from completed actions."
                }
              />

              <div className="inline-flex flex-wrap items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50/75 px-3.5 py-1.5 text-xs font-semibold text-emerald-900 shadow-sm">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <CheckCircle2 size={12} />
                </span>
                {fr ? "Actions futures et passées" : "Future and past actions"}
              </div>
            </div>

            <div className="min-h-[140px] self-end">
              <HeroIllustration />
            </div>
          </div>
        </section>

      <JoinActionTabs
        activeTab={controller.activeTab}
        focusActionId={controller.focusActionId}
        fr={fr}
      />

      <div
        id={`join-action-panel-${controller.activeTab}`}
        role="tabpanel"
        aria-labelledby={`join-action-tab-${controller.activeTab}`}
        tabIndex={-1}
        className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-4"
      >
        {controller.targetResolution === "resolving" ? (
          <div role="status" className="rounded-[1.25rem] border border-emerald-100 bg-white px-4 py-5 text-sm font-semibold text-emerald-900 shadow-sm">
            {fr ? "Recherche de cette action dans les publications accessibles..." : "Looking for this action in the accessible publications..."}
          </div>
        ) : controller.targetResolution === "unavailable" ? (
          <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-700 shadow-sm">
            <p className="font-bold text-slate-900">{fr ? "Cette action n’est pas disponible dans cette vue." : "This action is not available in this view."}</p>
            <p className="mt-2 leading-relaxed">{fr ? "Aucune information supplémentaire n’est affichée." : "No additional information is displayed."}</p>
          </div>
        ) : controller.activeTab === "future" ? (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_340px]">
            <JoinFormExplorer {...controller} onShareAction={setShareActionId} />
            <JoinFormSidebar {...controller} />
          </div>
        ) : (
          <PastActionsPanel
            items={controller.visiblePastItems}
            loading={controller.pastLoading}
            error={controller.pastError}
            fr={controller.fr}
            focusedActionId={controller.focusActionId}
          />
        )}
      </div>
      </div>

      {shareActionId ? <ChatActionShareDialog actionId={shareActionId} onClose={() => setShareActionId(null)} /> : null}

      <JoinFormConfirmationDialog
        fr={fr}
        mode={pendingJoinActionId ? "join" : "leave"}
        pendingAction={items.find((item) => item.id === (pendingJoinActionId ?? pendingLeaveActionId)) ?? null}
        onClose={closePendingActions}
        onConfirm={() => {
          if (pendingJoinActionId) {
            void confirmPendingJoin();
            return;
          }
          void confirmPendingLeave();
        }}
      />
    </SectionShell>
  );
}

export const JoinFormSection = JoinActionSection;
