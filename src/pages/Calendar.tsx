import { useState, useRef } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useEvents } from '@/hooks/useEvents';
import { useAuth } from '@/contexts/AuthContext';
import { CalendarEvent } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Upload, 
  Download, 
  Plus, 
  Calendar as CalendarIcon, 
  Loader2,
  FileText,
  Check,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { Navigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';

// ICS Parser - simple implementation
function parseICS(icsContent: string): Partial<CalendarEvent>[] {
  const events: Partial<CalendarEvent>[] = [];
  const lines = icsContent.split(/\r?\n/);
  let currentEvent: Partial<CalendarEvent> | null = null;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    
    // Handle line continuations
    while (i + 1 < lines.length && (lines[i + 1].startsWith(' ') || lines[i + 1].startsWith('\t'))) {
      line += lines[i + 1].slice(1);
      i++;
    }

    if (line === 'BEGIN:VEVENT') {
      currentEvent = { source: 'ics_import', is_busy: true };
    } else if (line === 'END:VEVENT' && currentEvent) {
      if (currentEvent.title && currentEvent.start_ts && currentEvent.end_ts) {
        events.push(currentEvent);
      }
      currentEvent = null;
    } else if (currentEvent) {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const key = line.substring(0, colonIndex).split(';')[0];
        const value = line.substring(colonIndex + 1);

        switch (key) {
          case 'SUMMARY':
            currentEvent.title = value;
            break;
          case 'DESCRIPTION':
            currentEvent.description = value.replace(/\\n/g, '\n').replace(/\\,/g, ',');
            break;
          case 'DTSTART':
            currentEvent.start_ts = parseICSDate(value);
            break;
          case 'DTEND':
            currentEvent.end_ts = parseICSDate(value);
            break;
          case 'UID':
            currentEvent.external_id = value;
            break;
        }
      }
    }
  }

  return events;
}

function parseICSDate(dateStr: string): string {
  // Handle YYYYMMDDTHHMMSSZ format
  if (dateStr.length >= 15) {
    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);
    const hour = dateStr.substring(9, 11);
    const min = dateStr.substring(11, 13);
    const sec = dateStr.substring(13, 15);
    return `${year}-${month}-${day}T${hour}:${min}:${sec}Z`;
  }
  // Handle date-only format YYYYMMDD
  if (dateStr.length === 8) {
    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);
    return `${year}-${month}-${day}T00:00:00Z`;
  }
  return new Date().toISOString();
}

