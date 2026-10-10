// Gifted Brainz EduSpace Admin Portal configuration.
// Browser-side values are intentionally non-secret. Admin credentials, Groq
// keys and AUTH_SECRET are server environment variables on the Admin host.
window.GB_API_BASE = "";
window.GB_STUDENT_PORTAL_URL = ""; // Student Login uses the server-routed /api/student-login shortcut; no browser-side domain is required.
window.GB_LOGOUT_URL = "/admin.html";
