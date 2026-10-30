import * as React from "react";
import { act, create, type ReactTestInstance, type ReactTestRenderer } from "react-test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { COMMUNITY_HELP_CATEGORIES } from "@/lib/community/action-needs";
import { CommunityHelperSkillsSetting } from "./community-helper-skills-setting";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

type InputProps = { checked?: boolean; onChange?: () => void };
type ButtonProps = { children?: React.ReactNode; onClick?: () => void };

function propsOf<Props>(node: ReactTestInstance): Props {
  return node.props as unknown as Props;
}

describe("CommunityHelperSkillsSetting", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ categories: ["materiel"] }),
    }));
  });

  it("loads private preferences, exposes all eight opt-in categories and saves only explicitly selected values", async () => {
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = create(React.createElement(CommunityHelperSkillsSetting, { locale: "fr" }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(renderer.root.findByType("h3").children.join(" ")).toBe("Je peux aider pour…");
    const inputs = renderer.root.findAllByType("input");
    expect(inputs).toHaveLength(COMMUNITY_HELP_CATEGORIES.length);
    expect(propsOf<InputProps>(inputs[0]!).checked).toBe(true);

    await act(async () => {
      propsOf<InputProps>(inputs[1]!).onChange?.();
    });
    const save = renderer.root.findAllByType("button").find((button) => propsOf<ButtonProps>(button).children === "Enregistrer");
    await act(async () => {
      propsOf<ButtonProps>(save!).onClick?.();
      await Promise.resolve();
    });

    expect(vi.mocked(fetch)).toHaveBeenLastCalledWith("/api/community/helper-skills", expect.objectContaining({
      method: "PUT",
      body: JSON.stringify({ categories: ["materiel", "transport"] }),
    }));
    expect(renderer.root.findAll((node) => node.props?.children === "Aucun badge")).toHaveLength(0);
    renderer.unmount();
  });
});
