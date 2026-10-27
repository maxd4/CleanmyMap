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
  const leftIsValid = Number.isFinite(leftTime);
  const rightIsValid = Number.isFinite(rightTime);
  if (leftIsValid !== rightIsValid) {
    return leftIsValid ? 1 : -1;
  }
  if (leftIsValid && rightIsValid) {
    if (leftTime !== rightTime) {
      return leftTime - rightTime;
    }
    return left.id.localeCompare(right.id);
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
