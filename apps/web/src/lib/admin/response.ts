import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";

export type AdminErrorCode =
  | "unauthorized"
  | "forbidden"
  | "invalid_json"
  | "invalid_payload"
  | "not_found"
  | "confirmation_required"
  | "dry_run_required"
  | "dry_run_expired"
  | "dry_run_mismatch"
  | "server_error";

export function newOperationId(): string {
  return randomUUID();
}

export function adminErrorResponse(params: {
  status: number;
  code: AdminErrorCode;
  message: string;
  hint: string;
  operationId: string;
  details?: unknown;
}) {
  return NextResponse.json(
    {
      error: params.message,
      message: params.message,
      code: params.code,
      hint: params.hint,
      operationId: params.operationId,
      details: params.details,
    },
    { status: params.status },
  );
}

export function adminSuccessResponse<
  T extends Record<string, unknown>,
>(params: { status?: number; operationId: string; payload: T }) {
  return NextResponse.json(
    {
      ...params.payload,
      operationId: params.operationId,
    },
    { status: params.status ?? 200 },
  );
}
