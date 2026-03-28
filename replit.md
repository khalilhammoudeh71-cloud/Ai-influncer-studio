# AI Influencer Studio

## Overview
A React web application for managing AI influencer personas. Users can create personas, generate content plans, create captions/scripts, chat with an AI assistant, track revenue, and generate images using 114+ AI models.

## Tech Stack
- **Frontend**: React 19 + TypeScript, Vite (port 5000)
- **Backend**: Express.js server on port 3001 (`npm run server` via tsx watch)
- **Styling**: Tailwind CSS 4 (via @tailwindcss/postcss plugin + postcss.config.js)
- **Icons**: Lucide React
- **Database**: PostgreSQL via Drizzle ORM + @neondatabase/serverless
- **Storage**: Server-side PostgreSQL for all persistent data (personas, images, revenue, planned posts)
- **Image Generation**:
  - **Replit Built-in**: OpenAI DALL-E (gpt-image-1) via Replit AI integrations (free)
  - **Wavespeed AI**: 113+ models from 20+ providers (Google, OpenAI, Midjourney, Stability AI, ByteDance, xAI, etc.) via API key stored as `WAVESPEED_API_KEY`
  - Models fetched dynamically from Wavespeed API and cached for 30 minutes
  - URL allowlisting enforced for all Wavespeed response URLs (SSRF protection)
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
  index.css            - Tailwind import with @source directive
  types/index.ts       - TypeScript types (Persona, GeneratedImage, PlannedPost, RevenueEntry)
  utils/cn.ts          - Tailwind class merge utility
  utils/personaEngine.ts - Deterministic content generation engine
  services/
    apiService.ts      - Frontend API client for all CRUD operations
    imageService.ts    - Frontend client for image generation API (single-model generation)
  components/
    ui/index.tsx       - Reusable UI components (Card, Button, Input, Badge)
    VisualGenerator.tsx - Image generation modal with model dropdown (114+ models grouped by provider)
  views/
    PersonasView.tsx   - CRUD for personas with search, detail/creations view, visual library
    PlannerView.tsx    - 7-day content plan generator (persisted per persona/platform)
    CreateView.tsx     - Caption, video script, image prompt generation
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

## CSS Configuration
- Uses `@tailwindcss/postcss` (NOT `@tailwindcss/vite` — that caused HMR crash loops due to oxide scanner)
- `postcss.config.js` configures the PostCSS plugin
- `src/index.css` has `@source "../src/**/*.{ts,tsx}"` to scope Tailwind scanning
- `vite.config.ts` has `server.watch.ignored` for `.local/**`, `.cache/**`, `server/**`, `node_modules/**`

## Data Migration
On first load, the app checks localStorage for existing data and POSTs it to `/api/migrate`.
A `ai_influencer_db_migrated` flag in localStorage prevents re-migration.
