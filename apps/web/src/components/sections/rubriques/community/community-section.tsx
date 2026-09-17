"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Handshake, Users } from "lucide-react";
import { useCommunitySection } from "@/components/sections/rubriques/community/use-community-section";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { notifyNetworkToast } from "@/lib/errors/network-toast";
import { CmmButton } from "@/components/ui/cmm-button";
import { CommunityMissionsView } from "./community-section-components";
import { PartnersNetworkSection } from "../partners-network-section";
import { SectionShell } from "@/components/sections/rubriques/shared";

type SurfaceTab = "community" | "partners";

export function CommunitySection() {
  const model = useCommunitySection();
  const { eventsLoadError, reloadEvents } = model;
  const { locale } = useSitePreferences();
  const fr = locale === "fr";
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastToastRef = useRef<string | null>(null);

  const surfaceTab: SurfaceTab =
    searchParams.get("tab") === "partners" ? "partners" : "community";
  const isPartnersTab = surfaceTab === "partners";

  function setSurfaceTab(nextTab: SurfaceTab) {
    const params = new URLSearchParams(searchParams.toString());
    if (nextTab === "partners") {
      params.set("tab", "partners");
    } else {
      params.delete("tab");
    }

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

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
      title={fr ? "Communauté" : "Community"}
      subtitle={
        fr
          ? "Consultez les missions, inscrivez-vous et accédez au réseau de partenaires."
          : "Browse missions, register and access the partner network."
      }
      icon={Users}
      hideHeader={isPartnersTab}
    >
      <div className="space-y-6 pb-20">
        <div className="rounded-[2rem] border border-pink-200 bg-white/85 p-3 shadow-[0_20px_60px_-44px_rgba(190,24,93,0.35)]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="px-3 text-sm font-semibold text-slate-700">
              {surfaceTab === "community"
                ? fr
                  ? "Missions communautaires"
                  : "Community missions"
                : fr
                  ? "Réseau de partenaires"
                  : "Partner network"}
            </p>
            <div className="flex flex-wrap gap-2">
              <CmmButton
                onClick={() => setSurfaceTab("community")}
                tone={surfaceTab === "community" ? "primary" : "tertiary"}
                variant="pill"
                className="px-4 py-2.5"
              >
                <Users size={16} />
                <span>{fr ? "Communauté" : "Community"}</span>
              </CmmButton>
              <CmmButton
                onClick={() => setSurfaceTab("partners")}
                tone={surfaceTab === "partners" ? "primary" : "tertiary"}
                variant="pill"
                className="px-4 py-2.5"
              >
                <Handshake size={16} />
                <span>{fr ? "Partenaires" : "Partners"}</span>
              </CmmButton>
            </div>
          </div>
        </div>

        {surfaceTab === "partners" ? (
          <PartnersNetworkSection fr={fr} />
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
