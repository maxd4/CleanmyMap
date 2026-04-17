import { describe, expect, it } from "vitest";
import {
  createDryRunProof,
  hashImportPayload,
  verifyDryRunProof,
} from "./dry-run-proof";

describe("dry-run proof", () => {
  it("verifies a valid proof", () => {
    const payload = {
      items: [{ actionDate: "2026-04-10", locationLabel: "Paris", wasteKg: 1 }],
    };
    const hash = hashImportPayload(payload);
    const proof = createDryRunProof({
      userId: "user_1",
      payloadHash: hash,
      now: new Date("2026-04-10T10:00:00.000Z"),
    });

    const verification = verifyDryRunProof({
      token: proof.token,
      userId: "user_1",
      payloadHash: hash,
      now: new Date("2026-04-10T10:05:00.000Z"),
    });

    expect(verification).toEqual({ ok: true });
  });

  it("rejects mismatching payload hash", () => {
    const proof = createDryRunProof({
      userId: "user_1",
      payloadHash: "abc",
      now: new Date("2026-04-10T10:00:00.000Z"),
    });

    const verification = verifyDryRunProof({
      token: proof.token,
      userId: "user_1",
      payloadHash: "def",
      now: new Date("2026-04-10T10:05:00.000Z"),
    });

    expect(verification).toEqual({ ok: false, code: "mismatch" });
  });

  it("rejects expired proof", () => {
    const proof = createDryRunProof({
      userId: "user_1",
      payloadHash: "abc",
      now: new Date("2026-04-10T10:00:00.000Z"),
      ttlSeconds: 60,
    });

    const verification = verifyDryRunProof({
      token: proof.token,
      userId: "user_1",
      payloadHash: "abc",
      now: new Date("2026-04-10T10:02:00.000Z"),
    });

    expect(verification).toEqual({ ok: false, code: "expired" });
  });
});
