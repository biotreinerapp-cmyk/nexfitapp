-- Phase 2: Professional Flow Upgrade

-- 1. Update professionals table for balance and LP activation strategy
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS balance DECIMAL(10,2) DEFAULT 0.00;
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS lp_correction_count INTEGER DEFAULT 0;
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS lp_activated BOOLEAN DEFAULT FALSE;

-- 2. Update professional_landing_pages to track corrections
ALTER TABLE professional_landing_pages ADD COLUMN IF NOT EXISTS correction_count INTEGER DEFAULT 0;

-- 3. Create professional_withdrawals table
CREATE TABLE IF NOT EXISTS professional_withdrawals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    professional_id UUID NOT NULL REFERENCES professionals(id),
    amount DECIMAL(10,2) NOT NULL,
    fee_percent INTEGER NOT NULL, -- 5 or 8
    fee_amount DECIMAL(10,2) NOT NULL,
    net_amount DECIMAL(10,2) NOT NULL,
    pix_key TEXT NOT NULL,
    pix_type TEXT NOT NULL,
    status TEXT DEFAULT 'pending', -- pending, paid, rejected
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE
);

-- 4. Update professional_hires to track payments and fees
ALTER TABLE professional_hires ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(10,2);
ALTER TABLE professional_hires ADD COLUMN IF NOT EXISTS platform_fee DECIMAL(10,2); -- 15%
ALTER TABLE professional_hires ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT FALSE;
ALTER TABLE professional_hires ADD COLUMN IF NOT EXISTS pix_id TEXT;
ALTER TABLE professional_hires ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending';

-- Enable Row Level Security (RLS)
ALTER TABLE professional_withdrawals ENABLE ROW LEVEL SECURITY;

-- Policies for professional_withdrawals
CREATE POLICY "Professionals can view their own withdrawals" 
ON professional_withdrawals FOR SELECT 
USING (auth.uid() IN (SELECT user_id FROM professionals WHERE id = professional_id));

CREATE POLICY "Professionals can request withdrawals" 
ON professional_withdrawals FOR INSERT 
WITH CHECK (auth.uid() IN (SELECT user_id FROM professionals WHERE id = professional_id));

CREATE POLICY "Admins can manage all withdrawals" 
ON professional_withdrawals FOR ALL 
USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'));
