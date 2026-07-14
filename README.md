# AeroReply - Modular Hybrid AI/Human Live Support SaaS Platform

AeroReply is a modular customer-support platform that pairs an AI response
engine with a real-time human agent dashboard. Every incoming customer
message is triaged instantly by Google Gemini; when a conversation needs a
person — explicit request, frustration, or a repeated unresolved complaint —
it's escalated automatically and handed off to a live agent, with the full
conversation history intact.

The system is a **hybrid AI/human architecture**: AI handles the first line
of support at scale, and humans step in only when a conversation actually
needs judgment, empathy, or account-level access.

## Architecture

AeroReply is split into three independently-run services plus a shared
MongoDB database:

```
┌─────────────────┐        ┌──────────────────┐        ┌───────────────────┐
│  client-react    │  REST  │  gateway-node     │  REST  │  ai-python         │
│  React + Vite    │◄──────►│  Express +        │◄──────►│  FastAPI +         │
│  (port 5000)     │ Socket │  Socket.io        │  HTTP  │  Google Gemini     │
│                  │  .io   │  (port 3001)      │        │  (port 8000)       │
└─────────────────┘        └─────────┬─────────┘        └───────────────────┘
                                      │
                                      │ Mongoose
                                      ▼
                              ┌───────────────┐
                              │   MongoDB     │
                              │ (Users +      │
                              │  Tickets)     │
                              └───────────────┘
```

- **`client-react/`** — the React + Vite frontend. Serves the public landing
  page (with an embedded live `ChatWidget` demo) and the internal Agent
  Dashboard (AeroHub, Agent Workspace, Live Visitors, Settings). Talks to the
  gateway over `/api` (REST) and `/socket.io` (real-time), both proxied by
  Vite in development. Also owns authentication: `AuthContext`, the Login/
  Register forms, and `<ProtectedRoute>`.
- **`gateway-node/`** — the Express + Socket.io gateway. This is the system's
  hub: it persists tickets and users to MongoDB via Mongoose, brokers
  real-time chat between customers and agents, forwards AI requests to the
  Python service, and owns the entire authentication system (see below).
- **`ai-python/`** — a FastAPI microservice that calls Google Gemini to
  generate structured support replies (`reply`, `triggerHandoff`, `intent`,
  `confidence`). Falls through a model chain
  (`gemini-2.0-flash` → `gemini-2.0-flash-lite` → `gemini-2.5-flash` →
  `gemini-flash-lite-latest`) on rate-limit or unavailability.
- **MongoDB** — stores two collections: `User` (accounts, hashed passwords,
  auto-generated `projectId`) and `Ticket` (conversations, message history,
  status).

## Local directory layout

```
.
├── client-react/           # React + Vite frontend (see client-react/README.md)
│   └── src/
│       ├── App.jsx                    # React Router route table
│       ├── main.jsx                   # Entry point — wraps app in AuthProvider + SocketProvider
│       ├── services/api.js            # Axios instance with JWT request interceptor
│       ├── context/
│       │   ├── AuthContext.jsx        # useAuth() — user/token/loading + register/login/logout
│       │   └── SocketContext.jsx      # Shared Socket.io client + connection state
│       ├── components/
│       │   ├── ChatWidget.jsx         # Customer-facing chat widget (human-first, AI fallback)
│       │   └── ProtectedRoute.jsx     # Route guard used on /dashboard
│       └── pages/
│           ├── LandingPage.jsx        # Public marketing page
│           ├── Login.jsx              # Login form, wired to useAuth().login()
│           ├── Register.jsx           # Registration form, wired to useAuth().register()
│           ├── AgentDashboard.jsx     # Dashboard shell (sidebar + logout)
│           ├── AeroHub.jsx            # Dashboard home — ticket stats, gateway status
│           ├── AgentWorkspace.jsx     # Ticket queue + live reply console
│           ├── LiveVisitors.jsx       # Live visitor counter
│           └── Settings.jsx           # Widget embed snippet
│
├── gateway-node/            # Express + Socket.io gateway
│   ├── server.js                      # App bootstrap, REST routes, Socket.io wiring
│   ├── socketHandlers.js              # All real-time chat/ticket/handoff logic
│   ├── config/db.js                   # connectDB() — MongoDB connection via MONGODB_URI
│   ├── models/Ticket.js               # Ticket + embedded Message schema
│   ├── middleware/errorHandler.js     # notFound + errorHandler (consistent JSON error shape)
│   └── src/
│       ├── models/User.js             # User schema — hashed password, projectId, role
│       ├── controllers/authController.js  # register / login / getMe logic
│       ├── routes/authRoutes.js       # /api/auth/* route table
│       └── middleware/authMiddleware.js   # protect — verifies JWT, loads req.user
│
├── ai-python/               # FastAPI AI microservice
│   ├── main.py                        # Gemini integration, /chat endpoint
│   └── requirements.txt
│
├── replit.md                # Architecture notes + required secrets (Replit-specific)
└── README.md                # This file
```

