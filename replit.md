# AI Influencer Studio

## Overview
A React web application for managing AI influencer personas. Users can create personas, generate content plans, create captions/scripts, chat with an AI assistant, track revenue, generate images using 114+ AI models, manage AI voice/audio, and access AI creative tools (face swap, virtual try-on, background removal, hairstyle, headshot studio, time machine, story chains, talking head).

## Tech Stack
- **Frontend**: React 19 + TypeScript, Vite (port 5000)
- **Backend**: Express.js server on port 3001 (`npm run server` via tsx watch)
- **Styling**: Tailwind CSS 4 (via @tailwindcss/postcss plugin + postcss.config.js)
- **Icons**: Lucide React
- **Database**: PostgreSQL via Drizzle ORM + @neondatabase/serverless
- **Storage**: Server-side PostgreSQL for all persistent data (personas, images, revenue, planned posts)
- **Image Generation** (4 canonical provider groups in picker):
  - **Gemini** (google: prefix): Nano Banana 2/Pro/base, Imagen 4/4-Fast/4-Ultra via Gemini API key (`GEMINI_API_KEY`) — free
  - **OpenAI** (openai: prefix): GPT Image 2 via direct `Openai_api_key` secret (~$0.040/img). Falls back to `replit:gpt-image-1` via Replit integration if no direct key
  - **Wavespeed AI** (wavespeed: prefix): 120+ models via `WAVESPEED_API_KEY` — fetched dynamically, cached 30 min
  - **Venice AI** (venice: prefix): 24+ image models via `Veniceai_api_key` — fetched dynamically with real pricing; NSFW models flagged with 🔞
  - NSFW indicators: `🔞` emoji throughout all dropdowns and detail badges (replaced previous `🔓` icon)
- **Video Generation**:
  - Text-to-video and image-to-video via Wavespeed AI models
  - Model ID prefixes: `wavespeed-t2v:{id}` (text-to-video), `wavespeed-i2v:{id}` (image-to-video)
  - Videos return HTTP URLs (not base64); polled up to 3 minutes for completion
  - VisualGenerator has Image/Video mode toggle; videos saved to Visual Library with `mediaType: 'video'`
  - PersonasView gallery shows video badge, preview modal plays video with controls

## Database Schema
Tables managed in `shared/schema.ts`:
- `personas` - AI persona profiles with all settings
- `generated_images` - Visual library images linked to personas
- `revenue_entries` - Revenue tracking entries per persona
- `planned_posts` - 7-day content plans per persona/platform
- `conversations` / `messages` - Chat conversations (integration)

Schema is auto-created on server startup via `CREATE TABLE IF NOT EXISTS`.

## Project Structure
```
src/
  App.tsx              - Main app with API-backed state, loading, localStorage migration
  main.tsx             - Entry point
  index.css            - Tailwind import, CSS custom properties (design tokens), utility classes (.glass, .gradient-text, .animate-shimmer)
  types/index.ts       - TypeScript types (Persona, GeneratedImage, PlannedPost, RevenueEntry)
  lib/
    supabase.ts        - Supabase client stub (safe no-op if VITE_SUPABASE_URL not set)
  utils/
    cn.ts              - Tailwind class merge utility
    personaEngine.ts   - Deterministic content generation engine
    imageProcessing.ts - HEIC/image resize+compress utility for file uploads
  services/
    apiService.ts      - Frontend API client for all CRUD operations (including api.voice.*, api.images.generateVideo)
    imageService.ts    - Image/video generation client (faceSwap, removeBackground, virtualTryOn, textToSpeech, generateTalkingHead, lookSwap)
  components/
    VisualGenerator.tsx - Image generation modal with model dropdown (114+ models grouped by provider)
    VoiceStudio.tsx    - TTS voice studio component
    TalkingHeadStudio.tsx - Talking head video generation component
    StoryChainStudio.tsx - AI story chain visual component
    HeadshotStudio.tsx - Professional headshot generator component
    TimeMachine.tsx    - Age/era transformation component
    HairstyleTryOn.tsx - Hairstyle try-on component
    RotatingHeroImages.tsx - Infinite-scroll hero image carousel
  views/
    LandingView.tsx    - Marketing landing page (animated hero, influencer showcase, feature highlights, CTA) shown on first visit; skipped for returning users via localStorage flag
    PersonasView.tsx   - CRUD for personas with search, detail/creations view, visual library
    PlannerView.tsx    - 7-day content plan generator (persisted per persona/platform)
    CreateView.tsx     - Caption, video script, image prompt generation
    VoiceView.tsx      - AI voice studio (TTS, talking head, audio generation)
    AIToolsView.tsx    - AI creative tools (face swap, virtual try-on, bg removal, hairstyle, headshot, etc.)
    AssistantView.tsx  - Chat and reply generation (uses gpt-image-1 for image requests)
    RevenueView.tsx    - Revenue tracking per persona (API-backed)
    SettingsView.tsx   - Static settings page
shared/
  schema.ts            - Drizzle ORM schema definitions for all tables
server/
  index.ts             - Express backend: GET /api/models, POST /api/generate-image (routes to Replit or Wavespeed), GET /api/health, schema push on startup
  db.ts                - Database connection (Drizzle + Neon serverless)
  routes.ts            - RESTful CRUD API routes for all data entities
```

