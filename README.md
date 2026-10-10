# Gifted Brainz EduSpace — Admin Portal

This is the separate administrator interface for Gifted Brainz EduSpace.

## Deployment
Deploy this ZIP as its own EdgeOne Pages project. The Admin Portal includes a serverless API proxy. The browser talks to the Admin host; the proxy talks server-to-server to the shared Student Portal backend.

Configure and deploy the Admin project runtime environment with the variables listed in `ENVIRONMENT_VARIABLES.txt`. In particular, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, and `ADMIN_EMAIL` belong ONLY to this Admin project.

The Student Portal backend needs the same `AUTH_SECRET` so it can verify the admin tokens issued by this Admin Portal. The Student Portal does NOT store the admin username, password, or email.

`GB_STUDENT_API_URL` is a non-secret URL pointing to the Student Portal API origin.

The browser-side `admin-config.js` contains no secrets.
