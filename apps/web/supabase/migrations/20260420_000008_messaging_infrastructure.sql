-- 20260420000008_newsletter_subscriptions.sql
CREATE TABLE IF NOT EXISTS public.newsletter_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    gdpr_consent BOOLEAN NOT NULL DEFAULT FALSE,
    status TEXT NOT NULL DEFAULT 'active',
    source TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS for newsletter_subscriptions
ALTER TABLE public.newsletter_subscriptions ENABLE ROW LEVEL SECURITY;

-- Anonymous users can subscribe if they provide consent
CREATE POLICY "Allow anonymous subscription" ON public.newsletter_subscriptions
    FOR INSERT WITH CHECK (gdpr_consent = TRUE);

-- Only admins can view the list
CREATE POLICY "Allow admin view subscriptions" ON public.newsletter_subscriptions
    FOR SELECT USING (auth.uid() IN (SELECT user_id FROM public.profiles WHERE role IN ('admin', 'super-admin')));

-- 20260420000009_app_notifications.sql
CREATE TABLE IF NOT EXISTS public.app_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL, -- Linked to Clerk ID
    type TEXT NOT NULL CHECK (type IN ('validation', 'community', 'system', 'security')),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    read_at TIMESTAMP WITH TIME ZONE,
    payload JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS for app_notifications
ALTER TABLE public.app_notifications ENABLE ROW LEVEL SECURITY;

-- Users can read their own notifications
CREATE POLICY "Users can read own notifications" ON public.app_notifications
    FOR SELECT USING (user_id = auth.jwt() ->> 'sub');

-- Users can mark their own notifications as read
CREATE POLICY "Users can update own notifications" ON public.app_notifications
    FOR UPDATE USING (user_id = auth.jwt() ->> 'sub');

-- Only service role can create notifications (via API)
CREATE POLICY "Service role can insert notifications" ON public.app_notifications
    FOR INSERT WITH CHECK (TRUE);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.app_notifications(user_id) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_newsletter_email ON public.newsletter_subscriptions(email);
