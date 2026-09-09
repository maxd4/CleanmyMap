import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";
import {
  CAPTURE_MODE_INITIALIZER_SCRIPT,
  CAPTURE_MODE_QUERY_PARAM,
  CAPTURE_MODE_QUERY_VALUE,
} from "./capture-mode-initializer";

function runInitializer(search: string) {
  const documentElement = {
    dataset: {} as Record<string, string>,
  };

  runInNewContext(CAPTURE_MODE_INITIALIZER_SCRIPT, {
    document: { documentElement },
    window: { location: { search } },
    URLSearchParams,
  });

  return documentElement;
}

describe("capture mode initializer", () => {
  it("activates the root capture attribute from the explicit query contract", () => {
    expect(CAPTURE_MODE_QUERY_PARAM).toBe("cmmCapture");
    expect(CAPTURE_MODE_QUERY_VALUE).toBe("1");
    expect(runInitializer("?cmmCapture=1")).toEqual({
      dataset: { cmmCaptureMode: "true" },
    });
  });

  it("does not activate capture mode for a normal navigation", () => {
    expect(runInitializer("")).toEqual({ dataset: {} });
    expect(runInitializer("?cmmCapture=0")).toEqual({ dataset: {} });
  });

  it("does not depend on cookies or network calls", () => {
    expect(CAPTURE_MODE_INITIALIZER_SCRIPT).not.toContain("document.cookie");
    expect(CAPTURE_MODE_INITIALIZER_SCRIPT).not.toContain("fetch(");
  });
});
