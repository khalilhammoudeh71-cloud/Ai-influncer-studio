# AI Influencer Studio

## Overview
A React web application for managing AI influencer personas. Users can create personas, generate content plans, create captions/scripts, chat with an AI assistant, and track revenue.

## Tech Stack
- **Frontend**: React 19 + TypeScript, Vite
- **Styling**: Tailwind CSS 4 (via @tailwindcss/vite plugin)
- **Icons**: Lucide React
- **Storage**: localStorage for all data persistence
- **Image Generation**: OpenAI DALL-E 3 (requires backend API route at /api/generate-image)

## Project Structure
```
src/
  App.tsx              - Main app with tab navigation, onboarding, persona state
  main.tsx             - Entry point
  index.css            - Tailwind import
  types/index.ts       - TypeScript types (Persona, GeneratedImage, PlannedPost, RevenueEntry)
  utils/cn.ts          - Tailwind class merge utility
  utils/personaEngine.ts - Deterministic content generation engine
  services/imageService.ts - Frontend client for image generation API
  components/
    ui/index.tsx       - Reusable UI components (Card, Button, Input, Badge)
    VisualGenerator.tsx - Image generation modal
  views/
    PersonasView.tsx   - CRUD for personas with search and visual library
    PlannerView.tsx    - 7-day content plan generator
    CreateView.tsx     - Caption, video script, image prompt generation
    AssistantView.tsx  - Chat and reply generation
    RevenueView.tsx    - Revenue tracking per persona
    SettingsView.tsx   - Static settings page
api/
  generate-image.ts   - Serverless function for OpenAI DALL-E 3 (Vercel-style)
```

## Running
- Dev server: `npm run dev` on port 5000
- The image generation API requires a separate backend setup with OPENAI_API_KEY
