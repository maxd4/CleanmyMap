import { describe, expect, it } from "vitest";
import { escapeMarkdownTableCell } from "../../../../../scripts/cleanup/inventory";

describe("escapeMarkdownTableCell", () => {
  it("escapes markdown-sensitive characters for table cells", () => {
    const input = "line 1\\line 2|tick`quote\r\nnext|row";

    expect(escapeMarkdownTableCell(input)).toBe(
      "line 1\\\\line 2\\|tick\\`quote next\\|row",
    );
  });

  it("keeps plain text stable", () => {
    expect(escapeMarkdownTableCell("CleanMyMap")).toBe("CleanMyMap");
  });
});
