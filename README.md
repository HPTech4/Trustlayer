# TrustLayer 🛡️ — AI-Powered Trust Analysis Platform

> **Analyze text. Get trust scores. Make informed decisions.**

A modern, full-stack web application that analyzes user-submitted text and provides trust credibility scores (0-100) using Google Gemini AI. Track submissions, view detailed analysis reports, and leverage AI-powered insights.

---

## 1️⃣ **Project Overview**

**TrustLayer** is an AI-powered platform designed to assess the trustworthiness of text submissions through intelligent analysis. Users can submit content (people profiles, company information, transaction details), receive real-time trust scores, and access detailed AI-generated explanations. Built with modern web technologies, it combines secure authentication, real-time data processing, and intuitive UI/UX.

**Use Cases:**
- Due diligence analysis
- Content credibility verification
- Fraud detection
- Risk assessment

---

## 2️⃣ **Key Features**

✅ **User Authentication** — Secure email/password auth via Supabase  
✅ **AI Trust Scoring** — Google Gemini 3 Flash (0-100 scale)  
✅ **Text Submission** — Submit 10-5,000 character entries  
✅ **Detailed Results** — Trust score + AI explanations + original text  
✅ **Submission History** — Complete audit trail with filtering  
✅ **Dashboard** — Stats overview and recent activity  
✅ **Risk Badges** — Visual indicators (low/medium/high)  
✅ **Responsive Design** — Mobile-first, light indigo theme  
✅ **Row-Level Security** — User data isolation at DB level  
✅ **Lightning Fast** — Vite builds, optimized bundle

---

## 3️⃣ **Tech Stack**

| Layer | Technology | Version |
|-------|-----------|---------|
| **Frontend** | React | 18.2.0 |
| **Language** | TypeScript | 5.2.2 |
| **Routing** | TanStack Router | 1.168.7 |
| **State** | React Query | 5.28.0 |
| **Styling** | Tailwind CSS | 4.3.0 |
| **UI Components** | shadcn/ui | Latest |
| **Build** | Vite | 5.4.21 |
| **Backend** | Supabase | Latest |
| **Database** | PostgreSQL | (via Supabase) |
| **AI Engine** | Google Gemini 3 Flash | Latest |
| **Icons** | Lucide React | 0.376.0 |
| **Notifications** | Sonner | 1.3.1 |

---

## 4️⃣ **Prerequisites**

Before you begin, ensure you have:

