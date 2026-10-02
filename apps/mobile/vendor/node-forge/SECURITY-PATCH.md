# CleanMyMap `node-forge` security backport

This package contains the published `node-forge@1.4.0` tarball vendored locally
for the Expo tooling dependency graph. It is a CleanMyMap backport, not an
upstream release. The upstream package identity, license, provenance metadata,
and the runtime source required by Expo are preserved; upstream documentation
and build/test artifacts are intentionally omitted. The local package is
marked private and identified as a backport in `package.json`.

Upstream provenance:

- npm package: `node-forge@1.4.0`
- npm integrity: `sha512-LarFH0+6VfriEhqMMcLX2F7SwSXeWwnEAJEsYm5QKWchiVYVvJyV9v7UDvUv+w5HO23ZpQTXDv/GxdDdMyOuoQ==`
- source repository: https://github.com/digitalbazaar/forge
- source tarball contents: 59 files from the published package; the reduced
  vendor retains the 42 reachable `lib/*.js` runtime files required by the
  Node entry point consumed by Expo.

Applied local change:

- backport only the `DigestAlgorithm` child-count check from
  `digitalbazaar/forge#1152`, head
  `ceba34402e329f0365134f23fe19898756527d65`;
- reject an RSA PKCS#1 v1.5 signature whose nested `DigestAlgorithm` contains
  an extra child, preventing `GHSA-86w9-cpqp-85rv` / `CVE-2026-85393`.

The regression vector and the Expo code-signing smoke test are in
`apps/mobile/security/node-forge-security.test.mjs`. The test verifies that
the exact upstream 1.4.0 validation accepts the forged vector before this
single hunk and that the CleanMyMap backport rejects it afterwards.

The vendor and both scoped overrides must be removed only after a published
upstream `node-forge` release fixes this advisory and is verified as compatible
with `@expo/cli` and `@expo/code-signing-certificates@0.0.6`. At that point,
regenerate the lockfile and rerun the security, mobile, and lockfile checks.

CleanMyMap currently has no `codeSigningCertificate`, `codeSigningMetadata`, or
`expo-updates` configuration. This mitigation protects the Expo tooling graph;
it does not claim that the advisory was exposed through the public runtime.
