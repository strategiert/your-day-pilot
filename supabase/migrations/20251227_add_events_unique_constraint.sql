-- Add UNIQUE constraint on (user_id, external_id) for events table (if not exists)
-- This allows upsert operations to work correctly for Google Calendar sync
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'events_user_external_id_unique'
  ) THEN
    ALTER TABLE public.events
    ADD CONSTRAINT events_user_external_id_unique
    UNIQUE (user_id, external_id);
  END IF;
END $$;
