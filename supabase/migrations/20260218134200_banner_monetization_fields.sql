-- Add monetization fields to dashboard_outdoors (banner management)
ALTER TABLE public.dashboard_outdoors
  ADD COLUMN IF NOT EXISTS title text null,
  ADD COLUMN IF NOT EXISTS advertiser_name text null,
  ADD COLUMN IF NOT EXISTS advertiser_contact text null,
  ADD COLUMN IF NOT EXISTS price_paid numeric(10,2) null,
  ADD COLUMN IF NOT EXISTS payment_status text null default 'pending'
    check (payment_status in ('pending', 'paid', 'free', 'barter')),
  ADD COLUMN IF NOT EXISTS notes text null,
  ADD COLUMN IF NOT EXISTS display_order integer not null default 0;

-- Index for ordering
CREATE INDEX IF NOT EXISTS idx_dashboard_outdoors_order
  ON public.dashboard_outdoors (display_order, starts_at desc);
