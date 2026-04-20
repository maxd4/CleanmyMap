import { PostHog } from "posthog-node";
import { env } from "@/lib/env";

let posthogClient: PostHog | null = null;

export function getPostHogServerClient() {
  if (posthogClient) return posthogClient;

  if (!env.NEXT_PUBLIC_POSTHOG_KEY) {
    return null;
  }

  posthogClient = new PostHog(env.NEXT_PUBLIC_POSTHOG_KEY, {
    host: env.NEXT_PUBLIC_POSTHOG_HOST || "https://eu.i.posthog.com",
    flushAt: 1,
    flushInterval: 0,
  });

  return posthogClient;
}

/**
 * Capture an event from a server-side context (e.g. API Route).
 */
export async function trackServerEvent(
  userId: string | null,
  event: string,
  properties: Record<string, any> = {}
) {
  const client = getPostHogServerClient();
  if (!client) return;

  client.capture({
    distinctId: userId || "anonymous_server_context",
    event,
    properties: {
      ...properties,
      $set: userId ? { last_api_interaction: new Date().toISOString() } : undefined,
    },
  });

  // Ensure event is sent immediately in serverless environment
  await client.shutdown();
  posthogClient = null; // Re-initialize next time to ensure fresh client if needed in serverless
}
