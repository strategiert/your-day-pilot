import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useTasks } from '@/hooks/useTasks';
import { useHabits } from '@/hooks/useHabits';
import { useProfile } from '@/hooks/useProfile';
import { useScheduleBlocks } from '@/hooks/useScheduleBlocks';
import { useEvents } from '@/hooks/useEvents';
import { Task, Habit, WorkingHours, ScheduleBlock, BlockType } from '@/types';
import { 
  addMinutes, 
  startOfWeek, 
  addDays, 
  setHours, 
  setMinutes, 
  isAfter, 
  isBefore, 
  parseISO,
  format,
  addWeeks,
  isSameDay
} from 'date-fns';
import { toast } from 'sonner';

interface TimeSlot {
  start: Date;
  end: Date;
}

function parseTime(timeStr: string): { hours: number; minutes: number } {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return { hours, minutes };
}

function getWorkingSlots(date: Date, workingHours: WorkingHours): TimeSlot | null {
  const dayName = format(date, 'EEEE').toLowerCase() as keyof WorkingHours;
  const dayHours = workingHours[dayName];
  
  if (!dayHours) return null;
  
  const start = parseTime(dayHours.start);
  const end = parseTime(dayHours.end);
  
  return {
    start: setMinutes(setHours(date, start.hours), start.minutes),
    end: setMinutes(setHours(date, end.hours), end.minutes),
  };
}

function getAvailableSlots(
  dayStart: Date,
  workingSlot: TimeSlot,
  busyBlocks: { start: Date; end: Date }[],
  bufferMin: number
): TimeSlot[] {
  const slots: TimeSlot[] = [];
  let currentStart = workingSlot.start;
  
  // Sort busy blocks by start time
  const sortedBusy = [...busyBlocks].sort((a, b) => a.start.getTime() - b.start.getTime());
  
  for (const busy of sortedBusy) {
    if (isAfter(busy.start, currentStart) && isBefore(currentStart, workingSlot.end)) {
      const slotEnd = isBefore(busy.start, workingSlot.end) ? busy.start : workingSlot.end;
      if (isAfter(slotEnd, currentStart)) {
        slots.push({ start: currentStart, end: slotEnd });
      }
    }
    currentStart = addMinutes(busy.end, bufferMin);
  }
  
  // Add remaining time after last busy block
  if (isBefore(currentStart, workingSlot.end)) {
    slots.push({ start: currentStart, end: workingSlot.end });
  }
  
  return slots;
}

