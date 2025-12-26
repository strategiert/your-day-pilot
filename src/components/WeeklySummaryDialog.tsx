import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Sparkles, TrendingUp, Lightbulb, Clock, Target, CheckCircle2, Loader2, Sun, Sunset, Moon } from 'lucide-react';
import { useWeeklySummary, WeeklySummary } from '@/hooks/useWeeklySummary';
import { useState } from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
}

function StatCard({ label, value, icon }: StatCardProps) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
      <div className="text-primary">{icon}</div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-semibold">{value}</p>
      </div>
    </div>
  );
}

function PeakTimeIcon({ time }: { time: string }) {
  switch (time) {
    case 'morning':
      return <Sun className="h-4 w-4" />;
    case 'afternoon':
      return <Sunset className="h-4 w-4" />;
    case 'evening':
      return <Moon className="h-4 w-4" />;
    default:
      return <Clock className="h-4 w-4" />;
  }
}

function SummaryContent({ summary }: { summary: WeeklySummary }) {
  return (
    <div className="space-y-6">
      {/* Focus Score */}
      <div className="text-center p-6 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
        <p className="text-sm text-muted-foreground mb-2">Weekly Focus Score</p>
        <div className="text-5xl font-bold text-primary mb-2">{summary.focusScore}</div>
        <Progress value={summary.focusScore} className="h-2 w-32 mx-auto" />
      </div>

      {/* Summary */}
      <p className="text-muted-foreground leading-relaxed">{summary.summary}</p>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard 
          label="Focus Hours" 
          value={`${summary.stats.totalFocusHours}h`} 
          icon={<Clock className="h-4 w-4" />} 
        />
        <StatCard 
          label="Tasks Done" 
          value={summary.stats.tasksCompleted} 
          icon={<CheckCircle2 className="h-4 w-4" />} 
        />
        <StatCard 
          label="Habit Rate" 
          value={`${summary.stats.habitCompletionRate}%`} 
          icon={<Target className="h-4 w-4" />} 
        />
        <StatCard 
          label="Peak Time" 
          value={summary.peakProductivityTime} 
          icon={<PeakTimeIcon time={summary.peakProductivityTime} />} 
        />
      </div>

      {/* Highlights */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-green-500" />
            Highlights
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {summary.highlights.map((highlight, i) => (
            <div key={i} className="flex items-start gap-2">
              <Badge variant="outline" className="mt-0.5 shrink-0 bg-green-500/10 text-green-600 border-green-500/20">
                ✓
              </Badge>
              <span className="text-sm">{highlight}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Patterns */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-blue-500" />
            Patterns Observed
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {summary.patterns.map((pattern, i) => (
            <div key={i} className="flex items-start gap-2">
              <Badge variant="outline" className="mt-0.5 shrink-0 bg-blue-500/10 text-blue-600 border-blue-500/20">
                {i + 1}
              </Badge>
              <span className="text-sm">{pattern}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Suggestions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-amber-500" />
            Suggestions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {summary.suggestions.map((suggestion, i) => (
            <div key={i} className="flex items-start gap-2">
              <Badge variant="outline" className="mt-0.5 shrink-0 bg-amber-500/10 text-amber-600 border-amber-500/20">
                →
              </Badge>
              <span className="text-sm">{suggestion}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Week Range */}
      <p className="text-xs text-center text-muted-foreground">
        Analysis for {summary.stats.weekRange}
      </p>
    </div>
  );
}

export function WeeklySummaryDialog() {
  const { summary, isLoading, generateSummary } = useWeeklySummary();
  const [open, setOpen] = useState(false);

  const handleOpen = async (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen && !summary) {
      await generateSummary();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Sparkles className="h-4 w-4" />
          Weekly Insights
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Weekly Summary
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Analyzing your week...</p>
          </div>
        ) : summary ? (
          <SummaryContent summary={summary} />
        ) : (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Sparkles className="h-12 w-12 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">Click to generate your weekly insights</p>
            <Button onClick={generateSummary}>Generate Summary</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
