import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";
import type { RoutePlannerSnapshot } from "./route-calibration";
import {
  isRoutePlannerProofShape,
  ROUTE_PLANNER_PROOF_TTL_SECONDS,
  ROUTE_PLANNER_PROOF_VERSION,
  type RoutePlannerProof,
} from "./route-planner-proof-contract";

export {
  ROUTE_PLANNER_PROOF_TTL_SECONDS,
  ROUTE_PLANNER_PROOF_VERSION,
  type RoutePlannerProof,
} from "./route-planner-proof-contract";

type RoutePlannerProofPayload = {
  proofVersion: typeof ROUTE_PLANNER_PROOF_VERSION;
  snapshotHash: string;
  issuedAt: string;
  expiresAt: string;
};

export type RoutePlannerProofVerification =
  | { ok: true; snapshotHash: string }
  | {
      ok: false;
      reason: "missing" | "invalid" | "expired" | "snapshot_mismatch";
    };

export function hashRoutePlannerSnapshot(snapshot: RoutePlannerSnapshot): string {
  return createHash("sha256")
    .update(JSON.stringify(stableNormalize(snapshot)))
    .digest("hex");
}

export function createRoutePlannerProof(input: {
  snapshot: RoutePlannerSnapshot;
  now?: Date;
  ttlSeconds?: number;
}): RoutePlannerProof {
  const issuedAt = input.now ?? new Date();
  const expiresAt = new Date(
    issuedAt.getTime() + (input.ttlSeconds ?? ROUTE_PLANNER_PROOF_TTL_SECONDS) * 1000,
  );
  const payload: RoutePlannerProofPayload = {
    proofVersion: ROUTE_PLANNER_PROOF_VERSION,
    snapshotHash: hashRoutePlannerSnapshot(input.snapshot),
    issuedAt: issuedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };
  const encodedPayload = encodePayload(payload);
  return {
    ...payload,
    token: `${encodedPayload}.${sign(encodedPayload)}`,
  };
}

export function verifyRoutePlannerProof(input: {
  proof: unknown;
  snapshot: RoutePlannerSnapshot;
  now?: Date;
}): RoutePlannerProofVerification {
  if (input.proof === null || input.proof === undefined) {
    return { ok: false, reason: "missing" };
  }
  if (!isRoutePlannerProofShape(input.proof)) return { ok: false, reason: "invalid" };
  const proof = input.proof;
  const separator = proof.token.lastIndexOf(".");
  if (separator <= 0 || separator === proof.token.length - 1) {
    return { ok: false, reason: "invalid" };
  }
  const encodedPayload = proof.token.slice(0, separator);
  const receivedSignature = proof.token.slice(separator + 1);
  const expectedSignature = sign(encodedPayload);
  if (!safeEqual(receivedSignature, expectedSignature)) {
    return { ok: false, reason: "invalid" };
  }

  let payload: RoutePlannerProofPayload;
  try {
    payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as RoutePlannerProofPayload;
  } catch {
    return { ok: false, reason: "invalid" };
  }
  if (
    payload.proofVersion !== proof.proofVersion ||
    payload.snapshotHash !== proof.snapshotHash ||
    payload.issuedAt !== proof.issuedAt ||
    payload.expiresAt !== proof.expiresAt ||
    payload.proofVersion !== ROUTE_PLANNER_PROOF_VERSION
  ) {
    return { ok: false, reason: "invalid" };
  }

  const now = input.now ?? new Date();
  if (Date.parse(proof.expiresAt) <= now.getTime()) {
    return { ok: false, reason: "expired" };
  }
  const snapshotHash = hashRoutePlannerSnapshot(input.snapshot);
  if (snapshotHash !== proof.snapshotHash) {
    return { ok: false, reason: "snapshot_mismatch" };
  }
  return { ok: true, snapshotHash };
}

function sign(encodedPayload: string): string {
  return createHmac("sha256", proofSecret()).update(encodedPayload).digest("hex");
}

function proofSecret(): string {
  if (env.ROUTE_PLANNER_PROOF_SECRET) return env.ROUTE_PLANNER_PROOF_SECRET;
  if (process.env.NODE_ENV !== "production") {
    return "cleanmymap-dev-route-planner-proof";
  }
  throw new Error("ROUTE_PLANNER_PROOF_SECRET est requis en production.");
}

function encodePayload(payload: RoutePlannerProofPayload): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function safeEqual(actual: string, expected: string): boolean {
  const actualBuffer = Buffer.from(actual, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}

function stableNormalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableNormalize);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nested]) => [key, stableNormalize(nested)]),
  );
}
