-- Add status and store_access_confirmed to strategies
ALTER TABLE public.strategies 
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'in_progress',
  ADD COLUMN IF NOT EXISTS store_access_confirmed boolean NOT NULL DEFAULT false;