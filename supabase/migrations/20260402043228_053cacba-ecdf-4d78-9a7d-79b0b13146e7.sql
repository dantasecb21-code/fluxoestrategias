
ALTER TABLE public.strategies
ADD COLUMN strategy_type text NOT NULL DEFAULT 'initial';

ALTER TABLE public.strategies
ADD COLUMN observation text NOT NULL DEFAULT '';
