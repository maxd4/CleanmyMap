"use client";

import Link from "next/link";
import { CheckCircle2, ChevronRight, Leaf } from "lucide-react";
import { SectionShell } from "@/components/sections/rubriques/shared";
import { PageHeader } from "@/components/ui/page-header";
import { JoinFormExplorer } from "./rejoindre-un-formulaire-section.explorer";
import { JoinFormSidebar } from "./rejoindre-un-formulaire-section.sidebar";
import { HeroIllustration } from "./rejoindre-un-formulaire-section.shared";
import { JoinFormConfirmationDialog } from "./rejoindre-un-formulaire-section-dialog";
import { useJoinFormSectionController } from "./rejoindre-un-formulaire-section.controller";

export function JoinFormSection() {
  const controller = useJoinFormSectionController();
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
    <SectionShell id="rejoindre-un-formulaire" hideHeader gradient="from-emerald-500/18 via-emerald-500/6 to-transparent">
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
                <span>{fr ? "Formulaire de groupe" : "Group form"}</span>
              </div>

              <PageHeader
                title={fr ? "Rejoindre un formulaire de groupe" : "Join a group form"}
                subtitle={
                  fr
                    ? "Participez à des pré-formulaires ouverts et consultez séparément les déclarations terminées."
                    : "Join open pre-forms and keep completed declarations separate."
                }
              />

              <div className="inline-flex flex-wrap items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50/75 px-3.5 py-1.5 text-xs font-semibold text-emerald-900 shadow-sm">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <CheckCircle2 size={12} />
                </span>
                {fr ? "Pré-formulaires en attente de bénévoles" : "Pre-forms waiting for volunteers"}
              </div>
            </div>

            <div className="min-h-[140px] self-end">
              <HeroIllustration />
            </div>
          </div>
        </section>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_340px]">
          <JoinFormExplorer {...controller} />
          <JoinFormSidebar {...controller} />
        </div>
      </div>

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
