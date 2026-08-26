export const CHAT_PAGE_SIZE = 50;

export type ChatHistoryCursor = {
  createdAt: string;
  id: string;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isChatMessageId(value: string | null | undefined): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

export function parseChatHistoryCursor(
  createdAt: string | null,
  id: string | null,
): ChatHistoryCursor | null {
  if (!createdAt || !isChatMessageId(id)) {
    return null;
  }

  const timestamp = Date.parse(createdAt);
  if (!Number.isFinite(timestamp)) {
    return null;
  }

  return { createdAt: new Date(timestamp).toISOString(), id };
}

export function buildChatHistoryCursor(row: {
  created_at: string;
  id: string;
}): ChatHistoryCursor {
  return { createdAt: row.created_at, id: row.id };
}

export function buildStrictBeforeFilter(cursor: ChatHistoryCursor): string {
  return `created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`;
}

export function buildInclusiveThroughFilter(cursor: ChatHistoryCursor): string {
  return `created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lte.${cursor.id})`;
}

export function getChatScrollTopAfterPrepend(
  previousTop: number,
  previousHeight: number,
  nextHeight: number,
): number {
  return previousTop + Math.max(0, nextHeight - previousHeight);
}
