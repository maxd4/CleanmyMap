import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { WebSiteJsonLd } from "@/components/seo/structured-data/navigation-data";
import { metadata } from "./metadata";

describe("CleanMyMap SEO brand identity", () => {
  it("keeps the exact brand in global metadata without adding brand variants as keywords", () => {
    expect(metadata.title).toEqual({
      default: "CleanMyMap | Carte citoyenne de dépollution urbaine",
      template: "%s | CleanMyMap",
    });
    expect(metadata.creator).toBe("CleanMyMap");
    expect(metadata.publisher).toBe("CleanMyMap");
    expect(metadata.openGraph?.siteName).toBe("CleanMyMap");
    expect(metadata.authors).toEqual([
      { name: "CleanMyMap", url: expect.any(String) },
    ]);
    expect(metadata.keywords).toContain("CleanMyMap");
    expect(metadata.keywords).not.toContain("cleanmymap.fr");
    expect(metadata.keywords).not.toContain("CMM");
    expect(metadata.keywords).not.toContain("Clean My Map");
  });

  it("publishes the exact WebSite name and only the requested alternate names", () => {
    const markup = renderToStaticMarkup(<WebSiteJsonLd />);
    const json = markup.match(/<script[^>]*>(.*)<\/script>/)?.[1];

    expect(json).toBeDefined();
    expect(JSON.parse(json!)).toMatchObject({
      "@type": "WebSite",
      name: "CleanMyMap",
      alternateName: ["cleanmymap.fr", "CMM"],
    });
    expect(json).not.toContain("Clean My Map");
  });
});
