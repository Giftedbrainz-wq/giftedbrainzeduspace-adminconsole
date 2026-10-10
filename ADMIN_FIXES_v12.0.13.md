# Gifted Brainz EduSpace Admin v12.0.13 — Deep Audit Corrections

- Student subject-registration records now include subject IDs, so existing selections are restored correctly in the Admin UI.
- The password reset flow uses the shared Student backend and no longer increments the student token version twice.
- The “Student Login” shortcut is server-routed to the configured Student Portal URL, eliminating the placeholder-domain link.
- The Admin package now includes the environment-variable guide referenced by README.md.
- Duplicate Admin notification route code was removed.
- Live production transactions were not executed in this environment.
