# Example Protected Route Check

When a route depends on a role:

1. Resolve the session role on the server.
2. Call the existing authz helper.
3. Return a closed error path when access is denied.
4. Keep the UI in sync with the server rule.
5. Add a test that covers the forbidden case.
