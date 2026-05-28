# Fix Vercel Source Map Upload Errors

## Goal Description
The recent refactor of `service.ts` into multiple service modules succeeded, but Vercel deployment now reports numerous missing source map errors for generated JS files. The goal is to eliminate these warnings to ensure clean builds and proper debugging capabilities.

## User Review Required
> [!IMPORTANT]
> Confirm whether you prefer to keep source maps in production (useful for debugging) or disable them entirely to avoid upload warnings.

## Proposed Changes
---
### Next.js Configuration
- **Modify `next.config.js`** to control source map generation.
  - Add `productionBrowserSourceMaps: true` if you want source maps.
  - Or set `productionBrowserSourceMaps: false` to skip them and stop Vercel warnings.
  - Ensure `webpack` config does not delete source maps during optimization.

---
### Vercel Configuration (optional)
- If you keep source maps, add a `vercel.json` with `build` settings to include source maps in the upload.
- Example:
```json
{
  "build": {
    "env": {
      "NEXT_PUBLIC_SOURCE_MAP": "true"
    }
  }
}
```
- Or set `ignoreBuildStep` for source maps if you disable them.

---
### Adjust Build Scripts
- Update `package.json` scripts if they explicitly strip source maps (e.g., `next build && next export`).
- Ensure no `--no-sourcemap` flags are used unintentionally.

---
### Verify Locally
1. Run `npm run build` locally.
2. Check the `.next` directory for `.map` files.
3. Confirm that the build succeeds without warnings.

### Verification Plan
- **Automated**: Run `npx next build` and capture output; ensure no "missing sourcemap" lines.
- **Manual**: Deploy to Vercel preview branch; verify the Vercel dashboard shows no source map errors.

## Open Questions
- Do you want source maps preserved for production debugging?
- Should we adjust any CI/CD pipeline steps that may strip source maps?

---
