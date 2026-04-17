export type EventConversionRow = {
  eventId: string;
  title: string;
  eventDate: string;
  locationLabel: string;
  capacityTarget: number | null;
  rsvpYes: number;
  rsvpMaybe: number;
  rsvpNo: number;
  attendanceCount: number | null;
  linkedActions: number;
  fillRate: number | null;
  rsvpToAttendanceRate: number | null;
  attendanceToActionRate: number | null;
  rsvpToActionRate: number | null;
};

export type EventConversionSummary = {
  eventsCount: number;
  rsvpYesTotal: number;
  attendanceTotalKnown: number;
  linkedActionsTotal: number;
  rsvpToAttendanceRate: number | null;
  attendanceToActionRate: number | null;
  rsvpToActionRate: number | null;
};

export type EventReminder = {
  eventId: string;
  priority: "haute" | "moyenne" | "faible";
  daysToEvent: number;
  reason: string;
  message: string;
};

export type EventStaffingRow = {
  eventId: string;
  title: string;
  eventDate: string;
  locationLabel: string;
  priority: "haute" | "moyenne" | "faible";
  expectedParticipants: number;
  recommendedStaff: number;
  confirmedStaff: number;
  staffingGap: number;
  riskLevel: "vert" | "orange" | "rouge";
  reason: string;
};

export type EventStaffingSummary = {
  eventsCount: number;
  atRiskCount: number;
  totalRecommendedStaff: number;
  totalConfirmedStaff: number;
  totalStaffingGap: number;
};

export type QualityLeaderboardRow = {
  actor: string;
  actions: number;
  wasteKg: number;
  avgQuality: number;
  qualityA: number;
  qualityB: number;
  qualityC: number;
  rateA: number;
  weightedScore: number;
  badge: string;
};

export type PartnerCard = {
  actor: string;
  role: string;
  zone: string;
  contact: string;
  capacity: string;
  actions: number;
  avgQuality: number;
  nextAction: string;
};
