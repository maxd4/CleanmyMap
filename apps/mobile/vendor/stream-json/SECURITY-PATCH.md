# CleanMyMap security compatibility backport

This package exists only to satisfy the CommonJS contract used by
`jayson@4.3.0`:

- `stream-json/streamers/StreamValues`
- `stream-json/utils/Verifier`

Its implementation is intentionally bounded to JSON streaming, value
assembly, and verification. It does not include the upstream path-filter
modules `pick`, `ignore`, `filter`, or `replace`. The package version remains
`1.9.1` so that `jayson`'s declared `^1.9.1` contract is satisfied; the package
metadata and this document identify it as a CleanMyMap backport rather than an
upstream npm release.

Do not widen the root override. Remove this package only after `jayson` no
longer requires these CommonJS paths, or an upstream compatible release is
proved to preserve them while addressing the advisory. Regenerate the lockfile
and rerun the compatibility, audit, and lock-policy checks at removal time.
