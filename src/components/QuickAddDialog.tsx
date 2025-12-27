import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles } from 'lucide-react';
import { useTaskParser } from '@/hooks/useTaskParser';
import { useTasks } from '@/hooks/useTasks';
import { toast } from 'sonner';

interface QuickAddDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuickAddDialog({ open, onOpenChange }: QuickAddDialogProps) {
  const [input, setInput] = useState('');
  const { parseTask, isParsing } = useTaskParser();
  const { createTask } = useTasks();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!input.trim()) {
      toast.error('Please enter a task');
      return;
    }

    try {
      // Parse natural language input
      const parsed = await parseTask(input);

      if (!parsed) {
        toast.error('Failed to parse task');
        return;
      }

      // Create task with parsed data
      await createTask.mutateAsync({
        title: parsed.title,
        priority: parsed.priority || 'p3',
        due_ts: parsed.due_ts,
        est_min: parsed.est_min || 60,
        min_chunk_min: 15,
        energy: parsed.energy || 'medium',
        preferred_window: parsed.preferred_window || 'any',
        hard_deadline: parsed.hard_deadline || false,
        status: 'backlog',
      });

      toast.success('Task created!');
      setInput('');
      onOpenChange(false);
    } catch (err) {
      toast.error('Failed to create task');
      console.error('Quick add error:', err);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Quick Add Task
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Input
              placeholder="e.g., 'Write blog post by Friday, 2h, high priority'"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isParsing || createTask.isPending}
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              AI will parse dates, times, duration, and priority from natural language
            </p>
          </div>
          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isParsing || createTask.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isParsing || createTask.isPending || !input.trim()}
            >
              {isParsing || createTask.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  {isParsing ? 'Parsing...' : 'Creating...'}
                </>
              ) : (
                'Create Task'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
