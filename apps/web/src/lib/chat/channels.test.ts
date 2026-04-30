import { describe, expect, it } from "vitest";
import {
  canAccessChatChannel,
  getVisibleChatChannelTypes,
  isChatChannelType,
} from "./channels";

describe("chat channels", () => {
  it("recognizes the supported channel types", () => {
    expect(isChatChannelType("community")).toBe(true);
    expect(isChatChannelType("dm")).toBe(true);
    expect(isChatChannelType("admin_elu")).toBe(true);
    expect(isChatChannelType("territory")).toBe(true);
    expect(isChatChannelType("bug_report")).toBe(true);
    expect(isChatChannelType("neighborhood")).toBe(false);
  });

  it("limits the admin channel to admin or elected profiles", () => {
    expect(
      canAccessChatChannel("admin_elu", {
        roleLabel: "benevole",
        hasArrondissement: true,
      }),
    ).toBe(false);
    expect(
      canAccessChatChannel("admin_elu", {
        roleLabel: "elu",
        hasArrondissement: true,
      }),
    ).toBe(true);
    expect(
      canAccessChatChannel("admin_elu", {
        roleLabel: "admin",
        hasArrondissement: true,
      }),
    ).toBe(true);
    expect(
      canAccessChatChannel("admin_elu", {
        roleLabel: "max",
        hasArrondissement: true,
      }),
    ).toBe(true);
  });

  it("keeps territory hidden until an arrondissement exists", () => {
    expect(
      canAccessChatChannel("territory", {
        roleLabel: "benevole",
        hasArrondissement: false,
      }),
    ).toBe(false);
    expect(
      getVisibleChatChannelTypes({
        roleLabel: "benevole",
        hasArrondissement: false,
      }),
    ).toEqual(["community", "dm", "bug_report"]);
  });
});
