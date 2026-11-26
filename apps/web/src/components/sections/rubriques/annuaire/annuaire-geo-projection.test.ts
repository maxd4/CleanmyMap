import { describe, expect, it } from "vitest";
import { projectNetworkPoint } from "./annuaire-geo-projection";
describe("geographic network projection", () => {
  const identity = [1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
  it("projects the center and the edges into the CSS viewport", () => {
    expect(projectNetworkPoint(identity, { x: 0, y: 0, z: 0 }, 800, 600)).toEqual({ x: 400, y: 300 });
    expect(projectNetworkPoint(identity, { x: 1, y: 1, z: 0 }, 800, 600)).toEqual({ x: 800, y: 0 });
  });
  it("uses elevation from the same matrix and discards points behind the camera", () => {
    const tilted = [...identity]; tilted[9] = 0.5;
    expect(projectNetworkPoint(tilted, { x: 0, y: 0, z: 1 }, 800, 600)?.y).toBe(150);
    const behind = [...identity]; behind[15] = -1;
    expect(projectNetworkPoint(behind, { x: 0, y: 0, z: 0 }, 800, 600)).toBeNull();
  });
});