function priorityScore(task: Task): number {
  const priorityMap = { p1: 100, p2: 75, p3: 50, p4: 25 };
  let score = priorityMap[task.priority];
  
  // Hard deadline bonus
  if (task.hard_deadline) score += 50;
  
  // Due date urgency
  if (task.due_ts) {
    const daysUntilDue = Math.max(0, (parseISO(task.due_ts).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    score += Math.max(0, 30 - daysUntilDue * 5);
  }
  
  return score;
}

function windowScore(task: Task, slotStart: Date): number {
  const hour = slotStart.getHours();
  const windowMap = {
    morning: hour >= 6 && hour < 12 ? 20 : 0,
    afternoon: hour >= 12 && hour < 17 ? 20 : 0,
    evening: hour >= 17 && hour < 22 ? 20 : 0,
    any: 10,
  };
  return windowMap[task.preferred_window];
}

export function useScheduler() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { tasks } = useTasks();
  const { habits } = useHabits();
  const { profile } = useProfile();
  const { blocks, clearBlocks } = useScheduleBlocks();
  const { events } = useEvents();

  const scheduleMutation = useMutation({
    mutationFn: async () => {
      if (!user || !profile) throw new Error('Not authenticated');
      
      const workingHours = profile.working_hours_json;
      const focusLength = profile.focus_length_min;
      const bufferMin = profile.buffer_min;
      
      // Clear existing scheduled blocks
      await supabase
        .from('schedule_blocks')
        .delete()
        .eq('user_id', user.id);
      
      const newBlocks: Omit<ScheduleBlock, 'id' | 'created_at' | 'updated_at'>[] = [];
      
      // Schedule for next 7 days
      const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
      
      // First, create habit blocks
      for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        const day = addDays(weekStart, dayOffset);
        
        for (const habit of habits) {
          const { hours, minutes } = parseTime(habit.start_time);
          const habitStart = setMinutes(setHours(day, hours), minutes);
          const habitEnd = addMinutes(habitStart, habit.duration_min);
          
          newBlocks.push({
            user_id: user.id,
            block_type: 'habit',
            ref_id: habit.id,
            title: habit.name,
            start_ts: habitStart.toISOString(),
            end_ts: habitEnd.toISOString(),
            status: 'scheduled',
            explanation: habit.protected 
              ? 'Protected recurring habit - scheduled at fixed time'
              : 'Recurring habit block',
          });
        }
      }
      
      // Don't add events to schedule_blocks - they stay in events table
      // Instead, treat them as busy time when scheduling tasks

      // Sort tasks by priority
      const unscheduledTasks = tasks
        .filter(t => t.status === 'backlog')
        .sort((a, b) => priorityScore(b) - priorityScore(a));

      // Schedule tasks
      for (const task of unscheduledTasks) {
        let remainingMinutes = task.est_min;

        for (let dayOffset = 0; dayOffset < 7 && remainingMinutes > 0; dayOffset++) {
          const day = addDays(weekStart, dayOffset);
          const workingSlot = getWorkingSlots(day, workingHours);

          if (!workingSlot) continue;

          // Get busy times for this day - include both schedule blocks AND events
          const dayBusy = [
            // Already scheduled blocks (habits, tasks)
            ...newBlocks
              .filter(b => isSameDay(parseISO(b.start_ts), day))
              .map(b => ({ start: parseISO(b.start_ts), end: parseISO(b.end_ts) })),
            // FIXED: Add events as busy blocks (they should not be moved)
            ...events
              .filter(e => isSameDay(parseISO(e.start_ts), day))
              .map(e => ({ start: parseISO(e.start_ts), end: parseISO(e.end_ts) }))
          ];
          
          const availableSlots = getAvailableSlots(day, workingSlot, dayBusy, bufferMin);
          
          for (const slot of availableSlots) {
            if (remainingMinutes <= 0) break;
            
            const slotDuration = (slot.end.getTime() - slot.start.getTime()) / (1000 * 60);
            const chunkDuration = Math.min(
              remainingMinutes,
              Math.min(slotDuration, focusLength),
            );
            
            if (chunkDuration < task.min_chunk_min) continue;
            
            const blockEnd = addMinutes(slot.start, chunkDuration);
            
            const explanation = [
              `Priority: ${task.priority.toUpperCase()}`,
              task.hard_deadline ? 'Hard deadline task' : null,
              task.due_ts ? `Due: ${format(parseISO(task.due_ts), 'MMM d')}` : null,
              windowScore(task, slot.start) > 10 ? `Matched preferred ${task.preferred_window} window` : null,
            ].filter(Boolean).join(' • ');
            
            newBlocks.push({
              user_id: user.id,
              block_type: 'task',
              ref_id: task.id,
              title: task.title,
              start_ts: slot.start.toISOString(),
              end_ts: blockEnd.toISOString(),
              status: 'scheduled',
              explanation,
            });
            
            remainingMinutes -= chunkDuration;
            
            // Update slot start for next iteration
            slot.start = addMinutes(blockEnd, bufferMin);
          }
        }
      }
      
      // Insert all blocks
      if (newBlocks.length > 0) {
        const { error } = await supabase
          .from('schedule_blocks')
          .insert(newBlocks);
        
        if (error) throw error;
      }
      
      // Update task statuses
      for (const task of unscheduledTasks) {
        const taskBlocks = newBlocks.filter(b => b.ref_id === task.id);
        if (taskBlocks.length > 0) {
          await supabase
            .from('tasks')
            .update({ status: 'scheduled' })
            .eq('id', task.id);
        }
      }
      
      return newBlocks.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['schedule_blocks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success(`Scheduled ${count} blocks for the week!`);
    },
    onError: (error) => {
      toast.error('Failed to generate schedule');
      console.error('Scheduling error:', error);
    },
  });

  return {
    schedule: scheduleMutation.mutate,
    isScheduling: scheduleMutation.isPending,
  };
}
