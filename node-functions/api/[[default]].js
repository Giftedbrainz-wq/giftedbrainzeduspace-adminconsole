import crypto from "node:crypto";

const TOKEN_TTL = 12 * 60 * 60;
const text = v => String(v ?? "").trim();
const env = (context, name) => String(context?.env?.[name] ?? globalThis?.process?.env?.[name] ?? "").trim();
const json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), {
  status,
  headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers }
});
const b64url = x => Buffer.from(x).toString("base64url");
function sign(payload, secret) {
  const body = b64url(JSON.stringify(payload));
  const sig = crypto.createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${sig}`;
}
function same(a,b){ const aa=Buffer.from(a), bb=Buffer.from(b); return aa.length===bb.length && crypto.timingSafeEqual(aa,bb); }
function adminToken(secret) {
  return sign({
    iss:"gifted-brainz-admin",
    aud:"gifted-brainz-api",
    sub:"admin",
    role:"admin",
    permissions:["admin:all"],
    v:1,
    exp:Math.floor(Date.now()/1000)+TOKEN_TTL
  }, secret);
}
function cors(headers={}) { return { ...headers, "access-control-allow-origin":"*", "access-control-allow-headers":"Authorization, Content-Type", "access-control-allow-methods":"GET,POST,PUT,PATCH,DELETE,OPTIONS" }; }
function verifyAdminToken(request, secret){
  const supplied = text(request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const parts = String(supplied).split(".");
  if(parts.length!==2 || !parts[0] || !parts[1]) return false;
  try{
    const expected=crypto.createHmac("sha256",secret).update(parts[0]).digest("base64url");
    if(!same(Buffer.from(parts[1]),Buffer.from(expected))) return false;
    const payload=JSON.parse(Buffer.from(parts[0],"base64url").toString("utf8"));
    const permissions=Array.isArray(payload?.permissions) ? payload.permissions : [];
    return payload?.iss==="gifted-brainz-admin" &&
      payload?.aud==="gifted-brainz-api" &&
      payload?.role==="admin" &&
      payload?.sub==="admin" &&
      (permissions.includes("admin:all") || permissions.includes("admin:read")) &&
      Number(payload?.exp||0)>Math.floor(Date.now()/1000);
  }catch{return false}
}
function cookieValue(request,name){
  const header=request.headers.get("cookie")||"";
  for(const part of header.split(";")){ const [k,...rest]=part.split("="); if(k.trim()===name) return decodeURIComponent(rest.join("=").trim()); }
  return "";
}
const ADMIN_SESSION_COOKIE="gb_admin_session";
function adminCookie(token,maxAge=TOKEN_TTL){ return `${ADMIN_SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; Max-Age=${Math.max(0,Math.floor(maxAge))}; HttpOnly; Secure; SameSite=Lax`; }
function clearAdminCookie(){ return `${ADMIN_SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`; }
function verifyAdminSession(request,secret){
  const cookie=cookieValue(request,ADMIN_SESSION_COOKIE);
  if(!cookie) return false;
  const fakeRequest={headers:new Headers({authorization:`Bearer ${cookie}`})};
  return verifyAdminToken(fakeRequest,secret);
}

export async function onRequest(context) {
  const request = context.request;
  const url = new URL(request.url);
  const studentApi = env(context, "GB_STUDENT_API_URL").replace(/\/+$/,"").replace(/\/api(?:\/student)?$/i,"");
  if (request.method === "GET" && url.pathname === "/api/student-login") {
    if (!studentApi) return json({ error:"Student Portal URL is not configured. Set GB_STUDENT_API_URL in the Admin environment." },503);
    return new Response(null, { status: 302, headers: { Location: studentApi + "/login.html", "cache-control":"no-store" } });
  }
  if (url.pathname === "/api" || url.pathname === "/api/") return json({ ok:true, service:"Gifted Brainz EduSpace Admin API" });
  if (!url.pathname.startsWith("/api/")) return json({ error:"Not found." },404);
  if (request.method === "OPTIONS") return new Response(null,{status:204,headers:cors()});

  const secret = env(context, "AUTH_SECRET");
  const username = env(context, "ADMIN_USERNAME");
  const password = env(context, "ADMIN_PASSWORD");
  const email = env(context, "ADMIN_EMAIL");
  if (!secret || !username || !password || !email || !studentApi)
    return json({ error:"Admin server is not fully configured. Set ADMIN_USERNAME, ADMIN_PASSWORD, ADMIN_EMAIL, AUTH_SECRET and GB_STUDENT_API_URL in the Admin environment." },503);

  if (request.method === "POST" && url.pathname === "/api/admin/login") {
    let body={}; try { body=await request.json(); } catch { return json({error:"Invalid request body."},400); }
    const supplied=text(body.username || body.email);
    const suppliedPass=String(body.password ?? "");
    const userOk = same(Buffer.from(supplied.toLowerCase()),Buffer.from(username.toLowerCase()));
    const passOk = same(Buffer.from(suppliedPass),Buffer.from(String(password)));
    if (!userOk || !passOk)
      return json({error:"Invalid admin username or password. Check the credentials and try again."},401);
    const token = adminToken(secret);
    return json({ user:{id:"admin",name:"Administrator",username,email}, authenticated:true }, 200, { "set-cookie": adminCookie(token) });
  }

  if (request.method === "GET" && url.pathname === "/api/admin/session") {
    if (!verifyAdminSession(request, secret)) return json({ authenticated:false },401,{"set-cookie":clearAdminCookie()});
    return json({ authenticated:true, user:{id:"admin",name:"Administrator",username,email} });
  }

  if (request.method === "GET" && url.pathname === "/api/admin/backend-health") {
    if (!verifyAdminSession(request, secret)) return json({ authenticated:false, error:"Your admin session is missing or expired. Please sign in again." },401,{"set-cookie":clearAdminCookie()});
    try {
      const target = studentApi + "/api/admin/health";
      const upstream = await fetch(target,{method:"GET",headers:{"Authorization":`Bearer ${adminToken(secret)}`,"cache-control":"no-store"}});
      const data = await upstream.json().catch(()=>({}));
      if (!upstream.ok) {
        if (upstream.status === 503) return json({ ok:false, upstreamStatus:503, error:"Unable to connect to the central database. Please try again.", code:"CENTRAL_DATABASE_UNAVAILABLE" },503);
        if (upstream.status === 404) return json({ ok:false, upstreamStatus:404, error:"The shared Student backend API route was not found. Make sure GB_STUDENT_API_URL is the Student site root (e.g. https://student.example.com) and the Student v12.1.7 build is deployed.", code:"SHARED_BACKEND_ROUTE_MISSING" },502);
        if (upstream.status === 401 || upstream.status === 403) return json({ ok:false, upstreamStatus:upstream.status, error:"The shared backend rejected the Admin credential. Verify AUTH_SECRET matches on both portals.", code:"ADMIN_BACKEND_AUTH_MISCONFIGURED" },502);
        return json({ ok:false, upstreamStatus:upstream.status, error:data?.error||"The shared backend rejected the Admin request.", code:"SHARED_BACKEND_REJECTED" },502);
      }
      return json({ ok:true, upstream:data });
    } catch (e) {
      return json({
        ok:false,
        error:"The Admin Portal could not reach the shared Student backend. Please try again.",
        code:"SHARED_BACKEND_UNREACHABLE",
        retryable:true
      },502);
    }
  }
  if (request.method === "POST" && url.pathname === "/api/admin/logout") {
    return json({ ok:true },200,{"set-cookie":clearAdminCookie()});
  }
  // The account metadata endpoint and every other Admin operation require the same signed session.
  if (request.method === "GET" && url.pathname === "/api/admin/account") {
    if (!verifyAdminSession(request, secret)) return json({ error:"Your session has expired. Please sign in again.", code:"SESSION_EXPIRED" },401);
    return json({ username, email, credentialStorage: "environment", sharedAuth: "AUTH_SECRET", session: "HttpOnly cookie" });
  }

  if (!verifyAdminSession(request, secret)) return json({ error:"Your session has expired. Please sign in again.", code:"SESSION_EXPIRED" },401);

  // All other admin requests are proxied server-to-server to the shared Student
  // Portal backend. The browser never receives the student API origin unless it
  // is already configured as a non-secret public URL; the admin credentials and
  // service secrets remain on this server function.
  const target = studentApi + url.pathname + url.search;
  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("content-length");
  headers.delete("accept-encoding");
  headers.delete("cookie");
  headers.set("cache-control","no-store");
  headers.set("Authorization", `Bearer ${adminToken(secret)}`);
  try {
    const upstream = await fetch(target,{method:request.method,headers,body:["GET","HEAD"].includes(request.method)?undefined:await request.arrayBuffer()});
    const outHeaders = new Headers(upstream.headers);
    outHeaders.delete("content-encoding"); outHeaders.delete("content-length"); outHeaders.set("cache-control","no-store"); outHeaders.set("x-gifted-brainz-admin-proxy","12.0.18");
    if (upstream.status === 401) {
      return json({ error:"The shared backend rejected the Admin credential. Verify AUTH_SECRET matches on both portals.", code:"ADMIN_BACKEND_AUTH_MISCONFIGURED" },502);
    }
    if (upstream.status === 403) {
      const d = await upstream.clone().json().catch(()=>({}));
      if (/administrator access is required/i.test(String(d?.error||""))) return json({ error:"The shared backend rejected the Admin credential. Verify AUTH_SECRET matches on both portals.", code:"ADMIN_BACKEND_AUTH_MISCONFIGURED" },502);
      return json({ error:d?.error||"You do not have permission to perform this action.", code:"UNAUTHORIZED" },403);
    }
    if (upstream.status === 503) {
      return json({ error:"Unable to connect to the central database. Please try again.", code:"CENTRAL_DATABASE_UNAVAILABLE" },503);
    }
    return new Response(upstream.body,{status:upstream.status,statusText:upstream.statusText,headers:outHeaders});
  } catch (error) {
    return json({
      error:"The Admin Portal could not reach the shared Student backend. Please try again.",
      code:"SHARED_BACKEND_UNREACHABLE",
      retryable:true
    },502);
  }
}
