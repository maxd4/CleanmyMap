"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Handshake, Users } from "lucide-react";
import { useCommunitySection } from "@/components/sections/rubriques/community/use-community-section";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { notifyNetworkToast } from "@/lib/errors/network-toast";
import { PageHeader } from "@/components/ui/page-header";
import { CommunityMissionsView } from "./community-section-components";
import { PartnersNetworkSection } from "../partners-network-section";
import { SectionShell } from "@/components/sections/rubriques/shared";
import { cn } from "@/lib/utils";

type SurfaceTab = "community" | "partners";

export function CommunitySection() {
  const model = useCommunitySection();
  const { eventsLoadError, reloadEvents } = model;
  const { locale } = useSitePreferences();
  const fr = locale === "fr";
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastToastRef = useRef<string | null>(null);

  const surfaceTab: SurfaceTab =
    searchParams.get("tab") === "partners" ? "partners" : "community";
  const isPartnersTab = surfaceTab === "partners";

  useEffect(() => {
    const error = eventsLoadError?.kind === "network" ? eventsLoadError : null;
    if (!error) return;

    const key = `${error.kind}:${error.message}:${error.referenceCode ?? ""}`;
    if (lastToastRef.current === key) return;

    lastToastRef.current = key;
    notifyNetworkToast({
      message: error.message,
      onRetry: () => void reloadEvents(),
      onRefresh: () => window.location.reload(),
    });
  }, [eventsLoadError, reloadEvents]);

  return (
    <SectionShell
      id="community"
      hideHeader
    >
      <div className="space-y-8 pb-20">
        <PageHeader
          title={fr ? "Communauté" : "Community"}
          subtitle={
            fr
              ? "Participez aux missions communautaires et retrouvez les acteurs du réseau."
              : "Join community missions and find organisations in the network."
          }
          action={
            <nav
              aria-label={fr ? "Sections de la page" : "Page sections"}
              className="flex flex-wrap gap-2"
            >
              <Link
                href={pathname}
                aria-current={!isPartnersTab ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-11 items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 focus-visible:ring-offset-2",
                  !isPartnersTab
                    ? "border-pink-600 bg-pink-600 text-white"
                    : "border-pink-200 bg-white text-slate-700 hover:border-pink-400 hover:text-pink-700",
                )}
              >
                <Users size={16} aria-hidden="true" />
                {fr ? "Communauté" : "Community"}
              </Link>
              <Link
                href={`${pathname}?tab=partners`}
                aria-current={isPartnersTab ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-11 items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2",
                  isPartnersTab
                    ? "border-indigo-600 bg-indigo-600 text-white"
                    : "border-indigo-200 bg-white text-slate-700 hover:border-indigo-400 hover:text-indigo-700",
                )}
              >
                <Handshake size={16} aria-hidden="true" />
                {fr ? "Partenaires" : "Partners"}
              </Link>
            </nav>
          }
        />

        {surfaceTab === "partners" ? (
          <PartnersNetworkSection fr={fr} showHeader={false} />
        ) : (
          <CommunityMissionsView
            fr={fr}
            activeTab={model.activeTab}
            setActiveTab={model.setActiveTab}
            eventsLoading={model.eventsLoading}
            eventsLoadError={model.eventsLoadError}
            reloadEvents={model.reloadEvents}
            upcomingEvents={model.upcomingEvents}
            myEvents={model.myEvents}
            pastEvents={model.pastEvents}
            rsvpLoadingEventId={model.rsvpLoadingEventId}
            onRsvp={model.onRsvp}
            isUpdatingEventOpsId={model.isUpdatingEventOpsId}
            getOpsDraft={model.getOpsDraft}
            updateOpsDraft={model.updateOpsDraft}
            onSaveEventOps={model.onSaveEventOps}
            communitySuccessMessage={model.communitySuccessMessage}
            communityError={model.communityError}
            createForm={model.createForm}
            updateCreateForm={model.updateCreateForm}
            onCreateEvent={model.onCreateEvent}
            isCreatingEvent={model.isCreatingEvent}
          />
        )}
      </div>
    </SectionShell>
  );
}
