export type ActionAccountOption = {
  id: string;
  handle: string | null;
  display_name: string | null;
};

export type ChatUserOption = ActionAccountOption;

export type ParticipantPage = {
  items: ChatUserOption[];
  nextOffset: number | null;
  hasMore: boolean;
};

export type ParticipantPickerProps = {
  currentUserId: string;
  value: string[];
  onChange: (next: string[]) => void;
  endpoint?: string;
  includeCurrentUser?: boolean;
  title?: string;
  description?: string;
  className?: string;
  compact?: boolean;
  invitationStatuses?: readonly InvitationStatus[];
};

export type InvitationStatus = {
  userId: string;
  status: "pending" | "accepted" | "rejected" | "withdrawn";
};

export function labelForUser(user: ChatUserOption | null | undefined): string {
  return user?.display_name?.trim() || user?.handle?.trim() || user?.id || "";
}

export function normalizeParticipantIds(value: string[], currentUserId: string, includeCurrentUser: boolean): string[] {
  return [...new Set(value.map((userId) => userId.trim()).filter((userId) => userId && (includeCurrentUser || userId !== currentUserId)))];
}

export function appendParticipantId(
  selectedIds: string[],
  userId: string,
  currentUserId: string,
  includeCurrentUser: boolean,
): { ids: string[]; message: string | null } {
  if (!includeCurrentUser && userId === currentUserId) {
    return { ids: selectedIds, message: "Vous ne pouvez pas vous ajouter vous-même." };
  }
  if (selectedIds.includes(userId)) {
    return { ids: selectedIds, message: "Ce membre est déjà sélectionné." };
  }
  return { ids: [...selectedIds, userId], message: null };
}

export function removeParticipantId(selectedIds: string[], userId: string): string[] {
  return selectedIds.filter((candidate) => candidate !== userId);
}

export type PickerKeyAction = "open" | "submit" | "close" | null;

export function getPickerSearchKeyAction(key: string): PickerKeyAction {
  if (key === "Enter") return "submit";
  if (key === "Escape") return "close";
  return null;
}

export function getAccountPickerKeyAction(key: string): PickerKeyAction {
  if (key === "Enter" || key === " " || key === "ArrowDown") return "open";
  if (key === "Escape") return "close";
  return null;
}
