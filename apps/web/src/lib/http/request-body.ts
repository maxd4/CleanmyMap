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

  const chunks: Uint8Array[] = [];
  let byteLength = 0;

  if (request.body) {
    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
    try {
      reader = request.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        byteLength += value.byteLength;
        if (byteLength > maxBytes) {
          try {
            await reader.cancel();
          } catch {
            // The size rejection remains authoritative if cancellation fails.
          }
          return { ok: false, reason: "too_large" };
        }

        chunks.push(value);
      }
    } catch {
      return { ok: false, reason: "invalid_json" };
    } finally {
      reader?.releaseLock();
    }
  }

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