// ICS Generator
function generateICS(events: CalendarEvent[]): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//FlowPilot//Calendar Export//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];

  for (const event of events) {
    const startDate = new Date(event.start_ts);
    const endDate = new Date(event.end_ts);
    
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${event.id}@flowpilot`);
    lines.push(`DTSTAMP:${formatICSDate(new Date())}`);
    lines.push(`DTSTART:${formatICSDate(startDate)}`);
    lines.push(`DTEND:${formatICSDate(endDate)}`);
    lines.push(`SUMMARY:${escapeICS(event.title)}`);
    if (event.description) {
      lines.push(`DESCRIPTION:${escapeICS(event.description)}`);
    }
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

function formatICSDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

function escapeICS(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

export default function CalendarPage() {
  const { user, loading: authLoading } = useAuth();
  const { events, isLoading, createEvent, isCreating } = useEvents();
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [importedEvents, setImportedEvents] = useState<Partial<CalendarEvent>[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    start_ts: '',
    end_ts: '',
    is_busy: true,
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = parseICS(content);
        setImportedEvents(parsed);
        if (parsed.length === 0) {
          toast.error('No valid events found in file');
        } else {
          toast.success(`Found ${parsed.length} events`);
        }
      } catch (err) {
        toast.error('Failed to parse ICS file');
      }
    };
    reader.readAsText(file);
  };

  const handleImportConfirm = async () => {
    setIsImporting(true);
    let successCount = 0;

    for (const event of importedEvents) {
      try {
        await new Promise<void>((resolve, reject) => {
          createEvent({
            title: event.title!,
            description: event.description,
            start_ts: event.start_ts!,
            end_ts: event.end_ts!,
            is_busy: event.is_busy,
            source: 'ics_import',
          }, {
            onSuccess: () => { successCount++; resolve(); },
            onError: () => reject(),
          });
        });
      } catch {
        // Continue with other events
      }
    }

    setIsImporting(false);
    setIsImportDialogOpen(false);
    setImportedEvents([]);
    toast.success(`Imported ${successCount} events`);
  };

  const handleExport = () => {
    const icsContent = generateICS(events);
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `flowpilot-calendar-${format(new Date(), 'yyyy-MM-dd')}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Calendar exported!');
  };

  const handleAddEvent = (e: React.FormEvent) => {
    e.preventDefault();
    createEvent({
      title: newEvent.title,
      description: newEvent.description || undefined,
      start_ts: new Date(newEvent.start_ts).toISOString(),
      end_ts: new Date(newEvent.end_ts).toISOString(),
      is_busy: newEvent.is_busy,
    }, {
      onSuccess: () => {
        toast.success('Event created!');
        setIsAddDialogOpen(false);
        setNewEvent({ title: '', description: '', start_ts: '', end_ts: '', is_busy: true });
      },
      onError: () => toast.error('Failed to create event'),
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
            <h1 className="text-3xl font-bold">Calendar Sync</h1>
            <p className="text-muted-foreground">Import and export calendar events</p>
          </div>
          <div className="flex gap-3">
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Event
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Event</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAddEvent} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input
                      value={newEvent.title}
                      onChange={(e) => setNewEvent(prev => ({ ...prev, title: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      value={newEvent.description}
                      onChange={(e) => setNewEvent(prev => ({ ...prev, description: e.target.value }))}
                      rows={2}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Start</Label>
                      <Input
                        type="datetime-local"
                        value={newEvent.start_ts}
                        onChange={(e) => setNewEvent(prev => ({ ...prev, start_ts: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>End</Label>
                      <Input
                        type="datetime-local"
                        value={newEvent.end_ts}
                        onChange={(e) => setNewEvent(prev => ({ ...prev, end_ts: e.target.value }))}
                        required
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={isCreating}>
                    {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add Event'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Import Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-primary" />
                Import Calendar
              </CardTitle>
              <CardDescription>
                Import events from an ICS file (Google Calendar, Outlook, Apple Calendar)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full">
                    <Upload className="w-4 h-4 mr-2" />
                    Import ICS File
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Import Calendar Events</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div 
                      className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-sm text-muted-foreground mb-2">
                        Click to select an ICS file
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Supports Google Calendar, Outlook, Apple Calendar exports
                      </p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".ics,.ical"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </div>

                    {importedEvents.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-primary">
                          <Check className="w-4 h-4" />
                          Found {importedEvents.length} events
                        </div>
                        <div className="max-h-48 overflow-auto space-y-1">
                          {importedEvents.slice(0, 10).map((event, i) => (
                            <div key={i} className="text-sm p-2 rounded bg-secondary/30">
                              {event.title}
                            </div>
                          ))}
                          {importedEvents.length > 10 && (
                            <p className="text-xs text-muted-foreground">
                              ...and {importedEvents.length - 10} more
                            </p>
                          )}
                        </div>
                        <Button 
                          onClick={handleImportConfirm} 
                          className="w-full"
                          disabled={isImporting}
                        >
                          {isImporting ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          ) : null}
                          Import {importedEvents.length} Events
                        </Button>
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>

          {/* Export Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="w-5 h-5 text-primary" />
                Export Calendar
              </CardTitle>
              <CardDescription>
                Download your events as an ICS file to import into other apps
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={handleExport}
                disabled={events.length === 0}
              >
                <Download className="w-4 h-4 mr-2" />
                Export {events.length} Events
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Events list */}
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Your Events ({events.length})</h2>
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-12 bg-card rounded-xl border border-border">
              <CalendarIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No events yet. Import an ICS file or add events manually.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {events.slice(0, 20).map(event => (
                <div key={event.id} className="flex items-center gap-4 p-4 rounded-lg bg-card border border-border">
                  <div className="w-1 h-10 bg-primary rounded-full" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">{event.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {format(parseISO(event.start_ts), 'PPP p')} - {format(parseISO(event.end_ts), 'p')}
                    </p>
                  </div>
                  <span className="text-xs px-2 py-1 rounded bg-secondary text-muted-foreground">
                    {event.source}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
