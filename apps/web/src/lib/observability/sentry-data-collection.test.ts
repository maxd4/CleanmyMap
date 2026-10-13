import { describe, expect, it } from "vitest";
import { SENTRY_DATA_COLLECTION } from "./sentry-data-collection";

describe("Sentry data collection policy", () => {
  it("keeps the v10 restrictive telemetry baseline explicit", () => {
    expect(SENTRY_DATA_COLLECTION.userInfo).toBe(false);
    expect(SENTRY_DATA_COLLECTION.cookies).toBe(false);
    expect(SENTRY_DATA_COLLECTION.httpBodies).toEqual([]);
    expect(SENTRY_DATA_COLLECTION.databaseQueryData).toBe(false);
    expect(SENTRY_DATA_COLLECTION.queues).toBe(false);
    expect(SENTRY_DATA_COLLECTION.genAI).toEqual({ inputs: false, outputs: false });
    expect(SENTRY_DATA_COLLECTION.graphQL).toEqual({ document: false, variables: false });
    expect(SENTRY_DATA_COLLECTION.httpHeaders.request.deny).toEqual([
      "forwarded",
      "-ip",
      "remote-",
      "via",
      "-user",
    ]);
    expect(SENTRY_DATA_COLLECTION.httpHeaders.response.deny).toEqual(
      SENTRY_DATA_COLLECTION.httpHeaders.request.deny,
    );
    expect(SENTRY_DATA_COLLECTION.urlQueryParams.deny).toEqual(
      SENTRY_DATA_COLLECTION.httpHeaders.request.deny,
    );
  });
});
