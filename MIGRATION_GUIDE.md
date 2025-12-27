# Migration zum neuen Supabase Projekt

## Übersicht
Migration von `ygsznjehglazxhjvqoxt` → `hhlskbavdaapjlkwhcme`

Grund: Frisches Projekt ohne Timezone-Probleme. Alle Fixes sind bereits im Code und bereit für Deployment.

---

## Schritt 1: Lokale .env Datei erstellen

Erstelle/bearbeite die Datei `.env` im Projekt-Root:

```bash
# .env
VITE_SUPABASE_PROJECT_ID="hhlskbavdaapjlkwhcme"
VITE_SUPABASE_URL="https://hhlskbavdaapjlkwhcme.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhobHNrYmF2ZGFhcGpsa3doY21lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4NTA2MTAsImV4cCI6MjA4MjQyNjYxMH0.40KWCDl-0Tvh3ZhAor8CIJGX7lPAHmuc2mkflq1-qL8"
DEEPL_API_KEY="5c59876d-b3af-4d3e-865b-fc31503f5998:fx"
```

---

## Schritt 2: Supabase CLI Setup

```bash
# Projekt verknüpfen
cd your-day-pilot
supabase link --project-ref hhlskbavdaapjlkwhcme
```

---

## Schritt 3: Database Schema deployen

```bash
# Alle Migrations in neue DB pushen
supabase db push
```

Dies erstellt alle Tabellen:
- users, profiles
- tasks, events, calendar_connections
- schedule_blocks, habits, habit_logs
- Alle UNIQUE constraints sind bereits in den Migrations

---

## Schritt 4: Secrets setzen

```bash
# Google OAuth Credentials
supabase secrets set GOOGLE_CLIENT_ID="[dein_google_client_id]"
supabase secrets set GOOGLE_CLIENT_SECRET="[dein_google_client_secret]"

# Token Encryption (mindestens 32 Zeichen!)
supabase secrets set TOKEN_ENCRYPTION_KEY="$(openssl rand -base64 32)"
```

**Wichtig:** Verwende deine existierenden Google OAuth Credentials oder erstelle neue.

---

## Schritt 5: Edge Functions deployen

```bash
# Deployment-Skript ausführbar machen
chmod +x scripts/deploy-functions.sh

# Alle Functions deployen (mit korrekten Timezone-Fixes!)
./scripts/deploy-functions.sh
```

Dies deployed:
- ✅ `google-calendar-auth` - OAuth flow
- ✅ `sync-google-calendar` - **MIT TIMEZONE-FIX!**
- ✅ `parse-task` - AI task parsing
- ✅ `weekly-summary` - Weekly reports

---

## Schritt 6: Google OAuth Redirect URIs aktualisieren

Gehe zu **Google Cloud Console** → **APIs & Services** → **Credentials**

Füge diese URIs hinzu:
```
https://hhlskbavdaapjlkwhcme.supabase.co/auth/v1/callback
https://your-day-pilot.lovable.app/calendar
```

(Optional: Lösche die alten URIs vom alten Projekt)

---

## Schritt 7: App testen

1. **Lovable deployen**: Pushe den Code → Lovable deployed automatisch
2. **Onboarding**: Erstelle einen neuen Account (altes Projekt ist weg)
3. **Google Calendar verbinden**: Calendar Sync → "Connect Google Calendar"
4. **Sync testen**: "Sync Now" → sollte Events mit korrekten Timestamps synchen
5. **Week View prüfen**: "Kindergeburtstag" sollte am **30. Dezember** sein!

---

## Troubleshooting

### Problem: `supabase link` schlägt fehl
**Lösung**: Stelle sicher, dass du eingeloggt bist:
```bash
supabase login
```

### Problem: Edge Functions deployen schlägt fehl
**Lösung**: Prüfe ob Secrets gesetzt sind:
```bash
supabase secrets list
```

### Problem: Google OAuth schlägt fehl
**Lösung**: Prüfe ob Redirect URIs korrekt konfiguriert sind in Google Cloud Console

### Problem: Events haben immer noch falsche Timestamps
**Lösung**:
1. Prüfe ob Edge Function deployed wurde: `supabase functions list`
2. Lösche alte Events: Im Supabase Dashboard → SQL Editor → `DELETE FROM events WHERE source = 'google';`
3. Re-sync: Calendar Sync → "Sync Now"

---

## Erfolgs-Kriterien

✅ **Onboarding** funktioniert
✅ **Google Calendar** verbindet sich
✅ **Sync** lädt Events
✅ **Timestamps** sind korrekt (kein Datum-Shift)
✅ **"Kindergeburtstag Julika"** erscheint am **30. Dezember**
✅ **Auto-plan Week** erkennt Events als busy time

---

## Wichtige Hinweise

- ⚠️ **Altes Projekt ist tot** - keine Migration von Daten möglich/nötig
- ✅ **Alle Fixes sind im Code** - Edge Functions haben korrekten Timezone-Code
- 🔐 **Secrets niemals committen** - nur in Supabase setzen
- 📝 **.env nur lokal** - ist in .gitignore

---

## Support

Bei Problemen, frag Cline:
- "Deploy Edge Functions to Supabase"
- "Show me the Edge Function logs"
- "Check if migrations were applied"
