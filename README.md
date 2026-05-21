# TrustLayer 🛡️

A modern risk analysis platform built with **React**, **TypeScript**, **TanStack**, and **Supabase**.

## Overview

TrustLayer is a full-stack web application that analyzes text submissions (people, companies, transactions) and provides trustworthiness assessments with AI-powered risk scoring using the Google Gemini 3 Flash API.

## Features

- 🔐 **Secure Authentication** — Supabase Auth with email/password
- 🤖 **AI Risk Analysis** — Google Gemini 3 Flash Preview for intelligent assessments
- 📊 **Trust Scoring** — 0-100 score with risk levels (low/medium/high)
- 📈 **Dashboard** — Overview of submissions and trends
- 📜 **History** — Track all past submissions and results
- 🎨 **Modern UI** — Built with shadcn/ui and Tailwind CSS
- ⚡ **Type-Safe** — Full TypeScript with strict type checking
- 🚀 **Server Functions** — TanStack Start for seamless client-server communication

## Tech Stack

### Frontend

- **React 18** — UI framework
- **TypeScript** — Type safety
- **TanStack Router** — File-based routing
- **TanStack React Query** — Server state management
- **Tailwind CSS** — Styling
- **shadcn/ui** — Component library
- **Lucide React** — Icons
- **Sonner** — Toast notifications

### Backend

- **TanStack React Start** — Full-stack framework
- **Supabase** — Authentication & PostgreSQL database
- **Google Gemini 3 API** — AI analysis engine

### Development

- **Vite 5** — Build tool
- **ESLint & TypeScript** — Code quality

## Getting Started

### Prerequisites

- Node.js 18+ (tested on Node 21)
- npm or yarn
- Supabase account
- Google Gemini API key

### Installation

```bash
# Install dependencies (use legacy-peer-deps for compatibility)
npm install --legacy-peer-deps

# Start dev server
npm run dev
```

### Environment Variables

Create a `.env.local` file:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_key
GEMINI_API_KEY=your_gemini_api_key
```

### Database Setup

Run migrations:

```bash
supabase db push
```

## Project Structure

```
src/
├── routes/           # File-based routing (TanStack Router)
│   ├── __root.tsx    # Root layout & providers
│   ├── _authenticated/  # Protected route group
│   ├── index.tsx     # Home / login page
│   ├── login.tsx     # Auth page
│   └── results.$id.tsx # Result details
├── components/       # React components & UI
├── hooks/            # Custom React hooks (useAuth, useMobile)
├── lib/              # Utilities & helpers (analysis.functions, error handling)
├── integrations/     # Supabase & external services
├── client.tsx        # Client entry point (React hydration)
├── router.tsx        # Router configuration
└── styles.css        # Global styles & Tailwind theme
```

## Security Features

- ✅ Row Level Security (RLS) on database tables (enforced at DB level)
- ✅ User isolation on all queries (`.eq("user_id", user?.id)`)
- ✅ Protected routes with auth context
- ✅ Client-side auth with Supabase Session
- ✅ Secure token handling (browser session storage)

## Environment Variables

Create `.env.local` in the root:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_key
VITE_GEMINI_API_KEY=your_gemini_api_key  # ⚠️ Exposed in client - use Edge Function in production
```

## Available Scripts

```bash
npm run dev      # Start dev server on http://localhost:5173/
npm run build    # Build for production
npm run lint     # Run ESLint
npm run preview  # Preview production build
```

## License

MIT

## Support

For issues or questions, please open an issue on GitHub.
