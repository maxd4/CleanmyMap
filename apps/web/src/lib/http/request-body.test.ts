import { describe, expect, it } from "vitest";
import { readJsonBodyWithLimit } from "./request-body";

function streamRequest(stream: ReadableStream<Uint8Array>, headers?: HeadersInit): Request {
  return new Request("http://localhost/api/test", {
    method: "POST",
    body: stream,
    headers,
    duplex: "half",
  } as RequestInit & { duplex: "half" });
}

describe("readJsonBodyWithLimit", () => {
  it("rejects from Content-Length before consuming the body", async () => {
    let getReaderCalled = false;
    const body = {
      getReader() {
        getReaderCalled = true;
        throw new Error("body must not be read");
      },
    } as unknown as ReadableStream<Uint8Array>;
    const request = {
      body,
      headers: new Headers({ "content-length": "10" }),
    } as unknown as Request;

    await expect(readJsonBodyWithLimit(request, 4)).resolves.toEqual({
      ok: false,
      reason: "too_large",
    });
    expect(getReaderCalled).toBe(false);
  });

  it("cancels an oversized stream before consuming all chunks", async () => {
    const chunks = [
      new Uint8Array([123]),
      new TextEncoder().encode('"value":true}'),
      new TextEncoder().encode("tail that must not be consumed"),
    ];
    let deliveredChunks = 0;
    let cancelled = false;
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        const chunk = chunks[deliveredChunks];
        deliveredChunks += 1;
        if (!chunk) {
          controller.close();
          return;
        }
        controller.enqueue(chunk);
      },
      cancel() {
        cancelled = true;
      },
    });

    const result = await readJsonBodyWithLimit(streamRequest(stream), 3);

    expect(result).toEqual({ ok: false, reason: "too_large" });
    expect(cancelled).toBe(true);
    expect(deliveredChunks).toBe(2);
  });

  it("preserves invalid_json for a body within the byte limit", async () => {
    const request = new Request("http://localhost/api/test", {
      method: "POST",
      body: "{",
    });

    await expect(readJsonBodyWithLimit(request, 10)).resolves.toEqual({
      ok: false,
      reason: "invalid_json",
    });
  });

  it("parses a valid JSON body within the byte limit", async () => {
    const request = new Request("http://localhost/api/test", {
      method: "POST",
      body: JSON.stringify({ value: true }),
    });

    await expect(readJsonBodyWithLimit(request, 100)).resolves.toEqual({
      ok: true,
      data: { value: true },
    });
  });
});
