-- 20260420_000010_profile_arrondissement.sql
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS paris_arrondissement INTEGER;

-- Create index for fast lookup during event notifications
CREATE INDEX IF NOT EXISTS idx_profiles_arrondissement ON public.profiles(paris_arrondissement);

-- Policy update: Ensure service role can still upsert properly
-- (Already covered by profiles_all_owner)
