export type BoundedJsonResult =
  | { ok: true; data: unknown }
  | { ok: false; reason: "too_large" | "invalid_json" };

export async function readJsonBodyWithLimit(
  request: Request,
  maxBytes: number,
): Promise<BoundedJsonResult> {
  const declaredLength = Number(request.headers.get("content-length") ?? "");
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    return { ok: false, reason: "too_large" };
  }

  let body: string;
  try {
    body = await request.text();
  } catch {
    return { ok: false, reason: "invalid_json" };
  }

  if (new TextEncoder().encode(body).byteLength > maxBytes) {
    return { ok: false, reason: "too_large" };
  }

  try {
    return { ok: true, data: JSON.parse(body) as unknown };
  } catch {
    return { ok: false, reason: "invalid_json" };
  }
}
