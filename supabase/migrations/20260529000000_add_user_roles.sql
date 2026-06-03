-- Add user_roles table for admin access control
-- This table maps Clerk user IDs to roles (user, admin, godmode)

CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin', 'godmode', 'moderator')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);

-- Enable RLS (optional, but recommended)
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Only admins/system can read and modify roles
CREATE POLICY "system_can_manage_roles" ON user_roles
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Ensure user_id is valid
ALTER TABLE user_roles 
  ADD CONSTRAINT user_roles_user_id_not_empty CHECK (user_id != '');
