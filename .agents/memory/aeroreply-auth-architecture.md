---
name: AeroReply auth architecture (frontend + backend)
description: How JWT auth is wired between client-react and gateway-node — token storage, proxying, and session hydration.
---

Backend (`gateway-node`) exposes `/api/auth/register`, `/api/auth/login`, `/api/auth/logout`, and `/api/auth/me` (protected via the `protect` middleware, returns the current user from `req.user`). JWTs are 30-day tokens signed with `JWT_SECRET`.

Frontend (`client-react`) talks to the backend via a relative `/api` base URL — Vite's dev server proxies `/api` (and `/socket.io`) to `http://localhost:3001` (see `vite.config.js`), so no absolute backend URL is hardcoded in app code.

The JWT is stored in `localStorage` under the key `token`. An axios request interceptor reads it and attaches `Authorization: Bearer <token>` to every outgoing request.

**Why:** Session hydration on app load (restoring `user`/`token` state before the app renders authenticated content) requires a way to turn a stored token back into user data — there was no such endpoint initially, so `/api/auth/me` was added specifically to support this.

**How to apply:** Any new frontend auth flow should reuse the shared axios instance (interceptor already attaches the token) rather than hand-rolling fetch calls, and any new protected backend route should use the existing `protect` middleware rather than re-implementing JWT verification.
