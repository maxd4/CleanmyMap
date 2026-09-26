import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { JsonLd, serializeJsonLd } from "./json-ld-wrapper";

describe("JsonLd", () => {
  it("encodes script-context characters in user-controlled structured data", () => {
    const value = '</script><script>alert("xss")</script>';
    const markup = renderToStaticMarkup(
      <JsonLd data={{ name: value }} />,
    );

    expect(markup).not.toContain("</script><script>");
    expect(markup).toContain("\\u003c/script\\u003e\\u003cscript\\u003e");
    expect(serializeJsonLd({ name: value })).not.toContain("</script>");
  });
});
