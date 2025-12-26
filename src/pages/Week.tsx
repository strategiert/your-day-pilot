import { AppLayout } from '@/components/layout/AppLayout';
import { WeekCalendar } from '@/components/calendar/WeekCalendar';
import { TaskList } from '@/components/tasks/TaskList';
import { WeeklySummaryDialog } from '@/components/WeeklySummaryDialog';
import { useScheduler } from '@/hooks/useScheduler';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2 } from 'lucide-react';
import { Navigate } from 'react-router-dom';

export default function WeekPage() {
  const { user, loading: authLoading } = useAuth();
  const { profile, isLoading: profileLoading } = useProfile();
  const { schedule, isScheduling } = useScheduler();

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

  return (
    <AppLayout>
      <div className="h-screen flex flex-col">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h1 className="text-2xl font-bold">Week View</h1>
            <p className="text-sm text-muted-foreground">Plan and optimize your week</p>
          </div>
          <div className="flex items-center gap-3">
            <WeeklySummaryDialog />
            <Button
              variant="glow"
              onClick={() => schedule()}
              disabled={isScheduling}
            >
              {isScheduling ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Sparkles className="w-4 h-4 mr-2" />
              )}
              Auto-plan Week
            </Button>
          </div>
        </header>

        {/* Main content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Calendar */}
          <div className="flex-1 overflow-hidden">
            <WeekCalendar />
          </div>

          {/* Task panel */}
          <div className="w-96 border-l border-border overflow-auto p-4 bg-card/50">
            <TaskList />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
