# Gifted Brainz EduSpace Admin v12.0.11 — Restoration & Fixes

SOURCE OF TRUTH
- Admin-only package.
- Based on the supplied Admin v12.0.11-FIXED package.
- Student UI is not bundled here.

FIXES IN THIS RELEASE
1. Student password verification/reset
   - Admin uses the shared Student backend through GB_STUDENT_API_URL.
   - Browser calls /api/admin/students/:id/security-questions and /reset-password on the Admin origin; the Admin Function proxies them server-to-server.
   - GB_STUDENT_API_URL accepts the Student site root and also tolerates /api or /api/student suffixes.
2. Subject catalog/dropdowns
   - Student-backed /api/admin/subjects route is restored.
   - Dynamic subject icons, positions and activation state are preserved.
   - All Admin subject selectors repopulate after catalog load, including the Gifted Brainz AI generator.
   - Use of English cannot accidentally be renamed.
3. Subject creation
   - Add/edit/toggle operations use the shared authenticated Student backend without changing Admin layout or authentication.
4. Learning materials
   - Admin material create/update endpoints are restored through the shared Student backend.
   - Small uploads use the fast ticket path.
   - Larger files automatically use the existing 512 KB chunked upload protocol.
5. Speed
   - Admin safe GET cache is 3 seconds and is invalidated after writes.
   - Uploads avoid oversized single requests.
6. EdgeOne deployment
   - No catch-all SPA rewrite that swallows direct Admin routes or /api requests.
   - Deployment verifier checks the Admin HTML and Node Function entry point.

ENVIRONMENT
- AUTH_SECRET
- ADMIN_USERNAME
- ADMIN_PASSWORD
- ADMIN_EMAIL
- GB_STUDENT_API_URL = the Student site root (for example https://student.example.com)
- Keep AUTH_SECRET identical on Admin and Student.
