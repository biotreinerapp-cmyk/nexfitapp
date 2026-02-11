-- Grant explicit table privileges so RLS policies can take effect
GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE public.running_club_activities
TO authenticated;