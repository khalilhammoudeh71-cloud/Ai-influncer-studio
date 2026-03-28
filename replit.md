# AI Influencer Studio

## Overview
A React web application for managing AI influencer personas. Users can create personas, generate content plans, create captions/scripts, chat with an AI assistant, track revenue, and generate images using 114+ AI models.

## Tech Stack
- **Frontend**: React 19 + TypeScript, Vite (port 5000)
- **Backend**: Express.js server on port 3001 (`npm run server` via tsx watch)
- **Styling**: Tailwind CSS 4 (via @tailwindcss/postcss plugin + postcss.config.js)
- **Icons**: Lucide React
- **Storage**: localStorage for all data persistence
- **Image Generation**:
  - **Replit Built-in**: OpenAI DALL-E (gpt-image-1) via Replit AI integrations (free)
  - **Wavespeed AI**: 113+ models from 20+ providers (Google, OpenAI, Midjourney, Stability AI, ByteDance, xAI, etc.) via API key stored as `WAVESPEED_API_KEY`
  - Models fetched dynamically from Wavespeed API and cached for 30 minutes
  - URL allowlisting enforced for all Wavespeed response URLs (SSRF protection)

## Project Structure
```
src/
  App.tsx              - Main app with tab navigation, onboarding, persona state
  main.tsx             - Entry point
  index.css            - Tailwind import with @source directive
  types/index.ts       - TypeScript types (Persona, GeneratedImage, PlannedPost, RevenueEntry)
  utils/cn.ts          - Tailwind class merge utility
  utils/personaEngine.ts - Deterministic content generation engine
  services/imageService.ts - Frontend client for image generation API (single-model generation)
  components/
    ui/index.tsx       - Reusable UI components (Card, Button, Input, Badge)
    VisualGenerator.tsx - Image generation modal with model dropdown (114+ models grouped by provider)
  views/
    PersonasView.tsx   - CRUD for personas with search and visual library
    PlannerView.tsx    - 7-day content plan generator
    CreateView.tsx     - Caption, video script, image prompt generation
    AssistantView.tsx  - Chat and reply generation (uses gpt-image-1 for image requests)
    RevenueView.tsx    - Revenue tracking per persona
    SettingsView.tsx   - Static settings page
server/
  index.ts             - Express backend: GET /api/models, POST /api/generate-image (routes to Replit or Wavespeed), GET /api/health
```

## API Endpoints
- `GET /api/models` - Returns all available image generation models (built-in + Wavespeed), grouped by provider
- `POST /api/generate-image` - Generates a single image using the specified `modelId` (prefix: `replit:` or `wavespeed:`)
- `GET /api/health` - Health check

## Running
- Frontend: `npm run dev` on port 5000
- Backend: `npm run server` on port 3001
- Vite proxies all `/api` requests to the backend (port 3001)
- Env vars: `AI_INTEGRATIONS_OPENAI_API_KEY`, `AI_INTEGRATIONS_OPENAI_BASE_URL`, `WAVESPEED_API_KEY`

## CSS Configuration
- Uses `@tailwindcss/postcss` (NOT `@tailwindcss/vite` — that caused HMR crash loops due to oxide scanner)
- `postcss.config.js` configures the PostCSS plugin
- `src/index.css` has `@source "../src/**/*.{ts,tsx}"` to scope Tailwind scanning
- `vite.config.ts` has `server.watch.ignored` for `.local/**`, `.cache/**`, `server/**`, `node_modules/**`
