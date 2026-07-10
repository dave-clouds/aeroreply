# AeroReply

AI-powered customer support ticketing app with a chat widget and agent dashboard.

## Architecture (3 services)
- `client-react/` — React + Vite frontend (port 5000). Talks to the gateway via `/api` and `/socket.io`, proxied by Vite to `localhost:3001`.
- `gateway-node/` — Express + Socket.io gateway (port 3001). Handles realtime chat, persists tickets to MongoDB via Mongoose, and forwards AI requests to the Python service.
- `ai-python/` — FastAPI service (port 8000) that calls Google Gemini to generate support reply suggestions. Falls through a model fallback chain (`gemini-2.0-flash` → ...) on rate limit/unavailability.

## Running locally (Replit workflows)
- `Start application` — `cd client-react && npm run dev`
- `Gateway` — `cd gateway-node && node server.js`
- `AI Service` — `cd ai-python && uvicorn main:app --host 0.0.0.0 --port 8000 --reload`

All three must run together for full functionality (chat UI needs the gateway; AI replies need the AI service).

## Required secrets
- `MONGODB_URI` — MongoDB connection string. **Any `@` inside the password must be URL-encoded as `%40`**, otherwise Mongoose/the URI parser misreads the host. The gateway logs a "DB-less mode" warning when this is missing/fails, but socket handlers call `Ticket.findOneAndUpdate` unconditionally with no fallback — in practice chat/ticket operations will fail without a working connection, so this is effectively required.
- `GEMINI_API_KEY` — Google Gemini API key for AI-generated replies. Without it, AI responses are unavailable.

## User preferences
None recorded yet.
