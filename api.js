/* ------------------------------------------------------------------
   Gifted Brainz EduSpace — API client.

   Why this file is defensive: the portal runs on serverless functions, so
   transient gateway failures and mobile-network drops can happen. Requests
   use a bounded timeout and retry only transient gateway errors. Structured
   API errors (including storage/configuration failures) are surfaced directly
   instead of being mislabeled as a generic server wake-up.
------------------------------------------------------------------- */
window.GB = (() => {
  const API_BASE = String(window.GB_API_BASE || "").replace(/\/$/, "");
  // Admin authentication is carried only by the server-issued HttpOnly session cookie.
  // There is intentionally no browser-readable bearer token.


  const esc = v => String(v ?? "").replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const TIMEOUT = 15000;      // default API timeout; upload requests use a longer window
  const RETRIES = 2;          // avoid repeated long round trips on a slow connection
  const GET_CACHE_TTL = 3000; // tiny tab-local cache for safe admin reads
  const readCache = new Map();
  const pendingReads = new Map();
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const cloneData = data => {
    try { return typeof structuredClone === "function" ? structuredClone(data) : JSON.parse(JSON.stringify(data)); }
    catch { return data; }
  };
  const cacheableRead = (url, method) => {
    if (method !== "GET") return false;
    const u = String(url || "");
    // Keep this to idempotent resource reads. Never cache auth/session, files,
    // notifications or ticket endpoints; all cache entries live only in this tab.
    return /^\/api\/admin\/(overview|students|tests|notes|announcements|results|question-bank|feedback|question-reports|topics|subjects|collections)(?:[/?]|$)/i.test(u);
  };
  const invalidateReads = () => { readCache.clear(); };

  class NetworkError extends Error {}

  async function once(url, options = {}) {
    const controller = new AbortController();
    const timeoutMs = Number(options.timeoutMs) > 0 ? Math.min(55000, Number(options.timeoutMs)) : TIMEOUT;
    const fetchOptions = { ...options };
    delete fetchOptions.timeoutMs;
    delete fetchOptions.retryAttempts;
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const target = API_BASE + String(url || "");
      return await fetch(target, { ...fetchOptions, credentials: "include", signal: controller.signal, cache: "no-store" });
    } catch (e) {
      // Aborts, DNS failures and dropped connections all land here.
      throw new NetworkError(
        e && e.name === "AbortError"
          ? "The server is taking too long to respond. Please try again."
          : "Could not reach the Gifted Brainz server. Check your internet connection and try again."
      );
    } finally { clearTimeout(timer); }
  }

  const api = async (url, options = {}) => {
    const headers = { ...(options.headers || {}) };
    const method = String(options.method || "GET").toUpperCase();
    const useCache = cacheableRead(url, method) && options.cache !== "no-store";
    const cacheKey = useCache ? String(url) : "";
    if (useCache) {
      const hit = readCache.get(cacheKey);
      if (hit && (Date.now() - hit.at) < GET_CACHE_TTL) return cloneData(hit.data);
      readCache.delete(cacheKey);
      if (pendingReads.has(cacheKey)) return cloneData(await pendingReads.get(cacheKey));
    }

    const execute = async () => {
      // Retrying a write that the server may already have processed can create a
      // duplicate account, duplicate submission or double-counted answer, so only
      // reads and explicitly idempotent writes are retried.
      const unsafe = ["/submit", "/answer", "/register", "/duel/", "/feedback"].some(part => String(url).includes(part));
      const requestedAttempts = Number(options.retryAttempts);
      const attempts = Number.isInteger(requestedAttempts) && requestedAttempts > 0 && requestedAttempts <= 5
        ? requestedAttempts
        : (method === "GET" || method === "HEAD" ? RETRIES : 1);

      let lastError = null;
      for (let attempt = 0; attempt < attempts; attempt++) {
        if (attempt) await wait(250 * attempt);
        let r;
        try { r = await once(url, { ...options, headers }); }
        catch (e) { lastError = e; continue; }

        let data = {};
        const type = r.headers.get("content-type") || "";
        if (type.includes("application/json")) { try { data = await r.json(); } catch { data = {}; } }
        if ([502, 504, 522, 524].includes(r.status)) {
          if (data?.retryable === false) throw Error(data.error || `Request failed (${r.status}).`);
          lastError = new NetworkError(data?.error || "The shared Gifted Brainz backend is temporarily unreachable. Retrying automatically…");
          continue;
        }
        if (r.status === 503 && type.includes("application/json")) throw Error(data.error || "Unable to connect to the central database. Please try again.");
        if (r.status === 503) throw Error("The server is temporarily unavailable. Open /diagnostics.html for details.");
        if (!type.includes("application/json")) {
          const html = await r.text().catch(() => "");
          const looksLikeHtml = html.trim().startsWith("<");
          if (looksLikeHtml || !r.ok) {
            data = { error: looksLikeHtml ? "The API is not responding on this site: the server returned a web page instead of data. Publish the serverless function with this deploy." : (html || "Request failed."), apiMissing: looksLikeHtml };
            if (looksLikeHtml) throw Error(data.error);
          }
        }
        if (r.status === 401) {
          const path = location.pathname;
          if (!path.endsWith("admin.html") && path !== "/") location = "/admin.html?session=expired";
        }
        if (!r.ok) throw Error(data.error || `Request failed (${r.status}).`);
        return data;
      }
      throw lastError || new NetworkError("Could not reach the Gifted Brainz server. Please try again.");
    };

    if (useCache) {
      const pending = execute().then(data => { readCache.set(cacheKey,{at:Date.now(),data:cloneData(data)}); return data; }).finally(() => pendingReads.delete(cacheKey));
      pendingReads.set(cacheKey, pending);
      return cloneData(await pending);
    }
    const result = await execute();
    if (method !== "GET" && method !== "HEAD") invalidateReads();
    return result;
  };

  // Used by the sign-in screens to say precisely what is wrong.
  const health = async () => {
    try { const r = await once("/api/health", { method: "GET" }); return r.ok; }
    catch { return false; }
  };

  const logout = () => {
    invalidateReads();
    // Ask the server to clear the download cookie; keepalive lets the request
    // survive the navigation that follows.
    try { fetch(API_BASE + "/api/admin/logout", { method: "POST", credentials: "include", keepalive: true }).catch(() => {}); } catch {}
    try { window.__gbAdminTicketIssuedAt=0; } catch {}
    location = window.GB_LOGOUT_URL || "/";
  };

  // Phones frequently report an empty MIME type for camera videos, so the
  // extension is sent along and the server works the real type out.
  const guessType = name => {
    const e = String(name || "").toLowerCase().split(".").pop();
    return ({ mp4: "video/mp4", m4v: "video/x-m4v", mov: "video/quicktime", webm: "video/webm",
      "3gp": "video/3gpp", mkv: "video/x-matroska", avi: "video/x-msvideo",
      mp3: "audio/mpeg", m4a: "audio/mp4", wav: "audio/wav", ogg: "audio/ogg", aac: "audio/aac",
      png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp",
      pdf: "application/pdf" }[e]) || "";
  };


  const upload = async (file, onProgress) => {
    if (!file) return {};
    const report = v => { if (onProgress) onProgress(v); };
    report(0);
    const contentType = file.type || guessType(file.name) || "application/octet-stream";

    // Small files use the fast ticketed upload. Larger files use the existing
    // chunk protocol so EdgeOne request-body limits do not break publishing.
    const DIRECT_LIMIT = 700 * 1024;
    if (file.size <= DIRECT_LIMIT) {
      const sign = await api("/api/admin/upload/sign", {
        method: "POST", timeoutMs: 55000, retryAttempts: 1,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file.name, contentType, size: file.size })
      });
      const r = await fetch(sign.signedUrl, {
        method: "PUT",
        headers: { "x-upsert": "true", "content-type": contentType },
        body: file
      });
      if (!r.ok) {
        const detail = await r.text().catch(() => "");
        throw Error(detail || `Upload failed for ${file.name} (${r.status}).`);
      }
      report(100);
      return { fileKey: sign.path, key: sign.path, fileName: file.name, contentType, size: file.size };
    }

    const defaultChunkSize = 512 * 1024;
    const init = await api("/api/admin/upload/init", {
      method: "POST", timeoutMs: 55000, retryAttempts: 1,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName: file.name, contentType, size: file.size, chunkSize: defaultChunkSize
      })
    });
    const uploadId = String(init.uploadId || "");
    if (!uploadId) throw Error(`Upload could not be started for ${file.name}.`);
    const actualChunk = Number(init.chunkSize || defaultChunkSize);
    const totalParts = Math.ceil(file.size / actualChunk);

    for (let index = 0; index < totalParts; index++) {
      const start = index * actualChunk;
      const end = Math.min(file.size, start + actualChunk);
      const part = file.slice(start, end);
      let sent = false;
      let lastError = null;

      for (let attempt = 0; attempt < 2 && !sent; attempt++) {
        try {
          const r = await fetch(`${API_BASE}/api/admin/upload/chunk`, {
            method: "POST",
            credentials: "same-origin",
            headers: {
              "Content-Type": "application/octet-stream",
              "x-upload-id": uploadId,
              "x-chunk-index": String(index)
            },
            body: part
          });
          if (!r.ok) {
            const detail = await r.text().catch(() => "");
            throw Error(detail || `Upload chunk ${index + 1} failed (${r.status}).`);
          }
          sent = true;
        } catch (err) {
          lastError = err;
          if (attempt === 0) await wait(250);
        }
      }

      if (!sent) throw lastError || Error(`Upload chunk ${index + 1} failed.`);
      report(Math.round((end / file.size) * 100));
    }

    const done = await api("/api/admin/upload/complete", {
      method: "POST", timeoutMs: 55000, retryAttempts: 1,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uploadId, parts: totalParts })
    });
    report(100);
    return {
      fileKey: done.fileKey,
      key: done.fileKey,
      path: done.fileKey,
      fileName: file.name,
      contentType,
      size: file.size,
      kind: done.kind,
      fileUrl: done.fileUrl
    };
  };


  // Browser navigations (downloads, embedded viewers) cannot send an
  // Authorization header, so the server issues a short-lived HttpOnly download ticket.
  /* ----------------------------------------------------------------
     Download tickets.

     The browser loads media itself (<img>, <video>, download anchors) and
     cannot attach an Authorization header, so file requests are authorised by
     a short-lived HttpOnly cookie that the server issues from the current API
     token. The API token itself is never placed in a URL: such URLs are kept
     in browser history, are copied whenever a link is shared, and are commonly
     written to access logs, yet they would grant full account access until
     they expired.
  ---------------------------------------------------------------- */
  const TICKET_REFRESH_MS = 20 * 60 * 1000;
  let ticketIssuedAt = Number(window.__gbAdminTicketIssuedAt || 0);
  let ticketInFlight = null;

  const ticketFresh = () => ticketIssuedAt > 0 && (Date.now() - ticketIssuedAt) < TICKET_REFRESH_MS;

  const ensureFileTicket = (force = false) => {
    if (!force && ticketFresh()) return Promise.resolve(true);
    if (ticketInFlight) return ticketInFlight;
    ticketInFlight = once("/api/files/ticket", {
      method: "POST",
      credentials: "same-origin"
    }).then(r => {
      if (!r.ok) return false;
      ticketIssuedAt=Date.now();
      window.__gbAdminTicketIssuedAt=ticketIssuedAt;
      return true;
    }).catch(() => false).finally(() => { ticketInFlight = null; });
    return ticketInFlight;
  };

  const fileUrl = (url, opts = {}) => {
    if (!url) return "";
    // Fire-and-forget: the ticket is normally already valid, and any media
    // element that renders before the first ticket arrives is recovered by the
    // error handler below.
    ensureFileTicket();
    const u = new URL(url, location.origin);
    if (opts.inline) u.searchParams.set("inline", "1");
    return u.pathname + u.search;
  };

  // Re-issue the ticket and reload file media that failed while no valid ticket
  // was present, so a slow first load repairs itself.
  const refreshFileMedia = async () => {
    const ok = await ensureFileTicket(true);
    if (!ok) return;
    const selector = 'img[src*="/api/files/"], video[src*="/api/files/"], source[src*="/api/files/"]';
    for (const el of document.querySelectorAll(selector)) {
      const src = el.getAttribute("src");
      if (!src) continue;
      el.setAttribute("src", src.includes("?") ? `${src}&r=${Date.now()}` : `${src}?r=${Date.now()}`);
    }
  };

  if (window.__GB_ADMIN_SESSION_HINT) {
    ensureFileTicket();
    // Media load failures do not bubble, so listen during the capture phase.
    window.addEventListener("error", event => {
      const el = event && event.target;
      if (!el || !(el instanceof HTMLImageElement || el instanceof HTMLVideoElement)) return;
      if (!String(el.currentSrc || el.src || "").includes("/api/files/")) return;
      if (el.dataset.gbRetried === "1") return;
      el.dataset.gbRetried = "1";
      void refreshFileMedia();
    }, true);
  }

  const DL_DB = "gbMaterialDownloads";
  const DL_STORE = "handles";
  const openDownloadDb = () => new Promise((resolve, reject) => {
    if (!window.indexedDB) return reject(new Error("Persistent download tracking is not supported in this browser."));
    const req = indexedDB.open(DL_DB, 1);
    req.onupgradeneeded = () => { try { req.result.createObjectStore(DL_STORE); } catch {} };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error("Unable to open download storage."));
  });
  const putDownloadHandle = async (key, handle) => {
    if (!key || !handle || !window.indexedDB) return false;
    try {
      const db = await openDownloadDb();
      await new Promise((resolve, reject) => {
        const tx = db.transaction(DL_STORE, "readwrite");
        tx.objectStore(DL_STORE).put(handle, key);
        tx.oncomplete = resolve; tx.onerror = () => reject(tx.error);
      });
      db.close();
      return true;
    } catch { return false; }
  };
  const getDownloadHandle = async key => {
    if (!key || !window.indexedDB) return null;
    try {
      const db = await openDownloadDb();
      const handle = await new Promise((resolve, reject) => {
        const tx = db.transaction(DL_STORE, "readonly");
        const req = tx.objectStore(DL_STORE).get(key);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });
      db.close();
      return handle;
    } catch { return null; }
  };
  const materialDownloadExists = async key => {
    const handle = await getDownloadHandle(key);
    if (!handle) return false;
    try {
      const perm = handle.queryPermission ? await handle.queryPermission({ mode: "read" }) : "prompt";
      if (perm === "denied") return false;
      await handle.getFile();
      return true;
    } catch { return false; }
  };

  const download = async (url, fileName, onProgress, options = {}) => {
    if (!url) return { saved: false };
    const report = (value, label) => { try { if (typeof onProgress === "function") onProgress(Math.max(0, Math.min(100, Math.round(value))), label || ""); } catch {} };
    report(0, "Starting download…");

    // Ask for the save location while the original click still has user
    // activation. The resulting file handle is retained in IndexedDB only
    // after the complete download succeeds.
    let writable = null;
    let targetHandle = null;
    let persistent = false;
    const persistKey = String(options.persistKey || "");
    const directoryKey = String(options.directoryKey || "");
    if (options.persistent && persistKey && directoryKey && window.showDirectoryPicker) {
      let dir = await getDownloadHandle(directoryKey);
      try { if (dir && dir.queryPermission && await dir.queryPermission({ mode: "readwrite" }) === "denied") dir = null; } catch { dir = null; }
      if (!dir) {
        dir = await window.showDirectoryPicker({ mode: "readwrite" });
        await putDownloadHandle(directoryKey, dir);
      }
      targetHandle = await dir.getFileHandle(fileName || "download", { create: true });
      writable = await targetHandle.createWritable();
      persistent = true;
    } else if (options.persistent && persistKey && window.showSaveFilePicker) {
      const pickerTypes = (() => {
        const ext = extensionForFile(fileName, options.contentType || "application/octet-stream");
        const type = options.contentType && options.contentType !== "application/octet-stream" ? options.contentType : "";
        return type ? [{ description: "Material file", accept: { [type]: [ext] } }] : undefined;
      })();
      targetHandle = await window.showSaveFilePicker({ suggestedName: fileName || "download", types: pickerTypes });
      writable = await targetHandle.createWritable();
      persistent = true;
    }

    const ticketOk = await ensureFileTicket(true);
    if (!ticketOk) {
      if (writable) { try { await writable.abort(); } catch {} }
      throw new Error("Your session has expired. Please sign in again.");
    }
    const src = fileUrl(url, { inline: false });

    let total = 0;
    let type = "application/octet-stream";
    try {
      const head = await fetch(src, { method: "HEAD", credentials: "same-origin", cache: "no-store" });
      if (!head.ok) throw new Error(`File request failed (${head.status}).`);
      total = Number(head.headers.get("content-length") || 0);
      type = head.headers.get("content-type") || options.contentType || type;
      if (!total) {
        const probe = await fetch(src, { credentials: "same-origin", cache: "no-store", headers: { Range: "bytes=0-0" } });
        if (!probe.ok && probe.status !== 206) throw new Error(`File request failed (${probe.status}).`);
        const cr = probe.headers.get("content-range") || "";
        const match = cr.match(/\/([0-9]+)$/);
        total = match ? Number(match[1]) : 0;
      }
      if (!total) throw new Error("The file size could not be determined.");

      const CHUNK = 4 * 1024 * 1024;
      const parts = persistent ? null : [];
      report(0, "Downloading…");
      for (let start = 0; start < total; start += CHUNK) {
        const end = Math.min(total - 1, start + CHUNK - 1);
        const r = await fetch(src, { credentials: "same-origin", cache: "no-store", headers: { Range: `bytes=${start}-${end}` } });
        if (!r.ok && r.status !== 206) throw new Error(`File request failed (${r.status}).`);
        if (r.status !== 206 && total > CHUNK) throw new Error("The file server did not honour the range request.");
        const bytes = new Uint8Array(await r.arrayBuffer());
        if (!bytes.byteLength) throw new Error("The server returned an empty file chunk.");
        if (writable) await writable.write(bytes); else parts.push(bytes);
        const received = Math.min(total, start + bytes.byteLength);
        report(received / total * 100, `${Math.round(received / total * 100)}% downloaded`);
      }

      if (writable) {
        await writable.close();
        if (targetHandle && persistKey) await putDownloadHandle(persistKey, targetHandle);
        report(100, "Download complete");
        return { saved: true, persistent: true };
      }

      report(100, "Download complete");
      const blob = new Blob(parts, { type });
      const objectUrl = URL.createObjectURL(blob);
      try {
        const a = document.createElement("a");
        a.href = objectUrl; a.download = fileName || "download"; a.rel = "noopener";
        document.body.appendChild(a); a.click(); a.remove();
      } finally { setTimeout(() => URL.revokeObjectURL(objectUrl), 1000); }
      return { saved: true, persistent: false };
    } catch (e) {
      if (writable) { try { await writable.abort(); } catch {} }
      throw e;
    }
  };

  // Fetch an authenticated stored file as a local Blob URL. This is used for
  // question images because browser <img src="/api/files/..."> loads can race
  // the download-ticket cookie or be handled differently by a gateway. The
  // client-side fetch path always sends the cookie and can use the same bounded
  // 4-MB ranges as downloads, so the image arrives reliably in the CBT.
  const fileBlobUrl = async (url, options = {}) => {
    if (!url) throw new Error("Question image URL is missing.");
    const ticketOk = await ensureFileTicket(true);
    if (!ticketOk) throw new Error("Your session has expired. Please sign in again.");
    const src = fileUrl(url, { inline: true });
    const head = await fetch(src, { method: "HEAD", credentials: "same-origin", cache: "no-store" });
    if (!head.ok) throw new Error(`Question image request failed (${head.status}).`);
    let total = Number(head.headers.get("content-length") || 0);
    const type = head.headers.get("content-type") || options.contentType || "application/octet-stream";
    const CHUNK = 4 * 1024 * 1024;
    const parts = [];
    if (!total) {
      const probe = await fetch(src, { credentials: "same-origin", cache: "no-store", headers: { Range: "bytes=0-0" } });
      if (!probe.ok && probe.status !== 206) throw new Error(`Question image request failed (${probe.status}).`);
      const cr = probe.headers.get("content-range") || "";
      const m = cr.match(/\/(\d+)$/);
      total = m ? Number(m[1]) : 0;
      if (total && probe.status === 206) parts.push(new Uint8Array(await probe.arrayBuffer()));
      else if (!total) parts.push(new Uint8Array(await probe.arrayBuffer()));
    }
    if (!total) {
      const r = await fetch(src, { credentials: "same-origin", cache: "no-store" });
      if (!r.ok) throw new Error(`Question image request failed (${r.status}).`);
      return URL.createObjectURL(await r.blob());
    }
    let received = parts.length ? parts[0].byteLength : 0;
    for (let start = received; start < total; start += CHUNK) {
      const end = Math.min(total - 1, start + CHUNK - 1);
      const r = await fetch(src, { credentials: "same-origin", cache: "no-store", headers: { Range: `bytes=${start}-${end}` } });
      if (!r.ok && r.status !== 206) throw new Error(`Question image request failed (${r.status}).`);
      if (r.status !== 206 && total > CHUNK) throw new Error("The file server did not honour the image range request.");
      const bytes = new Uint8Array(await r.arrayBuffer());
      if (!bytes.byteLength) throw new Error("The server returned an empty question image.");
      parts.push(bytes);
      received += bytes.byteLength;
    }
    return URL.createObjectURL(new Blob(parts, { type }));
  };

  const extensionForFile = (name, type) => {
    const m = String(name || "").match(/(\.[A-Za-z0-9]{1,8})$/);
    if (m) return m[1];
    const map = { "application/pdf": ".pdf", "text/plain": ".txt", "application/zip": ".zip", "application/msword": ".doc", "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx" };
    return map[String(type || "").toLowerCase()] || ".bin";
  };

  const del = url => api(url, { method: "DELETE" });

  return { api, esc, logout, upload, fileUrl, fileBlobUrl, download, materialDownloadExists, putDownloadHandle, del, health, ensureFileTicket, refreshFileMedia };
})();
