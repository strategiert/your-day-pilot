import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { CalendarEvent } from '@/types';

export function useEvents(startDate?: Date, endDate?: Date) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: events = [], isLoading, error } = useQuery({
    queryKey: ['events', user?.id, startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async () => {
      if (!user) return [];

      console.log('[useEvents] Loading events for user:', user.id);
      console.log('[useEvents] Date range:', startDate?.toISOString(), 'to', endDate?.toISOString());

      let query = supabase
        .from('events')
        .select('*')
        .eq('user_id', user.id)
        .order('start_ts', { ascending: true });

      if (startDate) {
        query = query.gte('start_ts', startDate.toISOString());
      }
      if (endDate) {
        query = query.lte('end_ts', endDate.toISOString());
      }

      const { data, error } = await query;

      if (error) {
        console.error('[useEvents] Query failed:', error);
        throw error;
      }

      console.log('[useEvents] Loaded', data?.length || 0, 'events');
      if (data && data.length > 0) {
        console.log('[useEvents] First event:', data[0].title, 'at', data[0].start_ts);
        console.log('[useEvents] Last event:', data[data.length - 1].title, 'at', data[data.length - 1].start_ts);
      }

      return data as CalendarEvent[];
    },
    enabled: !!user,
  });

  const createEvent = useMutation({
    mutationFn: async (event: {
      title: string;
      description?: string;
      start_ts: string;
      end_ts: string;
      is_busy?: boolean;
      source?: string;
    }) => {
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('events')
        .insert({ ...event, user_id: user.id })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });

  const updateEvent = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CalendarEvent> & { id: string }) => {
      const { data, error } = await supabase
        .from('events')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });

  const deleteEvent = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });

  return {
    events,
    isLoading,
    error,
    createEvent: createEvent.mutate,
    updateEvent: updateEvent.mutate,
    deleteEvent: deleteEvent.mutate,
    isCreating: createEvent.isPending,
    isUpdating: updateEvent.isPending,
    isDeleting: deleteEvent.isPending,
  };
}
