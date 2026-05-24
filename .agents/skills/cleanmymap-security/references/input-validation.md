# Input Validation

Prefer these repo patterns:

- `new URL()` for URL parsing and hostname checks
- Zod `safeParse` for request payloads
- shared validation helpers instead of one-off string checks
- explicit error responses for invalid payloads

Never trust a prefix check alone when the input controls navigation, redirects, or external fetch targets.
