import { describe, expect, it } from "vitest";
import { ActionsHistoryList } from "./actions-history-list";

describe("ActionsHistoryList import", () => {
  it("exports the list shell as a component function", () => {
    expect(typeof ActionsHistoryList).toBe("function");
  });
});
