
-- Add soft delete column
ALTER TABLE public.strategies ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Create index for filtering
CREATE INDEX idx_strategies_deleted_at ON public.strategies (deleted_at);
