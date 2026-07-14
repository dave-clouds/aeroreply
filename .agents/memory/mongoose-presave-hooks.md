---
name: Mongoose async pre-save hooks
description: Mongoose (v9 in this project) does not pass a next callback to async pre-save middleware.
---

Mongoose treats an `async function` pre-save hook as promise-based middleware. It does **not** pass a `next` callback — declaring `function (next) {}` and calling `next()`/`next(err)` inside an async hook throws `"next is not a function"`.

**Why:** Discovered live while testing user registration — the password-hashing pre-save hook threw this error until the `next` param and calls were removed.

**How to apply:** Write async pre-save (and similar) hooks as plain `async function () { ... }` that resolve normally or `throw` on error. Only use the callback style for non-async hook functions.
