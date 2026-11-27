import { describe, expect, it } from "vitest";
import { sumKnown } from "./report-summary";
describe("organization report coverage", () => {
  it("distinguishes unknown from zero", () => {
    expect(sumKnown([null, undefined])).toEqual({value:null,known:0,total:2});
    expect(sumKnown([0,null])).toEqual({value:0,known:1,total:2});
  });
  it("sums only valid available observations", () => {
    expect(sumKnown([2,3,null,NaN,-1])).toEqual({value:5,known:2,total:5});
  });
  it("does not invent metrics for an empty perimeter", () => {
    expect(sumKnown([])).toEqual({value:null,known:0,total:0});
  });
});
