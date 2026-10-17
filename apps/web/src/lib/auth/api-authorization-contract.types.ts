export type ApiHttpMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "PATCH"
  | "DELETE"
  | "HEAD"
  | "OPTIONS";

type ApiAuthorizationDimension =
  | "public-safe"
  | "bearer token"
  | "authentication"
  | "admin/creator role"
  | "business permission"
  | "ownership"
  | "admin override"
  | "participant override"
  | "validated impact correction"
  | "audit";

export type ApiAuthorizationContractEntry = {
  expected: string;
  dimensions: readonly ApiAuthorizationDimension[];
  actual: string;
  evidence?: readonly string[];
  evidenceScope?: "method" | "module";
  /**
   * Evidence that must be present in the HTTP method even when some detailed
   * evidence is intentionally owned by a local helper in the module.
   */
  handlerEvidence?: readonly string[];
  delegatesTo?: ApiHttpMethod;
};

export type ApiAuthorizationContract = Record<
  string,
  Partial<Record<ApiHttpMethod, ApiAuthorizationContractEntry>>
>;
