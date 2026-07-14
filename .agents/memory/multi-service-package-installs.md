---
name: Sub-package installs in this multi-service repo
description: This repo has separate sub-packages (gateway-node, client-react, ai-python) — dependency installs must land inside the right one.
---

The repo root has no package.json of its own; `gateway-node` and `client-react` are independent Node sub-packages (plus `ai-python` for the AI service). Some install tooling (e.g. the generic package-management `installLanguagePackages` callback) has created a stray root-level `package.json`/`node_modules`/`.upm` instead of installing into the intended sub-package.

**Why:** Caught when a Stage 1 backend dependency install (mongoose/bcryptjs/jsonwebtoken) landed at the workspace root instead of `gateway-node/`, requiring manual cleanup and a redo via `npm install` run directly inside the sub-package.

**How to apply:** When adding a dependency to `gateway-node` or `client-react`, prefer running `npm install <pkg>` with `cd` into that sub-package directory directly, and afterward verify the dependency appears in that sub-package's own `package.json` (not a new root-level one).
