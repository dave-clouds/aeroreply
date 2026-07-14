# AeroReply Frontend Client

The React + Vite frontend for AeroReply, an AI-powered hybrid support
platform. This app is one of three services that make up AeroReply (see the
[root README](../README.md) for the full architecture); it has no direct
database or AI logic of its own and instead talks to `gateway-node` over
REST (`/api/...`) and Socket.io (`/socket.io`), both proxied through Vite in
development.

This package houses three things in one app: the customer-facing
**Landing Page** (with an embedded `ChatWidget` demo), the authentication
flow (**Login** / **Register**), and the internal **Agent Dashboard** used by
support agents.

## Project structure

```
src/
├── App.jsx                    # React Router route table (/, /login, /register, /dashboard)
├── main.jsx                   # Entry point — wraps the app in AuthProvider + SocketProvider
├── services/
│   └── api.js                 # Axios instance — baseURL '/api', attaches JWT automatically
├── context/
│   ├── AuthContext.jsx        # useAuth() — user/token/loading state, register/login/logout
│   └── SocketContext.jsx      # Shared Socket.io client + connection state
├── components/
│   ├── ChatWidget.jsx         # Customer-facing chat widget — human-first with
│   │                          # AI fallback/lead-capture. Demoed live on the
│   │                          # landing page, and also shipped separately via
│   │                          # the embed snippet on the Settings Panel.
│   └── ProtectedRoute.jsx     # Route guard — redirects to /login when unauthenticated
├── assets/
│   └── hero.png               # Hero graphic used on the landing page
└── pages/
    ├── LandingPage.jsx        # Public marketing page: navbar, hero, feature
    │                          # pillars, and the live ChatWidget demo.
    ├── Login.jsx              # Login form, wired to useAuth().login()
    ├── Register.jsx           # Registration form, wired to useAuth().register()
    ├── AgentDashboard.jsx     # Dashboard shell — responsive sidebar (hamburger
    │                          # on mobile), view switching, and the Log out button.
    ├── AeroHub.jsx            # Dashboard home — ticket stats, gateway status.
    ├── AgentWorkspace.jsx     # Ticket queue + live reply console for agents.
    ├── LiveVisitors.jsx       # Live visitor counter.
    └── Settings.jsx           # Widget embed snippet + copy-to-clipboard.
```

## State management & authentication

### `services/api.js` — the shared Axios instance

A single Axios instance is exported with `baseURL: '/api'` (relative, so it
rides the same Vite proxy → `gateway-node` in dev, and the same origin in
production). A request interceptor reads the JWT from `localStorage` on
every outgoing call and attaches it automatically:

```js
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})
```

Any new feature that needs to call the gateway should import this `api`
instance rather than using a bare `fetch`/`axios` call — it guarantees
authenticated requests without any extra wiring.

### `context/AuthContext.jsx` — `useAuth()`

`AuthProvider` (mounted around the whole app in `main.jsx`) holds three
pieces of state — `user`, `token`, `loading` — and exposes:

| Function | Behavior |
|---|---|
| `register(name, email, password)` | `POST /api/auth/register`, stores the returned token in `localStorage`, sets `user`/`token` state. |
| `login(email, password)` | `POST /api/auth/login`, same storage/state behavior as `register`. |
| `logout()` | Clears `localStorage` and state immediately, then fires a best-effort `POST /api/auth/logout` (stateless — errors are ignored). |

On first mount, an initialization `useEffect` checks `localStorage` for an
existing token. If found, it calls `GET /api/auth/me` (via the shared `api`
instance, so the token is attached automatically) to restore `user`; an
invalid/expired token is cleared. `loading` stays `true` until this
resolves, so consumers (like `ProtectedRoute`) never briefly render the
wrong screen while the session is being verified.

Any component can access this state with:

```jsx
import { useAuth } from '../context/AuthContext'

const { user, token, loading, login, register, logout } = useAuth()
```

### `pages/Login.jsx` & `pages/Register.jsx`

Both forms call `useAuth()` directly — no local mock state. On submit they:
1. Set a `submitting` flag (disables the button and swaps its label, e.g.
   "Logging in…" / "Creating account…") to prevent duplicate submissions.
2. Call `login(...)` / `register(...)`.
3. On success, `useNavigate()` redirects to `/dashboard`.
4. On failure, the backend's `error.message` (e.g. "Invalid email or
   password", "User already exists") is captured into local `error` state
   and rendered as an inline alert above the form.

### `components/ProtectedRoute.jsx`

```jsx
<ProtectedRoute>
  <AgentDashboard />
</ProtectedRoute>
```

Reads `user`, `token`, `loading` from `useAuth()`:
- **`loading === true`** → renders a "Loading secure session…" indicator
  (prevents a flash of the login screen while the token is being verified).
- **No `user`/`token`** → `<Navigate to="/login" replace />`.
- **Authenticated** → renders `children`.

## Routing

Routing is handled by `react-router-dom`, set up in `App.jsx`:

| Path | Element | Notes |
|---|---|---|
| `/` | `LandingPage` | Public marketing page. "Go to Dashboard" navigates to `/dashboard`. |
| `/login` | `Login` | Public. Links to `/register`. |
| `/register` | `Register` | Public. Links to `/login`. |
| `/dashboard` | `ProtectedRoute` → `AgentDashboard` | Requires an authenticated session; unauthenticated visitors are redirected to `/login`. |

The dashboard shell (`AgentDashboard.jsx`) has its own internal Log out
button in the sidebar, wired to `useAuth().logout()` followed by
`navigate('/login')`.

## Running locally

This package only works end-to-end when the companion `Gateway`
(`gateway-node`, port 3001) and `AI Service` (`ai-python`, port 8000) are
also running — Vite proxies `/api` and `/socket.io` to `localhost:3001`.

```bash
# from client-react/
npm install          # install dependencies
npm run dev          # start the Vite dev server — serves on port 5000
npm run build         # production build, output written to dist/
npm run preview       # preview a production build locally
npm run lint          # ESLint
```

On Replit, `npm run dev` is already wired up as the `Start application`
workflow, run in parallel with the `Gateway` and `AI Service` workflows
under the top-level `Project` workflow.
