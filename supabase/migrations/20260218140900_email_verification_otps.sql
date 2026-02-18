-- Custom email OTP verification table
-- Used by send-email-otp and verify-email-otp edge functions

CREATE TABLE IF NOT EXISTS public.email_verification_otps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  otp_code text NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '15 minutes'),
  used_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Fast lookup by email + code
CREATE INDEX IF NOT EXISTS idx_email_verification_otps_lookup
  ON public.email_verification_otps (email, otp_code);

-- Expire index for cleanup
CREATE INDEX IF NOT EXISTS idx_email_verification_otps_expires
  ON public.email_verification_otps (expires_at);

-- RLS: only service role can access (edge functions use service role key)
ALTER TABLE public.email_verification_otps ENABLE ROW LEVEL SECURITY;

-- No policies = only service_role bypass can access (correct for edge functions)