## Installation & running the full system

Each service has its own dependencies and must be started separately (on
Replit, this is already wired up as three parallel workflows — see below).

### 1. Install dependencies

```bash
# Frontend
cd client-react && npm install

# Gateway
cd gateway-node && npm install

# AI service
cd ai-python && pip install -r requirements.txt
```

### 2. Configure environment variables & secrets

The gateway requires two secrets to run with full functionality — set these
in **Replit → Secrets** (or a `.env` file loaded by your process manager if
running outside Replit):

| Secret | Used by | Purpose |
|---|---|---|
| `MONGODB_URI` | `gateway-node` | MongoDB connection string used by `config/db.js` and every Mongoose model (`User`, `Ticket`). Any `@` inside the password must be URL-encoded as `%40`. |
| `JWT_SECRET` | `gateway-node` | Signs and verifies authentication JWTs (`authController.js`, `authMiddleware.js`). |
| `GEMINI_API_KEY` | `ai-python` | Google Gemini API key used to generate AI support replies. Without it, `/chat` returns `503 AI service unavailable`. |
| `SESSION_SECRET` | reserved | Available for future session-based flows. |

Without `MONGODB_URI`, the gateway logs a "DB-less mode" warning and starts
anyway, but ticket persistence and authentication will fail at request time —
in practice it's required for the app to actually function.

### 3. Start each service

```bash
# Terminal 1 — Gateway (port 3001)
cd gateway-node && node server.js

# Terminal 2 — AI service (port 8000)
cd ai-python && uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# Terminal 3 — Frontend (port 5000)
cd client-react && npm run dev
```

On Replit, these three commands are already configured as the `Gateway`,
`AI Service`, and `Start application` workflows respectively, and all three
run together under the `Project` workflow. Vite proxies `/api` and
`/socket.io` from the frontend straight to the gateway (`localhost:3001`), so
no service needs a hardcoded absolute URL to another.

### 4. Verify it's running

```bash
curl http://localhost:3001/health
# {"status":"ok","service":"AeroReply Gateway","db":"connected","uptime":...}
```

## Authentication system

AeroReply ships with a complete, self-contained JWT authentication system
built entirely in `gateway-node`, with a fully wired-up React client.

### Data model — `gateway-node/src/models/User.js`

| Field | Details |
|---|---|
| `name` | required string |
| `email` | required, unique, lowercased, trimmed |
| `password` | required, hashed, `select: false` (never returned by default queries) |
| `projectId` | auto-generated 12-character hex string (`crypto.randomBytes(6).toString('hex')`), unique |
| `role` | enum `['agent', 'admin']`, defaults to `agent` |

### Password hashing

A Mongoose `pre('save')` hook hashes the password with **bcrypt** (10 salt
rounds) whenever it's new or modified. A `matchPassword(candidate)` instance
method compares a plaintext attempt against the stored hash via
`bcrypt.compare`.

### Token generation

`generateToken(id)` in `authController.js` signs a JWT with `JWT_SECRET`,
embedding the user's Mongo `_id`, valid for **30 days**. The token is
returned to the client on both register and login, and must be sent back on
every subsequent request as `Authorization: Bearer <token>`.

### Endpoints — mounted at `/api/auth` in `server.js`

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Creates a user (`name`, `email`, `password`). 400 if the email is already taken. Returns the user profile + JWT. |
| `POST` | `/api/auth/login` | Verifies email/password via `matchPassword`. 401 on bad credentials. Returns the user profile + JWT. |
| `POST` | `/api/auth/logout` | Stateless — no server-side session to invalidate; simply acknowledges the client-side token clear. |
| `GET` | `/api/auth/me` | Protected by the `protect` middleware. Returns the current user's profile, resolved from the verified JWT. |

### Route protection — `gateway-node/src/middleware/authMiddleware.js`

The `protect` middleware parses the `Authorization: Bearer <token>` header,
verifies it against `JWT_SECRET`, loads the user via
`User.findById(id).select('-password')`, and attaches it to `req.user` before
calling `next()`. Missing, malformed, or expired tokens return a `401` with a
descriptive `{ error: { message, status } }` body — the same error shape used
throughout the gateway (`middleware/errorHandler.js`).

### Frontend integration

See **[`client-react/README.md`](client-react/README.md)** for the full
breakdown of `AuthContext`, the Axios interceptor, and route guarding.
