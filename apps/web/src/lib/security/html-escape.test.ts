import { describe, expect, it } from "vitest";
import { escapeHtml, safeImageSource } from "./html-escape";

describe("HTML and image source boundaries", () => {
  it("escapes all HTML delimiters", () => {
    expect(escapeHtml('<img src=x onerror="alert(1)">')).toBe(
      "&lt;img src=x onerror=&quot;alert(1)&quot;&gt;",
    );
  });

  it("allows only web images and supported base64 image data", () => {
    expect(safeImageSource("https://cdn.example.test/photo.jpg")).toBe(
      "https://cdn.example.test/photo.jpg",
    );
    expect(safeImageSource("data:image/png;base64,AAAA")).toContain("data:image/png");
    expect(safeImageSource("javascript:alert(1)")).toBeNull();
    expect(safeImageSource("data:text/html;base64,PHNjcmlwdD4=")).toBeNull();
    expect(safeImageSource("data:image/svg+xml;base64,PHN2Zz4=")).toBeNull();
  });
});
