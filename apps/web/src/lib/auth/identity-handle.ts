export function buildFallbackHandle(userId: string): string {
  return `user_${userId.slice(-6).toLowerCase()}`;
}
