import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Save, Clock, Calendar, Focus, Languages } from 'lucide-react';
import { toast } from 'sonner';
import { Navigate } from 'react-router-dom';
import { WorkingHours, DayHours } from '@/types';
import { useTranslation } from 'react-i18next';
import { LanguageToggle } from '@/components/LanguageToggle';

const TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Toronto',
  'America/Vancouver',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Amsterdam',
  'Europe/Rome',
  'Europe/Madrid',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Hong_Kong',
  'Asia/Singapore',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Australia/Sydney',
  'Australia/Melbourne',
  'Pacific/Auckland',
  'Pacific/Honolulu',
];

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

export default function SettingsPage() {
  const { t } = useTranslation('settings');
  const { user, loading: authLoading } = useAuth();
  const { profile, isLoading: profileLoading, updateProfile, isUpdating } = useProfile();

  const [timezone, setTimezone] = useState('America/New_York');
  const [focusLength, setFocusLength] = useState(90);
  const [bufferMin, setBufferMin] = useState(5);
  const [workingHours, setWorkingHours] = useState<WorkingHours>({
    monday: { start: '09:00', end: '17:00' },
    tuesday: { start: '09:00', end: '17:00' },
    wednesday: { start: '09:00', end: '17:00' },
    thursday: { start: '09:00', end: '17:00' },
    friday: { start: '09:00', end: '17:00' },
    saturday: null,
    sunday: null,
  });

  useEffect(() => {
    if (profile) {
      setTimezone(profile.timezone || 'America/New_York');
      setFocusLength(profile.focus_length_min || 90);
      setBufferMin(profile.buffer_min || 5);
      setWorkingHours(profile.working_hours_json || workingHours);
    }
  }, [profile]);

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

  const handleSave = () => {
    updateProfile({
      timezone,
      focus_length_min: focusLength,
      buffer_min: bufferMin,
      working_hours_json: workingHours,
    }, {
      onSuccess: () => {
        toast.success(t('settings_saved'));
      },
      onError: () => {
        toast.error(t('failed_to_save'));
      }
    });
  };

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

  return (
    <AppLayout>
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">{t('title')}</h1>
            <p className="text-muted-foreground">{t('description')}</p>
          </div>
          <Button onClick={handleSave} disabled={isUpdating}>
            {isUpdating ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            {t('save_changes')}
          </Button>
        </div>

        <div className="space-y-6">
          {/* Language */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Languages className="w-5 h-5 text-primary" />
                {t('language_section.title')}
              </CardTitle>
              <CardDescription>{t('language_section.description')}</CardDescription>
            </CardHeader>
            <CardContent>
              <LanguageToggle />
            </CardContent>
          </Card>

          {/* Timezone */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                {t('timezone_section.title')}
              </CardTitle>
              <CardDescription>{t('timezone_section.description')}</CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger className="w-full max-w-sm">
                  <SelectValue placeholder={t('timezone_section.select_placeholder')} />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map(tz => (
                    <SelectItem key={tz} value={tz}>{tz.replace('_', ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Focus & Buffer */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Focus className="w-5 h-5 text-primary" />
                {t('focus_section.title')}
              </CardTitle>
              <CardDescription>{t('focus_section.description')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>{t('focus_section.focus_length')}</Label>
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
                    {t('focus_section.focus_help')}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>{t('focus_section.buffer_length')}</Label>
                  <div className="flex items-center gap-4">
                    <Input
                      type="number"
                      value={bufferMin}
                      onChange={(e) => setBufferMin(parseInt(e.target.value) || 5)}
                      min={0}
                      max={30}
                      className="w-24"
                    />
                    <span className="text-sm text-muted-foreground">{bufferMin}m {t('focus_section.break')}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t('focus_section.buffer_help')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Working Hours */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                {t('working_hours_section.title')}
              </CardTitle>
              <CardDescription>{t('working_hours_section.description')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {DAYS.map(day => (
                  <div key={day} className="flex items-center gap-4 p-3 rounded-lg bg-secondary/30">
                    <Switch
                      checked={!!workingHours[day]}
                      onCheckedChange={() => toggleDay(day)}
                    />
                    <span className="w-28 font-medium">{t(`working_hours_section.days.${day}`)}</span>
                    {workingHours[day] ? (
                      <div className="flex items-center gap-2">
                        <Input
                          type="time"
                          value={workingHours[day]?.start || '09:00'}
                          onChange={(e) => updateDayHours(day, 'start', e.target.value)}
                          className="w-32"
                        />
                        <span className="text-muted-foreground">{t('working_hours_section.to')}</span>
                        <Input
                          type="time"
                          value={workingHours[day]?.end || '17:00'}
                          onChange={(e) => updateDayHours(day, 'end', e.target.value)}
                          className="w-32"
                        />
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">{t('working_hours_section.day_off')}</span>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
