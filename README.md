# FlowPilot (Your Day Pilot)

**AI-powered task scheduling and calendar management application**

FlowPilot is an intelligent productivity app that helps you manage your tasks, schedule your day, and sync with Google Calendar. It uses AI to automatically parse tasks and optimize your schedule based on your working hours and preferences.

## Features

- 🤖 **AI-Powered Task Parsing** - Automatically extracts task details, deadlines, and priorities from natural language
- 📅 **Smart Scheduling** - Optimizes your schedule based on task priorities, energy levels, and working hours
- 🔗 **Google Calendar Integration** - Sync events bidirectionally with your Google Calendar
- 🌍 **Multi-Language Support** - Available in English, German, Spanish, French, and Italian with automatic geo-location detection
- 📊 **Progress Tracking** - Track habits, monitor task completion, and visualize your productivity
- 🔐 **Secure** - End-to-end encryption for OAuth tokens using AES-256-GCM
- 🎨 **Modern UI** - Built with React, TypeScript, and shadcn/ui components

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **UI**: shadcn/ui, Tailwind CSS, Radix UI
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **AI**: OpenAI GPT for task parsing
- **Authentication**: Supabase Auth with Google OAuth
- **Internationalization**: react-i18next with DeepL translations
- **State Management**: TanStack Query (React Query)

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account
- Google Cloud Console project (for OAuth)
- OpenAI API key (optional, for AI features)

### Installation

1. **Clone the repository**
```sh
git clone <YOUR_GIT_URL>
cd your-day-pilot
```

2. **Install dependencies**
```sh
npm install
```

3. **Set up environment variables**

Create a `.env` file in the root directory:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
VITE_SUPABASE_PROJECT_ID=your_project_id
```

4. **Start the development server**
```sh
npm run dev
```

The app will be available at `http://localhost:5173`

### Database Setup

The project uses Supabase for the database. Migrations are located in `supabase/migrations/`.

To apply migrations:
```sh
# Using Supabase CLI
supabase db push

# Or apply them manually in the Supabase Dashboard
```

### Edge Functions

The project uses Supabase Edge Functions for:
- `parse-task` - AI-powered task parsing
- `google-calendar-auth` - Google Calendar OAuth flow
- `sync-google-calendar` - Bidirectional calendar sync
- `weekly-summary` - Generate weekly productivity summaries

Required Edge Function secrets:
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `TOKEN_ENCRYPTION_KEY` (32+ characters)
- `OPENAI_API_KEY` (optional)

## Project Structure

```
your-day-pilot/
├── src/
│   ├── components/       # Reusable UI components
│   ├── contexts/         # React contexts (Auth, etc.)
│   ├── hooks/           # Custom React hooks
│   ├── i18n/            # Internationalization files
│   ├── integrations/    # Third-party integrations (Supabase)
│   ├── pages/           # Route pages
│   └── types/           # TypeScript type definitions
├── supabase/
│   ├── functions/       # Edge Functions (Deno)
│   └── migrations/      # Database migrations
├── docs/                # Documentation
└── scripts/             # Utility scripts (e.g., DeepL translation)
```

## Development

### Running Tests

```sh
npm run test
```

### Building for Production

```sh
npm run build
```

### Linting

```sh
npm run lint
```

## Internationalization

The app supports 5 languages with automatic detection:
1. User preference (localStorage)
2. Geo-location (IP-based via ipapi.co)
3. Browser language
4. Default (English)

### Adding Translations

Use the DeepL translation script:

```sh
DEEPL_API_KEY=your_key npm run translate
```

This will automatically translate all English strings to German, Spanish, French, and Italian.

## Security

- OAuth tokens are encrypted using AES-256-GCM before storage
- All API inputs are validated using Zod schemas
- Row Level Security (RLS) enabled on all database tables
- See `SECURITY.md` for complete security documentation

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

## Support

For issues, questions, or feature requests, please open an issue on GitHub.

---

**Built with ❤️ using modern web technologies**
