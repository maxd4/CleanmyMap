export type NotificationIdentity = {
  userId: string | null;
  generation: number;
};

export function isCurrentNotificationRequest(
  request: NotificationIdentity,
  current: NotificationIdentity,
): boolean {
  return (
    request.userId !== null &&
    request.userId === current.userId &&
    request.generation === current.generation
  );
}
