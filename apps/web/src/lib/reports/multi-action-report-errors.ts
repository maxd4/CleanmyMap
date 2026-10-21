export class MultiActionReportScopeUnavailableError extends Error {
  constructor() {
    super("The requested report scope is not present in the canonical public action corpus.");
    this.name = "MultiActionReportScopeUnavailableError";
  }
}

export class MultiActionReportSourceUnavailableError extends Error {
  constructor() {
    super("The canonical public action source is unavailable.");
    this.name = "MultiActionReportSourceUnavailableError";
  }
}

export class MultiActionReportEmptyError extends Error {
  constructor() {
    super("The requested report window contains no eligible public actions.");
    this.name = "MultiActionReportEmptyError";
  }
}

export class MultiActionReportPeriodInvalidError extends Error {
  constructor() {
    super("The requested report period is invalid.");
    this.name = "MultiActionReportPeriodInvalidError";
  }
}
