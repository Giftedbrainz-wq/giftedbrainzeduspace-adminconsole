# Gifted Brainz EduSpace Admin v12.0.15 — Deep Audit Corrections

- Student Portal shortcut now uses `/api/student-login`, a guaranteed Node Function path, instead of the unsupported root-level `/student-login` route.
- Both the Admin login-page shortcut and the authenticated Student View use the same server-routed redirect.
- Active Admin assets/cache and proxy marker are bumped to v12.0.15.

Live production transactions were not executed in the build environment.
