/**
 * Preserve the restrictive v10 collection baseline when running Sentry v11.
 *
 * Sentry v11 enables broader request and user data collection when this option
 * is omitted. Keep this policy explicit in both the server and browser
 * initializers so a SDK upgrade cannot silently widen the telemetry contract.
 */
export const SENTRY_DATA_COLLECTION = {
  userInfo: false,
  cookies: false,
  httpHeaders: {
    request: { deny: ["forwarded", "-ip", "remote-", "via", "-user"] },
    response: { deny: ["forwarded", "-ip", "remote-", "via", "-user"] },
  },
  httpBodies: [],
  urlQueryParams: { deny: ["forwarded", "-ip", "remote-", "via", "-user"] },
  genAI: { inputs: false, outputs: false },
  databaseQueryData: false,
  queues: false,
  graphQL: { document: false, variables: false },
  stackFrameVariables: true,
  frameContextLines: 7,
};
