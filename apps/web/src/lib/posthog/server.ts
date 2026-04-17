import { PostHog } from "posthog-node";
import { env } from "@/lib/env";

let posthogNode: PostHog | null = null;

export function getPostHogServerClient() {
  if (!env.NEXT_PUBLIC_POSTHOG_KEY) return null;
  if (posthogNode) return posthogNode;

  posthogNode = new PostHog(env.NEXT_PUBLIC_POSTHOG_KEY, {
    host: env.NEXT_PUBLIC_POSTHOG_HOST || "https://eu.i.posthog.com",
  });

  return posthogNode;
}
