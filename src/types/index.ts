export type TaskPriority = 'p1' | 'p2' | 'p3' | 'p4';
export type TaskStatus = 'backlog' | 'scheduled' | 'in_progress' | 'done' | 'snoozed';
export type EnergyLevel = 'low' | 'medium' | 'high';
export type TimeWindow = 'morning' | 'afternoon' | 'evening' | 'any';
export type BlockType = 'task' | 'habit' | 'event';
export type BlockStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

export interface Profile {
  id: string;
  user_id: string;
  timezone: string;
  working_hours_json: WorkingHours;
  focus_length_min: number;
  buffer_min: number;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkingHours {
  monday: DayHours | null;
  tuesday: DayHours | null;
  wednesday: DayHours | null;
  thursday: DayHours | null;
  friday: DayHours | null;
  saturday: DayHours | null;
  sunday: DayHours | null;
}

export interface DayHours {
  start: string;
  end: string;
}

export interface Project {
  id: string;
  user_id: string;
  name: string;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  user_id: string;
  project_id: string | null;
  title: string;
  description: string | null;
  priority: TaskPriority;
  due_ts: string | null;
  est_min: number;
  min_chunk_min: number;
  energy: EnergyLevel;
  preferred_window: TimeWindow;
  hard_deadline: boolean;
  status: TaskStatus;
  created_at: string;
  updated_at: string;
  project?: Project;
}

export interface Habit {
  id: string;
  user_id: string;
  name: string;
  recurrence_rrule: string;
  start_time: string;
  duration_min: number;
  protected: boolean;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface CalendarEvent {
  id: string;
  user_id: string;
  external_id: string | null;
  source: string;
  title: string;
  description: string | null;
  start_ts: string;
  end_ts: string;
  is_busy: boolean;
  created_at: string;
  updated_at: string;
}

export interface ScheduleBlock {
  id: string;
  user_id: string;
  block_type: BlockType;
  ref_id: string | null;
  title: string;
  start_ts: string;
  end_ts: string;
  status: BlockStatus;
  explanation: string | null;
  created_at: string;
  updated_at: string;
}

export interface CalendarConnection {
  id: string;
  user_id: string;
  provider: string;
  tokens_json: Record<string, unknown> | null;
  status: string;
  created_at: string;
  updated_at: string;
}
