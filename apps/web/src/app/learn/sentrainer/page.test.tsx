import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/learn/learn-localized-heading", () => ({
  LearnLocalizedHeading: ({ en }: { fr: string; en: string }) =>
    React.createElement("h1", null, en),
}));

vi.mock("./client", () => ({
  default: ({ staticIntro }: { staticIntro?: React.ReactNode }) =>
    React.createElement("div", null, staticIntro),
}));

import Page from "./page";

describe("sentrainer page", () => {
  it("keeps the localized heading in the server-rendered document", async () => {
    const markup = renderToStaticMarkup(Page());

    expect(markup).toContain("Practice");
    expect(markup.match(/<h1\b/g)).toHaveLength(1);
  });
});
