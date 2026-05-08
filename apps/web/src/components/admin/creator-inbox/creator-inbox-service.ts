import type { CreatorInboxItem, CreatorInboxSource } from "@/lib/community/creator-inbox";

type ApiErrorPayload = {
  error?: string;
  message?: string;
  hint?: string;
};

async function readJson<T>(response: Response): Promise<T | null> {
  return (await response.json().catch(() => null)) as T | null;
}

async function readErrorMessage(response: Response, fallback: string): Promise<string> {
  const body = await readJson<ApiErrorPayload>(response);
  return body?.hint ?? body?.message ?? body?.error ?? fallback;
}

async function postJson<T>(url: string, body: unknown, fallback: string): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, fallback));
  }
  const payload = await readJson<T>(response);
  if (!payload) {
    throw new Error(fallback);
  }
  return payload;
}

export async function fetchCreatorInboxItems(): Promise<CreatorInboxItem[]> {
  const response = await fetch("/api/admin/creator-inbox");
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Unable to refresh inbox."));
  }
  const payload = await readJson<{ items?: CreatorInboxItem[] }>(response);
  return payload?.items ?? [];
}

export async function applyCreatorInboxAction(params: {
  source: CreatorInboxSource;
  itemId: string;
  action: "mark_treated" | "responded" | "archive" | "delete";
}): Promise<{ item?: CreatorInboxItem; deletedId?: string }> {
  const response = await fetch("/api/admin/creator-inbox", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Action failed."));
  }
  const payload = await readJson<{ item?: CreatorInboxItem; deletedId?: string }>(response);
  return payload ?? {};
}

export async function acceptPromotionRequest(requestId: string): Promise<void> {
  await postJson("/api/admin/promotion-requests", { requestId, action: "accept" }, "Approval failed.");
}

export async function rejectPromotionRequest(requestId: string): Promise<void> {
  await postJson("/api/admin/promotion-requests", { requestId, action: "reject" }, "Rejection failed.");
}

export async function acceptPartnerRequest(params: {
  id: string;
  confirmPhrase: string;
}): Promise<void> {
  await postJson(
    "/api/admin/partners/published-directory",
    { id: params.id, publicationStatus: "accepted", confirmPhrase: params.confirmPhrase },
    "Approval failed.",
  );
}

export async function rejectPartnerRequest(params: {
  id: string;
  confirmPhrase: string;
}): Promise<void> {
  await postJson(
    "/api/admin/partners/published-directory",
    { id: params.id, publicationStatus: "rejected", confirmPhrase: params.confirmPhrase },
    "Rejection failed.",
  );
}
