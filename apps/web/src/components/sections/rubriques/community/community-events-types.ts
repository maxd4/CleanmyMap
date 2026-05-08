import type { AppError } from "@/lib/errors/app-errors";
import type {
  EventConversionRow,
  EventReminder,
  EventStaffingRow,
} from "@/lib/community/engagement";
import type {
  CommunityEventItem,
  CommunityRsvpStatus,
} from "@/lib/community/http";
import type { CommunityTab, OpsDraft } from "./types";

export type CommunityEventsTabsCardProps = {
  activeTab: CommunityTab;
  setActiveTab: (tab: CommunityTab) => void;
  eventsLoading: boolean;
  eventsLoadError: AppError | null;
  onRetry?: () => Promise<unknown> | void;
  upcomingEvents: CommunityEventItem[];
  myEvents: CommunityEventItem[];
  pastEvents: CommunityEventItem[];
  conversionByEventId: Map<string, EventConversionRow>;
  remindersByEventId: Map<string, EventReminder>;
  staffingByEventId: Map<string, EventStaffingRow>;
  rsvpLoadingEventId: string | null;
  onRsvp: (eventId: string, status: CommunityRsvpStatus) => Promise<void>;
  getOpsDraft: (event: CommunityEventItem) => OpsDraft;
  updateOpsDraft: (eventId: string, patch: Partial<OpsDraft>) => void;
  onSaveEventOps: (event: CommunityEventItem) => Promise<void>;
  isUpdatingEventOpsId: string | null;
};
