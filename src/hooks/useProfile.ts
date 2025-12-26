import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Profile, WorkingHours } from '@/types';
import { Json } from '@/integrations/supabase/types';

export function useProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: profile, isLoading, error } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      if (!data) return null;
      
      return {
        ...data,
        working_hours_json: data.working_hours_json as unknown as WorkingHours
      } as Profile;
    },
    enabled: !!user,
  });

  const updateProfile = useMutation({
    mutationFn: async (updates: Partial<Omit<Profile, 'id' | 'user_id' | 'created_at' | 'updated_at'>>) => {
      if (!user) throw new Error('Not authenticated');
      
      const dbUpdates = {
        ...updates,
        working_hours_json: updates.working_hours_json as unknown as Json
      };
      
      const { data, error } = await supabase
        .from('profiles')
        .update(dbUpdates)
        .eq('user_id', user.id)
        .select()
        .single();
      
      if (error) throw error;
      return {
        ...data,
        working_hours_json: data.working_hours_json as unknown as WorkingHours
      } as Profile;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
    },
  });

  return {
    profile,
    isLoading,
    error,
    updateProfile: updateProfile.mutate,
    isUpdating: updateProfile.isPending,
  };
}
