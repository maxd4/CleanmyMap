export type CreatorInboxRecordCursor = {
  createdAt: string;
  id: string;
};

export function compareCreatorInboxRecordCursors(
  left: CreatorInboxRecordCursor,
  right: CreatorInboxRecordCursor,
): number {
  const leftTime = Date.parse(left.createdAt);
  const rightTime = Date.parse(right.createdAt);
  if (
    Number.isFinite(leftTime) &&
    Number.isFinite(rightTime) &&
    leftTime !== rightTime
  ) {
    return leftTime - rightTime;
  }
  if (left.createdAt !== right.createdAt) {
    return left.createdAt.localeCompare(right.createdAt);
  }
  return left.id.localeCompare(right.id);
}
export function isCreatorInboxRecordCursor(
  value: unknown,
): value is CreatorInboxRecordCursor {
  if (!value || typeof value !== "object") {
    return false;
  }
  const cursor = value as Record<string, unknown>;
  return (
    typeof cursor.createdAt === "string" &&
    Number.isFinite(Date.parse(cursor.createdAt)) &&
    typeof cursor.id === "string" &&
    cursor.id.trim().length > 0 &&
    cursor.id.length <= 128
  );
}
