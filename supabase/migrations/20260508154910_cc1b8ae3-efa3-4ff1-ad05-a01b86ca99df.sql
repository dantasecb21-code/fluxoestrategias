ALTER TABLE public.strategies ADD COLUMN IF NOT EXISTS admin_approved boolean NOT NULL DEFAULT false;
-- Marcar estratégias já existentes (em andamento/aprovadas/aguardando) como já aprovadas pelo admin para não quebrar fluxo atual
UPDATE public.strategies SET admin_approved = true WHERE admin_approved = false;