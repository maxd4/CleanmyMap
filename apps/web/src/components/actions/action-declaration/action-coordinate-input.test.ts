import { describe, expect, it } from "vitest";
import { parseActionCoordinateInput } from "./action-coordinate-input";

describe("parseActionCoordinateInput", () => {
  it.each([
    ["48.8566, 2.3522", { latitude: 48.8566, longitude: 2.3522 }],
    ["48,8566; 2,3522", { latitude: 48.8566, longitude: 2.3522 }],
    ["48.8566 2.3522", { latitude: 48.8566, longitude: 2.3522 }],
    ["48°51'23.76\"N 2°21'7.92\"E", { latitude: 48.8566, longitude: 2.3522 }],
    ["https://www.google.com/maps/@48.8566,2.3522,17z", { latitude: 48.8566, longitude: 2.3522 }],
    ["https://maps.google.com/?q=48.8566,2.3522", { latitude: 48.8566, longitude: 2.3522 }],
  ] as const)("accepts %s", (input, expected) => {
    expect(parseActionCoordinateInput(input)).toEqual(expected);
  });

  it.each([
    "91, 2.35",
    "48.85, 181",
    "48,85 2,35",
    "48.85, 2.35, 3",
    "48°61'00\"N 2°21'00\"E",
    "https://example.com/maps/@48.8566,2.3522",
  ])("rejects ambiguous or out-of-range input %s", (input) => {
    expect(parseActionCoordinateInput(input)).toBeNull();
  });
});
