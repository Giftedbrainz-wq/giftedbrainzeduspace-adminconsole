# Gifted Brainz EduSpace Admin v12.0.17

This release packages the current Admin Portal corrections and the latest shared-backend hardening.

- Verified Admin → Student proxy operations for security-question verification/password reset, subject catalog changes, material publishing, collections, and chunked uploads.
- Corrected collection editor loading to use the backend's `subjectId` and preserved material/CBT IDs plus title overrides on save.
- Retained the fixed Student shared routes that prevent endpoint-not-found failures for Admin operations.

Static validation and mock end-to-end integration checks were run against the packaged source. Production EdgeOne/Supabase services were not directly exercised in this environment.