- **Node.js** 21.2.0+ ([Download](https://nodejs.org/))
- **npm** or **yarn** (comes with Node)
- **Git** for version control
- **Supabase Account** (free tier: [supabase.com](https://supabase.com))
- **Google Gemini API Key** ([Get it](https://aistudio.google.com/app/apikey))

---

## 5️⃣ **Installation & Setup**

### Clone & Install
```bash
git clone https://github.com/yourusername/trustlayer.git
cd trustlayer
npm install --legacy-peer-deps
```

### Configure Environment
Create `.env.local` in the project root:

```env
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# Google Gemini
GEMINI_API_KEY=your-gemini-api-key-here

# Optional
NODE_ENV=development
VITE_API_URL=http://localhost:4000
```

> ⚠️ **Never commit `.env.local`** — Add to `.gitignore`

---

## 6️⃣ **Running Locally**

### Development Server
```bash
npm run dev
```
Open **http://localhost:4000** — Hot reload enabled

### Build for Production
```bash
npm run build
```
Outputs to `dist/` — Includes TypeScript type checking + Vite bundling

### Lint Code
```bash
npm run lint
```
Uses ESLint with strict rules (`max-warnings: 0`)

### Preview Production Build
```bash
npm run preview
```
Test the production build locally at **http://localhost:4000**

---

## 7️⃣ **Project Structure**

```
trustlayer/
├── src/
│   ├── routes/                    # TanStack Router pages (file-based)
│   │   ├── index.tsx             # Landing page
│   │   ├── login.tsx             # Auth (sign in/up)
│   │   ├── __root.tsx            # Root layout + providers
│   │   ├── _authenticated.tsx    # Protected routes layout
│   │   ├── results.$id.tsx       # Result detail page
│   │   └── _authenticated/
│   │       ├── dashboard.tsx     # Dashboard stats
│   │       ├── submit.tsx        # Submission form
│   │       └── history.tsx       # Submission history
│   │
│   ├── components/                # React components
│   │   ├── app-sidebar.tsx       # Main navigation
│   │   ├── risk-badge.tsx        # Status/risk indicators
│   │   └── ui/                   # shadcn/ui components
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── input.tsx
│   │       ├── dialog.tsx
│   │       └── ... (27 more)
│   │
│   ├── integrations/              # External service clients
│   │   └── supabase/
│   │       ├── client.ts         # Supabase client
│   │       ├── auth-middleware.ts
│   │       └── types.ts
│   │
│   ├── hooks/                     # Custom React hooks
│   │   ├── use-auth.tsx          # Auth state
│   │   └── use-mobile.tsx        # Responsive detection
│   │
│   ├── lib/                       # Utilities
│   │   ├── analysis.functions.ts # AI analysis logic
│   │   ├── utils.ts              # Helper functions
│   │   └── error-capture.ts      # Error handling
│   │
│   ├── styles.css                # Global styles + CSS variables
│   ├── start.ts                  # Entry point
│   └── server.ts                 # Express server config
│
├── supabase/                      # Supabase local setup
│   ├── migrations/               # DB migrations
│   └── config.toml
│
├── public/                        # Static assets
├── Dockerfile                     # Container image
├── docker-compose.yml            # Local dev container
├── .env.local                    # Environment variables (git-ignored)
├── package.json                  # Dependencies
├── tsconfig.json                 # TypeScript config
├── vite.config.ts               # Vite config
├── eslint.config.js             # ESLint rules
└── README.md                     # This file
```

---

## 8️⃣ **Architecture & Key Flows**

### Authentication Flow
1. User signs up/logs in via email/password
2. Supabase generates JWT token
3. Token stored in localStorage
4. Each API request includes token in `Authorization` header
5. Supabase Row-Level Security (RLS) isolates user data

### Trust Analysis Flow
1. User submits text (10-5000 chars) on `/submit` page
2. Frontend sends to backend via React Query mutation
3. Backend validates input, calls Google Gemini API
4. Gemini analyzes text, returns trust score (0-100)
5. Result stored in Supabase PostgreSQL
6. User redirected to `/results/{id}` to view detailed report

### Data Isolation
- Every table has `user_id` column
- Supabase RLS policies enforce `user_id = auth.uid()`
- Users can only access their own data

---

## 9️⃣ **Deployment**

### Option A: Vercel (Recommended for Vite)
```bash
npm run build  # Test locally
git push       # Push to GitHub
```
Connect GitHub repo to [Vercel Dashboard](https://vercel.com) → auto-deploys on push

**Env vars in Vercel Dashboard:**
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `GEMINI_API_KEY`

### Option B: Docker
```bash
docker build -t trustlayer .
docker run -p 4000:4000 \
  -e VITE_SUPABASE_URL=... \
  -e VITE_SUPABASE_ANON_KEY=... \
  -e GEMINI_API_KEY=... \
  trustlayer
```

### Option C: Railway / Render
1. Connect GitHub repo
2. Set env vars in dashboard
3. Deploy (auto-builds via Node buildpack)

### Option D: Self-Hosted
```bash
npm run build
npm run preview  # Or use `node dist/server.js` if Express server
```
Use PM2 or systemd to manage process

---

## 🔟 **Contributing & Support**

### Reporting Issues
Found a bug? Create an issue on GitHub:
```
https://github.com/yourusername/trustlayer/issues
```

### Contributing Code
1. Fork the repo
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push: `git push origin feature/amazing-feature`
5. Open Pull Request

### Community
- 💬 Discussions: [GitHub Discussions](https://github.com/yourusername/trustlayer/discussions)
- 📧 Email: alimiazeez400@gmail.com 

---

## 📋 **Environment Variables Checklist**

Before deploying, ensure:

- [ ] `VITE_SUPABASE_URL` — Your Supabase project URL
- [ ] `VITE_SUPABASE_ANON_KEY` — Supabase anon public key (safe to expose)
- [ ] `GEMINI_API_KEY` — Google AI API key (keep secret on backend)
- [ ] `.env.local` in `.gitignore`

---

## 📚 **Resources**

- [React Docs](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Vite Guide](https://vitejs.dev/guide/)
- [TanStack Router](https://tanstack.com/router/latest)
- [Supabase Docs](https://supabase.com/docs)
- [Google Gemini API](https://ai.google.dev/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [shadcn/ui](https://ui.shadcn.com)

---

## 📄 **License**

MIT License — See [LICENSE](./LICENSE) file

---

## 👤 **Author**

Built by **[Alimi Azeez Opeyemi]**

**Acknowledgments:**
- shadcn/ui for beautiful components
- Supabase for backend infrastructure
- Google for Gemini AI API

---

**Happy coding! 🚀** For questions or feedback, open an issue or reach out directly.
- Google Gemini API key


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
