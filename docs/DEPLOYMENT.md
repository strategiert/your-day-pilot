# Edge Functions Deployment Guide

This guide explains how to deploy Supabase Edge Functions locally (e.g., via Claude or terminal).

## Prerequisites

### 1. Install Supabase CLI

**macOS (Homebrew):**
```bash
brew install supabase/tap/supabase
```

**Windows (Scoop):**
```bash
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

**Linux:**
```bash
brew install supabase/tap/supabase
# or
curl -fsSL https://raw.githubusercontent.com/supabase/cli/main/install.sh | sh
```

### 2. Login to Supabase

```bash
supabase login
```

This opens a browser for OAuth authentication. You only need to do this once.

### 3. Link the Project (Optional)

```bash
cd your-day-pilot
supabase link --project-ref hhlskbavdaapjlkwhcme
```

## Deployment

### Deploy All Functions

```bash
./scripts/deploy-functions.sh
```

### Deploy Single Function

```bash
./scripts/deploy-functions.sh sync-google-calendar
```

### Manual Deployment

```bash
supabase functions deploy google-calendar-auth --no-verify-jwt --project-ref hhlskbavdaapjlkwhcme
supabase functions deploy sync-google-calendar --no-verify-jwt --project-ref hhlskbavdaapjlkwhcme
supabase functions deploy parse-task --no-verify-jwt --project-ref hhlskbavdaapjlkwhcme
supabase functions deploy weekly-summary --no-verify-jwt --project-ref hhlskbavdaapjlkwhcme
```

## Available Functions

| Function | Purpose |
|----------|---------|
| `google-calendar-auth` | OAuth flow for Google Calendar |
| `sync-google-calendar` | Sync events from Google Calendar |
| `parse-task` | AI-powered task parsing |
| `weekly-summary` | Generate weekly productivity summary |

## View Logs

```bash
# Live logs
supabase functions logs sync-google-calendar --tail

# Recent logs
supabase functions logs sync-google-calendar
```

## Manage Secrets

```bash
# List secrets
supabase secrets list

# Set a secret
supabase secrets set GOOGLE_CLIENT_ID=your_value

# Set multiple from file
supabase secrets set --env-file .env.production
```

## Claude Desktop Setup (MCP)

To enable Claude Desktop to run deployment commands, add a shell server to your MCP config:

**macOS/Linux:** `~/.config/claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "shell": {
      "command": "npx",
      "args": ["-y", "@anthropic/mcp-server-shell"]
    }
  }
}
```

After adding this, Claude can execute commands like:
- `./scripts/deploy-functions.sh`
- `supabase functions logs sync-google-calendar`
- `supabase functions list`

## Troubleshooting

### "Supabase CLI not found"
Install the CLI using the commands above.

### "Not logged in"
Run `supabase login` to authenticate.

### "Permission denied" for deploy script
```bash
chmod +x scripts/deploy-functions.sh
```

### Function not updating
Clear the function cache:
```bash
supabase functions delete function-name
supabase functions deploy function-name --no-verify-jwt
```
