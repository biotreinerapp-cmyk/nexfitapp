-- Table to track highlight/banner purchase requests from store owners
CREATE TABLE public.highlight_purchase_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.marketplace_stores(id) ON DELETE CASCADE,
  offer_id UUID NOT NULL REFERENCES public.highlight_offers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  amount_cents INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  receipt_path TEXT,
  pix_payload TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  processed_by UUID,
  rejection_reason TEXT
);

-- Enable RLS
ALTER TABLE public.highlight_purchase_requests ENABLE ROW LEVEL SECURITY;

-- Store owners can view and create their own requests
CREATE POLICY "Store owners can view own highlight requests"
ON public.highlight_purchase_requests
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Store owners can create highlight requests"
ON public.highlight_purchase_requests
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Admins can manage all
CREATE POLICY "Admins manage highlight requests"
ON public.highlight_purchase_requests
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR ((auth.jwt() ->> 'email'::text) = 'biotreinerapp@gmail.com'::text))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR ((auth.jwt() ->> 'email'::text) = 'biotreinerapp@gmail.com'::text));
