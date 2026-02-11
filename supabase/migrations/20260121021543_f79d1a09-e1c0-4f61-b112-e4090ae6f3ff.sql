-- Fix linter WARN: move pg_net extension out of public schema
DO $$
DECLARE
  current_schema text;
BEGIN
  SELECT n.nspname INTO current_schema
  FROM pg_extension e
  JOIN pg_namespace n ON n.oid = e.extnamespace
  WHERE e.extname = 'pg_net';

  IF current_schema = 'public' THEN
    -- Drop & recreate in extensions schema because pg_net doesn't support ALTER EXTENSION ... SET SCHEMA
    EXECUTE 'DROP EXTENSION IF EXISTS pg_net';
    EXECUTE 'CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions';
  END IF;
END $$;