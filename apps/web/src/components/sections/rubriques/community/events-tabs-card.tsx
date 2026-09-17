"use client";

import { useState, memo } from "react";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { QRCodeDialog } from "@/components/ui/qrcode-dialog";
import { useAuth } from "@clerk/nextjs";
import { 
  EventTabsHeader, 
  EventListStates, 
  EventArticleUpcoming, 
  EventArticleMine, 
  EventArticlePast,
  AnonymousRegistrationState,
} from "./community-events-components";
import type { CommunityEventItem } from "@/lib/community/http";
import type { CommunityEventsTabsCardProps } from "./community-events-types";

const CommunityEventsTabsCard = memo(function CommunityEventsTabsCard(props: CommunityEventsTabsCardProps) {
  const [shareEvent, setShareEvent] = useState<CommunityEventItem | null>(null);
  const { locale } = useSitePreferences();

  const {
    activeTab,
    setActiveTab,
    eventsLoading,
    eventsLoadError,
    onRetry,
    upcomingEvents,
    myEvents,
    pastEvents,
    rsvpLoadingEventId,
    onRsvp,
    isUpdatingEventOpsId,
    getOpsDraft,
    updateOpsDraft,
    onSaveEventOps,
  } = props;

  const { isLoaded, isSignedIn } = useAuth();
  const showContent = !eventsLoading && !eventsLoadError;

  return (
    <div className="space-y-4">
      <EventTabsHeader
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        locale={locale}
      />

      <EventListStates
        eventsLoading={eventsLoading}
        eventsLoadError={eventsLoadError}
        onRetry={onRetry ? () => void onRetry() : undefined}
      />

      <section
        id="community-missions-panel"
        role="tabpanel"
        aria-labelledby={`community-tab-${activeTab}`}
        tabIndex={-1}
        className="space-y-4"
      >
      {showContent && activeTab === "upcoming" && (
        <>
          <div className="grid gap-3">
            {upcomingEvents.map((event) => (
              <EventArticleUpcoming
                key={event.id}
                event={event}
                locale={locale}
                onRsvp={onRsvp}
                rsvpLoading={rsvpLoadingEventId === event.id}
                onShare={setShareEvent}
              />
            ))}
          </div>

          {upcomingEvents.length === 0 && (
            <div className="rounded-2xl border border-pink-100 bg-white p-5">
              <h3 className="font-semibold text-slate-950">Aucune mission à venir</h3>
              <p className="mt-1 cmm-text-small cmm-text-secondary">
                Revenez plus tard pour découvrir les prochaines missions.
              </p>
            </div>
          )}
        </>
      )}

      {showContent && activeTab === "mine" && (
        <div className="mt-4 space-y-2">
          {!isLoaded ? (
            <p className="cmm-text-small cmm-text-muted" role="status">Vérification de la connexion…</p>
          ) : !isSignedIn ? (
            <AnonymousRegistrationState />
          ) : myEvents.length === 0 ? (
            <div className="rounded-2xl border border-pink-100 bg-white p-5">
              <h3 className="font-semibold text-slate-950">Aucune inscription</h3>
              <p className="mt-1 cmm-text-small cmm-text-secondary">
                Ouvrez l’onglet « À venir » pour rejoindre une mission.
              </p>
            </div>
          ) : (
            myEvents.map((event) => (
              <EventArticleMine key={event.id} event={event} />
            ))
          )}
        </div>
      )}

      {showContent && activeTab === "past" && (
        <div className="mt-4 space-y-3">
          {pastEvents.map((event) => (
            <EventArticlePast
              key={event.id}
              event={event}
              isUpdating={isUpdatingEventOpsId === event.id}
              getOpsDraft={getOpsDraft}
              updateOpsDraft={updateOpsDraft}
              onSaveEventOps={onSaveEventOps}
            />
          ))}
          {pastEvents.length === 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="font-semibold text-slate-950">Aucune mission passée</h3>
              <p className="mt-1 cmm-text-small cmm-text-secondary">
                Les missions terminées apparaîtront ici après leur publication.
              </p>
            </div>
          )}
        </div>
      )}
      </section>

      <QRCodeDialog
        isOpen={!!shareEvent}
        onClose={() => setShareEvent(null)}
        value={shareEvent ? `${typeof window !== "undefined" ? window.location.origin : ""}/missions/${shareEvent.id}` : ""}
        title={shareEvent?.title || ""}
        description={locale === "fr" ? "Scannez pour rejoindre cette mission" : "Scan to join this mission"}
      />
    </div>
  );
});

export { CommunityEventsTabsCard };
