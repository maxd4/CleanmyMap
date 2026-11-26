// @vitest-environment jsdom

import * as React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({ href, children, onClick, ...props }: { href: string; children: React.ReactNode; prefetch?: boolean; onClick?: React.MouseEventHandler<HTMLAnchorElement> }) => {
    const anchorProps = { ...props };
    delete anchorProps.prefetch;
    return (
      <a href={href} {...anchorProps} onClick={(event) => { event.preventDefault(); onClick?.(event); }}>
        {children}
      </a>
    );
  },
}));

import { RibbonDropdownItem } from "./ribbon-dropdown-item";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function TestIcon({ className, ...props }: React.SVGProps<SVGSVGElement>) {
  return <svg className={className} {...props} />;
}

describe("RibbonDropdownItem behavior", () => {
  let host: HTMLDivElement;
  let root: Root;

  afterEach(() => {
    act(() => root.unmount());
    host.remove();
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  function renderItem(props: Partial<React.ComponentProps<typeof RibbonDropdownItem>> = {}) {
    host = document.createElement("div");
    document.body.appendChild(host);
    act(() => {
      root = createRoot(host);
      root.render(
        <RibbonDropdownItem
          href="/sections/feedback#bug"
          label="Signaler un problème technique"
          icon={TestIcon as never}
          iconClassName="text-rose-300"
          {...props}
        />,
      );
    });
  }

  it("renders a regular item with navigation, icon, text and click callback", () => {
    const onClick = vi.fn();
    renderItem({ onClick });
    const link = host.querySelector<HTMLAnchorElement>("a")!;

    expect(link.getAttribute("href")).toBe("/sections/feedback#bug");
    expect(link.textContent).toContain("Signaler un problème technique");
    expect(link.className).toContain("min-h-14");
    expect(link.className).toContain("focus-visible:ring-cyan-200/80");
    expect(link.querySelector("svg")).not.toBeNull();
    expect(link.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");

    act(() => {
      link.click();
    });
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("uses the compact hit target and remains keyboard focusable", () => {
    renderItem({ compact: true, label: "Nous contacter" });
    const link = host.querySelector<HTMLAnchorElement>("a")!;

    expect(link.className).toContain("min-h-10");
    expect(link.className).toContain("gap-1.5");
    expect(link.querySelector("span")?.className).toContain("h-7");
    expect(link.querySelector("span")?.className).toContain("w-7");
    link.focus();
    expect(document.activeElement).toBe(link);
    expect(link.textContent).toContain("Nous contacter");
  });
});
