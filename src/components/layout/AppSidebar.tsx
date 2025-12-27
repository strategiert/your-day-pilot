import { NavLink as RouterNavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import {
  Inbox,
  Calendar,
  CalendarDays,
  FolderKanban,
  Repeat,
  Settings,
  CalendarClock,
  LogOut,
  Zap,
  Plus,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { QuickAddDialog } from '@/components/QuickAddDialog';
import { useState } from 'react';

interface NavItemProps {
  to: string;
  icon: React.ElementType;
  label: string;
  collapsed?: boolean;
}

function NavItem({ to, icon: Icon, label, collapsed }: NavItemProps) {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <RouterNavLink
      to={to}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
        isActive
          ? 'bg-primary/20 text-primary shadow-[0_0_20px_hsl(var(--primary)/0.2)]'
          : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
      )}
    >
      <Icon className="w-5 h-5 shrink-0" />
      {!collapsed && <span className="font-medium">{label}</span>}
    </RouterNavLink>
  );
}

export function AppSidebar() {
  const { signOut, user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  return (
    <aside
      className={cn(
        'h-screen bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center shadow-[0_0_20px_hsl(var(--primary)/0.3)] shrink-0">
            <Zap className="w-5 h-5 text-primary" />
          </div>
          {!collapsed && (
            <span className="text-xl font-bold text-gradient-cyan">FlowPilot</span>
          )}
        </div>
      </div>

      {/* Quick Add */}
      <div className="p-4">
        <Button
          variant="glow"
          size={collapsed ? 'icon' : 'default'}
          className={cn('w-full', collapsed && 'px-0')}
          onClick={() => setQuickAddOpen(true)}
        >
          <Plus className="w-4 h-4" />
          {!collapsed && <span>Quick Add</span>}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto scrollbar-thin">
        <NavItem to="/" icon={Inbox} label="Inbox" collapsed={collapsed} />
        <NavItem to="/today" icon={Calendar} label="Today" collapsed={collapsed} />
        <NavItem to="/week" icon={CalendarDays} label="Week" collapsed={collapsed} />
        
        <div className="pt-4 pb-2">
          {!collapsed && (
            <span className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Workspace
            </span>
          )}
        </div>
        
        <NavItem to="/projects" icon={FolderKanban} label="Projects" collapsed={collapsed} />
        <NavItem to="/habits" icon={Repeat} label="Habits" collapsed={collapsed} />
        <NavItem to="/calendar" icon={CalendarClock} label="Calendar Sync" collapsed={collapsed} />
        <NavItem to="/settings" icon={Settings} label="Settings" collapsed={collapsed} />
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-sidebar-border space-y-2">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-muted-foreground hover:bg-sidebar-accent transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4" />
              <span className="text-sm">Collapse</span>
            </>
          )}
        </button>
        
        <button
          onClick={signOut}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
        >
          <LogOut className="w-4 h-4" />
          {!collapsed && <span className="text-sm">Sign Out</span>}
        </button>
      </div>

      {/* Quick Add Dialog */}
      <QuickAddDialog open={quickAddOpen} onOpenChange={setQuickAddOpen} />
    </aside>
  );
}
