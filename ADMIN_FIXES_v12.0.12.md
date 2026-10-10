# Gifted Brainz EduSpace Admin v12.0.12 — Deep Audit Corrections

- Removed the broken `/api/app/runtime/manifest` and `/api/app/runtime/file/*` Admin update path that had no matching Admin backend implementation.
- Reworked the Admin service worker to use a safe same-origin network-first strategy with offline shell fallback.
- Admin notification fallback and logout now target `/admin.html`, preserving Student/Admin separation.
- Versioned Admin assets/service worker bumped to v12.0.12.
- Shared Student backend proxy remains the source of Admin data/content operations.

Live EdgeOne/Supabase/GROQ production transactions were not executed in this environment. Validation covers static analysis, local integration tests, and package integrity.
