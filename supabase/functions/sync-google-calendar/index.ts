import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { encode as base64Encode, decode as base64Decode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Encryption helpers (must match google-calendar-auth)
async function getEncryptionKey(keyString: string): Promise<CryptoKey> {
  const keyData = new TextEncoder().encode(keyString.padEnd(32, '0').slice(0, 32));
  return await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function decryptTokens(encryptedData: string, keyString: string): Promise<Record<string, unknown>> {
  const key = await getEncryptionKey(keyString);
  const combined = base64Decode(encryptedData);

  const iv = combined.slice(0, 12);
  const encrypted = combined.slice(12);

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    encrypted
  );

  return JSON.parse(new TextDecoder().decode(decrypted));
}

async function encryptTokens(tokens: Record<string, unknown>, keyString: string): Promise<string> {
  const key = await getEncryptionKey(keyString);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new TextEncoder().encode(JSON.stringify(tokens));

  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    data
  );

  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);

  return base64Encode(combined);
}

async function refreshAccessToken(refreshToken: string, clientId: string, clientSecret: string) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  const data = await response.json();
  if (data.error) {
    throw new Error(data.error_description || "Failed to refresh token");
  }
  
  return {
    access_token: data.access_token,
    expires_at: Date.now() + data.expires_in * 1000,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID");
    const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const ENCRYPTION_KEY = Deno.env.get("ENCRYPTION_KEY");

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      return new Response(
        JSON.stringify({ error: "Google OAuth not configured" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!ENCRYPTION_KEY) {
      return new Response(
        JSON.stringify({ error: "Server encryption not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get calendar connection
    const { data: connection, error: connError } = await supabase
      .from("calendar_connections")
      .select("*")
      .eq("user_id", user.id)
      .eq("provider", "google")
      .single();

    if (connError || !connection) {
      return new Response(
        JSON.stringify({ error: "No Google Calendar connection found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Decrypt tokens
    const tokens = await decryptTokens(connection.tokens_json as string, ENCRYPTION_KEY) as {
      access_token: string;
      refresh_token: string;
      expires_at: number;
    };

    // Refresh token if expired
    let accessToken = tokens.access_token;
    if (tokens.expires_at < Date.now()) {
      console.log("Token expired, refreshing...");
      const newTokens = await refreshAccessToken(
        tokens.refresh_token,
        GOOGLE_CLIENT_ID,
        GOOGLE_CLIENT_SECRET
      );
      accessToken = newTokens.access_token;

      // Re-encrypt and update stored tokens
      const updatedTokens = {
        ...tokens,
        access_token: newTokens.access_token,
        expires_at: newTokens.expires_at,
      };
      const encryptedTokens = await encryptTokens(updatedTokens, ENCRYPTION_KEY);

      await supabase
        .from("calendar_connections")
        .update({
          tokens_json: encryptedTokens,
          updated_at: new Date().toISOString(),
        })
        .eq("id", connection.id);
    }

    // Fetch events from Google Calendar
    const now = new Date();
    const timeMin = now.toISOString();
    const timeMax = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days ahead

    const calendarResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?` + 
      new URLSearchParams({
        timeMin,
        timeMax,
        singleEvents: "true",
        orderBy: "startTime",
        maxResults: "250",
      }),
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!calendarResponse.ok) {
      console.error("Google Calendar API error: status", calendarResponse.status);
      
      if (calendarResponse.status === 401) {
        // Token invalid, mark connection as needs reconnect
        await supabase
          .from("calendar_connections")
          .update({ status: "needs_reconnect" })
          .eq("id", connection.id);
          
        return new Response(
          JSON.stringify({ error: "Calendar access expired. Please reconnect." }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error("Failed to fetch calendar events");
    }

    const calendarData = await calendarResponse.json();
    const googleEvents = calendarData.items || [];

    console.log(`Fetched ${googleEvents.length} events from Google Calendar`);

    // Upsert events
    let syncedCount = 0;
    for (const gEvent of googleEvents) {
      if (!gEvent.start?.dateTime && !gEvent.start?.date) continue;
      
      const startTs = gEvent.start.dateTime || `${gEvent.start.date}T00:00:00Z`;
      const endTs = gEvent.end?.dateTime || gEvent.end?.date 
        ? (gEvent.end.dateTime || `${gEvent.end.date}T23:59:59Z`)
        : startTs;

      const { error: upsertError } = await supabase
        .from("events")
        .upsert({
          user_id: user.id,
          external_id: gEvent.id,
          title: gEvent.summary || "Untitled Event",
          description: gEvent.description,
          start_ts: startTs,
          end_ts: endTs,
          source: "google",
          is_busy: gEvent.transparency !== "transparent",
          updated_at: new Date().toISOString(),
        }, { 
          onConflict: "user_id,external_id" 
        });

      if (!upsertError) syncedCount++;
    }

    // Update last sync time
    await supabase
      .from("calendar_connections")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", connection.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        synced: syncedCount,
        total: googleEvents.length 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Sync error:", error instanceof Error ? error.message : "Unknown error");
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
