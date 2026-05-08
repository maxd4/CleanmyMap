"use client";

import { useState, memo } from "react";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { QRCodeDialog } from "@/components/ui/qrcode-dialog";
import { 
  EventTabsHeader, 
  EventListStates, 
  EventArticleUpcoming, 
  EventArticleMine, 
  EventArticlePast 
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
    conversionByEventId,
    remindersByEventId,
    rsvpLoadingEventId,
    onRsvp,
    getOpsDraft,
    updateOpsDraft,
    onSaveEventOps,
    isUpdatingEventOpsId,
  } = props;

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

      {showContent && activeTab === "upcoming" && (
        <>
          <div className="grid gap-4 sm:grid-cols-1">
            {upcomingEvents.map((event) => (
              <EventArticleUpcoming
                key={event.id}
                event={event}
                reminder={remindersByEventId.get(event.id)}
                locale={locale}
                onRsvp={onRsvp}
                rsvpLoading={rsvpLoadingEventId === event.id}
                onShare={setShareEvent}
              />
            ))}
          </div>

          {upcomingEvents.length === 0 && (
            <p className="cmm-text-small cmm-text-secondary">
              Aucun événement à venir sur cette vue. Revenez plus tard ou ouvrez l&apos;onglet Passé pour relier une action à un événement clôturé.
            </p>
          )}
        </>
      )}

      {showContent && activeTab === "mine" && (
        <div className="mt-4 space-y-2">
          {myEvents.length === 0 ? (
            <p className="cmm-text-small cmm-text-secondary">
              Vous n&apos;avez pas encore d&apos;inscription sur cette période. Ouvrez l&apos;onglet &quot;À venir&quot; pour rejoindre une action disponible.
            </p>
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
              conversion={conversionByEventId.get(event.id)}
              opsDraft={getOpsDraft(event)}
              updateOpsDraft={updateOpsDraft}
              onSaveEventOps={onSaveEventOps}
              isUpdating={isUpdatingEventOpsId === event.id}
            />
          ))}
          {pastEvents.length === 0 && (
            <p className="cmm-text-small cmm-text-secondary">
              Aucun événement passé n&apos;est encore disponible sur cette période. Les suivis apparaîtront ici une fois les événements clôturés.
            </p>
          )}
        </div>
      )}

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
