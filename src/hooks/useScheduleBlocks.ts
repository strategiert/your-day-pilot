import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ScheduleBlock, BlockType, BlockStatus } from '@/types';

export function useScheduleBlocks(startDate?: Date, endDate?: Date) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: blocks = [], isLoading, error } = useQuery({
    queryKey: ['schedule_blocks', user?.id, startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async () => {
      if (!user) return [];
      
      let query = supabase
        .from('schedule_blocks')
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
      
      if (error) throw error;
      return data as ScheduleBlock[];
    },
    enabled: !!user,
  });

  const createBlock = useMutation({
    mutationFn: async (block: {
      block_type: BlockType;
      ref_id?: string;
      title: string;
      start_ts: string;
      end_ts: string;
      status?: BlockStatus;
      explanation?: string;
    }) => {
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('schedule_blocks')
        .insert({ ...block, user_id: user.id })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule_blocks'] });
    },
  });

  const updateBlock = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ScheduleBlock> & { id: string }) => {
      const { data, error } = await supabase
        .from('schedule_blocks')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule_blocks'] });
    },
  });

  const deleteBlock = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('schedule_blocks')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule_blocks'] });
    },
  });

  const clearBlocks = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('schedule_blocks')
        .delete()
        .eq('user_id', user.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule_blocks'] });
    },
  });

  return {
    blocks,
    isLoading,
    error,
    createBlock: createBlock.mutate,
    updateBlock: updateBlock.mutate,
    deleteBlock: deleteBlock.mutate,
    clearBlocks: clearBlocks.mutate,
    isCreating: createBlock.isPending,
    isUpdating: updateBlock.isPending,
    isDeleting: deleteBlock.isPending,
  };
}
