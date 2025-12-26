import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useProjects } from '@/hooks/useProjects';
import { useTasks } from '@/hooks/useTasks';
import { useAuth } from '@/contexts/AuthContext';
import { Project, Task } from '@/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  FolderKanban, 
  MoreHorizontal, 
  Trash2, 
  Edit2, 
  Loader2,
  CheckCircle2,
  Circle,
  Clock
} from 'lucide-react';
import { toast } from 'sonner';
import { Navigate } from 'react-router-dom';

const COLORS = [
  '#06b6d4', // Cyan
  '#8b5cf6', // Purple
  '#10b981', // Green
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#ec4899', // Pink
  '#6366f1', // Indigo
  '#14b8a6', // Teal
  '#f97316', // Orange
  '#84cc16', // Lime
];

interface ProjectFormData {
  name: string;
  color: string;
}

function ProjectCard({ 
  project, 
  tasks,
  onEdit, 
  onDelete,
  isSelected,
  onSelect 
}: { 
  project: Project; 
  tasks: Task[];
  onEdit: (project: Project) => void;
  onDelete: (id: string) => void;
  isSelected: boolean;
  onSelect: (id: string | null) => void;
}) {
  const completedTasks = tasks.filter(t => t.status === 'done').length;
  const totalTasks = tasks.length;
  const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  return (
    <div 
      onClick={() => onSelect(isSelected ? null : project.id)}
      className={cn(
        "group p-5 rounded-xl bg-card border transition-all duration-200 cursor-pointer",
        isSelected ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/50"
      )}
    >
      <div className="flex items-start gap-4">
        <div 
          className="w-4 h-4 rounded-full shrink-0 mt-1"
          style={{ backgroundColor: project.color }}
        />
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-lg mb-1">{project.name}</h3>
          
          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
            <span>{totalTasks} tasks</span>
            <span>{completedTasks} completed</span>
          </div>

          {/* Progress bar */}
          <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="icon-sm"
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(project); }}>
              <Edit2 className="w-4 h-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(project.id); }} className="text-destructive">
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

function TaskItem({ task }: { task: Task }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30">
      {task.status === 'done' ? (
        <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
      ) : (
        <Circle className="w-4 h-4 text-muted-foreground shrink-0" />
      )}
      <span className={cn("flex-1 truncate", task.status === 'done' && "line-through text-muted-foreground")}>
        {task.title}
      </span>
      <span className={cn(
        'px-1.5 py-0.5 rounded text-xs font-semibold uppercase',
        task.priority === 'p1' && 'bg-priority-p1/20 text-priority-p1',
        task.priority === 'p2' && 'bg-priority-p2/20 text-priority-p2',
        task.priority === 'p3' && 'bg-priority-p3/20 text-priority-p3',
        task.priority === 'p4' && 'bg-priority-p4/20 text-priority-p4',
      )}>
        {task.priority}
      </span>
    </div>
  );
}

export default function ProjectsPage() {
  const { user, loading: authLoading } = useAuth();
  const { projects, isLoading, createProject, updateProject, deleteProject, isCreating, isUpdating } = useProjects();
  const { tasks } = useTasks();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [formData, setFormData] = useState<ProjectFormData>({
    name: '',
    color: COLORS[0],
  });

  const resetForm = () => {
    setFormData({ name: '', color: COLORS[0] });
    setEditingProject(null);
  };

  const handleEdit = (project: Project) => {
    setEditingProject(project);
    setFormData({ name: project.name, color: project.color });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingProject) {
      updateProject({ id: editingProject.id, ...formData }, {
        onSuccess: () => {
          toast.success('Project updated!');
          setIsDialogOpen(false);
          resetForm();
        },
        onError: () => toast.error('Failed to update project'),
      });
    } else {
      createProject(formData, {
        onSuccess: () => {
          toast.success('Project created!');
          setIsDialogOpen(false);
          resetForm();
        },
        onError: () => toast.error('Failed to create project'),
      });
    }
  };

  const handleDelete = (id: string) => {
    deleteProject(id, {
      onSuccess: () => {
        toast.success('Project deleted');
        if (selectedProjectId === id) setSelectedProjectId(null);
      },
      onError: () => toast.error('Failed to delete project'),
    });
  };

  const getTasksForProject = (projectId: string) => {
    return tasks.filter(t => t.project_id === projectId);
  };

  const selectedProject = projects.find(p => p.id === selectedProjectId);
  const selectedProjectTasks = selectedProjectId ? getTasksForProject(selectedProjectId) : [];

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
      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Projects</h1>
            <p className="text-muted-foreground">Organize your tasks by project</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                New Project
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingProject ? 'Edit Project' : 'Create New Project'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Website Redesign"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Color</Label>
                  <div className="flex flex-wrap gap-2">
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

                <Button type="submit" className="w-full" disabled={isCreating || isUpdating}>
                  {(isCreating || isUpdating) ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    editingProject ? 'Update Project' : 'Create Project'
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
        ) : projects.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <FolderKanban className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-medium mb-2">No projects yet</h3>
            <p className="text-muted-foreground mb-4">Create projects to organize your tasks</p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              New Project
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Projects list */}
            <div className="lg:col-span-2 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                {projects.map(project => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    tasks={getTasksForProject(project.id)}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    isSelected={selectedProjectId === project.id}
                    onSelect={setSelectedProjectId}
                  />
                ))}
              </div>
            </div>

            {/* Selected project details */}
            <div className="lg:col-span-1">
              {selectedProject ? (
                <div className="sticky top-6 p-5 rounded-xl bg-card border border-border">
                  <div className="flex items-center gap-3 mb-4">
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: selectedProject.color }}
                    />
                    <h3 className="font-semibold text-lg">{selectedProject.name}</h3>
                  </div>

                  <Tabs defaultValue="all">
                    <TabsList className="w-full">
                      <TabsTrigger value="all" className="flex-1">All</TabsTrigger>
                      <TabsTrigger value="active" className="flex-1">Active</TabsTrigger>
                      <TabsTrigger value="done" className="flex-1">Done</TabsTrigger>
                    </TabsList>
                    <TabsContent value="all" className="space-y-2 mt-4">
                      {selectedProjectTasks.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">No tasks in this project</p>
                      ) : (
                        selectedProjectTasks.map(task => <TaskItem key={task.id} task={task} />)
                      )}
                    </TabsContent>
                    <TabsContent value="active" className="space-y-2 mt-4">
                      {selectedProjectTasks.filter(t => t.status !== 'done').length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">No active tasks</p>
                      ) : (
                        selectedProjectTasks.filter(t => t.status !== 'done').map(task => <TaskItem key={task.id} task={task} />)
                      )}
                    </TabsContent>
                    <TabsContent value="done" className="space-y-2 mt-4">
                      {selectedProjectTasks.filter(t => t.status === 'done').length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">No completed tasks</p>
                      ) : (
                        selectedProjectTasks.filter(t => t.status === 'done').map(task => <TaskItem key={task.id} task={task} />)
                      )}
                    </TabsContent>
                  </Tabs>
                </div>
              ) : (
                <div className="p-5 rounded-xl bg-card/50 border border-border border-dashed text-center">
                  <FolderKanban className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Select a project to view tasks</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
