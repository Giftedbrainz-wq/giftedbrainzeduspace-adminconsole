/* Defensive global: pages use GB from inline handlers; api.js replaces this with the full client.
   Keeping a safe placeholder prevents a stale/missing API asset from producing the misleading
   "GB is not defined" ReferenceError. */
if (!window.GB) window.GB = {
  api: async () => { throw new Error("Gifted Brainz API client is unavailable. Please refresh the page."); },
  logout: () => { location="/"; }
};

(function(){
  function banner(){
    const b=document.getElementById("networkBanner");
    if(!b)return;
    const update=()=>{
      b.textContent=navigator.onLine?"":"You are disconnected from the internet. Connect to the internet to continue.";
      b.classList.toggle("show",!navigator.onLine);
    };
    addEventListener("online",update,{passive:true});
    addEventListener("offline",update,{passive:true});
    update();
  }
  window.notifyOffline=()=>alert("You are disconnected from the internet. Please connect to the internet to continue.");
  window.showNetworkError=el=>{if(el){el.className="error";el.textContent="Network error. Please connect to the internet and try again."}};
  banner();
})();

/* PWA install support shared by all portal pages. The install control is
   intentionally visible whenever the site is running in a browser and the
   app is not currently installed. On browsers without beforeinstallprompt,
   it opens platform-specific installation instructions instead. */
(function(){
  let deferred=null;
  let modal=null;
  const standalone=()=>matchMedia("(display-mode: standalone)").matches || navigator.standalone===true;
  const buttons=()=>Array.from(document.querySelectorAll("#install, .install-btn"));
  const isInstalled=()=>standalone();

  function hide(){
    buttons().forEach(b=>{b.hidden=true;b.setAttribute("aria-hidden","true")});
    closeModal();
  }
  function reveal(){
    if(isInstalled()) return hide();
    buttons().forEach(b=>{b.hidden=false;b.removeAttribute("hidden");b.removeAttribute("aria-hidden")});
  }
  function instructions(){
    const ua=navigator.userAgent;
    if(/iPhone|iPad|iPod/i.test(ua)) return 'On iPhone or iPad: tap Share in Safari, then choose “Add to Home Screen”.';
    if(/Android/i.test(ua)) return 'On Android: open the browser menu (⋮) and choose “Install app” or “Add to Home screen”.';
    return 'On desktop: use the install icon in your browser address bar, or open the browser menu and choose “Install Gifted Brainz EduSpace”.';
  }
  function closeModal(){if(modal){modal.remove();modal=null}}
  function openModal(){
    if(isInstalled()||modal)return;
    modal=document.createElement("div");
    modal.className="install-modal";
    modal.innerHTML='<div class="install-card" role="dialog" aria-modal="true" aria-label="Install Gifted Brainz EduSpace">'+
      '<img src="/assets/icon-192.png" alt="Gifted Brainz EduSpace" width="76" height="76">'+
      '<h3>Install Gifted Brainz EduSpace</h3>'+
      '<p class="muted">Install the app for faster access, a home-screen icon and offline-ready pages.</p>'+
      '<p class="install-steps muted"></p>'+
      '<button class="btn gold" data-install-now type="button" style="width:100%">'+(deferred?'Install App':'Show Install Steps')+'</button>'+
      '<button class="btn light" data-install-later type="button" style="width:100%;margin-top:8px">Not now</button>'+
      '</div>';
    document.body.appendChild(modal);
    modal.querySelector(".install-steps").textContent=deferred?"Tap Install App to continue.":instructions();
    modal.addEventListener("click",e=>{
      if(e.target!==modal && !e.target.closest("[data-install-later]"))return;
      // "Not now" is remembered for a week, so the prompt does not reappear on
      // every single visit.
      try{localStorage.setItem("gbInstallDismissed",String(Date.now()))}catch{}
      closeModal();
    });
  }
  async function promptInstall(){
    if(isInstalled()) return hide();
    if(deferred){
      const promptEvent=deferred;
      deferred=null;
      try{
        await promptEvent.prompt();
        const choice=await promptEvent.userChoice;
        if(choice?.outcome==="accepted"){hide();return;}
      }catch{}
      reveal();
      if(modal){
        modal.querySelector(".install-steps").textContent=instructions();
        const action=modal.querySelector("[data-install-now]");
        if(action)action.textContent="Show Install Steps";
      }
      return;
    }
    if(modal){
      modal.querySelector(".install-steps").textContent=instructions();
      return;
    }
    openModal();
  }

  addEventListener("beforeinstallprompt",e=>{
    e.preventDefault();
    deferred=e;
    reveal();
    if(modal){
      const action=modal.querySelector("[data-install-now]"),steps=modal.querySelector(".install-steps");
      if(action)action.textContent="Install App";
      if(steps)steps.textContent="Tap Install App to continue.";
    }
    maybeAutoPopup();
  });
  addEventListener("appinstalled",()=>{deferred=null;try{localStorage.setItem("gbWasInstalled","1")}catch{};hide()});

  if(navigator.getInstalledRelatedApps){
    navigator.getInstalledRelatedApps().then(apps=>{if(apps?.length)hide();else reveal()}).catch(reveal);
  }

  document.addEventListener("click",e=>{
    if(e.target.closest("[data-install-now]")){e.preventDefault();promptInstall();return;}
    const b=e.target.closest("#install, .install-btn");
    if(!b)return;
    e.preventDefault();
    promptInstall();
  });

  let autoDone=false;
  function maybeAutoPopup(){
    if(autoDone||isInstalled())return;
    if(document.body?.dataset.installPopup!=="on")return;
    let dismissed=0; try{dismissed=Number(localStorage.getItem("gbInstallDismissed")||0)}catch{}
    if(dismissed && Date.now()-dismissed < 7*24*60*60*1000) return;
    autoDone=true;
    const splash=document.getElementById("splash");
    setTimeout(openModal,splash?8200:900);
  }

  const VERSION_KEY="gbAppVersion";
  const BASE_VERSION="12.0.18";
  const read=k=>{try{return localStorage.getItem(k)||""}catch{return ""}};
  if("serviceWorker" in navigator){
    addEventListener("load",()=>{
      const v=read(VERSION_KEY)||BASE_VERSION;
      navigator.serviceWorker.register("/sw.js?v="+encodeURIComponent(v),{updateViaCache:"none"}).catch(()=>{});
    },{once:true});
  }

  function init(){reveal();maybeAutoPopup()}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});
  else init();
  window.GBInstall={open:openModal,prompt:promptInstall};
})();
