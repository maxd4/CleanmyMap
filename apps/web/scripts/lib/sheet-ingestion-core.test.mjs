import assert from "node:assert/strict";

import {
  createGeocodeResolver,
  geocodeAddress,
  normalizeGeocodeLabel,
} from "./sheet-ingestion-core.mjs";

assert.equal(normalizeGeocodeLabel("  Rue de Rivoli\nParis  "), "Rue de Rivoli Paris");
assert.equal(normalizeGeocodeLabel("https://example.com"), null);
assert.equal(normalizeGeocodeLabel("contact@example.org"), null);

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
