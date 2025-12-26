import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TaskPriority, EnergyLevel, TimeWindow } from '@/types';

export interface ParsedTask {
  title: string;
  due_ts?: string;
  est_min?: number;
  priority?: TaskPriority;
  energy?: EnergyLevel;
  preferred_window?: TimeWindow;
  hard_deadline?: boolean;
}

export function useTaskParser() {
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parseTask = async (input: string): Promise<ParsedTask | null> => {
    if (!input.trim()) return null;
    
    setIsParsing(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('parse-task', {
        body: { input }
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      return data.parsed as ParsedTask;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to parse task';
      setError(message);
      return null;
    } finally {
      setIsParsing(false);
    }
  };

  return {
    parseTask,
    isParsing,
    error,
    clearError: () => setError(null),
  };
}
