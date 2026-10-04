# CleanMyMap `braces` security backport

This package is the published `braces@3.0.3` source vendored locally as the
CleanMyMap-only `3.0.4` backport. No upstream patched release is available for
`GHSA-VFJ7-8CJW-P6XM` / `CVE-2026-93687`.

The backport keeps the public `braces` API and its `fill-range` dependency. It
adds a bounded parser depth of 1000 nested braces. The existing parser already
limits an input to 10000 characters; the additional depth guard prevents the
recursive compile/expand walk from exhausting the JavaScript call stack on a
deeply nested attacker-controlled pattern. Patterns within the bound continue
to use the upstream parser and compiler unchanged.

The source provenance is the npm `braces@3.0.3` package and the advisory
tracking issue is [micromatch/braces#70](https://github.com/micromatch/braces/issues/70).
The backport is covered by the local dependency gate and by the normal web and
mobile security suites; the exact lockfile path is `apps/mobile/vendor/braces`.
