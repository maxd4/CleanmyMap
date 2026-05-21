import { env } from "@/lib/env";

export function hasValidCronAuth(request: Request): boolean {
  const configuredSecret = env.CRON_SECRET?.trim();
  if (!configuredSecret) {
    return false;
  }

  const authHeader = request.headers.get("authorization")?.trim();
  return authHeader === `Bearer ${configuredSecret}`;
}

export function isCronSecretConfigured(): boolean {
  return Boolean(env.CRON_SECRET && env.CRON_SECRET.trim().length >= 16);
}
