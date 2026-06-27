import { describe, expect, it } from "vitest";
import { normalizeProfileRole, toProfile } from "@/lib/profiles";

describe("app shell profile resolution", () => {
  it("normalizes Clerk metadata roles to the app profile domain", () => {
    expect(normalizeProfileRole("admin")).toBe("admin");
    expect(normalizeProfileRole("Elu")).toBe("elu");
    expect(normalizeProfileRole("unknown")).toBeNull();
    expect(toProfile("anonymous")).toBe("benevole");
  });
});
