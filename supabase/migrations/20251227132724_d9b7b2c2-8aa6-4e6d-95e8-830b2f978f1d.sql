-- Add UNIQUE constraint on (user_id, external_id) for events table
-- This allows upsert operations to work correctly for Google Calendar sync
ALTER TABLE public.events
ADD CONSTRAINT events_user_external_id_unique
UNIQUE (user_id, external_id);