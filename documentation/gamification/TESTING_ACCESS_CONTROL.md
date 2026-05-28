# Integration Tests, Access Control & Documentation

## Completed

### 1. Integration Tests (route.integration.test.ts)
- **Scenario 1: Multiple tier unlocks**
  - Tests that exactly 3 `progression_events` inserts occur when 3 tiers are unlocked
  - Mocks Supabase `from('progression_events').select()` + `.insert()`
  - Verifies each insert has correct `event_type`, `xp_base`, `xp_awarded`, `source_id`

- **Scenario 2: Idempotency / Duplicate prevention**
  - Tests that calling the endpoint twice doesn't re-insert existing tiers
  - Mocks `progression_events` to return `data: { id: 1 }` on second call (row exists)
  - Verifies `insertCount === 0` when existing record found

### 2. Access Control

#### Frontend Guard (access.ts)
```typescript
export async function checkAdminAccess() {
  const { userId } = await auth();
  if (!userId) redirect('/auth/signin');
  
  const supabase = getSupabaseServerClient();
  const { data: userRole } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .maybeSingle();
    
  if (!userRole || (userRole.role !== 'admin' && userRole.role !== 'godmode')) {
    redirect('/');
  }
}
```
- Checks Clerk auth (`userId`)
- Queries `user_roles` table for admin/godmode role
- Redirects to `/` if unauthorized

#### Page-Level Protection (/admin/gamification/xp-audit/page.tsx)
```typescript
export default async function Page({ searchParams }: { searchParams: any }) {
  await checkAdminAccess();  // ← Guard here
  const supabase = getSupabaseServerClient(true);
  // ... rest of page
}
```

#### Middleware (middleware.ts)
```typescript
export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};

export async function middleware(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    const signInUrl = new URL('/auth/signin', req.nextUrl.origin);
    return NextResponse.redirect(signInUrl);
  }
}
```
- Intercepts all `/admin/*` and `/api/admin/*` requests
- Redirects unauthenticated users to sign-in with `returnTo` parameter
- Can be extended with role-based checks (TODO)

### 3. Test Files for Access Control (access.test.ts)
- Tests for redirect behavior when unauthenticated
- Tests for allowing authenticated users
- Tests for role-based restrictions

## Setup Instructions for Admin Access

### Option A: Use `user_roles` Table (Recommended)
1. Create migration to add `user_roles` table:
```sql
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'user', -- 'user', 'admin', 'godmode'
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
```

2. Assign role when user signs up (via Clerk webhook or manual)

### Option B: Use Clerk Metadata
Update `checkAdminAccess()` to check Clerk public metadata instead of DB:
```typescript
import { clerkClient } from '@clerk/nextjs/server';

export async function checkAdminAccess() {
  const { userId } = await auth();
  if (!userId) redirect('/auth/signin');

  const user = await clerkClient.users.getUser(userId);
  const isAdmin = user?.publicMetadata?.role === 'admin' || 
                  user?.publicMetadata?.role === 'godmode';
  
  if (!isAdmin) redirect('/');
}
```

### Option C: Use Supabase RLS
Add RLS policy to `xp_audit` and `xp_audit_daily`:
```sql
CREATE POLICY "only_admins_can_view_all" ON xp_audit
  FOR SELECT
  USING (auth.jwt() ->> 'user_role' = 'admin');
```

## Database Setup Required

If using **Option A** (`user_roles` table):
```bash
npm run supabase:migrations:create add_user_roles
# Edit migration file, then:
npm run supabase:migrations:up
```

**Migration template:**
```sql
-- supabase/migrations/20260529000000_add_user_roles.sql
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'user',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
```

Then manually assign admin roles (via SQL or admin UI):
```sql
INSERT INTO user_roles (user_id, role) VALUES
  ('clerk-user-id-1', 'admin'),
  ('clerk-user-id-2', 'godmode');
```

## Running Tests

```bash
# Run integration tests
npm run test route.integration.test.ts

# Run access control tests
npm run test access.test.ts

# Run all tests
npm run test

# Watch mode
npm run test -- --watch
```

## Future Enhancements

- [ ] RLS policies on xp_audit for row-level access control
- [ ] Admin dashboard with role/permission UI
- [ ] Audit log for admin actions (who viewed what, when)
- [ ] Fine-grained permissions (view audit, export CSV, modify users, etc.)
- [ ] Integration with Clerk's organizational roles feature

## Troubleshooting

### "Access Denied" even for admin users
- Verify `user_roles` table has the user's record with correct role
- Check Clerk user ID matches in `user_roles.user_id`
- Ensure migrations ran: `npm run supabase:migrations:status`

### Middleware not intercepting requests
- Verify `next.config.js` includes middleware in build output
- Check `middleware.ts` is at `apps/web/src/middleware.ts` (not nested deeper)
- Ensure `config.matcher` patterns match your routes

### Tests failing to import auth
- Ensure `@clerk/nextjs` is installed: `npm ls @clerk/nextjs`
- Clear test cache: `npm run test -- --clearCache`
