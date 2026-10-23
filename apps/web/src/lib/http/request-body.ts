export type BoundedJsonResult =
  | { ok: true; data: unknown }
  | { ok: false; reason: "too_large" | "invalid_json" };

async function cancelReader(reader: ReadableStreamDefaultReader<Uint8Array>): Promise<void> {
  try {
    await reader.cancel();
  } catch {
    // The size rejection remains authoritative if cancellation fails.
  }
}

async function readBoundedBody(
  body: ReadableStream<Uint8Array>,
  maxBytes: number,
): Promise<{ ok: true; chunks: Uint8Array[] } | { ok: false; reason: "too_large" | "invalid_json" }> {
  const chunks: Uint8Array[] = [];
  let byteLength = 0;
  const reader = body.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) return { ok: true, chunks };
      byteLength += value.byteLength;
      if (byteLength > maxBytes) {
        await cancelReader(reader);
        return { ok: false, reason: "too_large" };
      }
      chunks.push(value);
    }
  } catch {
    return { ok: false, reason: "invalid_json" };
  } finally {
    reader.releaseLock();
  }
}

export async function readJsonBodyWithLimit(
  request: Request,
  maxBytes: number,
): Promise<BoundedJsonResult> {
  const declaredLength = Number(request.headers.get("content-length") ?? "");
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    return { ok: false, reason: "too_large" };
  }

  const result = request.body
    ? await readBoundedBody(request.body, maxBytes)
    : { ok: true as const, chunks: [] as Uint8Array[] };
  if (!result.ok) return result;
  const { chunks } = result;
  const byteLength = chunks.reduce((total, chunk) => total + chunk.byteLength, 0);

  if (byteLength > maxBytes) {
    return { ok: false, reason: "too_large" };
  }

  const bodyBytes = new Uint8Array(byteLength);
  let offset = 0;
  for (const chunk of chunks) {
    bodyBytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  const body = new TextDecoder().decode(bodyBytes);

  try {
    return { ok: true, data: JSON.parse(body) as unknown };
  } catch {
    return { ok: false, reason: "invalid_json" };
  }
}
