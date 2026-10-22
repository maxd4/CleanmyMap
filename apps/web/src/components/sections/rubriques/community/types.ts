import type { AppError } from "@/lib/errors/app-errors";
import type { CommunityEventItem } from "@/lib/community/http";

export type CommunityTab = "upcoming" | "mine" | "past";

export type OpsDraft = {
  attendanceCount: string;
  postMortem: string;
};

type PostEventLoopRow = {
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
  completionRate: number | null;
  missing: PostEventLoopRow[];
};

import type { toRsvpLabel } from "./helpers";
import type { CommunityRsvpStatus } from "@/lib/community/http";

export type UseCommunitySectionModel = {
  activeTab: CommunityTab;
  setActiveTab: (tab: CommunityTab) => void;
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
  isUpdatingEventOpsId: string | null;
  getOpsDraft: (event: CommunityEventItem) => OpsDraft;
  updateOpsDraft: (eventId: string, patch: Partial<OpsDraft>) => void;
  onSaveEventOps: (event: CommunityEventItem) => Promise<void>;
  toRsvpLabel: typeof toRsvpLabel;
};
