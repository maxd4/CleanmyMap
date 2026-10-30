/** Refreshes the authenticated digest only when a community surface is visited. */
export async function refreshCommunityDigest(): Promise<void> {
  try {
    await fetch("/api/community/digest/refresh", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
  } catch {
    // Digest generation is opportunistic and must not disturb the community surface.
  }
}
