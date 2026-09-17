import type { AppError } from "@/lib/errors/app-errors";
import type {
  EventConversionRow,
  EventConversionSummary,
  EventReminder,
  EventStaffingRow,
  EventStaffingSummary,
} from "@/lib/community/engagement";
import type { CommunityEventItem } from "@/lib/community/http";
import type { LegacyWasteCategory } from "@/lib/waste";

export type CommunityTab = "upcoming" | "mine" | "past";

export type CreateCommunityEventForm = {
  title: string;
  eventDate: string;
  locationLabel: string;
  latitude: string;
  longitude: string;
  description: string;
  capacityTarget: string;
  cleanupObjective: string;
  cleanupZone: string;
  cleanupLogisticsNeeds: string;
  cleanupSupportLevel: "faible" | "moyen" | "fort";
  cleanupWasteTypesExpected: Array<Exclude<LegacyWasteCategory, "encombrant">>;
};

export type OpsDraft = {
  attendanceCount: string;
  postMortem: string;
};

export type CommunityHighlightItem = {
  date: string;
  actions: number;
  volunteers: number;
};

export type PostEventLoopRow = {
  event: CommunityEventItem;
  closed: boolean;
  hasAttendance: boolean;
  hasPostMortem: boolean;
  hasLinkedAction: boolean;
  hasWasteCharacterization: boolean;
};

export type PostEventLoop = {
  rows: PostEventLoopRow[];
  closedCount: number;
  total: number;
  completionRate: number;
  missing: PostEventLoopRow[];
};

export type ConversionModel = {
  summary: EventConversionSummary;
  rows: EventConversionRow[];
};

export type StaffingModel = {
  summary: EventStaffingSummary;
  rows: EventStaffingRow[];
};

export type ReminderModel = EventReminder[];

import type { toRsvpLabel } from "./helpers";
import type { CommunityRsvpStatus } from "@/lib/community/http";

export type UseCommunitySectionModel = {
  activeTab: CommunityTab;
  setActiveTab: (tab: CommunityTab) => void;
  createForm: CreateCommunityEventForm;
  updateCreateForm: <K extends keyof CreateCommunityEventForm>(
    key: K,
    value: CreateCommunityEventForm[K],
  ) => void;
  isCreatingEvent: boolean;
  onCreateEvent: () => Promise<void>;
  rsvpLoadingEventId: string | null;
  communitySuccessMessage: string | null;
  communityError: AppError | null;
  eventsLoading: boolean;
  eventsValidating: boolean;
  eventsLoadError: AppError | null;
  reloadEvents: () => Promise<unknown>;
  upcomingEvents: CommunityEventItem[];
  pastEvents: CommunityEventItem[];
  myEvents: CommunityEventItem[];
  onRsvp: (eventId: string, status: CommunityRsvpStatus) => Promise<void>;
  toRsvpLabel: typeof toRsvpLabel;
};
