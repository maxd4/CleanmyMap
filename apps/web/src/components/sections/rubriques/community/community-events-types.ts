import type { AppError } from "@/lib/errors/app-errors";
import type {
  CommunityEventItem,
  CommunityRsvpStatus,
} from "@/lib/community/http";
import type { CommunityTab } from "./types";

export type CommunityEventsTabsCardProps = {
  activeTab: CommunityTab;
  setActiveTab: (tab: CommunityTab) => void;
  eventsLoading: boolean;
  eventsLoadError: AppError | null;
  onRetry?: () => Promise<unknown> | void;
  upcomingEvents: CommunityEventItem[];
  myEvents: CommunityEventItem[];
  pastEvents: CommunityEventItem[];
  rsvpLoadingEventId: string | null;
  onRsvp: (eventId: string, status: CommunityRsvpStatus) => Promise<void>;
};
