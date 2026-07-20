// Broker ONE — PILOTT
// ─────────────────────────────────────

// ═══════════════════════════════════════════
//  PILOTT MODULE
// ═══════════════════════════════════════════
(function(){
  var STORAGE_KEY='brokerone_pilott';
  var COLUMNS=[
    {id:'a_fazer',name:'A Fazer',dot:'var(--slate)',bg:'var(--slate-bg)',icon:'list'},
    {id:'em_andamento',name:'Em Andamento',dot:'var(--blue)',bg:'var(--blue-bg)',icon:'spinner'},
    {id:'aguardando',name:'Aguardando',dot:'var(--amber)',bg:'var(--amber-bg)',icon:'hourglass'},
    {id:'concluido',name:'Concluído',dot:'var(--green)',bg:'var(--green-bg)',icon:'check'}
  ];
  var URGENCIA={id:'urgente',name:'Urgências',dot:'var(--red)',bg:'var(--red-bg)',icon:'flame'};
  var ALL_COLUMNS=[URGENCIA].concat(COLUMNS);
  var PRIO_LABEL={baixa:'Baixa',media:'Média',alta:'Alta'};
  var PRIO_ORDER={alta:0,media:1,baixa:2};
  var state={tasks:[]};
  var editingTaskId=null;var viewingTaskId=null;var openMenuId=null;var draggingId=null;

  function showStatus(msg){var el=document.getElementById('statusMsg');el.textContent=msg;el.style.display='block';setTimeout(function(){el.style.display='none';},2200);}
  function persist(){
    localStorage.setItem(STORAGE_KEY,JSON.stringify(state));
    if(window.syncTasksToAPI) syncTasksToAPI(state.tasks);
  }
  function pilottLoad(){try{var r=localStorage.getItem(STORAGE_KEY);if(r){var p=JSON.parse(r);state.tasks=p.tasks||[];}else{state.tasks=[];}}catch(e){state.tasks=[];}pilottRender();}
  function createTask(data){var now=new Date().toISOString();state.tasks.push({id:uid(),title:data.title,description:data.description||'',status:data.status,priority:data.priority,due_date:data.due_date||'',client_code:data.client_code||'',aai_name:data.aai_name||'',order_index:state.tasks.filter(function(t){return t.status===data.status;}).length,created_at:now,updated_at:now});persist();}
  function updateTask(id,data){var t=state.tasks.find(function(x){return x.id===id;});if(!t)return;Object.assign(t,data,{updated_at:new Date().toISOString()});persist();}
  function deleteTask(id){state.tasks=state.tasks.filter(function(t){return t.id!==id;});persist();}
  function moveTask(id,newStatus){var t=state.tasks.find(function(x){return x.id===id;});if(!t)return;t.status=newStatus;t.updated_at=new Date().toISOString();persist();}
  function clearCompleted(){if(!state.tasks.some(function(t){return t.status==='concluido';}))return;state.tasks=state.tasks.filter(function(t){return t.status!=='concluido';});persist();pilottRender();showStatus('Concluídas removidas.');}

  function sortTasks(tasks){
    return tasks.slice().sort(function(a,b){
      var pa=PRIO_ORDER[a.priority]!==undefined?PRIO_ORDER[a.priority]:1;
      var pb=PRIO_ORDER[b.priority]!==undefined?PRIO_ORDER[b.priority]:1;
      if(pa!==pb)return pa-pb;
      var da=a.due_date||'9999-99-99',db=b.due_date||'9999-99-99';
      return da<db?-1:da>db?1:0;
    });
  }

  function iconSvg(n){var ic={
    flag:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V4s-1 1-4 1-5-2-8-2-4 1-4 1z"/><path d="M4 22V4"/></svg>',
    calendar:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>',
    badge:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 9 6.6 6.6a2 2 0 010 2.8l-2.2 2.2a2 2 0 01-2.8 0L10 14"/><circle cx="6" cy="6" r="3"/><path d="m10 10-1.4 1.4"/></svg>',
    dots:'<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="12" cy="19" r="1.6"/></svg>',
    edit:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4Z"/></svg>',
    trash:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0-1 14a2 2 0 01-2 2H7a2 2 0 01-2-2L4 6"/></svg>',
    plus:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>',
    list:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 6h11M9 12h11M9 18h11"/><path d="M4 6h.01M4 12h.01M4 18h.01"/></svg>',
    spinner:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 11-2.6-6.4"/><path d="M21 4v5h-5"/></svg>',
    hourglass:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 2h14M5 22h14"/><path d="M6 2c0 5 5 6.5 6 8 1-1.5 6-3 6-8"/><path d="M6 22c0-5 5-6.5 6-8 1 1.5 6 3 6 8"/></svg>',
    check:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M5 13.5 9.5 18 19 6.5"/></svg>',
    flame:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8.5 14.5A2.5 2.5 0 0011 17a2.5 2.5 0 002.5-2.5c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7.5 7.5 0 11-15 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z"/></svg>'
  };return ic[n]||'';}

  function dueClass(iso){if(!iso)return '';var t=todayISO();if(iso<t)return 'overdue';if(iso===t)return 'today';return '';}
  function fmtDateK(iso){var p=iso.split('-');return p[2]+'/'+p[1];}
  function fmtDateTime(iso){if(!iso)return '-';var d=new Date(iso);return d.toLocaleDateString('pt-BR')+' às '+d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});}

  window.pilottRender=function(){
    document.getElementById('pilott-date').textContent=new Date().toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
    var pending=state.tasks.filter(function(t){return t.status!=='concluido';}).length;
    document.getElementById('pilott-badge').textContent=pending;
    renderUrgency();
    var board=document.getElementById('board');board.innerHTML='';
    COLUMNS.forEach(function(col){
      var colTasks=sortTasks(state.tasks.filter(function(t){return t.status===col.id;}));
      var colEl=document.createElement('div');colEl.className='k-col';colEl.dataset.status=col.id;
      colEl.addEventListener('dragover',function(e){e.preventDefault();colEl.classList.add('drag-over');});
      colEl.addEventListener('dragleave',function(){colEl.classList.remove('drag-over');});
      colEl.addEventListener('drop',function(e){e.preventDefault();colEl.classList.remove('drag-over');if(draggingId){moveTask(draggingId,col.id);draggingId=null;pilottRender();}});
      var hdr=document.createElement('div');hdr.className='k-col-header';
      hdr.innerHTML='<span class="k-col-icon" style="background:'+col.bg+';color:'+col.dot+'">'+iconSvg(col.icon)+'</span><span class="k-col-name">'+col.name+'</span><span class="k-col-count">'+colTasks.length+'</span><button class="k-col-add">'+iconSvg('plus')+'</button>';
      hdr.querySelector('.k-col-add').addEventListener('click',function(){openModal(null,col.id);});
      colEl.appendChild(hdr);
      var body=document.createElement('div');body.className='k-col-body';
      if(!colTasks.length){var em=document.createElement('div');em.className='k-col-empty';em.textContent='Sem tarefas.';body.appendChild(em);}
      else{colTasks.forEach(function(t){body.appendChild(renderCard(t));});}
      colEl.appendChild(body);board.appendChild(colEl);
    });
  };

  function renderUrgency(){
    var list=document.getElementById('urgencyList');
    var urg=sortTasks(state.tasks.filter(function(t){return t.status==='urgente';}));
    document.getElementById('urgencyCount').textContent=urg.length;
    list.innerHTML='';
    if(!urg.length){var em=document.createElement('div');em.className='urgency-empty';em.textContent='Nenhuma urgência.';list.appendChild(em);return;}
    urg.forEach(function(t){list.appendChild(renderCard(t));});
  }

  function initUrgency(){
    var box=document.getElementById('urgencyBox');
    box.addEventListener('dragover',function(e){e.preventDefault();box.classList.add('drag-over');});
    box.addEventListener('dragleave',function(){box.classList.remove('drag-over');});
    box.addEventListener('drop',function(e){e.preventDefault();box.classList.remove('drag-over');if(draggingId){moveTask(draggingId,'urgente');draggingId=null;pilottRender();}});
    document.getElementById('urgencyAddBtn').addEventListener('click',function(){openModal(null,'urgente');});
  }

  function renderCard(task){
    var card=document.createElement('div');card.className='k-card';card.draggable=true;card.dataset.id=task.id;
    card.addEventListener('dragstart',function(){draggingId=task.id;card.classList.add('dragging');});
    card.addEventListener('dragend',function(){card.classList.remove('dragging');});
    card.addEventListener('click',function(){openViewModal(task);});
    var top=document.createElement('div');top.className='k-card-top';
    var titleEl=document.createElement('div');titleEl.className='k-card-title';titleEl.textContent=task.client_code?(task.client_code.toUpperCase()+' | '+task.title):task.title;
    var menuBtn=document.createElement('button');menuBtn.className='k-card-menu-btn';menuBtn.innerHTML=iconSvg('dots');
    menuBtn.addEventListener('click',function(e){e.stopPropagation();toggleCardMenu(card,task);});
    top.appendChild(titleEl);top.appendChild(menuBtn);card.appendChild(top);
    if(task.description){var desc=document.createElement('div');desc.className='k-card-desc';desc.textContent=task.description;card.appendChild(desc);}
    var meta=document.createElement('div');meta.className='k-card-meta';
    var pc=document.createElement('span');pc.className='k-chip k-chip-'+task.priority;pc.innerHTML=iconSvg('flag')+PRIO_LABEL[task.priority];meta.appendChild(pc);
    if(task.due_date){var dc=document.createElement('span');dc.className='k-chip k-chip-due '+dueClass(task.due_date);dc.innerHTML=iconSvg('calendar')+fmtDateK(task.due_date);meta.appendChild(dc);}
    if(task.aai_name){var ac=document.createElement('span');ac.className='k-chip k-chip-aai';ac.innerHTML=iconSvg('badge')+task.aai_name.split(' ')[0];meta.appendChild(ac);}
    card.appendChild(meta);return card;
  }

  function toggleCardMenu(cardEl,task){
    closeAnyMenu();
    var menu=document.createElement('div');menu.className='k-card-menu';
    menu.innerHTML='<button data-act="edit">'+iconSvg('edit')+'Editar</button><button data-act="delete" class="danger">'+iconSvg('trash')+'Excluir</button>';
    menu.querySelector('[data-act="edit"]').addEventListener('click',function(e){e.stopPropagation();closeAnyMenu();openModal(task);});
    menu.querySelector('[data-act="delete"]').addEventListener('click',function(e){e.stopPropagation();closeAnyMenu();deleteTask(task.id);pilottRender();showStatus('Tarefa excluída.');});
    cardEl.appendChild(menu);openMenuId=task.id;
    setTimeout(function(){document.addEventListener('click',closeAnyMenu,{once:true});},0);
  }
  function closeAnyMenu(){var m=document.querySelector('.k-card-menu');if(m)m.remove();openMenuId=null;}

  function viewField(label,valueHtml,muted){return '<div class="view-field"><label>'+label+'</label><div class="view-field-value'+(muted?' muted':'')+'">'+valueHtml+'</div></div>';}

  function openViewModal(task){
    viewingTaskId=task.id;
    document.getElementById('viewTitle').textContent=task.client_code?(task.client_code.toUpperCase()+' | '+task.title):task.title;
    document.getElementById('viewDesc').textContent=task.description||'';
    var col=ALL_COLUMNS.find(function(c){return c.id===task.status;});
    var parts=[];
    parts.push(viewField('Coluna','<span class="view-status-badge" style="background:'+(col?col.bg:'var(--slate-bg)')+';color:'+(col?col.dot:'var(--slate)')+'"><span class="k-col-icon" style="background:transparent;">'+iconSvg(col?col.icon:'list')+'</span>'+(col?col.name:task.status)+'</span>'));
    parts.push(viewField('Prioridade','<span class="k-chip k-chip-'+task.priority+'">'+iconSvg('flag')+PRIO_LABEL[task.priority]+'</span>'));
    parts.push(viewField('Prazo',task.due_date?'<span class="k-chip k-chip-due '+dueClass(task.due_date)+'">'+iconSvg('calendar')+fmtDateK(task.due_date)+'</span>':'Sem prazo',!task.due_date));
    parts.push(viewField('Código do cliente',task.client_code?task.client_code.toUpperCase():'Não informado',!task.client_code));
    parts.push(viewField('AAI responsável',task.aai_name?task.aai_name:'Não informado',!task.aai_name));
    document.getElementById('viewGrid').innerHTML=parts.join('');
    document.getElementById('viewTimestamps').textContent='Criada em '+fmtDateTime(task.created_at)+' · Atualizada em '+fmtDateTime(task.updated_at);
    document.getElementById('viewOverlay').style.display='flex';
  }
  function closeViewModal(){document.getElementById('viewOverlay').style.display='none';viewingTaskId=null;}

  function populateStatusSelect(){var sel=document.getElementById('fStatus');sel.innerHTML='';ALL_COLUMNS.forEach(function(c){var o=document.createElement('option');o.value=c.id;o.textContent=c.name;sel.appendChild(o);});}
  function openModal(task,defaultStatus){
    editingTaskId=task?task.id:null;
    document.getElementById('modalTitle').textContent=task?'Editar tarefa':'Nova tarefa';
    document.getElementById('fTitle').value=task?task.title:'';
    document.getElementById('fDesc').value=task?task.description:'';
    document.getElementById('fPriority').value=task?task.priority:'media';
    document.getElementById('fDue').value=task?task.due_date:'';
    document.getElementById('fClientCode').value=task?(task.client_code||''):'';
    document.getElementById('fAai').value=task?(task.aai_name||''):'';
    populateStatusSelect();
    document.getElementById('fStatus').value=task?task.status:(defaultStatus||'a_fazer');
    document.getElementById('taskOverlay').style.display='flex';
    setTimeout(function(){document.getElementById('fTitle').focus();},30);
  }
  function closeModal(){document.getElementById('taskOverlay').style.display='none';editingTaskId=null;}
  function saveFromModal(){
    var title=document.getElementById('fTitle').value.trim();
    if(!title){showStatus('Dê um título para a tarefa.');return;}
    var data={title:title,description:document.getElementById('fDesc').value.trim(),priority:document.getElementById('fPriority').value,due_date:document.getElementById('fDue').value,client_code:document.getElementById('fClientCode').value.trim().toUpperCase(),aai_name:document.getElementById('fAai').value,status:document.getElementById('fStatus').value};
    if(editingTaskId){updateTask(editingTaskId,data);showStatus('Tarefa atualizada.');}
    else{createTask(data);showStatus('Tarefa criada.');}
    closeModal();pilottRender();
  }

  document.getElementById('newTaskBtn').addEventListener('click',function(){openModal(null);});
  document.getElementById('modalCloseBtn').addEventListener('click',closeModal);
  document.getElementById('cancelBtn').addEventListener('click',closeModal);
  document.getElementById('saveBtn').addEventListener('click',saveFromModal);
  document.getElementById('clearDoneBtn').addEventListener('click',clearCompleted);
  document.getElementById('taskOverlay').addEventListener('click',function(e){if(e.target.id==='taskOverlay')closeModal();});
  document.getElementById('viewCloseIconBtn').addEventListener('click',closeViewModal);
  document.getElementById('viewCloseBtn').addEventListener('click',closeViewModal);
  document.getElementById('viewOverlay').addEventListener('click',function(e){if(e.target.id==='viewOverlay')closeViewModal();});
  document.getElementById('viewEditBtn').addEventListener('click',function(){var t=state.tasks.find(function(x){return x.id===viewingTaskId;});closeViewModal();if(t)openModal(t);});
  document.getElementById('viewDeleteBtn').addEventListener('click',function(){var id=viewingTaskId;closeViewModal();deleteTask(id);pilottRender();showStatus('Tarefa excluída.');});

  pilottLoad();
  initUrgency();
})();

