import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useGoogleCalendar() {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const checkStatus = async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('google-calendar-auth', {
        body: { action: 'get_status' }
      });

      if (!error && data) {
        setIsConnected(data.connected);
        setLastSyncedAt(data.updated_at);
      }
    } catch (err) {
      console.error('Failed to check Google Calendar status:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkStatus();
  }, [user]);

  const connect = async () => {
    setIsConnecting(true);
    try {
      const redirectUri = `${window.location.origin}/calendar`;
      
      const { data, error } = await supabase.functions.invoke('google-calendar-auth', {
        body: { 
          action: 'get_auth_url',
          redirect_uri: redirectUri
        }
      });

      if (error) throw new Error(error.message);
      if (data.error) throw new Error(data.error);

      // Open OAuth flow in same window
      window.location.href = data.auth_url;
    } catch (err) {
      console.error('Failed to start Google OAuth:', err);
      throw err;
    } finally {
      setIsConnecting(false);
    }
  };

  const handleOAuthCallback = async (code: string) => {
    setIsConnecting(true);
    try {
      const redirectUri = `${window.location.origin}/calendar`;

      console.log('[useGoogleCalendar] Exchanging code with redirect_uri:', redirectUri);

      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      // Direct fetch to get error details even on non-2xx status
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://hhlskbavdaapjlkwhcme.supabase.co";
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhobHNrYmF2ZGFhcGpsa3doY21lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4NTA2MTAsImV4cCI6MjA4MjQyNjYxMH0.40KWCDl-0Tvh3ZhAor8CIJGX7lPAHmuc2mkflq1-qL8";
      
      const response = await fetch(
        `${supabaseUrl}/functions/v1/google-calendar-auth`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': supabaseKey,
          },
          body: JSON.stringify({
            action: 'exchange_code',
            code,
            redirect_uri: redirectUri
          })
        }
      );

      const responseText = await response.text();
      console.log('[useGoogleCalendar] Raw response status:', response.status);
      console.log('[useGoogleCalendar] Raw response body:', responseText);

      let data;
      try {
        data = JSON.parse(responseText);
      } catch {
        console.error('[useGoogleCalendar] Failed to parse response as JSON');
        throw new Error(`HTTP ${response.status}: ${responseText || 'Empty response'}`);
      }

      console.log('[useGoogleCalendar] Parsed response data:', JSON.stringify(data, null, 2));

      if (!response.ok) {
        const errorMessage = data.details || data.error || `HTTP ${response.status}`;
        console.error('[useGoogleCalendar] Function returned error:', JSON.stringify(data, null, 2));
        throw new Error(errorMessage);
      }

      await checkStatus();
      return true;
    } catch (err) {
      console.error('[useGoogleCalendar] OAuth callback failed:', err);
      throw err;
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = async () => {
    try {
      const { error } = await supabase.functions.invoke('google-calendar-auth', {
        body: { action: 'disconnect' }
      });

      if (error) throw error;

      setIsConnected(false);
      setLastSyncedAt(null);
    } catch (err) {
      console.error('Failed to disconnect:', err);
      throw err;
    }
  };

  const sync = async () => {
    setIsSyncing(true);
    try {
      console.log('[useGoogleCalendar] Starting sync...');
      const { data, error } = await supabase.functions.invoke('sync-google-calendar', {
        body: {}
      });

      console.log('[useGoogleCalendar] Sync response:', data);
      if (error) throw new Error(error.message);
      if (data.error) throw new Error(data.error);

      await checkStatus();

      // Invalidate events cache to force reload
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        console.log('[useGoogleCalendar] Synced:', data.synced, 'events');
      }

      return data;
    } catch (err) {
      console.error('Sync failed:', err);
      throw err;
    } finally {
      setIsSyncing(false);
    }
  };

  const resetAndResync = async () => {
    setIsSyncing(true);
    try {
      console.log('[useGoogleCalendar] RESET: Deleting all Google Calendar events from database...');

      // Delete all events from Google Calendar
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) throw new Error('Not authenticated');

      const { error: deleteError, count } = await supabase
        .from('events')
        .delete()
        .eq('user_id', currentUser.id)
        .eq('source', 'google');

      if (deleteError) {
        console.error('[useGoogleCalendar] RESET: Delete failed:', deleteError);
        throw deleteError;
      }

      console.log('[useGoogleCalendar] RESET: Deleted', count, 'events');
      console.log('[useGoogleCalendar] RESET: Starting fresh sync...');

      // Now sync fresh
      const { data, error } = await supabase.functions.invoke('sync-google-calendar', {
        body: {}
      });

      console.log('[useGoogleCalendar] RESET: Sync response:', data);
      if (error) throw new Error(error.message);
      if (data.error) throw new Error(data.error);

      await checkStatus();

      console.log('[useGoogleCalendar] RESET: Complete! Synced', data.synced, 'events');

      // Force page reload to clear all caches
      window.location.reload();

      return data;
    } catch (err) {
      console.error('[useGoogleCalendar] RESET: Failed:', err);
      throw err;
    } finally {
      setIsSyncing(false);
    }
  };

  return {
    isConnected,
    lastSyncedAt,
    isLoading,
    isSyncing,
    isConnecting,
    connect,
    disconnect,
    sync,
    resetAndResync,
    handleOAuthCallback,
    checkStatus,
  };
}
