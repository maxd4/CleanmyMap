import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { useNotificationRequestIdentity } from "./use-notification-request-identity";

function renderRequest(userId: string | null) {
  let request: ReturnType<typeof useNotificationRequestIdentity> | undefined;

  function Harness() {
    request = useNotificationRequestIdentity(userId);
    return null;
  }

  renderToStaticMarkup(React.createElement(Harness));
  return request?.getRequest();
}

describe("useNotificationRequestIdentity", () => {
  it("captures a user identity and generation for every request", () => {
    expect(renderRequest("user-a")).toMatchObject({ userId: "user-a", generation: expect.any(Number) });
    expect(renderRequest(null)).toMatchObject({ userId: null, generation: expect.any(Number) });
  });
});
