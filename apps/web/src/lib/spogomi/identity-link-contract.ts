export type SpogomiIdentityParticipation = {
  status: "not_requested" | "pending" | "confirmed" | "cancelled" | "unavailable";
  store: "action_registrations" | "action_participants" | null;
};

export type SpogomiIdentityLinkResult = {
  linkStatus: "linked" | "already_linked";
  participantId: string;
  actionId: string;
  attendanceStatus: "unknown" | "present" | "absent";
};

export type SpogomiPublishedTeamResult = {
  status: "provisional" | "certified";
  rank: number | null;
  score: number | null;
  countedButts: number | null;
  ratio: number | null;
};

export type SpogomiLinkedTeam = {
  publicName: string;
  teamNumber: number;
  divisionType: "casual" | "world_cup" | null;
  attendanceStatus: "unknown" | "present" | "absent";
  participationStatus: SpogomiIdentityParticipation["status"];
  publishedResults: {
    sport: SpogomiPublishedTeamResult | null;
    butts: SpogomiPublishedTeamResult | null;
  } | null;
};

export type SpogomiIdentityState =
  | "identity_unlinked"
  | "identity_verified"
  | "participation_unavailable"
  | "participation_pending"
  | "participation_confirmed"
  | "participation_cancelled";

export type SpogomiIdentityStateResult = {
  state: SpogomiIdentityState;
  participantId: string | null;
  actionId: string | null;
  attendanceStatus: "unknown" | "present" | "absent";
  participation: SpogomiIdentityParticipation;
  team: SpogomiLinkedTeam | null;
};
