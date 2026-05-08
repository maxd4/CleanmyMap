import type { AppError } from "@/lib/errors/app-errors";
import type {
  EventConversionRow,
  EventConversionSummary,
  EventReminder,
  EventStaffingRow,
  EventStaffingSummary,
} from "@/lib/community/engagement";
import type { CommunityEventItem } from "@/lib/community/http";

export type CommunityTab = "upcoming" | "mine" | "past";

export type CreateCommunityEventForm = {
  title: string;
  eventDate: string;
  locationLabel: string;
  description: string;
  capacityTarget: string;
  cleanupObjective: string;
  cleanupZone: string;
  cleanupLogisticsNeeds: string;
  cleanupSupportLevel: "faible" | "moyen" | "fort";
  cleanupWasteTypesExpected: Array<
    "megots" | "plastique" | "verre" | "metal" | "mixte"
  >;
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
  isUpdatingEventOpsId: string | null;
  rsvpLoadingEventId: string | null;
  communitySuccessMessage: string | null;
  communityError: AppError | null;
  eventsLoading: boolean;
  eventsValidating: boolean;
  eventsLoadError: AppError | null;
  highlightsLoadError: AppError | null;
  actionsLoading: boolean;
  reloadEvents: () => Promise<unknown>;
  reloadHighlights: () => Promise<unknown>;
  highlights: CommunityHighlightItem[];
  upcomingEvents: CommunityEventItem[];
  pastEvents: CommunityEventItem[];
  myEvents: CommunityEventItem[];
  conversionSummary: EventConversionSummary;
  conversionByEventId: Map<string, EventConversionRow>;
  reminders: EventReminder[];
  remindersByEventId: Map<string, EventReminder>;
  staffingPlan: StaffingModel;
  staffingByEventId: Map<string, EventStaffingRow>;
  postEventLoop: PostEventLoop;
  onRsvp: (eventId: string, status: CommunityRsvpStatus) => Promise<void>;
  getOpsDraft: (event: CommunityEventItem) => OpsDraft;
  updateOpsDraft: (eventId: string, patch: Partial<OpsDraft>) => void;
  onSaveEventOps: (event: CommunityEventItem) => Promise<void>;
  copyReminderMessage: (message: string) => Promise<void>;
  toRsvpLabel: typeof toRsvpLabel;
};
