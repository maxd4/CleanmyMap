import assert from "node:assert/strict";

import {
  createGeocodeResolver,
  geocodeAddress,
  findColumnIndex,
  normalizeGeocodeLabel,
  parseCoordsFromText,
  toNullableNumber,
} from "./sheet-ingestion-core.mjs";

assert.equal(
  findColumnIndex(["Déchets (kg)"], ["dechets (kg)", "dechets(kg)"]),
  0,
);
assert.equal(toNullableNumber(""), null);
assert.equal(toNullableNumber("  "), null);
assert.equal(toNullableNumber("0"), 0);
assert.equal(toNullableNumber("20"), 20);
assert.throws(() => toNullableNumber("not-a-number"), /invalide/);

assert.equal(normalizeGeocodeLabel("  Rue de Rivoli\nParis  "), "Rue de Rivoli Paris");
assert.equal(normalizeGeocodeLabel("https://example.com"), null);
assert.equal(normalizeGeocodeLabel("contact@example.org"), null);
assert.deepEqual(parseCoordsFromText("Départ: 48.8566, 2.3522"), { latitude: 48.8566, longitude: 2.3522 });
const dms = parseCoordsFromText("48°51'23.76\"N 2°21'7.92\"E");
assert.ok(dms.latitude !== null && Math.abs(dms.latitude - 48.8566) < 1e-9);
assert.ok(dms.longitude !== null && Math.abs(dms.longitude - 2.3522) < 1e-9);
assert.deepEqual(parseCoordsFromText(`${"x ".repeat(100_000)}48.8566, 2.3522`), { latitude: 48.8566, longitude: 2.3522 });
assert.deepEqual(parseCoordsFromText(`${"9".repeat(100_000)} invalid`), { latitude: null, longitude: null });
assert.deepEqual(parseCoordsFromText(`${" ".repeat(100_000)}not coordinates`), { latitude: null, longitude: null });
assert.equal(normalizeGeocodeLabel(`${"a@".repeat(40)}b.example`), null);

const originalFetch = globalThis.fetch;
let fetchCalled = false;

try {
  globalThis.fetch = async () => {
    fetchCalled = true;
    return {
      ok: true,
      json: async () => [],
    };
  };

  const invalid = await geocodeAddress("mailto:test@example.org", {
    userAgent: "test-agent",
    acceptLanguage: "fr",
  });
  assert.deepEqual(invalid, { latitude: null, longitude: null });
  assert.equal(fetchCalled, false);

  const resolve = createGeocodeResolver({
    userAgent: "test-agent",
    acceptLanguage: "fr",
    delayMs: 0,
  });
  const invalidResolved = await resolve("https://example.com");
  assert.deepEqual(invalidResolved, { latitude: null, longitude: null });
  assert.equal(fetchCalled, false);
} finally {
  globalThis.fetch = originalFetch;
}
