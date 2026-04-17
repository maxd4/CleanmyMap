import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { env, isConfigured } from "../env";

const DEFAULT_TTL_SECONDS = 20 * 60;

type ProofPayload = {
  userId: string;
  payloadHash: string;
  issuedAt: string;
  expiresAt: string;
};

export type DryRunProof = {
  token: string;
  expiresAt: string;
  payloadHash: string;
};

function stableNormalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => stableNormalize(item));
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(
      ([a], [b]) => a.localeCompare(b),
    );
    const normalized: Record<string, unknown> = {};
    for (const [key, item] of entries) {
      normalized[key] = stableNormalize(item);
    }
    return normalized;
  }
  return value;
}

function encodingSecret(): string {
  if (isConfigured(process.env.IMPORT_DRY_RUN_SECRET)) {
    return String(process.env.IMPORT_DRY_RUN_SECRET);
  }
  if (isConfigured(env.CLERK_SECRET_KEY)) {
    return String(env.CLERK_SECRET_KEY);
  }
  if (process.env.NODE_ENV !== "production") {
    return "cleanmymap-dev-import-proof";
  }
  throw new Error(
    "Missing dry-run proof secret in production. Set IMPORT_DRY_RUN_SECRET or CLERK_SECRET_KEY.",
  );
}

export function hashImportPayload(payload: unknown): string {
  const normalized = stableNormalize(payload);
  return createHash("sha256").update(JSON.stringify(normalized)).digest("hex");
}

function sign(payloadBase64: string): string {
  return createHmac("sha256", encodingSecret())
    .update(payloadBase64)
    .digest("hex");
}

export function createDryRunProof(params: {
  userId: string;
  payloadHash: string;
  now?: Date;
  ttlSeconds?: number;
}): DryRunProof {
  const now = params.now ?? new Date();
  const ttlSeconds = params.ttlSeconds ?? DEFAULT_TTL_SECONDS;
  const expiresAt = new Date(now.getTime() + ttlSeconds * 1000).toISOString();

  const payload: ProofPayload = {
    userId: params.userId,
    payloadHash: params.payloadHash,
    issuedAt: now.toISOString(),
    expiresAt,
  };

  const payloadBase64 = Buffer.from(JSON.stringify(payload), "utf8").toString(
    "base64url",
  );
  const signature = sign(payloadBase64);

  return {
    token: `${payloadBase64}.${signature}`,
    expiresAt,
    payloadHash: params.payloadHash,
  };
}

export function verifyDryRunProof(params: {
  token: string;
  userId: string;
  payloadHash: string;
  now?: Date;
}): { ok: true } | { ok: false; code: "invalid" | "expired" | "mismatch" } {
  const [payloadBase64, signature] = params.token.split(".");
  if (!payloadBase64 || !signature) {
    return { ok: false, code: "invalid" };
  }

  const expectedSignature = sign(payloadBase64);
  const left = Buffer.from(signature, "utf8");
  const right = Buffer.from(expectedSignature, "utf8");

  if (left.length !== right.length || !timingSafeEqual(left, right)) {
    return { ok: false, code: "invalid" };
  }

  let payload: ProofPayload;
  try {
    payload = JSON.parse(
      Buffer.from(payloadBase64, "base64url").toString("utf8"),
    ) as ProofPayload;
  } catch {
    return { ok: false, code: "invalid" };
  }

  if (payload.userId !== params.userId) {
    return { ok: false, code: "invalid" };
  }
  if (payload.payloadHash !== params.payloadHash) {
    return { ok: false, code: "mismatch" };
  }

  const now = params.now ?? new Date();
  if (new Date(payload.expiresAt).getTime() < now.getTime()) {
    return { ok: false, code: "expired" };
  }

  return { ok: true };
}
