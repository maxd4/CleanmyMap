import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const useSWRMock = vi.hoisted(() => vi.fn());

vi.mock("swr", () => ({
  default: useSWRMock,
}));

import { SystemStatusPanel } from "./system-status-panel";

describe("SystemStatusPanel asynchronous states", () => {
  it("renders canonical loading skeletons", () => {
    useSWRMock.mockReturnValue({
      data: undefined,
      error: undefined,
      isLoading: true,
      isValidating: true,
      mutate: vi.fn(),
    });

    const markup = renderToStaticMarkup(React.createElement(SystemStatusPanel));

    expect(markup).toContain('role="status"');
    expect(markup).toContain('aria-busy="true"');
    expect(markup).toContain('data-skeleton-variant="list-item"');
    expect(markup).not.toContain("animate-pulse");
  });

  it("exposes a local retry action for a supervision error", () => {
    useSWRMock.mockReturnValue({
      data: undefined,
      error: new Error("unavailable"),
      isLoading: false,
      isValidating: false,
      mutate: vi.fn(),
    });

    const markup = renderToStaticMarkup(React.createElement(SystemStatusPanel));

    expect(markup).toContain('data-feedback-tone="error"');
    expect(markup).toContain("État des intégrations indisponible");
    expect(markup).toContain("Réessayer");
  });
});
