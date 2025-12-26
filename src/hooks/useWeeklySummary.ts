import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface WeeklySummary {
  summary: string;
  highlights: string[];
  patterns: string[];
  suggestions: string[];
  peakProductivityTime: 'morning' | 'afternoon' | 'evening';
  focusScore: number;
  stats: {
    weekRange: string;
    totalScheduledBlocks: number;
    completedBlocks: number;
    cancelledBlocks: number;
    totalFocusHours: number;
    taskBlocksCompleted: number;
    habitBlocksScheduled: number;
    habitCompletionRate: number;
    productivityByTimeOfDay: Record<string, number>;
    tasksCompleted: number;
    tasksInBacklog: number;
    totalHabits: number;
  };
}

export function useWeeklySummary() {
  const [summary, setSummary] = useState<WeeklySummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const generateSummary = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: funcError } = await supabase.functions.invoke('weekly-summary');

      if (funcError) {
        throw new Error(funcError.message);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setSummary(data as WeeklySummary);
      return data as WeeklySummary;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate summary';
      setError(message);
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    summary,
    isLoading,
    error,
    generateSummary,
  };
}
