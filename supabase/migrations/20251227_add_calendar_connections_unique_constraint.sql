-- Add unique constraint for calendar_connections
ALTER TABLE public.calendar_connections
ADD CONSTRAINT calendar_connections_user_provider_unique
UNIQUE (user_id, provider);
