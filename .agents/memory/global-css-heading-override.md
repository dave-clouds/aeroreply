---
name: Global CSS heading override in client-react
description: index.css forces h1 color globally, which can silently make new page titles unreadable in the dark theme.
---

`client-react/src/index.css` has a global rule pinning `h1`/heading elements to `color: var(--text-h)`, which resolves to a near-black color unless the OS reports `prefers-color-scheme: dark`. Screenshotting via a headless/light-mode browser context therefore renders any new `<h1>` on a dark page background as nearly invisible, even though the surrounding inline styles look correct.

**Why:** Found while building the Login/Register pages — their `<h1>` titles appeared to vanish against the dark card background despite matching the rest of the dark UI, because the global CSS rule overrode the (missing) inline color.

**How to apply:** Any new page/component that renders an `<h1>` (or other heading) inside this dark-themed app must set an explicit inline `color` (e.g. `#f9fafb`) rather than relying on inherited/default heading color.
