# Example Zod Route Pattern

When a route receives user input:

1. Define a schema close to the route.
2. Parse with `safeParse()`.
3. Return a validation error response on failure.
4. Use the parsed payload only after validation succeeds.
5. Add a test for the invalid payload branch.
