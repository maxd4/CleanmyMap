# Example URL and Secret Check

When a route accepts a URL or secret-like value:

1. Parse the URL with `new URL()`.
2. Compare `hostname`, protocol, and path against an allowlist.
3. Reject malformed input with a controlled validation error.
4. Keep secrets in server-only env vars.
5. Never copy a secret into client code or a committed file.
