-- Add unique constraint for calendar_connections (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'calendar_connections_user_provider_unique'
  ) THEN
    ALTER TABLE public.calendar_connections
    ADD CONSTRAINT calendar_connections_user_provider_unique
    UNIQUE (user_id, provider);
  END IF;
END $$;
