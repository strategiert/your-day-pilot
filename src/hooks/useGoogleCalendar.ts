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

      const { data, error } = await supabase.functions.invoke('google-calendar-auth', {
        body: {
          action: 'exchange_code',
          code,
          redirect_uri: redirectUri
        }
      });

      console.log('[useGoogleCalendar] Exchange response DATA:', JSON.stringify(data, null, 2));
      console.log('[useGoogleCalendar] Exchange response ERROR:', JSON.stringify(error, null, 2));

      if (error) {
        console.error('[useGoogleCalendar] Supabase function error:', error);
        throw new Error(error.message);
      }

      if (data?.error) {
        const errorMessage = data.details || data.error;
        console.error('[useGoogleCalendar] Function returned error data:', JSON.stringify(data, null, 2));
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
      const { data, error } = await supabase.functions.invoke('sync-google-calendar', {
        body: {}
      });

      if (error) throw new Error(error.message);
      if (data.error) throw new Error(data.error);

      await checkStatus();
      return data;
    } catch (err) {
      console.error('Sync failed:', err);
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
    handleOAuthCallback,
    checkStatus,
  };
}
