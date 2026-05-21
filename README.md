# TrustLayer 🛡️

A modern risk analysis platform built with **React**, **TypeScript**, **TanStack**, and **Supabase**.

## Overview

TrustLayer is a full-stack web application that analyzes text submissions (people, companies, transactions) and provides trustworthiness assessments with AI-powered risk scoring using the Gemini API.

## Features

- 🔐 **Secure Authentication** — Supabase Auth with email/password
- 🤖 **AI Risk Analysis** — Google Gemini 2.0 Flash for intelligent assessments
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
- **Google Gemini API** — AI analysis engine

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
├── components/       # React components & UI
├── hooks/            # Custom React hooks
├── lib/              # Utilities & helpers
├── integrations/     # Supabase & external services
├── server.ts         # Server entry point
├── client.tsx        # Client entry point
└── router.tsx        # Router configuration
```

## Security Features

- ✅ Row Level Security (RLS) on database tables
- ✅ User isolation on all queries
- ✅ Protected routes with authentication middleware
- ✅ API key validation before processing
- ✅ Secure token handling with Supabase

## Available Scripts

```bash
npm run dev      # Start dev server
npm run build    # Build for production
npm run lint     # Run ESLint
npm run preview  # Preview production build
```

## License

MIT

## Support

For issues or questions, please open an issue on GitHub.
