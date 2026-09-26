-- Chat applies the 8 MiB business limit at the Storage boundary as well as in the UI/API.
-- Keep uploads browser -> Supabase Storage; do not proxy file bytes through Vercel.
update storage.buckets
set file_size_limit = 8 * 1024 * 1024
where id = 'chat-attachments';
