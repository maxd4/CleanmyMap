import type { AdminOperationAuditEntry } from "@/lib/admin/operation-audit";

function parseAuditResponse(body: unknown): { items?: AdminOperationAuditEntry[] } {
  if (!body || typeof body !== "object") {
    return {};
  }

  const candidate = body as { items?: unknown };
  return {
    items: Array.isArray(candidate.items)
      ? (candidate.items as AdminOperationAuditEntry[])
      : undefined,
  };
}

export async function fetchActionOperationAudit(
  actionId: string,
  limit = 25,
  fetchImpl: typeof fetch = fetch,
): Promise<{ items?: AdminOperationAuditEntry[] }> {
  const params = new URLSearchParams({
    limit: String(limit),
  });

  const response = await fetchImpl(
    `/api/actions/${encodeURIComponent(actionId)}/audit?${params.toString()}`,
    {
      method: "GET",
      cache: "no-store",
    },
  );

  const body = await response
    .json()
    .catch(() => null);
  if (!response.ok) {
    const message =
      (body && typeof body === "object" && "error" in body && typeof (body as { error?: unknown }).error === "string")
        ? ((body as { error?: string }).error as string)
        : "Journal indisponible.";
    throw new Error(message);
  }

  return parseAuditResponse(body);
}
