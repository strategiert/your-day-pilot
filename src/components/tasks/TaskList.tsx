import { useState, useRef, useEffect } from 'react';
import { useTasks } from '@/hooks/useTasks';
import { useProjects } from '@/hooks/useProjects';
import { useTaskParser, ParsedTask } from '@/hooks/useTaskParser';
import { Task, TaskPriority, TaskStatus, EnergyLevel, TimeWindow } from '@/types';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import {
  Plus,
  Flag,
  Clock,
  Zap,
  Sun,
  Moon,
  Sunrise,
  Calendar,
  MoreHorizontal,
  Check,
  Trash2,
  Edit2,
  Loader2,
  Sparkles,
  Send,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

const PRIORITY_COLORS = {
  p1: 'text-priority-p1 bg-priority-p1/20',
  p2: 'text-priority-p2 bg-priority-p2/20',
  p3: 'text-priority-p3 bg-priority-p3/20',
  p4: 'text-priority-p4 bg-priority-p4/20',
};

const ENERGY_ICONS = {
  low: Moon,
  medium: Sun,
  high: Zap,
};

const WINDOW_ICONS = {
  morning: Sunrise,
  afternoon: Sun,
  evening: Moon,
  any: Clock,
};

interface TaskCardProps {
  task: Task;
  onUpdate: (updates: Partial<Task> & { id: string }) => void;
  onDelete: (id: string) => void;
}

function TaskCard({ task, onUpdate, onDelete }: TaskCardProps) {
  const EnergyIcon = ENERGY_ICONS[task.energy];
  const WindowIcon = WINDOW_ICONS[task.preferred_window];

  const handleStatusToggle = () => {
    const newStatus = task.status === 'done' ? 'backlog' : 'done';
    onUpdate({ id: task.id, status: newStatus });
    if (newStatus === 'done') {
      toast.success('Task completed!');
    }
  };

  return (
    <div className={cn(
      'group p-4 rounded-xl bg-card border border-border hover:border-primary/50 transition-all duration-200',
      task.status === 'done' && 'opacity-50'
    )}>
      <div className="flex items-start gap-3">
        <button
          onClick={handleStatusToggle}
          className={cn(
            'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all',
            task.status === 'done'
              ? 'bg-primary border-primary'
              : 'border-muted-foreground hover:border-primary'
          )}
        >
          {task.status === 'done' && <Check className="w-3 h-3 text-primary-foreground" />}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className={cn(
              'font-medium truncate',
              task.status === 'done' && 'line-through'
            )}>
              {task.title}
            </h3>
            <span className={cn('px-1.5 py-0.5 rounded text-xs font-semibold uppercase', PRIORITY_COLORS[task.priority])}>
              {task.priority}
            </span>
          </div>

          {task.description && (
            <p className="text-sm text-muted-foreground truncate mb-2">{task.description}</p>
          )}

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{task.est_min}m</span>
            </div>
            <div className="flex items-center gap-1">
              <EnergyIcon className="w-3 h-3" />
              <span className="capitalize">{task.energy}</span>
            </div>
            <div className="flex items-center gap-1">
              <WindowIcon className="w-3 h-3" />
              <span className="capitalize">{task.preferred_window}</span>
            </div>
            {task.due_ts && (
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>{format(parseISO(task.due_ts), 'MMM d')}</span>
              </div>
            )}
            {task.hard_deadline && (
              <span className="px-1.5 py-0.5 rounded bg-destructive/20 text-destructive text-xs">
                Hard deadline
              </span>
            )}
          </div>

          {task.project && (
            <div className="mt-2 flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: task.project.color }}
              />
              <span className="text-xs text-muted-foreground">{task.project.name}</span>
            </div>
          )}
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
            <DropdownMenuItem onClick={() => onDelete(task.id)} className="text-destructive">
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

interface TaskFormData {
  title: string;
  description: string;
  project_id: string;
  priority: TaskPriority;
  due_ts: string;
  est_min: number;
  min_chunk_min: number;
  energy: EnergyLevel;
  preferred_window: TimeWindow;
  hard_deadline: boolean;
}

export function TaskList() {
  const { tasks, isLoading, createTask, updateTask, deleteTask, isCreating } = useTasks();
  const { projects } = useProjects();
  const { parseTask, isParsing } = useTaskParser();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [quickAddInput, setQuickAddInput] = useState('');
  const quickAddRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState<TaskFormData>({
    title: '',
    description: '',
    project_id: '',
    priority: 'p3',
    due_ts: '',
    est_min: 30,
    min_chunk_min: 15,
    energy: 'medium',
    preferred_window: 'any',
    hard_deadline: false,
  });

  const handleQuickAdd = async () => {
    if (!quickAddInput.trim() || isParsing) return;
    
    const parsed = await parseTask(quickAddInput);
    if (parsed) {
      // Format due_ts for datetime-local input if present
      let formattedDueTs = '';
      if (parsed.due_ts) {
        try {
          const date = new Date(parsed.due_ts);
          formattedDueTs = format(date, "yyyy-MM-dd'T'HH:mm");
        } catch {
          formattedDueTs = '';
        }
      }
      
      setFormData({
        title: parsed.title,
        description: '',
        project_id: '',
        priority: parsed.priority || 'p3',
        due_ts: formattedDueTs,
        est_min: parsed.est_min || 30,
        min_chunk_min: 15,
        energy: parsed.energy || 'medium',
        preferred_window: parsed.preferred_window || 'any',
        hard_deadline: parsed.hard_deadline || false,
      });
      setIsDialogOpen(true);
      setQuickAddInput('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createTask({
      title: formData.title,
      description: formData.description || undefined,
      project_id: formData.project_id && formData.project_id !== 'none' ? formData.project_id : undefined,
      priority: formData.priority,
      due_ts: formData.due_ts || undefined,
      est_min: formData.est_min,
      min_chunk_min: formData.min_chunk_min,
      energy: formData.energy,
      preferred_window: formData.preferred_window,
      hard_deadline: formData.hard_deadline,
    }, {
      onSuccess: () => {
        toast.success('Task created!');
        setIsDialogOpen(false);
        setFormData({
          title: '',
          description: '',
          project_id: '',
          priority: 'p3',
          due_ts: '',
          est_min: 30,
          min_chunk_min: 15,
          energy: 'medium',
          preferred_window: 'any',
          hard_deadline: false,
        });
      },
      onError: () => {
        toast.error('Failed to create task');
      }
    });
  };

  const backlogTasks = tasks.filter(t => t.status === 'backlog');
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress' || t.status === 'scheduled');
  const doneTasks = tasks.filter(t => t.status === 'done');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Quick Add Input */}
      <div className="relative">
        <div className="flex items-center gap-2 p-3 rounded-xl bg-card border border-border focus-within:border-primary/50 transition-colors">
          <Sparkles className="w-5 h-5 text-primary shrink-0" />
          <input
            ref={quickAddRef}
            type="text"
            value={quickAddInput}
            onChange={(e) => setQuickAddInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleQuickAdd();
              }
            }}
            placeholder="Quick add: 'Meeting with John tomorrow at 2pm for 1 hour'"
            className="flex-1 bg-transparent border-none outline-none text-sm placeholder:text-muted-foreground"
            disabled={isParsing}
          />
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleQuickAdd}
            disabled={!quickAddInput.trim() || isParsing}
          >
            {isParsing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-1 ml-1">
          AI will parse dates, times, duration, and priority from natural language
        </p>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Tasks</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Task
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create New Task</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="What needs to be done?"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Add more details..."
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(v) => setFormData(prev => ({ ...prev, priority: v as TaskPriority }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="p1">P1 - Urgent</SelectItem>
                      <SelectItem value="p2">P2 - High</SelectItem>
                      <SelectItem value="p3">P3 - Medium</SelectItem>
                      <SelectItem value="p4">P4 - Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Project</Label>
                  <Select
                    value={formData.project_id}
                    onValueChange={(v) => setFormData(prev => ({ ...prev, project_id: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="No project" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No project</SelectItem>
                      {projects.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Estimated Time (min)</Label>
                  <Input
                    type="number"
                    value={formData.est_min}
                    onChange={(e) => setFormData(prev => ({ ...prev, est_min: parseInt(e.target.value) || 30 }))}
                    min={5}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Min Chunk Size (min)</Label>
                  <Input
                    type="number"
                    value={formData.min_chunk_min}
                    onChange={(e) => setFormData(prev => ({ ...prev, min_chunk_min: parseInt(e.target.value) || 15 }))}
                    min={5}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Energy Level</Label>
                  <Select
                    value={formData.energy}
                    onValueChange={(v) => setFormData(prev => ({ ...prev, energy: v as EnergyLevel }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Preferred Window</Label>
                  <Select
                    value={formData.preferred_window}
                    onValueChange={(v) => setFormData(prev => ({ ...prev, preferred_window: v as TimeWindow }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any time</SelectItem>
                      <SelectItem value="morning">Morning</SelectItem>
                      <SelectItem value="afternoon">Afternoon</SelectItem>
                      <SelectItem value="evening">Evening</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Due Date</Label>
                <Input
                  type="datetime-local"
                  value={formData.due_ts}
                  onChange={(e) => setFormData(prev => ({ ...prev, due_ts: e.target.value }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.hard_deadline}
                    onCheckedChange={(c) => setFormData(prev => ({ ...prev, hard_deadline: c }))}
                  />
                  <Label>Hard deadline (cannot be moved)</Label>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isCreating}>
                {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Task'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Task sections */}
      <div className="space-y-6">
        {inProgressTasks.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              In Progress ({inProgressTasks.length})
            </h3>
            <div className="space-y-2">
              {inProgressTasks.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onUpdate={updateTask}
                  onDelete={deleteTask}
                />
              ))}
            </div>
          </div>
        )}

        {backlogTasks.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Backlog ({backlogTasks.length})
            </h3>
            <div className="space-y-2">
              {backlogTasks.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onUpdate={updateTask}
                  onDelete={deleteTask}
                />
              ))}
            </div>
          </div>
        )}

        {doneTasks.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Done ({doneTasks.length})
            </h3>
            <div className="space-y-2">
              {doneTasks.slice(0, 5).map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onUpdate={updateTask}
                  onDelete={deleteTask}
                />
              ))}
            </div>
          </div>
        )}

        {tasks.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Flag className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-medium mb-2">No tasks yet</h3>
            <p className="text-muted-foreground mb-4">Create your first task to get started</p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Task
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
