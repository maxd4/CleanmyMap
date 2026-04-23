import { PostHog } from "posthog-node";
import {
  getPostHogDeprecatedEnvWarnings,
  getPostHogHost,
  getPostHogKey,
} from "@/lib/posthog/config";

let posthogNode: PostHog | null = null;
let envWarningLogged = false;

export function getPostHogServerClient() {
  const key = getPostHogKey();
  if (!key) return null;
  if (posthogNode) return posthogNode;

  if (!envWarningLogged) {
    const warnings = getPostHogDeprecatedEnvWarnings();
    for (const warning of warnings) {
      console.warn(`[PostHog] ${warning}`);
    }
    envWarningLogged = true;
  }

  posthogNode = new PostHog(key, {
    host: getPostHogHost(),
    flushAt: 1,
    flushInterval: 0,
  });

  return posthogNode;
}

export async function trackServerEvent(
  userId: string | null,
  event: string,
  properties: Record<string, unknown> = {},
): Promise<boolean> {
  const client = getPostHogServerClient();
  if (!client) {
    return false;
  }

  try {
    client.capture({
      distinctId: userId || "anonymous_server_context",
      event,
      properties: {
        ...properties,
        $set: userId ? { last_api_interaction: new Date().toISOString() } : undefined,
      },
    });

    await client.shutdown();
    posthogNode = null;
    return true;
  } catch (error) {
    console.error("[PostHog] Server event capture failed", {
      event,
      userId,
      message: error instanceof Error ? error.message : String(error),
    });
    posthogNode = null;
    return false;
  }
}
