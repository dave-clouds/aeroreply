# AeroReply

A modular, white-label live-chat SaaS platform — embeddable on any website in one `<script>` tag. Google Gemini answers instantly; your human agents take over when a conversation needs a personal touch.

## Architecture

Three services, one MongoDB database:

```
client-react  (port 5000)   ←─ Vite proxy ─→   gateway-node  (port 3001)   ←─ HTTP ─→   ai-python  (port 8000)
React + Vite                                     Express + Socket.io                       FastAPI + Google Gemini
Agent Dashboard                                  Auth · Tickets · Real-time                Structured AI replies
Public Landing Page                              MongoDB via Mongoose
```

## Environment variables

Set these before starting the gateway. On Replit, use **Secrets**; locally, use a `.env` file.

| Variable | Service | Required | Purpose |
|---|---|---|---|
| `MONGODB_URI` | gateway-node | ✅ Yes | MongoDB connection string. URL-encode any `@` in the password as `%40`. |
| `JWT_SECRET` | gateway-node | ✅ Yes | Signs and verifies all authentication tokens. Use a long random string. |
| `GEMINI_API_KEY` | ai-python | ✅ Yes | Google Gemini API key. Without it the AI service returns `503`. |
| `SESSION_SECRET` | reserved | — | Available for future session-based flows. |

Without `MONGODB_URI` the gateway enters a "DB-less mode" — it starts, but auth and ticket persistence fail immediately. In practice all three are required for a working system.

## Quick start (standard)

```bash
# 1 — Clone and install
git clone <repo-url> && cd aeroreply

cd client-react   && npm install   && cd ..
cd gateway-node   && npm install   && cd ..
cd ai-python      && pip install -r requirements.txt && cd ..

# 2 — Set secrets (create .env files or export variables)
#   gateway-node/.env
#     MONGODB_URI=mongodb+srv://...
#     JWT_SECRET=your-very-long-random-secret
#
#   ai-python/.env  (or export GEMINI_API_KEY=...)
#     GEMINI_API_KEY=AIza...

# 3 — Start all three services (three separate terminals)
cd gateway-node && node server.js                                    # Terminal 1 → port 3001
cd ai-python    && uvicorn main:app --host 0.0.0.0 --port 8000      # Terminal 2 → port 8000
cd client-react && npm run dev                                       # Terminal 3 → port 5000

# 4 — Verify
curl http://localhost:3001/health
# {"status":"ok","service":"AeroReply Gateway","db":"connected",...}
```

Open `http://localhost:5000` → register an account → open **More → Integration Code** in the dashboard to get your embed snippet.

---

## Quick start — Termux (Android mobile terminal)

Termux is a terminal emulator for Android that can run Node.js and Python locally. Follow these steps to get AeroReply running without a desktop.

### Install required packages

```bash
# Update package index
pkg update && pkg upgrade -y

# Core runtimes
pkg install -y git nodejs python

# Python build tools (needed for some pip packages)
pkg install -y python-cryptography libffi openssl

# Confirm versions
node -v   # should be v18+ or v20+
python --version
git --version
```

### Clone and install dependencies

```bash
git clone <repo-url> aeroreply
cd aeroreply

# Frontend
cd client-react && npm install && cd ..

# Gateway
cd gateway-node && npm install && cd ..

# AI service
cd ai-python && pip install -r requirements.txt && cd ..
```

### Configure secrets in Termux

Create `.env` files (Termux has no GUI secret manager):

```bash
# Gateway secrets
cat > gateway-node/.env << 'EOF'
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/aeroreply
JWT_SECRET=replace-with-a-long-random-string-at-least-32-chars
EOF

# AI service key
cat > ai-python/.env << 'EOF'
GEMINI_API_KEY=AIzaSy...
EOF
```

> **Note:** The gateway reads `process.env.*` directly. If your Node version doesn't auto-load `.env`, install `dotenv` and add `require('dotenv').config()` at the top of `gateway-node/server.js`, or `export` the variables manually before running.

### Start all three services

Termux supports multiple sessions via the swipe-right panel (tap **+** to add a new session).

```bash
# Session 1 — Gateway
cd aeroreply/gateway-node && node server.js

# Session 2 — AI service
cd aeroreply/ai-python && uvicorn main:app --host 0.0.0.0 --port 8000

# Session 3 — Frontend
cd aeroreply/client-react && npm run dev
```

Once all three are running, open a browser on your device and navigate to `http://localhost:5000`. The dashboard and widget are fully functional on mobile browsers.

---

## Embed snippet

After registering, open **More → Integration Code** in the agent dashboard. Copy the generated snippet and paste it into any HTML page before `</body>`:

```html
<script
  src="https://your-aeroreply-domain/widget.js"
  data-aeroreply-project-id="YOUR_PROJECT_ID"
  async
></script>
```

The widget is zero-dependency — no React, no bundler required on the host page.

## Customise the widget

Go to **More → Widget Settings** in the dashboard to configure:

- **Title & subtitle** shown in the chat header
- **Primary colour** applied to the launcher button, header, and send button
- **Text/icon colour** for contrast
- **Launcher icon** (Speech Bubble, Message Box, or Headset)
- **Position** (Bottom-Right or Bottom-Left) and pixel offset from the screen edge

Changes apply the next time a visitor connects — no re-embedding required.

## Health check

```bash
curl http://localhost:3001/health
```

Returns `{ "status": "ok", "db": "connected", "uptime": <seconds> }`. If `db` is `"disconnected"`, check your `MONGODB_URI`.
