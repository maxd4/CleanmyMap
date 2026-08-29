# CleanMyMap `image-size` security backport

This local package is based on the published `image-size@1.2.1` package currently resolved by Metro. It is intentionally kept local because the npm registry currently publishes `2.0.2` as its latest version and no patched npm release is currently available.

The local package is versioned as `2.0.3` only to make the patched dependency explicit to package and advisory tooling. It is not an upstream npm release.

Applied hardening:

- reject ICNS entries shorter than their 8-byte header or extending beyond the declared/input length, which prevents zero-length and non-advancing entry loops;
- retain the upstream `findBox` forward-progress guard for zero-sized JXL/HEIF boxes.
- read TIFF metadata by opening the file first, calling `fstatSync` on that same descriptor, and closing it in `finally` so the size/read pair cannot race and descriptors are not leaked on read errors.

Advisories covered:

- `GHSA-5p2g-fcmc-qvqq` / `CVE-2025-71329`;
- `GHSA-w3rx-r6r6-pgpr` / `CVE-2025-71330`.

The override in `apps/mobile/package.json` makes every Metro resolution use this local backport. Remove the vendor and override only after an actual upstream `image-size` release containing both fixes is available and verified.
