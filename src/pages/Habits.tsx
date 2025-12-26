import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useHabits } from '@/hooks/useHabits';
import { useAuth } from '@/contexts/AuthContext';
import { Habit } from '@/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { 
  Plus, 
  Repeat, 
  Clock, 
  Shield, 
  MoreHorizontal, 
  Trash2, 
  Edit2, 
  Loader2,
  Palette 
} from 'lucide-react';
import { toast } from 'sonner';
import { Navigate } from 'react-router-dom';

const COLORS = [
  '#8b5cf6', // Purple
  '#06b6d4', // Cyan
  '#10b981', // Green
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#ec4899', // Pink
  '#6366f1', // Indigo
  '#14b8a6', // Teal
];

const RECURRENCE_OPTIONS = [
  { value: 'FREQ=DAILY', label: 'Every day' },
  { value: 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR', label: 'Weekdays' },
  { value: 'FREQ=WEEKLY;BYDAY=SA,SU', label: 'Weekends' },
  { value: 'FREQ=WEEKLY;BYDAY=MO,WE,FR', label: 'Mon, Wed, Fri' },
  { value: 'FREQ=WEEKLY;BYDAY=TU,TH', label: 'Tue, Thu' },
  { value: 'FREQ=WEEKLY', label: 'Once a week' },
];

interface HabitFormData {
  name: string;
  start_time: string;
  duration_min: number;
  recurrence_rrule: string;
  protected: boolean;
  color: string;
}

function HabitCard({ 
  habit, 
  onEdit, 
  onDelete 
}: { 
  habit: Habit; 
  onEdit: (habit: Habit) => void;
  onDelete: (id: string) => void;
}) {
  const recurrenceLabel = RECURRENCE_OPTIONS.find(o => o.value === habit.recurrence_rrule)?.label || 'Custom';

  return (
    <div className="group p-5 rounded-xl bg-card border border-border hover:border-primary/50 transition-all duration-200">
      <div className="flex items-start gap-4">
        <div 
          className="w-3 h-full min-h-[60px] rounded-full shrink-0"
          style={{ backgroundColor: habit.color }}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-semibold text-lg">{habit.name}</h3>
            {habit.protected && (
              <Shield className="w-4 h-4 text-primary" />
            )}
          </div>
          
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              <span>{habit.start_time.slice(0, 5)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span>{habit.duration_min} min</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Repeat className="w-4 h-4" />
              <span>{recurrenceLabel}</span>
            </div>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(habit)}>
              <Edit2 className="w-4 h-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDelete(habit.id)} className="text-destructive">
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

export default function HabitsPage() {
  const { user, loading: authLoading } = useAuth();
  const { habits, isLoading, createHabit, updateHabit, deleteHabit, isCreating, isUpdating } = useHabits();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [formData, setFormData] = useState<HabitFormData>({
    name: '',
    start_time: '09:00',
    duration_min: 30,
    recurrence_rrule: 'FREQ=DAILY',
    protected: true,
    color: COLORS[0],
  });

  const resetForm = () => {
    setFormData({
      name: '',
      start_time: '09:00',
      duration_min: 30,
      recurrence_rrule: 'FREQ=DAILY',
      protected: true,
      color: COLORS[0],
    });
    setEditingHabit(null);
  };

  const handleEdit = (habit: Habit) => {
    setEditingHabit(habit);
    setFormData({
      name: habit.name,
      start_time: habit.start_time,
      duration_min: habit.duration_min,
      recurrence_rrule: habit.recurrence_rrule,
      protected: habit.protected,
      color: habit.color,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingHabit) {
      updateHabit({ id: editingHabit.id, ...formData }, {
        onSuccess: () => {
          toast.success('Habit updated!');
          setIsDialogOpen(false);
          resetForm();
        },
        onError: () => toast.error('Failed to update habit'),
      });
    } else {
      createHabit(formData, {
        onSuccess: () => {
          toast.success('Habit created!');
          setIsDialogOpen(false);
          resetForm();
        },
        onError: () => toast.error('Failed to create habit'),
      });
    }
  };

  const handleDelete = (id: string) => {
    deleteHabit(id, {
      onSuccess: () => toast.success('Habit deleted'),
      onError: () => toast.error('Failed to delete habit'),
    });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Habits</h1>
            <p className="text-muted-foreground">Recurring time blocks for your routines</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Habit
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingHabit ? 'Edit Habit' : 'Create New Habit'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Morning meditation"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Time</Label>
                    <Input
                      type="time"
                      value={formData.start_time}
                      onChange={(e) => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Duration (minutes)</Label>
                    <Input
                      type="number"
                      value={formData.duration_min}
                      onChange={(e) => setFormData(prev => ({ ...prev, duration_min: parseInt(e.target.value) || 30 }))}
                      min={5}
                      max={240}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Recurrence</Label>
                  <Select
                    value={formData.recurrence_rrule}
                    onValueChange={(v) => setFormData(prev => ({ ...prev, recurrence_rrule: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RECURRENCE_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Color</Label>
                  <div className="flex gap-2">
                    {COLORS.map(color => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, color }))}
                        className={cn(
                          'w-8 h-8 rounded-full transition-all',
                          formData.color === color && 'ring-2 ring-offset-2 ring-offset-background ring-primary'
                        )}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                  <div>
                    <Label>Protected</Label>
                    <p className="text-xs text-muted-foreground">Won't be overridden by task scheduling</p>
                  </div>
                  <Switch
                    checked={formData.protected}
                    onCheckedChange={(c) => setFormData(prev => ({ ...prev, protected: c }))}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={isCreating || isUpdating}>
                  {(isCreating || isUpdating) ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    editingHabit ? 'Update Habit' : 'Create Habit'
                  )}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : habits.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
              <Repeat className="w-8 h-8 text-accent" />
            </div>
            <h3 className="text-lg font-medium mb-2">No habits yet</h3>
            <p className="text-muted-foreground mb-4">Create recurring time blocks for routines</p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Habit
            </Button>
          </div>
        ) : (
          <div className="grid gap-4">
            {habits.map(habit => (
              <HabitCard
                key={habit.id}
                habit={habit}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
