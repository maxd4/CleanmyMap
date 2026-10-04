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

## CodeQL `js/polynomial-redos` — #935, #936, #937

These three High alerts target the PEM parser regular expressions in
`lib/pem.js`. They remain open and visible as `KEEP_VISIBLE_UPSTREAM`: the
CodeQL ReDoS class is applicable to the expression shape, so vendoring alone
is not a false-positive justification.

The upstream state was checked against `digitalbazaar/forge` on 2026-10-02:

- npm `node-forge@1.4.0` remains the published `latest` release and is the
  compatible release currently resolved by the Expo graph;
- upstream `v1.4.0` is `2ae172f7cda6831b358c3fc111f4f3e1781782b2` and current
  `main` is `723240415b25120d47146f982809fa69344ab890`;
- the `v1.4.0...main` comparison changes only `README.md`, `SECURITY.md`,
  `package.json` and `tests/unit/jsbn.js`; `lib/pem.js` is unchanged;
- no upstream commit, reviewed pull request, issue or advisory corresponding
  to these PEM polynomial-ReDoS findings was identified.

The relevant Expo APIs are `convertPrivateKeyPEMToPrivateKey`,
`convertPublicKeyPEMToPublicKey`, `convertCertificatePEMToCertificate` and
`convertCSRPEMToCSR` from `@expo/code-signing-certificates`; the Expo CLI uses
them for configured local code-signing files or cached/provisioned development
certificates. CleanMyMap currently has no `updates.codeSigningCertificate`, no
`updates.codeSigningMetadata` and no EAS project identifier is currently
versioned: the `extra.eas.projectId` entry was removed from
`apps/mobile/app.json` until the project is linked to a real Expo account. The
current repository path reaching these APIs is the security smoke test, which
generates its PEM values locally; no current mobile runtime or remote input
path supplies a PEM string to this parser.

Do not rewrite the cryptographic PEM parser or dismiss these alerts while this
boundary remains true. Re-open this decision if a valid upstream fix becomes
available, a new CleanMyMap consumer accepts untrusted or remote PEM input, or
Expo signing/update code is enabled. Any future mitigation must then be based
on the reviewed upstream change or a size limit justified by the actual Expo
contract, not an arbitrary threshold.
