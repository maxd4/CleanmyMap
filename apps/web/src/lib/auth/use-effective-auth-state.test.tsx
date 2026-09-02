import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ useUser: vi.fn() }));

vi.mock("@clerk/nextjs", () => ({ useUser: mocks.useUser }));

import {
  EffectiveAuthStateProvider,
  useEffectiveAuthState,
} from "./use-effective-auth-state";

function StateProbe() {
  return <output>{JSON.stringify(useEffectiveAuthState())}</output>;
}

describe("useEffectiveAuthState", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reports a signed-in effective state for an anonymous Clerk UI with local bypass", () => {
    mocks.useUser.mockReturnValue({ isLoaded: true, isSignedIn: false });

    const markup = renderToStaticMarkup(
      <EffectiveAuthStateProvider localDevAuth={{ active: true, role: "benevole" }}>
        <StateProbe />
      </EffectiveAuthStateProvider>,
    );

    expect(markup).toContain("&quot;isSignedIn&quot;:true");
    expect(markup).toContain("&quot;isDevBypass&quot;:true");
  });

  it("does not synthesize authentication when the bypass is inactive", () => {
    mocks.useUser.mockReturnValue({ isLoaded: true, isSignedIn: false });

    const markup = renderToStaticMarkup(
      <EffectiveAuthStateProvider localDevAuth={{ active: false, role: null }}>
        <StateProbe />
      </EffectiveAuthStateProvider>,
    );

    expect(markup).toContain("&quot;isSignedIn&quot;:false");
    expect(markup).toContain("&quot;isDevBypass&quot;:false");
  });
});
