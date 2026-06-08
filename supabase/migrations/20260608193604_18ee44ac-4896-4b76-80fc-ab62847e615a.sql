DROP POLICY IF EXISTS "Assistants view own base_strategy_requests" ON public.base_strategy_requests;

CREATE POLICY "Assistants view all base_strategy_requests" 
ON public.base_strategy_requests 
FOR SELECT 
TO authenticated 
USING (has_role(auth.uid(), 'strategic_assistant'::app_role));