import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getServerLocale: vi.fn().mockResolvedValue("en"),
}));

vi.mock("@/lib/server-preferences", () => ({
  getServerLocale: mocks.getServerLocale,
}));

vi.mock("./client", () => ({
  default: ({ staticIntro }: { staticIntro?: React.ReactNode }) =>
    React.createElement("div", null, staticIntro),
}));

import Page from "./page";

describe("sentrainer page", () => {
  it("keeps the localized heading in the server-rendered document", async () => {
    const markup = renderToStaticMarkup(await Page());

    expect(markup).toContain("Practice");
    expect(markup.match(/<h1\b/g)).toHaveLength(1);
  });
});
