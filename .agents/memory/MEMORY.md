# Memory Index

- [Mongoose async pre-save hooks](mongoose-presave-hooks.md) — no `next` callback is passed; don't call/expect it or you'll get "next is not a function".
- [Sub-package installs in this repo](multi-service-package-installs.md) — verify installs land inside the correct sub-package (gateway-node/client-react), not the workspace root.
- [AeroReply auth architecture](aeroreply-auth-architecture.md) — JWT in localStorage, `/api` proxied via Vite to gateway-node, session hydration needs a `/api/auth/me` endpoint. Full epic (backend + frontend + route guards) complete.
- [Global CSS heading override](global-css-heading-override.md) — index.css forces `h1` color via `--text-h`; new page titles need an explicit inline color or they render near-invisible in dark UI.
