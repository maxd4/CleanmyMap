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
