# AI Influencer Studio

## Overview
A React web application for managing AI influencer personas. Users can create personas, generate content plans, create captions/scripts, chat with an AI assistant, and track revenue.

## Tech Stack
- **Frontend**: React 19 + TypeScript, Vite (port 5000)
- **Backend**: Express.js server on port 3001 (`npm run server` via tsx watch)
- **Styling**: Tailwind CSS 4 (via @tailwindcss/vite plugin)
- **Icons**: Lucide React
- **Storage**: localStorage for all data persistence
- **Image Generation**: Google Gemini via Replit AI Integrations (no user API key needed)
  - Fast model: `gemini-2.5-flash-image` ("nano banana")
  - Pro model: `gemini-3-pro-image-preview` ("nano banana pro")

## Project Structure
```
src/
  App.tsx              - Main app with tab navigation, onboarding, persona state
  main.tsx             - Entry point
  index.css            - Tailwind import
  types/index.ts       - TypeScript types (Persona, GeneratedImage, PlannedPost, RevenueEntry)
  utils/cn.ts          - Tailwind class merge utility
  utils/personaEngine.ts - Deterministic content generation engine
  services/imageService.ts - Frontend client for image generation API (model selection support)
  components/
    ui/index.tsx       - Reusable UI components (Card, Button, Input, Badge)
    VisualGenerator.tsx - Image generation modal with Gemini model selector UI
  views/
    PersonasView.tsx   - CRUD for personas with search and visual library
    PlannerView.tsx    - 7-day content plan generator
    CreateView.tsx     - Caption, video script, image prompt generation
    AssistantView.tsx  - Chat and reply generation
    RevenueView.tsx    - Revenue tracking per persona (localStorage per persona)
    SettingsView.tsx   - Static settings page
server/
  index.ts             - Express backend: POST /api/generate-image using Gemini
```

## Running
- Frontend: `npm run dev` on port 5000
- Backend: `npm run server` on port 3001
- Vite proxies all `/api` requests to the backend (port 3001)
- Env vars used by backend: `AI_INTEGRATIONS_GEMINI_API_KEY`, `AI_INTEGRATIONS_GEMINI_BASE_URL`
