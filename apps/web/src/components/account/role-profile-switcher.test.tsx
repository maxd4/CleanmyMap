import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const componentSource = readFileSync(new URL("./role-profile-switcher.tsx", import.meta.url), "utf8");

describe("role profile switcher contract", () => {
  it("derives options from the granted role and delegates mutations to the shared flow", () => {
    expect(componentSource).toContain("getSwitchableProfiles(grantedRole)");
    expect(componentSource).toContain("useActiveRoleMutation");
    expect(componentSource).toContain("handleActiveRoleMutation(profile)");
    expect(componentSource).not.toContain("href=");
  });
});