## API Endpoints
- `GET /api/models` - Returns all available image/video generation models (built-in + Wavespeed), grouped by provider
- `POST /api/generate-image` - Generates a single image using the specified `modelId` (prefix: `replit:` or `wavespeed:`)
- `POST /api/generate-video` - Generates a video using Wavespeed (prefix: `wavespeed-t2v:` or `wavespeed-i2v:`)
- `GET /api/health` - Health check
- `GET/POST /api/personas` - List/create personas
- `PUT/DELETE /api/personas/:clientId` - Update/delete persona
- `GET/POST /api/personas/:id/images` - List/add generated images
- `DELETE /api/personas/:id/images/:imageId` - Delete an image
- `GET /api/revenue/:personaId` - List revenue entries
- `POST /api/revenue` - Create revenue entry
- `DELETE /api/revenue/:id` - Delete revenue entry
- `GET/PUT /api/planned-posts/:personaId` - Get/save planned posts
- `POST /api/migrate` - One-time localStorage migration endpoint

## Running
- Frontend: `npm run dev` on port 5000
- Backend: `npm run server` on port 3001
- Vite proxies all `/api` requests to the backend (port 3001)
- Env vars: `DATABASE_URL`, `AI_INTEGRATIONS_OPENAI_API_KEY`, `AI_INTEGRATIONS_OPENAI_BASE_URL`, `WAVESPEED_API_KEY`

## Design System
- **Color Palette**: CSS custom properties in `src/index.css`
  - Backgrounds: `--bg-base: #050507`, `--bg-surface: #0e0e12`, `--bg-elevated: #161619`, `--bg-overlay: #1e1e23`
  - Borders: `--border-subtle`, `--border-default`, `--border-strong` (white with varying opacity)
  - Text: `--text-primary: #f4f4f5`, `--text-secondary: #a1a1aa`, `--text-tertiary: #63637a`, `--text-muted: #3f3f50`
  - Accent gradients: violet-600 to fuchsia-600 (primary), amber/gold (premium), emerald (success), rose (danger)
- **Typography**: Inter (Google Fonts via @import), applied globally
- **Animations**: Framer Motion (AnimatePresence page transitions, spring nav indicator, staggered list items, modals), CSS keyframes (fadeInUp, shimmer, skeleton-wave, glow-ping, hero-float)
- **App Shell**: Fixed top app bar (54px) + scrollable 8-tab bottom nav bar (88px). Main content area uses `pt-[54px] pb-[88px]`.
- **Utility Classes**: `.glass` / `.glass-strong` (backdrop-blur), `.gradient-text`, `.gradient-border`, `.premium-card` / `.premium-card-selected`, `.premium-button`, `.premium-input`, `.premium-header`, `.tag-pill`, `.skeleton` (loading shimmer), `.scrollbar-hide`, `.bubble-user` / `.bubble-assistant`, `.ring-glow`, `.avatar-ring`, `.stagger-1..5`, `.chip-gradient`, `.section-label`
- **UI Components**: `src/components/ui/index.tsx` — Card, Button (primary/secondary/ghost/danger/accent variants), Input, Badge

## CSS Configuration
- Uses `@tailwindcss/postcss` (NOT `@tailwindcss/vite` — that caused HMR crash loops due to oxide scanner)
- `postcss.config.js` configures the PostCSS plugin
- `src/index.css` has `@import url(Google Fonts)` BEFORE `@source` to satisfy CSS spec order requirements
- `src/index.css` has `@source "../src/**/*.{ts,tsx}"` to scope Tailwind scanning
- `vite.config.ts` has `server.watch.ignored` for `.local/**`, `.cache/**`, `server/**`, `node_modules/**`

## Data Migration
On first load, the app checks localStorage for existing data and POSTs it to `/api/migrate`.
A `ai_influencer_db_migrated` flag in localStorage prevents re-migration.
