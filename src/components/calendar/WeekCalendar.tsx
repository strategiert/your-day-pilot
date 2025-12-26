import { useState } from 'react';
import { format, startOfWeek, addDays, addHours, isSameDay, parseISO, differenceInMinutes, setHours, setMinutes } from 'date-fns';
import { useTasks } from '@/hooks/useTasks';
import { useScheduleBlocks } from '@/hooks/useScheduleBlocks';
import { useHabits } from '@/hooks/useHabits';
import { useEvents } from '@/hooks/useEvents';
import { ScheduleBlock, Task } from '@/types';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Sparkles, Info, Clock, Flag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const HOUR_HEIGHT = 60;

interface CalendarBlockProps {
  block: ScheduleBlock;
  dayStart: Date;
  onClick: () => void;
}

function CalendarBlock({ block, dayStart, onClick }: CalendarBlockProps) {
  const startTime = parseISO(block.start_ts);
  const endTime = parseISO(block.end_ts);
  
  const startMinutes = startTime.getHours() * 60 + startTime.getMinutes();
  const durationMinutes = differenceInMinutes(endTime, startTime);
  
  const top = (startMinutes / 60) * HOUR_HEIGHT;
  const height = Math.max((durationMinutes / 60) * HOUR_HEIGHT, 30);

  const blockStyles = {
    task: 'bg-primary/20 border-l-4 border-primary hover:bg-primary/30',
    habit: 'bg-accent/20 border-l-4 border-accent hover:bg-accent/30',
    event: 'bg-secondary border-l-4 border-muted-foreground hover:bg-secondary/80',
  };

  return (
    <div
      className={cn(
        'absolute left-1 right-1 rounded-lg p-2 cursor-pointer transition-all duration-200 overflow-hidden',
        blockStyles[block.block_type]
      )}
      style={{ top: `${top}px`, height: `${height}px` }}
      onClick={onClick}
    >
      <div className="text-xs font-medium truncate">{block.title}</div>
      <div className="text-xs text-muted-foreground">
        {format(startTime, 'h:mm a')} - {format(endTime, 'h:mm a')}
      </div>
    </div>
  );
}

interface WeekCalendarProps {
  selectedDate?: Date;
  onDateChange?: (date: Date) => void;
}

export function WeekCalendar({ selectedDate = new Date(), onDateChange }: WeekCalendarProps) {
  const [currentWeekStart, setCurrentWeekStart] = useState(() => startOfWeek(selectedDate, { weekStartsOn: 1 }));
  const [selectedBlock, setSelectedBlock] = useState<ScheduleBlock | null>(null);
  
  const weekEnd = addDays(currentWeekStart, 7);
  const { blocks } = useScheduleBlocks(currentWeekStart, weekEnd);
  
  const days = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));

  const navigateWeek = (direction: number) => {
    setCurrentWeekStart(addDays(currentWeekStart, direction * 7));
  };

  const getBlocksForDay = (day: Date) => {
    return blocks.filter(block => {
      const blockDate = parseISO(block.start_ts);
      return isSameDay(blockDate, day);
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon-sm" onClick={() => navigateWeek(-1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h2 className="text-lg font-semibold">
            {format(currentWeekStart, 'MMMM d')} - {format(addDays(currentWeekStart, 6), 'MMMM d, yyyy')}
          </h2>
          <Button variant="ghost" size="icon-sm" onClick={() => navigateWeek(1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <Button variant="ghost" onClick={() => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}>
          Today
        </Button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border">
        <div className="p-2" />
        {days.map(day => (
          <div
            key={day.toISOString()}
            className={cn(
              'p-3 text-center border-l border-border',
              isSameDay(day, new Date()) && 'bg-primary/10'
            )}
          >
            <div className="text-xs text-muted-foreground uppercase">{format(day, 'EEE')}</div>
            <div className={cn(
              'text-xl font-semibold',
              isSameDay(day, new Date()) && 'text-primary'
            )}>
              {format(day, 'd')}
            </div>
          </div>
        ))}
      </div>

      {/* Time grid */}
      <div className="flex-1 overflow-auto scrollbar-thin">
        <div className="grid grid-cols-[60px_repeat(7,1fr)] min-h-[1440px]">
          {/* Time labels */}
          <div className="relative">
            {HOURS.map(hour => (
              <div
                key={hour}
                className="absolute right-2 text-xs text-muted-foreground"
                style={{ top: `${hour * HOUR_HEIGHT}px` }}
              >
                {format(setHours(new Date(), hour), 'h a')}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map(day => (
            <div key={day.toISOString()} className="relative border-l border-border">
              {/* Hour lines */}
              {HOURS.map(hour => (
                <div
                  key={hour}
                  className="absolute left-0 right-0 border-t border-border/30"
                  style={{ top: `${hour * HOUR_HEIGHT}px`, height: `${HOUR_HEIGHT}px` }}
                />
              ))}

              {/* Blocks */}
              {getBlocksForDay(day).map(block => (
                <CalendarBlock
                  key={block.id}
                  block={block}
                  dayStart={day}
                  onClick={() => setSelectedBlock(block)}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Block detail sheet */}
      <Sheet open={!!selectedBlock} onOpenChange={() => setSelectedBlock(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{selectedBlock?.title}</SheetTitle>
            <SheetDescription>
              {selectedBlock && (
                <div className="space-y-4 mt-4">
                  <div className="flex items-center gap-2 text-foreground">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span>
                      {format(parseISO(selectedBlock.start_ts), 'PPP p')} -{' '}
                      {format(parseISO(selectedBlock.end_ts), 'p')}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      'px-2 py-1 rounded-full text-xs font-medium capitalize',
                      selectedBlock.block_type === 'task' && 'bg-primary/20 text-primary',
                      selectedBlock.block_type === 'habit' && 'bg-accent/20 text-accent',
                      selectedBlock.block_type === 'event' && 'bg-secondary text-foreground'
                    )}>
                      {selectedBlock.block_type}
                    </span>
                    <span className={cn(
                      'px-2 py-1 rounded-full text-xs font-medium capitalize',
                      selectedBlock.status === 'completed' && 'bg-neon-green/20 text-neon-green',
                      selectedBlock.status === 'in_progress' && 'bg-neon-orange/20 text-neon-orange'
                    )}>
                      {selectedBlock.status}
                    </span>
                  </div>

                  {selectedBlock.explanation && (
                    <div className="p-4 rounded-lg bg-secondary/50">
                      <div className="flex items-center gap-2 text-sm font-medium mb-2">
                        <Info className="w-4 h-4 text-primary" />
                        Why here?
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {selectedBlock.explanation}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </SheetDescription>
          </SheetHeader>
        </SheetContent>
      </Sheet>
    </div>
  );
}
