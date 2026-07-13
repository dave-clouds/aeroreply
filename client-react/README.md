# AeroReply - Agent Dashboard & Landing Page

The React + Vite frontend for AeroReply, an AI-powered customer support platform. This
folder houses three things in one app: the customer-facing **Landing Page**, the
interactive **ChatWidget** demo embedded on it, and the internal **Agent Workspace /
AeroHub Dashboard** used by support agents.

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
│                              # AI fallback/lead-capture. Demoed live on the
│                              # landing page, and also shipped separately via
│                              # the embed snippet on the Settings Panel.
├── assets/
│   └── hero.png               # Hero graphic used on the landing page
└── pages/
    ├── LandingPage.jsx        # Public marketing page: navbar, hero, feature
    │                          # pillars, and the live ChatWidget demo.
    ├── AgentDashboard.jsx     # Dashboard shell — responsive sidebar (hamburger
    │                          # on mobile) + view switching between the pages below.
    ├── AeroHub.jsx            # Dashboard home — ticket stats, gateway status.
    ├── AgentWorkspace.jsx     # Ticket queue + live reply console for agents.
    ├── LiveVisitors.jsx       # Live visitor counter.
    └── Settings.jsx           # Widget embed snippet + copy-to-clipboard.
```

## Running locally

This package is one of three services that make up AeroReply; the dashboard and chat
widget only work end-to-end when all three are running.

```bash
# from client-react/
npm install        # install dependencies
npm run dev         # serves on port 5000, proxies /api and /socket.io to the gateway
npm run build        # production build, output written to dist/
```

On Replit, `npm run dev` is already wired up as the `Start application` workflow. The
companion `Gateway` (`gateway-node`, port 3001) and `AI Service` (`ai-python`, port
8000) workflows must also be running for the dashboard and chat widget to function.

Other scripts:
- `npm run lint` — ESLint
- `npm run preview` — preview a production build locally

## Current Status

There is currently no routing library installed. `App.jsx` holds a single `view`
state (`'landing' | 'dashboard'`) and swaps directly between `LandingPage` and
`AgentDashboard`; `AgentDashboard` itself uses its own local state to switch between
AeroHub / Agent Workspace / Live Visitors / Settings. This is a deliberate,
temporary approach — it will be replaced with real React Router routes once
authentication is implemented, so views become addressable by URL and protected
routes (e.g. the dashboard) can gate on login state.
