/* ------------------------------------------------------------------
   Gifted Brainz EduSpace — shared portal shell.

   Every student page includes this file. It renders the left-hand menu
   (each entry is an icon *plus its name*), the top bar, the mobile menu
   button, and the helpers used to display rich announcements, media and
   "Show more / Show less" lists.
------------------------------------------------------------------- */
window.GBUI = (() => {

  const NAV_GROUPS = [
    { title: "Home", items: [
      { href: "/admin.html#overview", icon: "🏠", label: "Dashboard", desc: "Admin overview at a glance" }
    ]},
    { title: "Practice", items: [
      { href: "/cbt.html", icon: "🎯", label: "CBT Arena", desc: "Mock tests, Question Bank & practice" },
      { href: "/duel.html", icon: "⚔️", label: "1-v-1 Challenge", desc: "Compete head-to-head with another student" }
    ]},
    { title: "Learn", items: [
      { href: "/announcements.html", icon: "📢", label: "Announcements", desc: "News from Gifted Brainz" }
    ]},
    { title: "Progress", items: [
      { href: "/performance.html", icon: "📈", label: "My Performance", desc: "Scores, progress and corrections" },
      { href: "/leaderboards.html", icon: "🏆", label: "Leaderboards", desc: "Rankings overall and per subject" }
    ]},
    { title: "Support & Account", items: [
      { href: "/feedback.html", icon: "⭐", label: "Feedback & Rating", desc: "Rate the app and send complaints" },
      { href: "/help.html", icon: "🆘", label: "Help & Support", desc: "Contact Gifted Brainz support" },
      { href: "/account.html", icon: "👤", label: "My Account", desc: "Your profile and sign out" }
    ]}
  ];
  const NAV = NAV_GROUPS.flatMap(group => group.items);

  const SUBJECTS = ["Mathematics", "Use of English", "Physics", "Chemistry", "Biology"];
  const SUBJECT_ICONS = {
    "Mathematics": "➗", "Use of English": "📘", "Physics": "⚡",
    "Chemistry": "🧪", "Biology": "🌿"
  };
  const DEFAULT_SUBJECT_ICONS = {...SUBJECT_ICONS};
  function setSubjects(rows){
    const incoming = Array.isArray(rows) ? rows.filter(r=>r && String(r.name||"").trim()).sort((a,b)=>(Number(a.position)||0)-(Number(b.position)||0)).map(r=>({name:String(r.name).trim(), icon:String(r.icon||"📘").trim()||"📘"})) : [];
    if(!incoming.length) return SUBJECTS;
    SUBJECTS.splice(0,SUBJECTS.length,...incoming.map(r=>r.name));
    Object.keys(SUBJECT_ICONS).forEach(k=>delete SUBJECT_ICONS[k]);
    incoming.forEach(r=>SUBJECT_ICONS[r.name]=r.icon);
    return SUBJECTS;
  }
  const EMOJI = { home:"🏠", cbt:"🎯", materials:"📚", performance:"📈", leaderboard:"🏆", duel:"⚔️", set:"🧩", check:"✅", warning:"⚠️" };
  function mySubjects(){
    // Admin subject access is determined by the authenticated server session.
    // Do not read identity or permissions from device-local storage.
    return [...SUBJECTS];
  }

  const esc = v => String(v ?? "").replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* ----------------------------- the shell ----------------------------- */
  function shell(opts = {}) {
    const active = opts.active || location.pathname;
    const links = NAV_GROUPS.map(group => `
      <div class="nav-group">
        <div class="nav-group-title">${esc(group.title)}</div>
        ${group.items.map(item => {
          const on = item.href === active;
          return `<a class="${on ? "active" : ""}" href="${item.href}" aria-label="${esc(item.label)} — ${esc(item.desc)}" ${on ? 'aria-current="page"' : ""}>
            <span class="ic" aria-hidden="true">${item.icon}</span>
            <span class="nav-text"><span class="lbl">${esc(item.label)}</span><small>${esc(item.desc)}</small></span>
          </a>`;
        }).join("")}
      </div>`).join("");


    return `
    <button class="menu-toggle" id="menuToggle" type="button" aria-label="Open navigation menu" aria-controls="sidebar" aria-expanded="false">☰ Menu</button>
    <div class="scrim" id="scrim" hidden></div>
    <aside class="sidebar" id="sidebar">
      <a class="side-brand" href="/admin.html#overview">
        <img class="logo-transparent" src="/assets/icon-light.png" alt="Gifted Brainz EduSpace">
        <span>Gifted Brainz<br><small>EduSpace</small></span>
      </a>
      <nav class="sidenav" aria-label="Main menu">${links}</nav>
      <div class="side-foot">Gifted Brainz EduSpace<br>No cramming, just understanding.</div>
    </aside>`;
  }

  function mount(opts = {}) {
    const host = document.getElementById("shell");
    if (!host) return;
    host.classList.add("shell");
    const main = host.querySelector(".main");
    host.insertAdjacentHTML("afterbegin", shell(opts));
    if (main) host.appendChild(main);
    const sidebar = document.getElementById("sidebar");
    const scrim = document.getElementById("scrim");
    const toggle = document.getElementById("menuToggle");
    const close = () => { sidebar.classList.remove("open"); scrim.hidden = true; };
    toggle?.addEventListener("click", () => {
      const open = !sidebar.classList.contains("open");
      sidebar.classList.toggle("open", open);
      scrim.hidden = !open;
      toggle.setAttribute("aria-expanded", String(open));
      if (open) sidebar.querySelector("a")?.focus();
    });
    scrim?.addEventListener("click", close);
    sidebar?.addEventListener("click", e => { if (e.target.closest("a")) close(); });
    addEventListener("keydown", e => { if (e.key === "Escape") close(); });

    const who = document.getElementById("who");
    if (who) {
      // Identity comes from the authenticated Admin session, never from device storage.
      GB?.api?.("/api/admin/session").then(data => { if (data?.user?.name) who.textContent = data.user.name; }).catch(() => {});
    }
    setTimeout(()=>{
      // The notification centre uses Admin-only server routes. It never
      // registers the administrator as a student push subscriber.
      notificationCenter();
    },0);
  }

  /* --------------------------- notifications --------------------------- */
  function notificationCenter(){
    if(document.getElementById("gbNoticeButton")) return;
    const top=document.querySelector(".topbar-right");
    if(!top || !window.GB?.api) return;
    const wrap=document.createElement("div");
    wrap.style="position:relative;display:inline-flex";
    wrap.innerHTML=`<button class="btn light" id="gbNoticeButton" type="button" aria-label="Notifications" style="position:relative">🔔<span id="gbNoticeBadge" style="display:none;position:absolute;top:-5px;right:-5px;min-width:18px;height:18px;padding:0 4px;border-radius:20px;background:#b91c1c;color:#fff;font-size:.68rem;line-height:18px;font-weight:900"></span></button><div id="gbNoticePanel" hidden style="position:absolute;right:0;top:46px;width:min(360px,calc(100vw - 28px));max-height:420px;overflow:auto;background:#fff;border:1px solid rgba(8,45,99,.15);border-radius:16px;box-shadow:0 18px 45px rgba(0,0,0,.18);z-index:5000;padding:10px"></div>`;
    top.prepend(wrap);
    const button=wrap.querySelector("#gbNoticeButton"), panel=wrap.querySelector("#gbNoticePanel"), badge=wrap.querySelector("#gbNoticeBadge");
    let lastIds=new Set(); let first=true;
    function esc2(v){return esc(v)}
    function render(items){
      if(!items.length){panel.innerHTML='<div class="muted" style="padding:16px;text-align:center">No notifications yet.</div>';return}
      panel.innerHTML=`<div style="padding:4px 4px 8px"><b>Notifications</b></div>`+items.map(n=>`<button type="button" data-notice-id="${esc2(n.id)}" data-notice-url="${esc2(n.url||"/admin.html#overview")}" style="display:block;width:100%;text-align:left;border:0;background:${n.read?'#fff':'#f2f7ff'};padding:12px;border-radius:12px;margin:0 0 6px;cursor:pointer"><b>${esc2(n.title||"Notification")}</b><span style="display:block;color:#425466;font-size:.86rem;margin-top:4px">${esc2(n.message||"")}</span><small style="display:block;color:#7b8794;margin-top:6px">${n.createdAt?new Date(n.createdAt).toLocaleString():""}</small></button>`).join("");

    }
    async function load(){
      try{
        const x=await GB.api("/api/admin/notifications"); const items=x.items||[];
        const unread=Number(x.unread)||0; badge.style.display=unread?"inline-block":"none"; if(unread)badge.textContent=unread>99?"99+":String(unread);
        for(const n of items){
          if(!first && !lastIds.has(String(n.id)) && n.type==="update" && "serviceWorker" in navigator){
            try{const reg=await navigator.serviceWorker.ready; await reg.showNotification(n.title||"Gifted Brainz update",{body:n.message||"A new update is available.",icon:"/assets/icon-192.png",badge:"/assets/icon-192.png",data:{url:n.url||"/admin.html#overview"}})}catch{}
          }
        }
        lastIds=new Set(items.map(n=>String(n.id))); first=false; render(items);
      }catch{}
    }
    button.addEventListener("click",async e=>{e.stopPropagation();panel.hidden=!panel.hidden;if(!panel.hidden){await load();const unread=(panel.querySelectorAll("button[data-notice-id]").length);if(unread)await GB.api("/api/admin/notifications/read",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({})}).catch(()=>{});await load()}});
    panel.addEventListener("click",async e=>{const item=e.target.closest("[data-notice-id]");if(!item)return;const id=item.dataset.noticeId,url=item.dataset.noticeUrl||"/admin.html#overview";await GB.api("/api/admin/notifications/read",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({ids:[id]})}).catch(()=>{});location.href=url});
    load();setInterval(load,45000);
  }

  /* ------------------- safe rendering of rich content ------------------- */
  // The server already strips anything unsafe. This is the second line of
  // defence: the markup is rebuilt from an allow-list inside the browser too.
  const ALLOWED = new Set(["B", "STRONG", "I", "EM", "U", "S", "STRIKE", "BR", "P", "DIV",
    "SPAN", "UL", "OL", "LI", "BLOCKQUOTE", "H1", "H2", "H3", "H4", "SUP", "SUB", "CODE", "PRE", "A", "IMG", "VIDEO", "AUDIO", "FIGURE", "FIGCAPTION"]);

  function safeHtml(html) {
    const src = document.createElement("div");
    src.innerHTML = String(html ?? "");
    const out = document.createElement("div");
    walk(src, out);
    return out.innerHTML;
  }

  function walk(from, to) {
    from.childNodes.forEach(node => {
      if (node.nodeType === 3) { to.appendChild(document.createTextNode(node.nodeValue)); return; }
      if (node.nodeType !== 1) return;
      if (!ALLOWED.has(node.tagName)) { walk(node, to); return; }
      const el = document.createElement(node.tagName.toLowerCase());
      if (node.tagName === "A") {
        const href = String(node.getAttribute("href") || "");
        if (!/^(https?:\/\/|mailto:|tel:|\/|#)/i.test(href)) { walk(node, to); return; }
        el.setAttribute("href", href);
        el.setAttribute("target", "_blank");
        el.setAttribute("rel", "noopener noreferrer nofollow");
      }
      if (["IMG","VIDEO","AUDIO"].includes(node.tagName)) {
        const src = String(node.getAttribute("src") || "");
        if (!/^\/api\/files\//.test(src)) { walk(node, to); return; }
        el.setAttribute("src", src);
        if (node.hasAttribute("alt")) el.setAttribute("alt", String(node.getAttribute("alt") || "").slice(0,200));
        if (node.hasAttribute("loading")) el.setAttribute("loading", "lazy");
        if (node.hasAttribute("controls")) el.setAttribute("controls", "");
        if (node.hasAttribute("playsinline")) el.setAttribute("playsinline", "");
        if (node.hasAttribute("preload")) el.setAttribute("preload", node.getAttribute("preload") === "none" ? "none" : "metadata");
        if (node.hasAttribute("type")) el.setAttribute("type", String(node.getAttribute("type") || "").slice(0,100));
      }
      walk(node, el);
      to.appendChild(el);
    });
  }

  // Older material was stored as plain text: keep the line breaks and make
  // any link inside it clickable, so nothing published before an update is lost.
  function textToHtml(text) {
    const escaped = esc(text);
    const linked = escaped.replace(/((?:(?:https?:\/\/|www\.)[^\s<]+|[a-z0-9.-]+\.(?:com|org|net|ng|edu|gov|co|uk)(?:\/[^\s<]*)?))/gi, url => {
      const clean = url.replace(/[).,;:!?]+$/, "");
      const tail = url.slice(clean.length);
      const href = /^(?:https?:\/\/)/i.test(clean) ? clean : "https://" + clean;
      return `<a href="${href}" target="_blank" rel="noopener noreferrer nofollow">${clean}</a>${tail}`;
    });
    return linked.replace(/\n/g, "<br>");
  }

  function decodeDisplayEntities(value) {
    let out = String(value ?? "");
    for (let pass = 0; pass < 4; pass++) {
      const next = out
        .replace(/&nbsp;|&#160;|&#xA0;/gi, " ")
        .replace(/&amp;/gi, "&")
        .replace(/&lt;/gi, "<")
        .replace(/&gt;/gi, ">")
        .replace(/&quot;/gi, '"')
        .replace(/&#39;|&apos;/gi, "'")
        .replace(/&#(\d+);/g, (_, n) => { const cp=Number(n); return Number.isInteger(cp) ? String.fromCodePoint(cp) : _; })
        .replace(/&#x([0-9a-f]+);/gi, (_, n) => { const cp=parseInt(n,16); return Number.isInteger(cp) ? String.fromCodePoint(cp) : _; });
      if (next === out) break;
      out = next;
    }
    return out;
  }

  function latexReady(value) {
    let out=decodeDisplayEntities(String(value ?? ""));
    // Providers sometimes JSON-escape TeX command slashes. Collapse exactly
    // the duplicated slash before a control word/delimiter; keep real TeX
    // matrix/aligned row breaks ("\\ " and "\\ &") intact.
    for (let pass = 0; pass < 3; pass++) {
      const next = out.replace(/\\\\(?=[A-Za-z\[\(])/g,"\\");
      if (next === out) break;
      out = next;
    }
    out=out.replace(/frac\(([^()]+)\)\(([^()]+)\)/g,"\\frac{$1}{$2}");
    out=out.replace(/sqrt\(([^()]+)\)/g,"\\sqrt{$1}");
    return out;
  }
  let gbMathObserver=null;
  let gbMathFallbackMode=false;
  function fallbackMathTextNodes(){
    if(gbMathFallbackMode) return;
    gbMathFallbackMode=true;
    gbMathObserver?.disconnect();
    const re=/\\\[([\s\S]*?)\\\]|\\\(([\s\S]*?)\\\)|\$\$([\s\S]*?)\$\$|\$([^$\n]+)\$/g;
    const walker=document.createTreeWalker(document.body||document.documentElement,NodeFilter.SHOW_TEXT);
    const nodes=[];
    let node;
    while((node=walker.nextNode())){
      const parent=node.parentElement;
      if(parent && /^(SCRIPT|STYLE|TEXTAREA|PRE|CODE)$/.test(parent.tagName)) continue;
      if(re.test(node.nodeValue||"")) nodes.push(node);
      re.lastIndex=0;
    }
    for(const textNode of nodes){
      const source=textNode.nodeValue||"";
      re.lastIndex=0;
      textNode.nodeValue=source.replace(re,(_,display,inline,dollars,plain)=>mathToPlainText(display??inline??dollars??plain??""));
    }
  }
  function mathToPlainText(value) {
    let s = latexReady(value).replace(/\\\[|\\\]|\\\(|\\\)|\$\$/g,"");
    s = s.replace(/\\(?:dfrac|tfrac|frac)\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, "($1)/($2)");
    s = s.replace(/\\sqrt\s*\[(\d+)\]\s*\{([^{}]*)\}/g, (_, n, x) => n === "3" ? `∛(${x})` : `${n}√(${x})`);
    s = s.replace(/\\sqrt\s*\{([^{}]*)\}/g, "√($1)");
    s = s.replace(/\\text\s*\{([^{}]*)\}/g, "$1");
    s = s.replace(/\\(?:left|right)\b/g, "");
    s = s.replace(/\\(?:!|,|;|:|quad|qquad)\b/g, " ");
    s = s.replace(/\\begin\{(?:bmatrix|pmatrix|matrix|Bmatrix|vmatrix|Vmatrix)\}/g, "[");
    s = s.replace(/\\end\{(?:bmatrix|pmatrix|matrix|Bmatrix|vmatrix|Vmatrix)\}/g, "]");
    s = s.replace(/\^+\{([^{}]*)\}/g, "^$1").replace(/_+\{([^{}]*)\}/g, "_$1");
    s = s.replace(/\{([^{}]*)\}/g, "$1");
    s = s.replace(/\\/g, "; ").replace(/&/g, " ");
    const greek = {alpha:"α",beta:"β",gamma:"γ",delta:"δ",epsilon:"ε",theta:"θ",lambda:"λ",mu:"μ",pi:"π",sigma:"σ",phi:"φ",omega:"ω",Delta:"Δ",Gamma:"Γ",Lambda:"Λ",Sigma:"Σ",Phi:"Φ",Omega:"Ω"};
    const symbols = {pm:"±",mp:"∓",neq:"≠",ne:"≠",le:"≤",leq:"≤",ge:"≥",geq:"≥",times:"×",cdot:"·",div:"÷",approx:"≈",propto:"∝",infty:"∞",int:"∫",oint:"∮",sum:"Σ",prod:"Π",partial:"∂",nabla:"∇",forall:"∀",exists:"∃",rightarrow:"→",leftarrow:"←",Rightarrow:"⇒",Leftarrow:"⇐",leftrightarrow:"↔",Leftrightarrow:"⇔",to:"→",ast:"*",cdots:"…",ldots:"…",dots:"…",degree:"°"};
    s = s.replace(/\\([A-Za-z]+)(?![A-Za-z])/g, (_, name) => greek[name] || symbols[name] || name);
    s = s.replace(/\\([A-Za-z])/g, "$1");
    return s.replace(/[ \t]+/g," ").replace(/\n\s*\n\s*\n+/g,"\n\n").trim();
  }

  function ensureMathJax(){
    if(window.MathJax || document.getElementById("gb-mathjax")) return;
    window.MathJax={tex:{packages:{"[+]":["ams"]},inlineMath:[["\\\\(","\\\\)"],["$","$"]],displayMath:[["\\\\[","\\\\]"],["$$","$$"]]},options:{skipHtmlTags:["script","noscript","style","textarea","pre","code"]},startup:{typeset:false}};
    const sc=document.createElement("script"); sc.id="gb-mathjax"; sc.async=true; sc.src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js";
    sc.onerror=()=>fallbackMathTextNodes();
    sc.onload=()=>{window.MathJax.typesetPromise?.().catch(()=>fallbackMathTextNodes())};
    document.head.appendChild(sc);
  }
  function typesetMath(){
    if(gbMathFallbackMode) return;
    if(window.MathJax?.typesetPromise){
      gbMathObserver?.disconnect();
      window.MathJax.typesetPromise().catch(()=>fallbackMathTextNodes()).finally(()=>{if(!gbMathFallbackMode) gbMathObserver?.observe(document.documentElement,{subtree:true,childList:true})});
    }
  }
  function unescapeMarkdownPunctuationOutsideMath(value) {
    const s=String(value??""); let out="", mode="", i=0;
    while(i<s.length){
      if(!mode && s.startsWith("\\(",i)){mode="paren";out+="\\(";i+=2;continue;}
      if(!mode && s.startsWith("\\[",i)){mode="bracket";out+="\\[";i+=2;continue;}
      if(!mode && s.startsWith("$$",i)){mode="double";out+="$$";i+=2;continue;}
      if(!mode && s[i]==="$"){mode="single";out+="$";i++;continue;}
      if(mode==="paren" && s.startsWith("\\)",i)){mode="";out+="\\)";i+=2;continue;}
      if(mode==="bracket" && s.startsWith("\\]",i)){mode="";out+="\\]";i+=2;continue;}
      if(mode==="double" && s.startsWith("$$",i)){mode="";out+="$$";i+=2;continue;}
      if(mode==="single" && s[i]==="$" && s[i-1]!=="\\"){mode="";out+="$";i++;continue;}
      if(!mode && s[i]==="\\" && ".*_`#".includes(s[i+1]||"")){out+=s[i+1];i+=2;continue;}
      out+=s[i++];
    }
    return out;
  }

  function markdownTextToHtml(value) {
    let raw = latexReady(value);
    if (!raw.trim()) return "";
    // Escape first: Markdown is presentation, never permission to inject HTML.
    let out = esc(raw);
    // AI list items can arrive as escaped Markdown (for example "1\\.").
    // Unescape Markdown punctuation without touching TeX delimiters (\\(...\\),
    // \\[...\\]) or TeX row breaks (\\\\), which MathJax must receive intact.
    out = unescapeMarkdownPunctuationOutsideMath(out);
    // Inline code first so formatting markers inside code are left alone.
    const code = [];
    out = out.replace(/`([^`\n]+)`/g, (_, x) => { const i=code.push(`<code>${x}</code>`)-1; return `@@GB_CODE_${i}@@`; });
    // Basic Markdown emphasis used by the AI. Students see the formatted result, never the asterisks.
    out = out.replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>");
    out = out.replace(/__([^_\n]+)__/g, "<strong>$1</strong>");
    out = out.replace(/~~([^~\n]+)~~/g, "<s>$1</s>");
    out = out.replace(/(?<![\w*])\*([^*\n]+)\*(?![\w*])/g, "<em>$1</em>");
    out = out.replace(/(?<![\w_])_([^_\n]+)_(?![\w_])/g, "<em>$1</em>");
    // Headings and numbered lists are rendered as semantic educational content.
    out = out.replace(/^###\s+(.+)$/gm, "<h3>$1</h3>");
    out = out.replace(/^##\s+(.+)$/gm, "<h2>$1</h2>");
    out = out.replace(/^#\s+(.+)$/gm, "<h1>$1</h1>");
    out = out.replace(/(?:^|<br>)\s*(\d+)[.)]\s+([^<\n]+)/g, (m,n,item) => `<br><li data-num="${n}">${item}</li>`);
    // Turn simple Markdown bullet lines into a semantic list.
    out = out.replace(/(?:^|<br>)\s*[-*]\s+([^<\n][^\n]*)/g, (m, item) => `<br><li>${item}</li>`);
    out = out.replace(/(?:<br><li>.*?\<\/li>)+/gs, block => `<ul>${block.replace(/<br>/g, "")}</ul>`);
    out = out.replace(/\n/g, "<br>");
    code.forEach((v,i)=>{ out=out.replace(`@@GB_CODE_${i}@@`,v); });
    return out;
  }
  function renderBody(value, format) {
    const raw = latexReady(decodeDisplayEntities(value));
    if (!raw.trim()) return "";
    // Embedded note media is stored as a safe data-gb-file key. Resolve the
    // authenticated file URL at render time so a note never stores an expiring
    // token inside its HTML.
    const mediaReady = raw.replace(/<(img|video|audio)\b([^>]*?)data-gb-file=["']([^"']+)["']([^>]*)>/gi, (all, tag, before, key, after) => {
      const src = GB.fileUrl(`/api/files/${encodeURIComponent(key)}`, { inline: true });
      return `<${tag}${before} src="${esc(src)}"${after}>`;
    });
    return format === "html" || /<(a|b|i|u|p|div|br|ul|ol|li|strong|em|img|video|audio)\b/i.test(mediaReady)
      ? safeHtml(mediaReady)
      : textToHtml(mediaReady);
  }

  /* ---------------------------- media & files --------------------------- */
  function kindOf(f) {
    if (f.kind) return f.kind;
    const t = String(f.contentType || "").toLowerCase(), n = String(f.fileName || "").toLowerCase();
    if (t.startsWith("image/") || /\.(png|jpe?g|gif|webp|bmp|svg)$/.test(n)) return "image";
    if (t.startsWith("video/") || /\.(mp4|webm|ogv|mov|m4v)$/.test(n)) return "video";
    if (t.startsWith("audio/") || /\.(mp3|wav|ogg|m4a|aac)$/.test(n)) return "audio";
    if (t === "application/pdf" || /\.pdf$/.test(n)) return "pdf";
    if (t.startsWith("text/") || /\.(txt|md|csv|json)$/.test(n)) return "text";
    return "file";
  }

  const ICON_FOR = { image: "🖼️", video: "🎬", audio: "🎧", pdf: "📄", text: "📃", file: "📎" };

  // Pictures and videos are shown inline; every other type gets a
  // File attachments are download-only in learning materials.
  function media(list) {
    if (!Array.isArray(list) || !list.length) return "";
    return `<div class="media-grid">` + list.map(f => {
      const url = GB.fileUrl(f.url, { inline: true });
      const kind = kindOf(f);
      if (kind === "image") return `<figure class="media"><a href="${esc(url)}" target="_blank" rel="noopener"><img loading="lazy" src="${esc(url)}" alt="${esc(f.fileName || "Announcement picture")}"></a><figcaption>${esc(f.fileName || "")}</figcaption></figure>`;
      if (kind === "video") return `<figure class="media"><video controls playsinline preload="metadata" src="${esc(url)}" type="${esc(f.contentType||"video/mp4")}"></video><figcaption>${esc(f.fileName || "")}</figcaption><a class="muted" href="${esc(url)}" target="_blank" rel="noopener">Open video separately</a></figure>`;
      if (kind === "audio") return `<figure class="media"><audio controls preload="metadata" src="${esc(url)}"></audio><figcaption>${esc(f.fileName || "")}</figcaption></figure>`;
      return fileRow(f);
    }).join("") + `</div>`;
  }

  function fileRow(f) {
    const kind = kindOf(f);
    return `<div class="filerow"><span class="fic">${ICON_FOR[kind] || "📎"}</span>
      <span class="fname">${esc(f.fileName || "Attachment")}</span>
      <span class="factions">
        <button class="btn gold" type="button" data-download-file="${esc(f.url)}" data-download-name="${esc(f.fileName || "")}">Download</button>
      </span></div>`;
  }

  function files(list) {
    if (!Array.isArray(list) || !list.length) return "";
    return `<div class="filelist">${list.map(fileRow).join("")}</div>`;
  }

  /* -------------------------- show more / less -------------------------- */
  // Any list longer than the limit collapses, with a Show more / Show less
  // control so a busy subject never crowds the screen.
  const LIMIT = 5;
  // Preserve Show more / Show less state when a page re-renders its list.
  // Materials, for example, refreshes download status periodically; without
  // this state map every refresh would collapse an open list again.
  const moreState = new Map();
  function collapsible(id, cards, limit = LIMIT) {
    if (!cards.length) { moreState.delete(id); return `<p class="muted">Nothing here yet.</p>`; }
    const head = cards.slice(0, limit).join("");
    if (cards.length <= limit) { moreState.delete(id); return `<div class="list">${head}</div>`; }
    const rest = cards.slice(limit).join("");
    const open = moreState.get(id) === true;
    return `<div class="list">${head}<div class="list more" id="${id}" ${open ? "" : "hidden"}>${rest}</div></div>
      <button class="btn light showmore" type="button" data-more="${id}">${open ? "▴ Show less" : `▾ Show more (${cards.length - limit} more)`}</button>`;
  }

  function showDownloadProgress(name, pct=0) {
    let modal=document.getElementById("gbDownloadProgress");
    if(!modal){
      modal=document.createElement("div"); modal.id="gbDownloadProgress"; modal.className="modal";
      modal.innerHTML=`<div class="modal-box"><div class="section-head"><h2>Downloading material</h2><span id="gbDownloadPct">0%</span></div><p id="gbDownloadName" class="muted"></p><div class="progress" aria-label="Download progress"><i id="gbDownloadBar" style="width:0%"></i></div><p id="gbDownloadStatus" class="muted">Starting download…</p></div>`;
      document.body.appendChild(modal);
    }
    modal.hidden=false; document.body.classList.add("noscroll");
    modal.querySelector("#gbDownloadName").textContent=name; updateDownloadProgress(pct);
  }
  function updateDownloadProgress(pct, label) {
    const modal=document.getElementById("gbDownloadProgress"); if(!modal) return;
    const n=Math.max(0,Math.min(100,Math.round(Number(pct)||0)));
    modal.querySelector("#gbDownloadPct").textContent=`${n}%`;
    modal.querySelector("#gbDownloadBar").style.width=`${n}%`;
    if(label) modal.querySelector("#gbDownloadStatus").textContent=label;
  }
  function finishDownloadProgress(ok, message) {
    const modal=document.getElementById("gbDownloadProgress"); if(!modal) return;
    updateDownloadProgress(ok ? 100 : Number(modal.querySelector("#gbDownloadPct").textContent.replace("%","")) || 0, ok ? "Download complete." : message);
    if(ok) setTimeout(()=>{ modal.hidden=true; document.body.classList.remove("noscroll"); }, 700);
  }

  document.addEventListener("click", e => {
    const dl = e.target.closest("[data-download-file]");
    if (dl) {
      e.preventDefault();
      showDownloadProgress(dl.dataset.downloadName || "Download", pct => updateDownloadProgress(pct));
      GB.download(dl.dataset.downloadFile, dl.dataset.downloadName || "", (pct, label) => updateDownloadProgress(pct, label))
        .then(() => finishDownloadProgress(true))
        .catch(err => finishDownloadProgress(false, err?.message || "Download failed."));
      return;
    }
    const b = e.target.closest("[data-more]");
    if (!b) return;
    const box = document.getElementById(b.dataset.more);
    if (!box) return;
    const open = box.hidden;
    box.hidden = !open;
    moreState.set(b.dataset.more, open);
    b.textContent = open ? "▴ Show less" : `▾ Show more (${box.children.length} more)`;
  });

  function confirmAction(title, message, proceedLabel="Yes, proceed", options={}) {
    const requirePhrase=String(options.requirePhrase||"").trim();
    return new Promise(resolve => {
      const modal=document.createElement("div"); modal.className="modal critical-modal";
      const phraseHtml=requirePhrase?`<div class="field" style="margin-top:12px"><label>Safety confirmation</label><input id="criticalPhrase" type="text" autocomplete="off" spellcheck="false" placeholder="Type ${esc(requirePhrase)} to confirm" aria-describedby="criticalPhraseHelp"><small id="criticalPhraseHelp" class="muted">This extra step helps prevent accidental destructive actions.</small></div>`:"";
      modal.innerHTML=`<div class="modal-box critical-box" role="dialog" aria-modal="true" aria-labelledby="criticalTitle"><div class="section-head"><h2 id="criticalTitle">${esc(title)}</h2><button type="button" class="btn light" data-cancel aria-label="Cancel">✕</button></div><p>${esc(message)}</p>${phraseHtml}<div class="factions" style="justify-content:flex-end"><button class="btn light" type="button" data-cancel>Cancel</button><button class="btn danger" type="button" data-proceed ${requirePhrase?'disabled':''}>${esc(proceedLabel)}</button></div></div>`;
      document.body.appendChild(modal); document.body.classList.add("noscroll");
      const proceed=modal.querySelector("[data-proceed]"), input=modal.querySelector("#criticalPhrase");
      const finish=v=>{modal.remove();document.body.classList.remove("noscroll");resolve(v)};
      if(input){ input.addEventListener("input",()=>{proceed.disabled=input.value.trim()!==requirePhrase}); setTimeout(()=>input.focus(),0); }
      else setTimeout(()=>proceed?.focus(),0);
      modal.addEventListener("click",e=>{
        if(e.target===modal||e.target.closest("[data-cancel]"))finish(false);
        else if(e.target.closest("[data-proceed]") && !proceed.disabled)finish(true);
      });
    });
  }

  function unsavedGuard() {
    let dirty=false;
    const mark=()=>{dirty=true}; const clear=()=>{dirty=false};
    addEventListener("beforeunload",e=>{if(!dirty)return;e.preventDefault();e.returnValue=""});
    return {mark,clear};
  }

  /* ------------------------- grading (score bands) ---------------------- */
  // One place decides the colour, the word, the remark and the emoji so the
  // dashboard, the CBT results page, performance and the admin views agree.
  const BANDS = [
    { min: 0,  max: 39,  band: "red",    word: "Needs work", colour: "#b3261e", soft: "#fdeceb", ink: "#8a1b13",
      emoji: "💪", remark: "Don't be discouraged, you just need work" },
    { min: 40, max: 59,  band: "orange", word: "Fair",       colour: "#e08a00", soft: "#fff3e0", ink: "#8a5000",
      emoji: "🙂", remark: "Fair enough. There is room for improvement" },
    { min: 60, max: 79,  band: "green",  word: "Good",       colour: "#067647", soft: "#e7f6ee", ink: "#04502f",
      emoji: "👍", remark: "Nice attempt. You can do better" },
    { min: 80, max: 100, band: "blue",   word: "Excellent",  colour: "#1454b8", soft: "#e8f0fe", ink: "#123a6b",
      emoji: "🌟", remark: "Excellent. Keep it up" }
  ];

  function GRADE(score) {
    const n = Math.max(0, Math.min(100, Math.round(Number(score) || 0)));
    const b = BANDS.find(x => n >= x.min && n <= x.max) || BANDS[0];
    return { ...b, score: n, text: `${b.remark} ${b.emoji}` };
  }

  // Circular score meter used on the results screen (matches the design).
  function scoreDonut(percent, size = 168) {
    const g = GRADE(percent);
    const r = 52, c = 2 * Math.PI * r, off = c * (1 - g.score / 100);
    return `<svg class="donut" viewBox="0 0 130 130" width="${size}" height="${size}" role="img" aria-label="Score ${g.score} percent">
      <circle class="track" cx="65" cy="65" r="${r}"></circle>
      <circle class="bar" cx="65" cy="65" r="${r}" stroke="${g.colour}" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}"></circle>
      <text x="65" y="73" text-anchor="middle" fill="${g.colour}">${g.score}%</text>
    </svg>`;
  }

  function stars(rating, big = false) {
    const n = Math.round(Number(rating) || 0);
    return `<span class="rating-stars${big ? " big" : ""}" aria-label="${n} out of 5 stars">${"★".repeat(Math.min(5, n))}${"☆".repeat(Math.max(0, 5 - n))}</span>`;
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded",ensureMathJax,{once:true}); else ensureMathJax();
  gbMathObserver=new MutationObserver(()=>{clearTimeout(window.__gbMathTimer);window.__gbMathTimer=setTimeout(typesetMath,80)});
  gbMathObserver.observe(document.documentElement,{subtree:true,childList:true});
  return { NAV, SUBJECTS, SUBJECT_ICONS, DEFAULT_SUBJECT_ICONS, EMOJI, mySubjects, setSubjects, esc, mount, safeHtml, textToHtml, renderBody, media, files, fileRow, kindOf, collapsible, confirmAction, unsavedGuard, GRADE, scoreDonut, stars, showDownloadProgress, updateDownloadProgress, finishDownloadProgress, ensureMathJax, typesetMath, mathToPlainText };
})();
