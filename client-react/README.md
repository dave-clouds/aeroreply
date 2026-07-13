# AeroReply — client-react

The React + Vite frontend for AeroReply, an AI-powered customer support platform. This
package contains both the public marketing site and the internal Agent Dashboard, plus
the embeddable customer-facing chat widget.

It talks to the `gateway-node` service over REST (`/api/...`) and Socket.io
(`/socket.io`), both proxied through Vite in development. The gateway is what actually
persists tickets to MongoDB and forwards AI requests to the `ai-python` service — this
package has no direct backend logic of its own.

## Project structure

```
src/
├── App.jsx                    # Top-level view switcher (landing ↔ dashboard)
├── main.jsx                   # Entry point, wraps the app in SocketProvider
├── context/
│   └── SocketContext.jsx      # Shared Socket.io client + connection state
├── components/
│   └── ChatWidget.jsx         # Customer-facing chat widget — human-first with
│                              # AI fallback/lead-capture. NOT rendered inside the
│                              # dashboard; it's demoed on the landing page and
│                              # shipped separately via the embed snippet on the
│                              # Settings Panel.
└── pages/
    ├── LandingPage.jsx        # Public marketing page: navbar, hero, feature
    │                          # pillars, and a live ChatWidget demo.
    ├── AgentDashboard.jsx     # Dashboard shell — responsive sidebar (hamburger
    │                          # on mobile) + view switching between the pages below.
    ├── AeroHub.jsx            # Dashboard home — ticket stats, gateway status.
    ├── AgentWorkspace.jsx     # Ticket queue + live reply console for agents.
    ├── LiveVisitors.jsx       # Live visitor counter.
    └── Settings.jsx           # Widget embed snippet + copy-to-clipboard.
```

## Running locally

This package is one of three services that make up AeroReply; the dashboard and chat
widget only work end-to-end when all three are running:

```bash
# from client-react/
npm install
npm run dev       # serves on port 5000, proxies /api and /socket.io to the gateway
```

On Replit, this is already wired up as the `Start application` workflow. The
companion `Gateway` (`gateway-node`, port 3001) and `AI Service` (`ai-python`, port
8000) workflows must also be running.

Other scripts:
- `npm run build` — production build (`dist/`)
- `npm run lint` — ESLint
- `npm run preview` — preview a production build locally

## Routing note

There is currently no routing library installed. `App.jsx` holds a single `view`
state (`'landing' | 'dashboard'`) and swaps between `LandingPage` and
`AgentDashboard` directly; `AgentDashboard` itself uses its own local state to switch
between AeroHub / Agent Workspace / Live Visitors / Settings. This is a deliberate
placeholder — the next phase replaces both of these with real React Router routes
(e.g. `/`, `/dashboard`, `/dashboard/workspace`, ...) so views are addressable by URL.
