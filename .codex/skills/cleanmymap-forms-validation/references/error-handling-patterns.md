# Error Handling Patterns

Prefer these patterns when validation fails:

- `safeParse()` with flattened field errors
- explicit validation error responses
- field-level messages that help the user fix the input
- route-level guards before the expensive or privileged work

Do not silently coerce invalid values into a success path.
