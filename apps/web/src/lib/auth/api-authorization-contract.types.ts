export type ApiHttpMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "PATCH"
  | "DELETE"
  | "HEAD"
  | "OPTIONS";

export type ApiAuthorizationDimension =
  | "public-safe"
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
  delegatesTo?: ApiHttpMethod;
};

export type ApiAuthorizationContract = Record<
  string,
  Partial<Record<ApiHttpMethod, ApiAuthorizationContractEntry>>
>;
