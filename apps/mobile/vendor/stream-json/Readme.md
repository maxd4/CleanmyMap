# CleanMyMap `stream-json` compatibility package

This package is a bounded CommonJS compatibility backport for `jayson@4.3.0`.
It preserves only the historical `StreamValues` and `Verifier` paths used by
that dependency and is not the upstream `stream-json@3.6.0` package.

The package is intentionally not a general `stream-json` distribution. It does
not ship the JSON path-filter surface (`pick`, `ignore`, `filter`, or
`replace`) covered by the CleanMyMap dependency advisory. It must remain
scoped to the `jayson@4.3.0` override in the workspace root.
