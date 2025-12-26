import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProfile } from '@/hooks/useProfile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Zap, ArrowRight, ArrowLeft, Clock, Calendar, Focus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { WorkingHours, DayHours } from '@/types';

const TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Dubai',
  'Australia/Sydney',
  'Pacific/Auckland',
];

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { profile, updateProfile, isUpdating } = useProfile();
  const [step, setStep] = useState(1);
  
  const [timezone, setTimezone] = useState(profile?.timezone || 'America/New_York');
  const [focusLength, setFocusLength] = useState(profile?.focus_length_min || 90);
  const [bufferMin, setBufferMin] = useState(profile?.buffer_min || 5);
  const [workingHours, setWorkingHours] = useState<WorkingHours>(
    profile?.working_hours_json || {
      monday: { start: '09:00', end: '17:00' },
      tuesday: { start: '09:00', end: '17:00' },
      wednesday: { start: '09:00', end: '17:00' },
      thursday: { start: '09:00', end: '17:00' },
      friday: { start: '09:00', end: '17:00' },
      saturday: null,
      sunday: null,
    }
  );

  const toggleDay = (day: typeof DAYS[number]) => {
    setWorkingHours(prev => ({
      ...prev,
      [day]: prev[day] ? null : { start: '09:00', end: '17:00' }
    }));
  };

  const updateDayHours = (day: typeof DAYS[number], field: 'start' | 'end', value: string) => {
    setWorkingHours(prev => ({
      ...prev,
      [day]: prev[day] ? { ...prev[day], [field]: value } : { start: '09:00', end: '17:00', [field]: value }
    }));
  };

  const handleComplete = () => {
    updateProfile({
      timezone,
      focus_length_min: focusLength,
      buffer_min: bufferMin,
      working_hours_json: workingHours,
      onboarding_completed: true,
    }, {
      onSuccess: () => {
        toast.success('Setup complete! Let\'s get productive.');
        navigate('/');
      },
      onError: () => {
        toast.error('Failed to save settings');
      }
    });
  };

  const steps = [
    {
      title: 'Time Zone & Focus',
      icon: Clock,
      content: (
        <div className="space-y-6">
          <div className="space-y-2">
            <Label>Your Timezone</Label>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger>
                <SelectValue placeholder="Select timezone" />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map(tz => (
                  <SelectItem key={tz} value={tz}>{tz.replace('_', ' ')}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Focus Session Length (minutes)</Label>
            <div className="flex items-center gap-4">
              <Input
                type="number"
                value={focusLength}
                onChange={(e) => setFocusLength(parseInt(e.target.value) || 90)}
                min={15}
                max={240}
                className="w-24"
              />
              <span className="text-sm text-muted-foreground">
                {focusLength >= 60 ? `${Math.floor(focusLength / 60)}h ${focusLength % 60}m` : `${focusLength}m`}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Tasks longer than this will be split into chunks
            </p>
          </div>

          <div className="space-y-2">
            <Label>Buffer Between Blocks (minutes)</Label>
            <Input
              type="number"
              value={bufferMin}
              onChange={(e) => setBufferMin(parseInt(e.target.value) || 5)}
              min={0}
              max={30}
              className="w-24"
            />
            <p className="text-xs text-muted-foreground">
              Breathing room between scheduled tasks
            </p>
          </div>
        </div>
      ),
    },
    {
      title: 'Working Hours',
      icon: Calendar,
      content: (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Set your available hours for each day. Tasks will only be scheduled during these times.
          </p>
          
          <div className="space-y-3">
            {DAYS.map(day => (
              <div key={day} className="flex items-center gap-4 p-3 rounded-lg bg-secondary/30">
                <Switch
                  checked={!!workingHours[day]}
                  onCheckedChange={() => toggleDay(day)}
                />
                <span className="w-24 capitalize font-medium">{day}</span>
                {workingHours[day] && (
                  <div className="flex items-center gap-2">
                    <Input
                      type="time"
                      value={workingHours[day]?.start || '09:00'}
                      onChange={(e) => updateDayHours(day, 'start', e.target.value)}
                      className="w-32"
                    />
                    <span className="text-muted-foreground">to</span>
                    <Input
                      type="time"
                      value={workingHours[day]?.end || '17:00'}
                      onChange={(e) => updateDayHours(day, 'end', e.target.value)}
                      className="w-32"
                    />
                  </div>
                )}
                {!workingHours[day] && (
                  <span className="text-sm text-muted-foreground">Day off</span>
                )}
              </div>
            ))}
          </div>
        </div>
      ),
    },
  ];

  const currentStep = steps[step - 1];
  const StepIcon = currentStep.icon;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center shadow-[0_0_30px_hsl(var(--primary)/0.4)]">
              <Zap className="w-6 h-6 text-primary" />
            </div>
            <span className="text-3xl font-bold text-gradient-cyan">FlowPilot</span>
          </div>
          <h1 className="text-2xl font-bold mb-2">Let's set up your workspace</h1>
          <p className="text-muted-foreground">Step {step} of {steps.length}</p>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-secondary rounded-full mb-8 overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-500"
            style={{ width: `${(step / steps.length) * 100}%` }}
          />
        </div>

        {/* Content Card */}
        <div className="glass-panel rounded-2xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <StepIcon className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-xl font-semibold">{currentStep.title}</h2>
          </div>

          {currentStep.content}

          {/* Navigation */}
          <div className="flex justify-between mt-8">
            <Button
              variant="ghost"
              onClick={() => setStep(step - 1)}
              disabled={step === 1}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>

            {step < steps.length ? (
              <Button onClick={() => setStep(step + 1)}>
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button variant="glow" onClick={handleComplete} disabled={isUpdating}>
                {isUpdating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    Complete Setup
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
