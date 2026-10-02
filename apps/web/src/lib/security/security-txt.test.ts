import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const securityTxtPath = resolve(process.cwd(), "public/.well-known/security.txt");
const securityTxt = readFileSync(securityTxtPath, "utf8");

function readField(name: string): string {
  const match = securityTxt.match(new RegExp(`^${name}:\\s*(.+)$`, "m"));
  return match?.[1]?.trim() ?? "";
}

// STATIC_CONTRACT: this guard verifies the published file shape only; it does
// not prove deployment reachability or GitHub security-setting availability.
describe("security.txt STATIC_CONTRACT", () => {
  it("contains the required RFC 9116 contact, language, policy and expiry fields", () => {
    expect(readField("Contact")).toBe("mailto:security@cleanmymap.fr");
    expect(readField("Preferred-Languages")).toBe("fr, en");
    expect(readField("Canonical")).toBe("https://cleanmymap.fr/.well-known/security.txt");
    expect(readField("Policy")).toBe("https://github.com/maxd4/CleanmyMap/security/policy");

    const expiresAt = Date.parse(readField("Expires"));
    expect(expiresAt).toBeGreaterThan(Date.now());
    expect(expiresAt - Date.now()).toBeLessThan(365 * 24 * 60 * 60 * 1000);
  });
});
