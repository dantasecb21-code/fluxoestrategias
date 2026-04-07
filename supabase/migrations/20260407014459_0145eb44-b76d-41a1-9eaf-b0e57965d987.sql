
-- Add new text column for store creation status
ALTER TABLE public.store_requests ADD COLUMN store_creation_status text NOT NULL DEFAULT 'pending';

-- Migrate existing data
UPDATE public.store_requests SET store_creation_status = CASE WHEN store_created = true THEN 'created' ELSE 'pending' END;

-- Drop old boolean column
ALTER TABLE public.store_requests DROP COLUMN store_created;
