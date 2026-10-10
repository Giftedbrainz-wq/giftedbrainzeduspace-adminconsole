/* Gifted Brainz EduSpace v12 — Subjects, Collections, Media and Registrations */
(() => {
  const $ = id => document.getElementById(id);
  const esc = GBUI.esc;
  const ICONS = Array.from(new Set((`
😀 😃 😄 😁 😆 😅 😂 🙂 🙃 😉 😊 😇 🥰 😍 🤩 😘 😗 😙 😚 😋 😛 😜 🤪 🤨 🧐 🤓 😎 🤠 🥳 😏 😌 🥺 😢 😭 😤 😠 😡 🤔 🤭 🤫 🤥 😶 😐 😑 😬 🙄 😯 😲 😳 🥱 😴 🤗 🤮 🤧 😷 🤒 🤕 🤑 😈 👿 👹 👺 🤖 👻 💀 ☠️ 👽 👾 🎃 😺 😸 😹 😻 😼 😽 🙀 😿 😾
👍 👎 👌 ✌️ 🤞 🤟 🤘 🤙 👈 👉 👆 👇 ☝️ ✋ 🤚 🖐️ 🖖 👋 🤏 💪 👏 🙌 👐 🤝 🙏 ✍️ 💅 🤳 💃 🕺 🏃 🚶 🧘 🧑‍🎓 👨‍🎓 👩‍🎓 👨‍🏫 👩‍🏫 👨‍🔬 👩‍🔬
📚 📖 📕 📗 📘 📙 📒 📔 📓 📜 📝 ✏️ ✒️ 🖊️ 🖋️ 🖍️ 📌 📍 📎 🔖 🔗 📁 📂 🗂️ 🗒️ 📋 📆 🗓️ 📅 📊 📈 📉 🧾 📇 🗃️ 🗄️ 💼 🎓 🧠 💡 🔍 🔎 🧩 🧮 🧪 ⚗️ 🔬 🧬 🧫
➗ ➕ ➖ ✖️ 🟰 🔢 📐 📏 📎 🧲 ⚙️ 🧰 🛠️ 🔭 🌡️ 💻 🖥️ 🖨️ ⌨️ 🖱️ 📱 🔋 🔌 💾 💿 📡 🌐 🛰️
⚡ 🔥 💧 🌊 🌱 🌿 🍃 🍀 ☘️ 🌳 🌴 🌵 🌻 🌞 🌙 ⭐ 🌟 ✨ 💫 🌈 ☁️ ❄️ ☔ 🌪️ 🌍 🌎 🌏
🎯 🏆 🥇 🥈 🥉 🏅 🏋️ ⚽ 🏀 🏈 ⚾ 🎾 🏐 🏉 🥊 🥋 🎮 🕹️ 🎲 ♟️ 🎳 🧩 🎼 🎵 🎶 🎤 🎧 🎸 🎹 🎺 🎻 🎬 📷 📹 🎨 🖌️ 🖍️
🚀 ✈️ 🚁 🚗 🚌 🚆 🚲 🛵 🚦 🗺️ 🧭 🏠 🏫 🏢 🏛️ 🏥 🏬 🏭 🏙️ 🌆 🌉
🧑‍💻 👩‍💻 👨‍💻 👥 🧑‍🤝‍🧑 🫂 🗣️ 💬 🗨️ 📣 📢 🔔 🔕 ✅ ☑️ ❌ ⛔ ⚠️ 🚫 ❗ ❓ ⁉️ 💯 🔒 🔓 🔑 🛡️ 🏷️ 🆕 🆙 🆗 🆘
❤️ 🧡 💛 💚 💙 💜 🖤 🤍 🤎 💔 ❤️‍🔥 💖 💗 💓 💕 💞 💟 ❣️ 💌 💎 👑 🪄 🎉 🎊 🎁 🎈
`)).trim().split(/\s+/));
  let subjects=[];
  let students=[];
  let activeCollectionId='';
  let collectionItems=[];

  function subjectOptions(selected='', includeBlank=false){
    return (includeBlank?'<option value="">Choose subject…</option>':'') + subjects.map(s=>`<option value="${esc(s.id)}" ${String(s.id)===String(selected)?'selected':''}>${esc(s.icon)} ${esc(s.name)}</option>`).join('');
  }
  async function loadSubjects(){
    const rows=await GB.api('/api/admin/subjects'); subjects=Array.isArray(rows)?rows:[];
    GBUI.setSubjects(subjects); renderSubjectList(); renderCollectionSubjectSelectors(); renderRegistrationStudents();
    if(typeof fillAdminSubjectSelectors==='function') fillAdminSubjectSelectors();
  }
  function renderSubjectList(){
    const host=$('esSubjectList'); if(!host)return;
    host.innerHTML=subjects.length?subjects.map(s=>`<div class="subject-admin-row"><span class="es-icon">${esc(s.icon)}</span><span class="es-row-title"><b>${esc(s.name)}</b><small>Position ${Number(s.position)||0} • ${s.active?'Active':'Archived'}</small></span><span class="es-actions"><button class="btn light" data-es-edit-subject="${esc(s.id)}">Edit</button><button class="btn ${s.active?'light':'primary'}" data-es-toggle-subject="${esc(s.id)}">${s.active?'Archive':'Activate'}</button></span></div>`).join(''):'<div class="es-empty">No subjects yet. Add the first subject above.</div>';
  }
  function renderIconPicker(selected=''){
    const host=$('esIconPicker');if(!host)return;host.innerHTML=ICONS.map((i,idx)=>`<button type="button" class="icon-btn ${i===selected?'selected':''}" data-es-icon="${esc(i)}" title="Icon ${idx+1}">${i}</button>`).join('');$('esSelectedIcon').value=selected||'📘';
  }
  function renderCollectionSubjectSelectors(){
    const active=subjects.filter(s=>s.active!==false); const preferred=active[0]?.id||subjects[0]?.id||'';
    const current=$('esCollectionSubject')?.value; const currentMat=$('esMaterialSubject')?.value;
    if($('esCollectionSubject')){$('esCollectionSubject').innerHTML=subjectOptions(current||preferred,true);if(!current||![...$('esCollectionSubject').options].some(o=>o.value===current))$('esCollectionSubject').value=preferred;}
    if($('esMaterialSubject')){$('esMaterialSubject').innerHTML=subjectOptions(currentMat||preferred,true);if(!currentMat||![...$('esMaterialSubject').options].some(o=>o.value===currentMat))$('esMaterialSubject').value=preferred;}
    if($('esRegSubjectHint'))$('esRegSubjectHint').textContent=subjects.length?`${subjects.length} subjects available`:'No subjects';
    if($('esRegSubjectCount'))$('esRegSubjectCount').textContent=subjects.length;
  }
  function selectedSubjectId(){return $('esCollectionSubject')?.value||subjects.filter(s=>s.active!==false)[0]?.id||subjects[0]?.id||'';}
  async function refreshCollections(){
    const subjectId=selectedSubjectId(); const host=$('esCollectionList');if(!host)return;
    if(!subjectId){host.innerHTML='<div class="es-empty">Add a subject first.</div>';return;}
    const rows=await GB.api('/api/admin/collections?subject='+encodeURIComponent(subjectId));
    host.innerHTML=rows.length?rows.map(c=>`<div class="collection-admin-row"><span class="es-icon">🗂️</span><span class="es-row-title"><b>${esc(c.name)}</b><small>${esc(c.description||'')} • ${esc(c.sort_mode||'manual')} • ${c.published?'Published':'Draft'}</small></span><span class="es-actions"><button class="btn light" data-es-open-collection="${esc(c.id)}">Manage</button><button class="btn danger" data-es-delete-collection="${esc(c.id)}">Delete</button></span></div>`).join(''):'<div class="es-empty">No collections for this subject yet.</div>';
  }
  async function openCollection(id){
    activeCollectionId=id; const data=await GB.api('/api/admin/collections/'+encodeURIComponent(id)); const c=data.collection; collectionItems=Array.isArray(c.items)?c.items:[];
    $('esCollectionName').value=c.name||'';$('esCollectionDescription').value=c.description||'';$('esCollectionSort').value=c.sort_mode||'manual';$('esCollectionPublished').checked=c.published!==false;$('esCollectionEditor').hidden=false;$('esCollectionEditorTitle').textContent=`Manage: ${c.name}`;renderCollectionItems();await loadMaterialAndQuizChoices(c.subjectId || c.subject_id);
    $('esCollectionEditor').scrollIntoView({behavior:'smooth',block:'start'});
  }
  function renderCollectionItems(){
    const host=$('esCollectionItems');if(!host)return;host.innerHTML=collectionItems.length?collectionItems.map((it,i)=>`<div class="es-item" draggable="true" data-es-item-index="${i}"><span class="drag">☷</span><span><b>${esc(it.title)}</b><small>${it.type==='cbt'?'CBT Assessment':'Learning material'}</small></span><span class="es-actions"><button class="btn light" type="button" data-es-remove-item="${i}">Remove</button></span></div>`).join(''):'<div class="es-empty">This collection is empty. Add a note/material or import a CBT assessment.</div>';
    let draggedIndex=null;host.querySelectorAll('[data-es-item-index]').forEach(row=>{row.addEventListener('dragstart',e=>{draggedIndex=Number(row.dataset.esItemIndex);row.classList.add('dragging');e.dataTransfer.effectAllowed='move';try{e.dataTransfer.setData('text/plain',String(draggedIndex));}catch{}});row.addEventListener('dragover',e=>{e.preventDefault();e.dataTransfer.dropEffect='move';row.classList.add('drag-over');});row.addEventListener('dragleave',()=>row.classList.remove('drag-over'));row.addEventListener('drop',e=>{e.preventDefault();row.classList.remove('drag-over');const to=Number(row.dataset.esItemIndex);if(!Number.isInteger(draggedIndex)||draggedIndex===to)return;const [m]=collectionItems.splice(draggedIndex,1);collectionItems.splice(Math.max(0,Math.min(to,collectionItems.length)),0,m);draggedIndex=null;renderCollectionItems();});row.addEventListener('dragend',()=>{draggedIndex=null;row.classList.remove('dragging','drag-over');host.querySelectorAll('.drag-over').forEach(x=>x.classList.remove('drag-over'));});});
  }
  async function loadMaterialAndQuizChoices(subjectId){
    const mats=await GB.api('/api/admin/materials?subject='+encodeURIComponent(subjectId)).catch(()=>[]); const tests=await GB.api('/api/admin/tests').catch(()=>[]);
    const subjectName=subjects.find(s=>String(s.id)===String(subjectId))?.name||'';
    const published=tests.filter(t=>t.published!==false&&t.status!=='draft'&&(!subjectId||String(t.subjectId||'')===String(subjectId)||String(t.subject||'')===String(subjectName)));
    if($('esAddMaterialSelect'))$('esAddMaterialSelect').innerHTML='<option value="">Add existing material…</option>'+mats.map(m=>`<option value="${esc(m.id)}">📚 ${esc(m.title)}</option>`).join('');
    if($('esAddCbtSelect'))$('esAddCbtSelect').innerHTML='<option value="">Import a CBT from CBT Arena…</option>'+published.map(t=>`<option value="${esc(t.id)}">🎯 ${esc(t.title)}</option>`).join('');
  }
  async function saveCollection(){
    if(!activeCollectionId)return; const c=await GB.api('/api/admin/collections/'+encodeURIComponent(activeCollectionId),{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:$('esCollectionName').value.trim(),description:$('esCollectionDescription').value.trim(),sortMode:$('esCollectionSort').value,published:$('esCollectionPublished').checked,items:collectionItems.map((it,i)=>({type:it.type,materialId:it.type==='material'?(it.material?.id||it.materialId||null):null,quizId:it.type==='cbt'?(it.quiz?.id||it.quizId||null):null,titleOverride:it.title||it.titleOverride||'',position:i}))})});say('Collection saved.');await openCollection(activeCollectionId);await refreshCollections();return c;
  }
  async function createMaterial(){
    const subjectId=$('esMaterialSubject').value,title=$('esMaterialTitle').value.trim();if(!subjectId||!title){say('Choose a subject and material title first.','error');return}
    const files=[];const input=$('esMaterialFiles');for(const file of [...(input.files||[])]){const up=await GB.upload(file);files.push({filePath:up.fileKey||up.key,fileName:up.fileName||file.name,contentType:up.contentType||file.type||'application/octet-stream',sizeBytes:up.size||file.size});}
    const saved=await GB.api('/api/admin/materials',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({subjectId,title,topic:$('esMaterialTopic').value.trim(),body:$('esMaterialBody').value,materialType:$('esMaterialType').value,published:$('esMaterialPublished').checked,access:$('esMaterialAccess').value,files})});say('Material saved.');$('esMaterialForm').reset();if(activeCollectionId)await loadMaterialAndQuizChoices(subjectId);return saved;
  }
  function renderRegistrationStudents(){
    const sel=$('esRegStudent');if(!sel)return; const cur=sel.value;sel.innerHTML='<option value="">Choose student…</option>'+students.map(s=>`<option value="${esc(s.id)}">${esc(s.name||s.full_name||s.email||'Student')} • ${esc(s.email||'')}</option>`).join('');if(cur)sel.value=cur;
  }
  async function loadRegistration(){const id=$('esRegStudent').value;if(!id){$('esRegSubjectList').innerHTML='<div class="es-empty">Choose a student to edit subject registration.</div>';return}if(!students.length)students=await GB.api('/api/admin/students');const s=students.find(x=>String(x.id)===String(id));const selected=new Set(s?.subjectIds||[]);$('esRegSubjectList').innerHTML=subjects.filter(x=>x.active).map(x=>`<label class="es-check"><input type="checkbox" value="${esc(x.id)}" ${selected.has(x.id)?'checked':''}><span class="es-icon">${esc(x.icon)}</span><span><b>${esc(x.name)}</b></span></label>`).join('')||'<div class="es-empty">No active subjects available.</div>';}
  async function saveRegistration(){const id=$('esRegStudent').value;if(!id)return;const ids=[...$('esRegSubjectList').querySelectorAll('input:checked')].map(x=>x.value);if(!ids.length){say('A student must have at least one registered subject.','error');return}await GB.api('/api/admin/students/registrations',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({studentId:id,subjectIds:ids})});const s=students.find(x=>String(x.id)===String(id));if(s)s.subjectIds=ids;say('Student subject registration updated.');}
  async function loadStudentsForRegistration(){students=await GB.api('/api/admin/students');renderRegistrationStudents();}
  async function resetAll(){if(!await GBUI.confirmAction('Reset the entire platform?','This removes student accounts, CBTs, attempts, question-bank content, learning materials, collections and subject registrations. The schema is retained and the five core subjects are restored. This cannot be undone.','Reset platform',{requirePhrase:'RESET PLATFORM'}))return;const r=await GB.api('/api/admin/reset-platform',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({confirm:'RESET PLATFORM'})});say(r.message||'Platform reset completed.');await loadSubjects();await loadStudentsForRegistration();}

  document.addEventListener('click',async e=>{
    const icon=e.target.closest('[data-es-icon]');if(icon){renderIconPicker(icon.dataset.esIcon);return;}
    const edit=e.target.closest('[data-es-edit-subject]');if(edit){const s=subjects.find(x=>x.id===edit.dataset.esEditSubject);if(!s)return;$('esSubjectId').value=s.id;$('esSubjectName').value=s.name;$('esSubjectPosition').value=s.position;$('esSelectedIcon').value=s.icon;renderIconPicker(s.icon);$('esSubjectSave').textContent='Save changes';return;}
    const toggle=e.target.closest('[data-es-toggle-subject]');if(toggle){const s=subjects.find(x=>x.id===toggle.dataset.esToggleSubject);if(!s)return;await GB.api('/api/admin/subjects/'+encodeURIComponent(s.id),{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({active:!s.active})});await loadSubjects();say(s.active?'Subject archived.':'Subject activated.');return;}
    const open=e.target.closest('[data-es-open-collection]');if(open){try{await openCollection(open.dataset.esOpenCollection)}catch(err){say(err.message,'error')}return;}
    const del=e.target.closest('[data-es-delete-collection]');if(del){if(!await GBUI.confirmAction('Delete this collection?','The collection and its item links will be removed. The underlying material and CBT remain available.','Delete collection'))return;await GB.del('/api/admin/collections/'+encodeURIComponent(del.dataset.esDeleteCollection));if(activeCollectionId===del.dataset.esDeleteCollection){activeCollectionId='';$('esCollectionEditor').hidden=true;}await refreshCollections();say('Collection deleted.');return;}
    const rem=e.target.closest('[data-es-remove-item]');if(rem){collectionItems.splice(Number(rem.dataset.esRemoveItem),1);renderCollectionItems();return;}
  });
  document.addEventListener('change',async e=>{if(e.target.id==='esCollectionSubject'){activeCollectionId='';$('esCollectionEditor').hidden=true;await refreshCollections();$('esMaterialSubject').value=e.target.value;await loadMaterialAndQuizChoices(e.target.value).catch(()=>{});}if(e.target.id==='esRegStudent')await loadRegistration();if(e.target.id==='esAddMaterialSelect'&&e.target.value){const mat=(await GB.api('/api/admin/materials')).find(m=>m.id===e.target.value);if(mat){collectionItems.push({id:'new-'+Date.now(),type:'material',title:mat.title,material:mat});renderCollectionItems();e.target.value='';}}if(e.target.id==='esAddCbtSelect'&&e.target.value){const test=(await GB.api('/api/admin/tests')).find(t=>t.id===e.target.value);if(test){collectionItems.push({id:'new-'+Date.now(),type:'cbt',title:test.title,quiz:{id:test.id,slug:test.slug,title:test.title,description:test.description,duration:test.duration}});renderCollectionItems();e.target.value='';}}});
  document.addEventListener('submit',async e=>{
    if(e.target.id==='esSubjectForm'){e.preventDefault();const id=$('esSubjectId').value,name=$('esSubjectName').value.trim();if(!name){say('Subject name is required.','error');return}const payload={name,icon:$('esSelectedIcon').value||'📘',position:Number($('esSubjectPosition').value)||0};try{if(id)await GB.api('/api/admin/subjects/'+encodeURIComponent(id),{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});else await GB.api('/api/admin/subjects',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});e.target.reset();$('esSubjectId').value='';$('esSelectedIcon').value='📘';renderIconPicker('📘');$('esSubjectSave').textContent='Add subject';await loadSubjects();say('Subject saved.');}catch(err){say(err.message||'Could not save the subject.','error');}}
    if(e.target.id==='esCollectionForm'){e.preventDefault();const subjectId=$('esCollectionSubject').value;if(!subjectId){say('Choose a subject.','error');return}await GB.api('/api/admin/collections',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({subjectId,name:$('esNewCollectionName').value.trim(),description:$('esNewCollectionDescription').value.trim(),sortMode:$('esNewCollectionSort').value,published:true})});e.target.reset();$('esCollectionSubject').value=subjectId;await refreshCollections();say('Collection created.');}
    if(e.target.id==='esMaterialForm'){e.preventDefault();try{await createMaterial()}catch(err){say(err.message,'error')}}
    if(e.target.id==='esRegistrationForm'){e.preventDefault();try{await saveRegistration()}catch(err){say(err.message,'error')}}
  });
  window.EduSpaceAdmin={loadSubjects,loadStudentsForRegistration,refreshCollections,renderCollectionSubjectSelectors,resetAll,renderIconPicker,saveCollection};
  $('esResetPlatformBtn')?.addEventListener('click',()=>resetAll().catch(e=>say(e.message,'error')));
  $('esRefreshCollections')?.addEventListener('click',()=>refreshCollections().then(()=>say('Collections refreshed.')).catch(e=>say(e.message,'error')));
  // Hook view navigation supplied by the existing admin console.
  const oldShow=window.show; if(typeof oldShow==='function')window.show=(id)=>{oldShow(id);if(id==='subjects'){loadSubjects().catch(e=>say(e.message,'error'));loadStudentsForRegistration().catch(e=>say(e.message,'error'));setTimeout(()=>{renderIconPicker($('esSelectedIcon')?.value||'📘');refreshCollections().catch(()=>{});},0)}};
  setTimeout(()=>{if(document.getElementById('v-subjects')){renderIconPicker('📘');}},0);
})();
