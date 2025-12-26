# Security Measures

This document outlines the security measures implemented in the Your Day Pilot application.

## Overview

The application implements multiple layers of security to protect user data and prevent common vulnerabilities.

## Security Features

### 1. Input Validation ✅

**Location:** `supabase/functions/parse-task/index.ts`

**Implementation:**
- All AI-generated responses are validated using Zod schemas before being returned to the client
- Input length is limited to 2000 characters to prevent abuse
- Input type validation ensures only strings are processed
- Validation schema enforces strict typing for all task properties:
  - `title`: string (1-500 characters)
  - `due_ts`: ISO datetime string (optional)
  - `est_min`: integer (1-1440 minutes, optional)
  - `priority`: enum ["p1", "p2", "p3", "p4"] (optional)
  - `energy`: enum ["low", "medium", "high"] (optional)
  - `preferred_window`: enum ["morning", "afternoon", "evening", "any"] (optional)
  - `hard_deadline`: boolean (optional)

**Protection Against:**
- Malformed AI responses
- Data injection attacks
- Type confusion vulnerabilities

---

### 2. OAuth Token Encryption ✅

**Location:**
- `supabase/functions/google-calendar-auth/index.ts`
- `supabase/functions/sync-google-calendar/index.ts`

**Implementation:**
- All OAuth tokens (access_token, refresh_token) are encrypted using AES-256-GCM before storage
- Encryption key is stored securely in environment variables (`ENCRYPTION_KEY`)
- Each encrypted payload includes a unique IV (Initialization Vector)
- Tokens are automatically decrypted when needed and re-encrypted after refresh

**Encryption Details:**
- Algorithm: AES-GCM (Authenticated Encryption with Associated Data)
- Key Size: 256 bits
- IV Size: 12 bytes (randomly generated for each encryption)
- Encoding: Base64 for storage

**Protection Against:**
- Database compromise (tokens unreadable without encryption key)
- Token theft from database dumps
- Insider threats with database access

---

### 3. Authentication & Authorization ✅

**Location:** All Edge Functions

**Implementation:**
- All Edge Functions require valid JWT authentication
- User identity is verified before any operation
- Supabase Auth handles session management
- Row Level Security (RLS) policies enforce data access control

**Protection Against:**
- Unauthorized access
- Data leaks
- Cross-user data access

---

### 4. CORS Protection ✅

**Location:** All Edge Functions

**Implementation:**
- Strict CORS headers on all endpoints
- OPTIONS preflight request handling
- Allowed origins restricted to application domain

---

### 5. Rate Limiting ✅

**Location:** `supabase/functions/parse-task/index.ts`

**Implementation:**
- AI API rate limit errors (429) are properly handled
- User-friendly error messages for rate limit scenarios
- Credit exhaustion (402) detection and handling

---

## Environment Variables Required

The following environment variables must be configured for security features to work:

### Required:
- `ENCRYPTION_KEY` - 32-character encryption key for OAuth token encryption
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret
- `LOVABLE_API_KEY` - API key for AI services

### Generating a Secure Encryption Key:

```bash
# Option 1: Using OpenSSL
openssl rand -base64 32

# Option 2: Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Option 3: Using Python
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

---

## Security Audit Results

### Fixed Issues (Warn Level):

1. ✅ **INPUT_VALIDATION** - AI response validation added (parse-task)
2. ✅ **STORAGE_EXPOSURE** - OAuth token encryption implemented
3. ⚠️ **CLIENT_SIDE_AUTH** - Acceptable for React SPA with RLS (no changes needed)
4. ⚠️ **Leaked Password** - Requires manual review in Supabase scanner

---

## Best Practices

### For Developers:

1. **Never commit secrets to version control**
2. **Rotate encryption keys regularly** (requires re-encryption of all tokens)
3. **Keep dependencies updated** to patch security vulnerabilities
4. **Review RLS policies** before deploying schema changes
5. **Test security features** after environment changes

### For Deployment:

1. **Set all required environment variables** before deploying
2. **Use different encryption keys** for production and development
3. **Enable HTTPS** for all production domains
4. **Monitor for failed authentication attempts**
5. **Regularly audit Supabase security scanner**

---

## Reporting Security Issues

If you discover a security vulnerability, please report it responsibly:

1. **DO NOT** open a public GitHub issue
2. Contact the development team privately
3. Provide detailed reproduction steps
4. Allow reasonable time for a fix before disclosure

---

## Compliance

This application implements security measures aligned with:

- OWASP Top 10 Web Application Security Risks
- OAuth 2.0 Security Best Practices
- GDPR data protection requirements (encryption at rest)

---

## Changelog

### 2025-12-26
- Added Zod validation for AI responses in parse-task function
- Implemented AES-256-GCM encryption for OAuth tokens
- Created security documentation

---

*Last Updated: 2025-12-26*
