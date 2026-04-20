-- 20260420_000015_advanced_chat_core.sql

-- 1. Extend Profiles with Handle
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS handle TEXT UNIQUE;
CREATE INDEX IF NOT EXISTS idx_profiles_handle ON public.profiles(handle);

-- 2. Chat Infrastructure
CREATE TABLE IF NOT EXISTS public.app_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id TEXT NOT NULL REFERENCES public.profiles(id),
    recipient_id TEXT, -- User ID for DMs (NULL for channels)
    channel_type TEXT NOT NULL CHECK (channel_type IN ('dm', 'neighborhood', 'governance', 'executive')),
    arrondissement_id INTEGER, -- Only for 'neighborhood'
    content TEXT NOT NULL,
    attachment_url TEXT,
    attachment_type TEXT,
    attachment_expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for history fetching
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.app_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_dm ON public.app_messages(sender_id, recipient_id) WHERE channel_type = 'dm';
CREATE INDEX IF NOT EXISTS idx_messages_neighbor ON public.app_messages(arrondissement_id) WHERE channel_type = 'neighborhood';

-- 3. RLS - Policies
ALTER TABLE public.app_messages ENABLE ROW LEVEL SECURITY;

-- 3a. DM Policy: Sender or Recipient can see
CREATE POLICY "Allow individual DMs" ON public.app_messages
    FOR SELECT USING (
        channel_type = 'dm' AND (sender_id = auth.jwt() ->> 'sub' OR recipient_id = auth.jwt() ->> 'sub')
    );

-- 3b. Neighborhood Policy: Users see messages from their arrondissement and neighbors
-- This requires a join with profiles of the current user.
CREATE OR REPLACE FUNCTION public.can_view_neighborhood_message(p_msg_arrondissement INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
    v_user_arrondissement INTEGER;
    v_is_neighbor BOOLEAN;
BEGIN
    SELECT paris_arrondissement INTO v_user_arrondissement 
    FROM public.profiles 
    WHERE id = auth.jwt() ->> 'sub';

    IF v_user_arrondissement IS NULL OR p_msg_arrondissement IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Using the same logic as the TS helper but in SQL
    -- For simplicity in RLS, we can check if it's the same or if they are linked.
    -- Better: we use a helper table for arrondissement adjacency in the DB if possible,
    -- or a CASE / Array check here.
    
    RETURN p_msg_arrondissement = v_user_arrondissement OR (
        CASE v_user_arrondissement
            WHEN 1 THEN p_msg_arrondissement IN (2,3,4,5,6,7,8)
            WHEN 2 THEN p_msg_arrondissement IN (1,3,4,9,10)
            WHEN 3 THEN p_msg_arrondissement IN (1,2,4,10,11)
            WHEN 4 THEN p_msg_arrondissement IN (1,2,3,5,6,11,12)
            WHEN 5 THEN p_msg_arrondissement IN (1,4,6,12,13,14)
            WHEN 6 THEN p_msg_arrondissement IN (1,4,5,7,14,15)
            WHEN 7 THEN p_msg_arrondissement IN (1,6,8,15,16)
            WHEN 8 THEN p_msg_arrondissement IN (1,7,9,16,17)
            WHEN 9 THEN p_msg_arrondissement IN (2,8,10,17,18)
            WHEN 10 THEN p_msg_arrondissement IN (2,3,9,11,18,19)
            WHEN 11 THEN p_msg_arrondissement IN (3,4,10,12,19,20)
            WHEN 12 THEN p_msg_arrondissement IN (4,5,11,13,20)
            WHEN 13 THEN p_msg_arrondissement IN (5,12,14)
            WHEN 14 THEN p_msg_arrondissement IN (5,6,13,15)
            WHEN 15 THEN p_msg_arrondissement IN (6,7,14,16)
            WHEN 16 THEN p_msg_arrondissement IN (7,8,15,17)
            WHEN 17 THEN p_msg_arrondissement IN (8,9,16,18)
            WHEN 18 THEN p_msg_arrondissement IN (9,10,17,19)
            WHEN 19 THEN p_msg_arrondissement IN (10,11,18,20)
            WHEN 20 THEN p_msg_arrondissement IN (11,12,19)
            ELSE FALSE
        END
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE POLICY "Allow neighborhood visibility" ON public.app_messages
    FOR SELECT USING (
        channel_type = 'neighborhood' AND public.can_view_neighborhood_message(arrondissement_id)
    );

-- 3c. Governance Policy: Admins, Elus, Coordinators
CREATE POLICY "Allow Governance visibility" ON public.app_messages
    FOR SELECT USING (
        channel_type = 'governance' AND EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.jwt() ->> 'sub' 
            AND role_label IN ('admin', 'super-admin', 'elu', 'coordinateur')
        )
    );

-- 3d. Executive Policy: Admins only
CREATE POLICY "Allow Executive visibility" ON public.app_messages
    FOR SELECT USING (
        channel_type = 'executive' AND EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.jwt() ->> 'sub' 
            AND role_label IN ('admin', 'super-admin')
        )
    );

-- 3e. Insert Policy
CREATE POLICY "Allow authenticated insert" ON public.app_messages
    FOR INSERT WITH CHECK (sender_id = auth.jwt() ->> 'sub');

-- 4. Automatic Pruning Procedure
CREATE OR REPLACE FUNCTION public.prune_old_messages()
RETURNS VOID AS $$
BEGIN
    -- Remove attachments older than 1 month
    -- (The actual files in Storage must be removed via a worker, here we nullify the pointers)
    UPDATE public.app_messages
    SET attachment_url = NULL, attachment_type = NULL
    WHERE attachment_url IS NOT NULL
      AND created_at < now() - INTERVAL '1 month';

    -- Remove messages older than 6 months
    DELETE FROM public.app_messages
    WHERE created_at < now() - INTERVAL '6 months';
END;
$$ LANGUAGE plpgsql;

-- 5. Storage policies (assuming 'chat-attachments' bucket exists)
-- This logic will be applied in the Supabase UI or via CLI but here is the RLS intent:
-- Policy: "Allow upload < 2MB for authenticated"
-- Policy: "Allow view if message visible via RLS" (handled by app logic typically)
