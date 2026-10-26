import { describe, expect, it } from "vitest";
import { readBoundedPages } from "./pagination";

describe("readBoundedPages", () => {
  it("reads until an empty page and preserves the requested offset", async () => {
    const requests: Array<{ limit: number; from: number; to: number }> = [];
    const result = await readBoundedPages({
      requestedLimit: null,
      pageSize: 2,
      loadPage: async (request) => {
        requests.push(request);
        return request.from === 0 ? ["a", "b"] : request.from === 2 ? ["c"] : [];
      },
      safetyError: "pagination overflow",
    });

    expect(result).toEqual(["a", "b", "c"]);
    expect(requests).toEqual([
      { limit: 2, from: 0, to: 1 },
      { limit: 2, from: 2, to: 3 },
      { limit: 2, from: 3, to: 4 },
    ]);
  });

  it("stops at the requested limit and trims an overfull page", async () => {
    const requests: Array<{ limit: number; from: number; to: number }> = [];
    const result = await readBoundedPages({
      requestedLimit: 3,
      pageSize: 2,
      loadPage: async (request) => {
        requests.push(request);
        return request.from === 0 ? ["a", "b"] : ["c", "d"];
      },
      safetyError: "pagination overflow",
    });

    expect(result).toEqual(["a", "b", "c"]);
    expect(requests).toEqual([
      { limit: 2, from: 0, to: 1 },
      { limit: 1, from: 2, to: 2 },
    ]);
  });

  it("fails closed when the bounded page budget is exhausted", async () => {
    await expect(readBoundedPages({
      requestedLimit: null,
      pageSize: 1,
      loadPage: async () => ["still available"],
      safetyError: "pagination overflow",
    })).rejects.toThrow("pagination overflow");
  });
});
