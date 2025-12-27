-- Add UNIQUE constraint on (user_id, provider) for calendar_connections
-- This allows upsert operations to work correctly
ALTER TABLE public.calendar_connections
ADD CONSTRAINT calendar_connections_user_provider_unique
UNIQUE (user_id, provider);