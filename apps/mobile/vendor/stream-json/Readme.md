# CleanMyMap `stream-json` compatibility package

This package is a bounded CommonJS compatibility backport for `jayson@4.3.0`.
It preserves only the historical `StreamValues` and `Verifier` paths used by
that dependency and is not the upstream `stream-json@3.6.0` package. The
parser, assembler, streamers, verifier, and `withParser()` bridge are based on
the corresponding `stream-json@1.9.1` implementation so values are emitted
incrementally on an open stream. The compatible `stream-chain@2.2.5` pipeline
used by the upstream `withParser()` helper is bundled under this package; no
additional workspace dependency or global override is required.

The package is intentionally not a general `stream-json` distribution. It does
not ship the JSON path-filter surface (`pick`, `ignore`, `filter`, or
`replace`) covered by the CleanMyMap dependency advisory. It must remain
scoped to the `jayson@4.3.0` override in the workspace root.

The upstream BSD-3-Clause license notices are retained in `LICENSE` and
`stream-chain/LICENSE`. This local package is a CleanMyMap compatibility
backport and must not be represented as the upstream `stream-json@3.6.0`
distribution.
