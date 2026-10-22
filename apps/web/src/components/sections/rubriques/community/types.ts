import type { CommunityEventItem } from "@/lib/community/http";

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
