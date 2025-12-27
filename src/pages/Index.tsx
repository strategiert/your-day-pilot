import { AppLayout } from '@/components/layout/AppLayout';
import { TaskList } from '@/components/tasks/TaskList';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { useTasks } from '@/hooks/useTasks';
import { useScheduleBlocks } from '@/hooks/useScheduleBlocks';
import { useEvents } from '@/hooks/useEvents';
import { Button } from '@/components/ui/button';
import { Loader2, Zap, Calendar, CheckCircle2, Clock, ArrowRight, Lock } from 'lucide-react';
import { Navigate, useNavigate } from 'react-router-dom';
import { startOfDay, endOfDay, format, parseISO } from 'date-fns';

export default function Index() {
  const { user, loading: authLoading } = useAuth();
  const { profile, isLoading: profileLoading } = useProfile();
  const { tasks } = useTasks();
  const navigate = useNavigate();

  const today = new Date();
  const { blocks } = useScheduleBlocks(startOfDay(today), endOfDay(today));
  const { events } = useEvents(startOfDay(today), endOfDay(today));

  // Combine schedule blocks and events
  const allBlocks = [
    ...blocks,
    ...events.map(event => ({
      id: event.id,
      user_id: event.user_id,
      block_type: 'event' as const,
      ref_id: event.external_id || null,
      title: event.title,
      start_ts: event.start_ts,
      end_ts: event.end_ts,
      status: 'scheduled' as const,
      explanation: event.description || null,
      created_at: event.created_at,
      updated_at: event.updated_at,
    }))
  ].sort((a, b) => new Date(a.start_ts).getTime() - new Date(b.start_ts).getTime());

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (profile && !profile.onboarding_completed) {
    return <Navigate to="/onboarding" replace />;
  }

  const todayBlocks = allBlocks; // Show all blocks including events
  const todayTasks = allBlocks.filter(b => b.block_type === 'task');
  const completedToday = todayTasks.filter(b => b.status === 'completed').length;
  const pendingTasks = tasks.filter(t => t.status === 'backlog').length;

  return (
    <AppLayout>
      <div className="p-6 max-w-6xl mx-auto">
        {/* Welcome header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            Good {format(today, 'a') === 'am' ? 'morning' : format(today, 'a') === 'pm' && today.getHours() < 18 ? 'afternoon' : 'evening'}! ✨
          </h1>
          <p className="text-muted-foreground">
            {format(today, 'EEEE, MMMM d, yyyy')}
          </p>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="p-6 rounded-2xl bg-card border border-border">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-primary" />
              </div>
              <span className="text-sm text-muted-foreground">Today's Blocks</span>
            </div>
            <div className="text-3xl font-bold">{todayBlocks.length}</div>
          </div>

          <div className="p-6 rounded-2xl bg-card border border-border">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-neon-green/20 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-neon-green" />
              </div>
              <span className="text-sm text-muted-foreground">Completed</span>
            </div>
            <div className="text-3xl font-bold">{completedToday}</div>
          </div>

          <div className="p-6 rounded-2xl bg-card border border-border">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center">
                <Clock className="w-5 h-5 text-accent" />
              </div>
              <span className="text-sm text-muted-foreground">Pending Tasks</span>
            </div>
            <div className="text-3xl font-bold">{pendingTasks}</div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="flex flex-wrap gap-4 mb-8">
          <Button variant="glow" onClick={() => navigate('/week')}>
            <Zap className="w-4 h-4 mr-2" />
            Open Week Planner
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>

        {/* Today's schedule */}
        {todayBlocks.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Today's Schedule</h2>
            <div className="space-y-2">
              {todayBlocks.map(block => (
                <div
                  key={block.id}
                  className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border hover:border-primary/50 transition-colors"
                >
                  <div className={`w-1 h-12 rounded-full ${
                    block.block_type === 'task' ? 'bg-primary' :
                    block.block_type === 'event' ? 'bg-muted-foreground' :
                    'bg-accent'
                  }`} />
                  <div className="flex-1">
                    <div className="font-medium flex items-center gap-2">
                      {block.title}
                      {block.block_type === 'event' && (
                        <Lock className="w-3 h-3 text-muted-foreground" />
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {format(parseISO(block.start_ts), 'h:mm a')} - {format(parseISO(block.end_ts), 'h:mm a')}
                      {block.block_type === 'event' && <span className="ml-2 text-xs">(Google Calendar - Fixed)</span>}
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${
                    block.status === 'completed' ? 'bg-neon-green/20 text-neon-green' :
                    block.status === 'in_progress' ? 'bg-neon-orange/20 text-neon-orange' :
                    'bg-secondary text-muted-foreground'
                  }`}>
                    {block.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Task list */}
        <TaskList />
      </div>
    </AppLayout>
  );
}
