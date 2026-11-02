# CleanMyMap `deepmerge` security backport

This package is a local backport of the reachable `deepmerge@4.3.1` CommonJS
runtime used by Expo configuration tooling. It is not an upstream npm release.

`GHSA-gcqx-w48m-w2h4` / `CVE-2026-93753` has no upstream patched version and
affects `mergeObject()` when a source object contains prototype keys and the
target does not inherit those keys, including a null-prototype target. The
backport keeps the upstream API and rejects `__proto__`, `constructor`, and
`prototype` before writing to the returned object.

The dedicated security test exercises normal merges and malicious own
properties, including a null-prototype target, and verifies that
`Object.prototype` is unchanged.
