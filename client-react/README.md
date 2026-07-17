# AeroReply — Frontend Client

React + Vite frontend for the AeroReply platform. Serves the public landing page, the authentication flow (Login / Register), and the internal Agent Dashboard. Talks to `gateway-node` over `/api` (REST) and `/socket.io` (real-time), both proxied through Vite in development — no hardcoded URLs needed.

## Running locally

The frontend only works end-to-end when the companion gateway (`gateway-node`, port 3001) and AI service (`ai-python`, port 8000) are also running.

```bash
# From the repo root, start the gateway and AI service first (see root README).
# Then:

cd client-react
npm install      # install dependencies
npm run dev      # start Vite dev server → http://localhost:5000
```

Other scripts:

```bash
npm run build    # production build → dist/
npm run preview  # preview the production build locally
npm run lint     # ESLint
```

---

## Quick start — Termux (Android mobile terminal)

```bash
# Install runtimes (if not already done via root README)
pkg install -y nodejs

# Inside the client-react directory
npm install
npm run dev
```

The Vite dev server listens on port 5000. Open `http://localhost:5000` in any browser on your device.

> Vite's proxy config already forwards `/api` and `/socket.io` to `localhost:3001`, so the gateway must be running in another Termux session for login, registration, and chat to work.

---

## Project structure

```
src/
├── App.jsx                    # React Router route table (/, /login, /register, /dashboard)
├── main.jsx                   # Entry point — wraps app in AuthProvider + SocketProvider
├── services/
│   └── api.js                 # Axios instance — baseURL '/api', attaches JWT automatically
├── context/
│   ├── AuthContext.jsx        # useAuth() — user/token/loading + register/login/logout
│   └── SocketContext.jsx      # Shared Socket.io client + connection state
├── components/
│   ├── ChatWidget.jsx         # Customer-facing chat widget (human-first, AI fallback)
│   └── ProtectedRoute.jsx     # Route guard — redirects to /login when unauthenticated
├── assets/
│   └── hero.png               # Hero image on the landing page
└── pages/
    ├── LandingPage.jsx        # Public marketing + "How to Use" page
    ├── Login.jsx              # Login form
    ├── Register.jsx           # Registration form
    ├── AgentDashboard.jsx     # Dashboard shell — collapsible sidebar, view switching
    ├── AeroHub.jsx            # Dashboard home — ticket stats, gateway status
    ├── AgentWorkspace.jsx     # Live ticket queue + reply console
    ├── LiveVisitors.jsx       # Real-time visitor counter
    ├── Settings.jsx           # Widget embed snippet (Integration Code)
    ├── WidgetSettings.jsx     # Widget appearance configuration
    └── AccountSettings.jsx    # User profile (name, email, project ID)

public/
├── widget.js                  # Self-contained embeddable chat widget (no framework deps)
└── assets/
    └── chat-launcher.svg      # Default launcher button icon — swap this file to rebrand
```

## Authentication

All auth state lives in `AuthContext`. The shared `api.js` Axios instance attaches the JWT from `localStorage` automatically on every request — any new feature that calls the gateway should import it rather than using bare `fetch`.

| Hook | What you get |
|---|---|
| `useAuth().user` | Current user object (`_id`, `name`, `email`, `projectId`, `widgetSettings`) or `null` |
| `useAuth().token` | Raw JWT string or `null` |
| `useAuth().loading` | `true` while the stored token is being verified on first load |
| `useAuth().login(email, pw)` | POST `/api/auth/login`, stores token, sets state |
| `useAuth().register(name, email, pw)` | POST `/api/auth/register`, same behaviour |
| `useAuth().logout()` | Clears localStorage + state, fires a best-effort logout request |

## Routing

| Path | Component | Access |
|---|---|---|
| `/` | `LandingPage` | Public |
| `/login` | `Login` | Public |
| `/register` | `Register` | Public |
| `/dashboard` | `ProtectedRoute → AgentDashboard` | Authenticated only |

`ProtectedRoute` checks `loading`, `user`, and `token` from `useAuth()`. While loading it shows a session indicator; unauthenticated visitors are redirected to `/login`.

## Environment variables (Vite)

No Vite-level `.env` variables are required for development — all backend communication uses relative paths proxied through Vite. The proxy target is set in `vite.config.js`:

```
/api       → http://localhost:3001
/socket.io → http://localhost:3001
```

For production deployments, point these to your deployed gateway URL.

## Widget embed

The embeddable widget lives at `public/widget.js` and is served as a static file. It is a self-contained IIFE — no React, no bundler, no external CDN. The launcher icon is loaded from `public/assets/chat-launcher.svg`; replacing that file is the fastest way to rebrand the widget without touching JavaScript.

See **Widget Settings** in the agent dashboard to configure colours, title, position, and icon at runtime (changes are stored in the database and applied per-project on each visitor connection).
