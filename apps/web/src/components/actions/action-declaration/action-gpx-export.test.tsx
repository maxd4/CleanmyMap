import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  ActionGpxExportButton,
  downloadGpxDocument,
} from "./action-gpx-export";

vi.mock("lucide-react", () => ({ Download: "span" }));

const validInput = {
  drawing: { coordinates: [[48.85, 2.35], [48.86, 2.36]] as [number, number][] },
  routeTopology: "point_to_point" as const,
};

describe("ActionGpxExportButton", () => {
  it("is absent without a usable final geometry and present otherwise", () => {
    expect(renderToStaticMarkup(<ActionGpxExportButton input={{}} />)).not.toContain(
      "Exporter en GPX",
    );
    expect(renderToStaticMarkup(<ActionGpxExportButton input={validInput} />)).toContain(
      "Exporter en GPX",
    );
  });

  it("downloads a GPX blob through the browser without a network request", () => {
    const click = vi.fn();
    const remove = vi.fn();
    const createElement = vi.fn(() => ({
      href: "",
      download: "",
      rel: "",
      click,
      remove,
    }));
    const appendChild = vi.fn();
    const createObjectURL = vi.fn(() => "blob:cleanmymap");
    const revokeObjectURL = vi.fn();
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    vi.stubGlobal("document", { createElement, body: { appendChild } });
    vi.stubGlobal("URL", { createObjectURL, revokeObjectURL });

    downloadGpxDocument("<gpx />");

    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(createElement).toHaveBeenCalledWith("a");
    expect(appendChild).toHaveBeenCalledOnce();
    expect(click).toHaveBeenCalledOnce();
    expect(remove).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:cleanmymap");
    expect(fetchSpy).not.toHaveBeenCalled();

    fetchSpy.mockRestore();
    vi.unstubAllGlobals();
  });
});
