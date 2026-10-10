# Gifted Brainz EduSpace Admin v12.0.14 — Deep Audit Corrections

- Corrected the shared-backend diagnostic text to reference Student v12.1.5.
- Student View now uses the server-routed `/student-login` shortcut instead of a placeholder/browser-side student domain.
- Restored the historical v12.0.12 release manifest so old release documentation is not overwritten by current versioning.
- Bumped active Admin assets/cache and proxy version marker to v12.0.14.

Live production transactions were not executed in the build environment.
