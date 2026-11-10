import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SpogomiCachanRankings } from "./spogomi-cachan-closure-summary";
import { getSpogomiCachanDemoClosureProjection } from "@/lib/spogomi/cachan-closure";

describe("Spogomi Cachan closure rankings", () => {
  it("renders the direct ratio unit separately from the counted total", () => {
    const projection = getSpogomiCachanDemoClosureProjection();
    const markup = renderToStaticMarkup(<SpogomiCachanRankings projection={projection} />);

    expect(markup).toContain("mégots/participant");
    expect(markup).toContain("mégots comptés directement");
    expect(markup).not.toContain("mégots ·");
  });
});
