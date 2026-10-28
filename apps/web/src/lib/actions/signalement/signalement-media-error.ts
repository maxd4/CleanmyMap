export type SignalementMediaErrorCode =
  | "validation"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "limit_reached"
  | "storage_missing"
  | "storage_invalid"
  | "storage_error";

export class SignalementMediaError extends Error {
  constructor(
    message: string,
    public readonly code: SignalementMediaErrorCode,
  ) {
    super(message);
    this.name = "SignalementMediaError";
  }
}
