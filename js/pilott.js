// Broker ONE — PILOTT MODULE
// ─────────────────────────────────────

(function () {
  var STORAGE_KEY = 'brokerone_pilott_v2';

  var COLUMNS = [
    { id: 'a_fazer',     name: 'A Fazer',       dot: 'var(--slate)', bg: 'var(--slate-bg)', icon: 'list'      },
    { id: 'em_andamento',name: 'Em Andamento',  dot: 'var(--blue)',  bg: 'var(--blue-bg)',  icon: 'spinner'   },
    { id: 'aguardando',  name: 'Aguardando',    dot: 'var(--amber)', bg: 'var(--amber-bg)', icon: 'hourglass' },
    { id: 'concluido',   name: 'Concluído',     dot: 'var(--green)', bg: 'var(--green-bg)', icon: 'check'     }
  ];
  var URGENCIA = { id: 'urgente', name: 'Urgências', dot: 'var(--red)', bg: 'var(--red-bg)', icon: 'flame' };
  var ALL_COLUMNS = [URGENCIA].concat(COLUMNS);

  var PRIO_LABEL = { baixa: 'Baixa', media: 'Média', alta: 'Alta' };
  var PRIO_ORDER = { alta: 0, media: 1, baixa: 2 };

  var state = { tasks: [] };
  var editingTaskId = null;
  var viewingTaskId = null;
  var draggingId    = null;
  var openMenuId    = null;

  // ─── Viewer state (admin vendo outro broker) ───
  var viewingBroker = null; // { id, name } ou null = próprio broker

  // ─── helpers ───
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function todayISO() { return new Date().toISOString().slice(0, 10); }
  function showStatus(msg) {
    var el = document.getElementById('statusMsg');
    if (!el) return;
    el.textContent = msg; el.style.display = 'block';
    setTimeout(function () { el.style.display = 'none'; }, 2200);
  }

  // ─── Persist / Load ───
  function persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function loadFromStorage() {
    try {
      var r = localStorage.getItem(STORAGE_KEY);
      if (r) {
        var p = JSON.parse(r);
        state.tasks = Array.isArray(p.tasks) ? p.tasks : [];
      } else {
        state.tasks = [];
      }
    } catch (e) {
      state.tasks = [];
    }
  }

  // ─── CRUD ───
  function createTask(data) {
    var now = new Date().toISOString();
    var user = window.currentUser || {};
    state.tasks.push({
      id:           uid(),
      title:        data.title,
      description:  data.description || '',
      status:       data.status,
      priority:     data.priority,
      due_date:     data.due_date || '',
      client_code:  data.client_code || '',
      aai_name:     data.aai_name || '',
      // brokers responsáveis (array de { id, name })
      brokers:      data.brokers || [],
      // dono da tarefa (broker que criou)
      owner_id:     user.id || null,
      owner_name:   user.nome || user.username || '',
      order_index:  state.tasks.filter(function (t) { return t.status === data.status; }).length,
      created_at:   now,
      updated_at:   now
    });
    persist();
  }

  function updateTask(id, data) {
    var t = state.tasks.find(function (x) { return x.id === id; });
    if (!t) return;
    Object.assign(t, data, { updated_at: new Date().toISOString() });
    persist();
  }

  function deleteTask(id) {
    state.tasks = state.tasks.filter(function (t) { return t.id !== id; });
    persist();
  }

  function moveTask(id, newStatus) {
    var t = state.tasks.find(function (x) { return x.id === id; });
    if (!t) return;
    t.status = newStatus;
    t.updated_at = new Date().toISOString();
    persist();
  }

  function clearCompleted() {
    var had = state.tasks.some(function (t) { return t.status === 'concluido'; });
    if (!had) return;
    state.tasks = state.tasks.filter(function (t) { return t.status !== 'concluido'; });
    persist();
    pilottRender();
    showStatus('Tarefas concluídas removidas.');
  }

  // ─── Ordenação ───
  function sortTasks(tasks) {
    return tasks.slice().sort(function (a, b) {
      var pa = PRIO_ORDER[a.priority] !== undefined ? PRIO_ORDER[a.priority] : 1;
      var pb = PRIO_ORDER[b.priority] !== undefined ? PRIO_ORDER[b.priority] : 1;
      if (pa !== pb) return pa - pb;
      var da = a.due_date || '9999-99-99', db = b.due_date || '9999-99-99';
      return da < db ? -1 : da > db ? 1 : 0;
    });
  }

  // ─── Filtro por broker ───
  function getVisibleTasks() {
    var user = window.currentUser || {};
    var nivel = user.nivel || 1;

    // Admin vendo outro broker especificamente
    if (viewingBroker) {
      return state.tasks.filter(function (t) {
        return t.owner_id === viewingBroker.id ||
          (t.brokers && t.brokers.some(function (b) { return b.id === viewingBroker.id; }));
      });
    }

    // Admin/Líder sem filtro: vê tudo
    if (nivel >= 4) {
      return state.tasks;
    }

    // Broker/outros: vê só as próprias ou compartilhadas
    return state.tasks.filter(function (t) {
      if (t.owner_id === user.id) return true;
      if (t.brokers && t.brokers.some(function (b) { return b.id === user.id; })) return true;
      return false;
    });
  }

  // ─── SVG Icons ───
  function iconSvg(n) {
    var ic = {
      flag:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V4s-1 1-4 1-5-2-8-2-4 1-4 1z"/><path d="M4 22V4"/></svg>',
      calendar:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>',
      badge:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 9 6.6 6.6a2 2 0 010 2.8l-2.2 2.2a2 2 0 01-2.8 0L10 14"/><circle cx="6" cy="6" r="3"/><path d="m10 10-1.4 1.4"/></svg>',
      users:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
      dots:      '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="12" cy="19" r="1.6"/></svg>',
      edit:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4Z"/></svg>',
      trash:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0-1 14a2 2 0 01-2 2H7a2 2 0 01-2-2L4 6"/></svg>',
      plus:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>',
      list:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 6h11M9 12h11M9 18h11"/><path d="M4 6h.01M4 12h.01M4 18h.01"/></svg>',
      spinner:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 11-2.6-6.4"/><path d="M21 4v5h-5"/></svg>',
      hourglass: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 2h14M5 22h14"/><path d="M6 2c0 5 5 6.5 6 8 1-1.5 6-3 6-8"/><path d="M6 22c0-5 5-6.5 6-8 1 1.5 6 3 6 8"/></svg>',
      check:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M5 13.5 9.5 18 19 6.5"/></svg>',
      flame:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8.5 14.5A2.5 2.5 0 0011 17a2.5 2.5 0 002.5-2.5c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7.5 7.5 0 11-15 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z"/></svg>',
      eye:       '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',
      close:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>'
    };
    return ic[n] || '';
  }

  // ─── Date helpers ───
  function dueClass(iso) {
    if (!iso) return '';
    var t = todayISO();
    if (iso < t) return 'overdue';
    if (iso === t) return 'today';
    return '';
  }
  function fmtDateK(iso) { var p = iso.split('-'); return p[2] + '/' + p[1]; }
  function fmtDateTime(iso) {
    if (!iso) return '-';
    var d = new Date(iso);
    return d.toLocaleDateString('pt-BR') + ' às ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  // ─── Admin: barra de seleção de broker ───
  function renderBrokerBar() {
    var bar = document.getElementById('pilott-broker-bar');
    if (!bar) return;
    var user = window.currentUser || {};
    var nivel = user.nivel || 1;
    if (nivel < 4) { bar.style.display = 'none'; return; }

    bar.style.display = 'flex';

    // Coleta brokers únicos das tarefas
    var brokerMap = {};
    state.tasks.forEach(function (t) {
      if (t.owner_id && t.owner_name) {
        brokerMap[t.owner_id] = t.owner_name;
      }
    });

    // Também busca da parametrização se disponível
    var paramData = window.getParamData ? window.getParamData() : [];
    paramData.forEach(function (p) {
      if (p.broker_id && p.broker) brokerMap[p.broker_id] = p.broker;
    });

    var options = Object.keys(brokerMap).map(function (id) {
      return { id: parseInt(id), name: brokerMap[id] };
    });

    var sel = document.getElementById('pilott-broker-select');
    if (!sel) return;
    sel.innerHTML = '<option value="">Todos / Visão geral</option>';
    options.forEach(function (b) {
      var opt = document.createElement('option');
      opt.value = b.id;
      opt.textContent = b.name;
      if (viewingBroker && viewingBroker.id === b.id) opt.selected = true;
      sel.appendChild(opt);
    });
  }

  // ─── Render principal ───
  window.pilottRender = function () {
    var dateEl = document.getElementById('pilott-date');
    if (dateEl) dateEl.textContent = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    var badgeEl = document.getElementById('pilott-badge');
    var visible = getVisibleTasks();
    var pending = visible.filter(function (t) { return t.status !== 'concluido'; }).length;
    if (badgeEl) badgeEl.textContent = pending;

    renderBrokerBar();
    renderUrgency();

    var board = document.getElementById('board');
    if (!board) return;
    board.innerHTML = '';

    COLUMNS.forEach(function (col) {
      var colTasks = sortTasks(visible.filter(function (t) { return t.status === col.id; }));
      var colEl = document.createElement('div');
      colEl.className = 'k-col';
      colEl.dataset.status = col.id;

      colEl.addEventListener('dragover', function (e) { e.preventDefault(); colEl.classList.add('drag-over'); });
      colEl.addEventListener('dragleave', function () { colEl.classList.remove('drag-over'); });
      colEl.addEventListener('drop', function (e) {
        e.preventDefault(); colEl.classList.remove('drag-over');
        if (draggingId) { moveTask(draggingId, col.id); draggingId = null; pilottRender(); }
      });

      // Header
      var hdr = document.createElement('div');
      hdr.className = 'k-col-header';
      hdr.innerHTML =
        '<div class="k-col-header-left">' +
          '<span class="k-col-icon" style="background:' + col.bg + ';color:' + col.dot + '">' + iconSvg(col.icon) + '</span>' +
          '<span class="k-col-name">' + col.name + '</span>' +
        '</div>' +
        '<div class="k-col-header-right">' +
          '<span class="k-col-count" style="background:' + col.bg + ';color:' + col.dot + '">' + colTasks.length + '</span>' +
          '<button class="k-col-add" title="Nova tarefa nesta coluna">' + iconSvg('plus') + '</button>' +
        '</div>';
      hdr.querySelector('.k-col-add').addEventListener('click', function () { openModal(null, col.id); });
      colEl.appendChild(hdr);

      // Body
      var body = document.createElement('div');
      body.className = 'k-col-body';

      if (!colTasks.length) {
        var em = document.createElement('div');
        em.className = 'k-col-empty';
        em.innerHTML = '<span>Nenhuma tarefa aqui</span><small>Arraste um card ou clique em +</small>';
        body.appendChild(em);
      } else {
        colTasks.forEach(function (t) { body.appendChild(renderCard(t)); });
      }

      colEl.appendChild(body);
      board.appendChild(colEl);
    });
  };

  // ─── Urgency ───
  function renderUrgency() {
    var list = document.getElementById('urgencyList');
    if (!list) return;
    var visible = getVisibleTasks();
    var urg = sortTasks(visible.filter(function (t) { return t.status === 'urgente'; }));
    var countEl = document.getElementById('urgencyCount');
    if (countEl) countEl.textContent = urg.length;
    list.innerHTML = '';
    if (!urg.length) {
      var em = document.createElement('div');
      em.className = 'urgency-empty';
      em.textContent = 'Nenhuma urgência no momento.';
      list.appendChild(em);
      return;
    }
    urg.forEach(function (t) { list.appendChild(renderCard(t)); });
  }

  // ─── Card ───
  function renderCard(task) {
    var card = document.createElement('div');
    card.className = 'k-card';
    if (task.priority === 'alta') card.classList.add('k-card-high');
    card.draggable = true;
    card.dataset.id = task.id;

    card.addEventListener('dragstart', function () { draggingId = task.id; card.classList.add('dragging'); });
    card.addEventListener('dragend', function () { card.classList.remove('dragging'); draggingId = null; });
    card.addEventListener('click', function () { openViewModal(task); });

    // Topo: título + menu
    var top = document.createElement('div');
    top.className = 'k-card-top';

    var titleEl = document.createElement('div');
    titleEl.className = 'k-card-title';
    if (task.client_code) {
      titleEl.innerHTML = '<span class="k-card-code">' + task.client_code.toUpperCase() + '</span> ' + escHtml(task.title);
    } else {
      titleEl.textContent = task.title;
    }

    var menuBtn = document.createElement('button');
    menuBtn.className = 'k-card-menu-btn';
    menuBtn.innerHTML = iconSvg('dots');
    menuBtn.addEventListener('click', function (e) { e.stopPropagation(); toggleCardMenu(card, task); });

    top.appendChild(titleEl);
    top.appendChild(menuBtn);
    card.appendChild(top);

    // Descrição (preview)
    if (task.description) {
      var desc = document.createElement('div');
      desc.className = 'k-card-desc';
      desc.textContent = task.description.length > 80 ? task.description.slice(0, 80) + '…' : task.description;
      card.appendChild(desc);
    }

    // Chips
    var meta = document.createElement('div');
    meta.className = 'k-card-meta';

    // Prioridade
    var pc = document.createElement('span');
    pc.className = 'k-chip k-chip-' + task.priority;
    pc.innerHTML = iconSvg('flag') + PRIO_LABEL[task.priority];
    meta.appendChild(pc);

    // Prazo
    if (task.due_date) {
      var dc = document.createElement('span');
      dc.className = 'k-chip k-chip-due ' + dueClass(task.due_date);
      dc.innerHTML = iconSvg('calendar') + fmtDateK(task.due_date);
      meta.appendChild(dc);
    }

    // AAI
    if (task.aai_name) {
      var ac = document.createElement('span');
      ac.className = 'k-chip k-chip-aai';
      ac.innerHTML = iconSvg('badge') + task.aai_name.split(' ')[0];
      meta.appendChild(ac);
    }

    // Brokers compartilhados
    if (task.brokers && task.brokers.length > 0) {
      var bc = document.createElement('span');
      bc.className = 'k-chip k-chip-broker';
      var names = task.brokers.map(function (b) { return b.name.split(' ')[0]; });
      bc.innerHTML = iconSvg('users') + (names.length === 1 ? names[0] : names.length + ' brokers');
      meta.appendChild(bc);
    }

    card.appendChild(meta);
    return card;
  }

  function escHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // ─── Card menu (dots) ───
  function toggleCardMenu(cardEl, task) {
    closeAnyMenu();
    var menu = document.createElement('div');
    menu.className = 'k-card-menu';
    menu.innerHTML =
      '<button data-act="edit">' + iconSvg('edit') + 'Editar</button>' +
      '<button data-act="delete" class="danger">' + iconSvg('trash') + 'Excluir</button>';
    menu.querySelector('[data-act="edit"]').addEventListener('click', function (e) {
      e.stopPropagation(); closeAnyMenu(); openModal(task);
    });
    menu.querySelector('[data-act="delete"]').addEventListener('click', function (e) {
      e.stopPropagation(); closeAnyMenu();
      if (confirm('Excluir esta tarefa?')) { deleteTask(task.id); pilottRender(); showStatus('Tarefa excluída.'); }
    });
    cardEl.appendChild(menu);
    openMenuId = task.id;
    setTimeout(function () { document.addEventListener('click', closeAnyMenu, { once: true }); }, 0);
  }
  function closeAnyMenu() { var m = document.querySelector('.k-card-menu'); if (m) m.remove(); openMenuId = null; }

  // ─── View Modal ───
  function openViewModal(task) {
    viewingTaskId = task.id;
    var overlay = document.getElementById('viewOverlay');
    if (!overlay) return;

    document.getElementById('viewTitle').textContent = task.client_code
      ? task.client_code.toUpperCase() + ' · ' + task.title
      : task.title;
    document.getElementById('viewDesc').textContent = task.description || 'Sem descrição.';

    var col = ALL_COLUMNS.find(function (c) { return c.id === task.status; });
    var parts = [];

    parts.push(viewField('Coluna',
      '<span class="view-status-badge" style="background:' + (col ? col.bg : 'var(--slate-bg)') + ';color:' + (col ? col.dot : 'var(--slate)') + '">' +
        iconSvg(col ? col.icon : 'list') + (col ? col.name : task.status) +
      '</span>'));
    parts.push(viewField('Prioridade',
      '<span class="k-chip k-chip-' + task.priority + '">' + iconSvg('flag') + PRIO_LABEL[task.priority] + '</span>'));
    parts.push(viewField('Prazo',
      task.due_date
        ? '<span class="k-chip k-chip-due ' + dueClass(task.due_date) + '">' + iconSvg('calendar') + fmtDateK(task.due_date) + '</span>'
        : '<span class="muted">Sem prazo</span>'));
    parts.push(viewField('Cliente', task.client_code ? task.client_code.toUpperCase() : '<span class="muted">Não informado</span>'));
    parts.push(viewField('AAI', task.aai_name || '<span class="muted">Não informado</span>'));

    // Brokers
    if (task.brokers && task.brokers.length) {
      parts.push(viewField('Brokers',
        task.brokers.map(function (b) {
          return '<span class="k-chip k-chip-broker">' + iconSvg('users') + b.name + '</span>';
        }).join(' ')));
    }

    document.getElementById('viewGrid').innerHTML = parts.join('');
    document.getElementById('viewTimestamps').textContent =
      'Criada em ' + fmtDateTime(task.created_at) + ' · Atualizada em ' + fmtDateTime(task.updated_at);

    overlay.style.display = 'flex';
  }

  function viewField(label, valueHtml) {
    return '<div class="view-field"><label>' + label + '</label><div class="view-field-value">' + valueHtml + '</div></div>';
  }

  function closeViewModal() {
    var overlay = document.getElementById('viewOverlay');
    if (overlay) overlay.style.display = 'none';
    viewingTaskId = null;
  }

  // ─── Task Modal (criar/editar) ───
  function populateStatusSelect() {
    var sel = document.getElementById('fStatus');
    if (!sel) return;
    sel.innerHTML = '';
    ALL_COLUMNS.forEach(function (c) {
      var o = document.createElement('option');
      o.value = c.id; o.textContent = c.name;
      sel.appendChild(o);
    });
  }

  function populateAaiSelect(selected) {
    var sel = document.getElementById('fAai');
    if (!sel) return;
    sel.innerHTML = '<option value="">— Nenhum —</option>';
    var paramData = window.getParamData ? window.getParamData() : [];
    var user = window.currentUser || {};
    var filtered = paramData.filter(function (p) {
      if (user.nivel >= 4) return true;
      return p.broker === user.nome || p.broker === user.username;
    });
    var seen = {};
    filtered.forEach(function (p) {
      var name = (p.assessor || '').trim();
      if (!name || seen[name]) return;
      seen[name] = true;
      var o = document.createElement('option');
      o.value = name; o.textContent = name;
      if (name === selected) o.selected = true;
      sel.appendChild(o);
    });
    // Se não veio dado de param, ao menos mantém o valor atual como opção
    if (selected && !seen[selected]) {
      var fallback = document.createElement('option');
      fallback.value = selected; fallback.textContent = selected; fallback.selected = true;
      sel.insertBefore(fallback, sel.options[1]);
    }
  }

  function populateBrokerCheckboxes(selectedBrokers) {
    var container = document.getElementById('fBrokersContainer');
    if (!container) return;
    container.innerHTML = '';

    var user = window.currentUser || {};
    // Coleta lista de brokers disponíveis
    var brokerMap = {};

    // Da parametrização
    var paramData = window.getParamData ? window.getParamData() : [];
    paramData.forEach(function (p) {
      if (p.broker_id && p.broker) brokerMap[p.broker_id] = p.broker;
    });

    // Das tarefas existentes (fallback)
    state.tasks.forEach(function (t) {
      if (t.owner_id && t.owner_name) brokerMap[t.owner_id] = t.owner_name;
    });

    var selectedIds = (selectedBrokers || []).map(function (b) { return b.id; });
    var entries = Object.keys(brokerMap);

    if (!entries.length) {
      container.innerHTML = '<span class="muted" style="font-size:12px">Nenhum broker cadastrado na Parametrização.</span>';
      return;
    }

    entries.forEach(function (id) {
      var name = brokerMap[id];
      var numId = parseInt(id);
      // Não mostrar o próprio usuário (ele já é dono)
      // if (numId === user.id) return;

      var label = document.createElement('label');
      label.className = 'broker-checkbox-label';
      var chk = document.createElement('input');
      chk.type = 'checkbox';
      chk.value = numId;
      chk.dataset.name = name;
      if (selectedIds.indexOf(numId) > -1) chk.checked = true;
      label.appendChild(chk);
      label.appendChild(document.createTextNode(' ' + name));
      container.appendChild(label);
    });
  }

  function getBrokersFromCheckboxes() {
    var container = document.getElementById('fBrokersContainer');
    if (!container) return [];
    var brokers = [];
    container.querySelectorAll('input[type=checkbox]:checked').forEach(function (chk) {
      brokers.push({ id: parseInt(chk.value), name: chk.dataset.name });
    });
    return brokers;
  }

  function openModal(task, defaultStatus) {
    editingTaskId = task ? task.id : null;
    var overlay = document.getElementById('taskOverlay');
    if (!overlay) return;

    document.getElementById('modalTitle').textContent = task ? 'Editar tarefa' : 'Nova tarefa';
    document.getElementById('fTitle').value = task ? task.title : '';
    document.getElementById('fDesc').value = task ? task.description : '';
    document.getElementById('fPriority').value = task ? task.priority : 'media';
    document.getElementById('fDue').value = task ? task.due_date : '';
    document.getElementById('fClientCode').value = task ? (task.client_code || '') : '';

    populateStatusSelect();
    document.getElementById('fStatus').value = task ? task.status : (defaultStatus || 'a_fazer');

    populateAaiSelect(task ? task.aai_name : '');
    populateBrokerCheckboxes(task ? task.brokers : []);

    overlay.style.display = 'flex';
    setTimeout(function () {
      var t = document.getElementById('fTitle');
      if (t) t.focus();
    }, 30);
  }

  function closeModal() {
    var overlay = document.getElementById('taskOverlay');
    if (overlay) overlay.style.display = 'none';
    editingTaskId = null;
  }

  function saveFromModal() {
    var titleEl = document.getElementById('fTitle');
    if (!titleEl) return;
    var title = titleEl.value.trim();
    if (!title) { showStatus('Dê um título para a tarefa.'); titleEl.focus(); return; }

    var aaiSel = document.getElementById('fAai');
    var data = {
      title:       title,
      description: document.getElementById('fDesc').value.trim(),
      priority:    document.getElementById('fPriority').value,
      due_date:    document.getElementById('fDue').value,
      client_code: document.getElementById('fClientCode').value.trim().toUpperCase(),
      aai_name:    aaiSel ? aaiSel.value : '',
      status:      document.getElementById('fStatus').value,
      brokers:     getBrokersFromCheckboxes()
    };

    if (editingTaskId) {
      updateTask(editingTaskId, data);
      showStatus('Tarefa atualizada.');
    } else {
      createTask(data);
      showStatus('Tarefa criada.');
    }
    closeModal();
    pilottRender();
  }

  // ─── pilottLoad (chamado pelo shared.js/onPageLoaded) ───
  window.pilottLoad = function () {
    loadFromStorage();
    pilottRender();

    function bindEl(id, evt, fn) {
      var el = document.getElementById(id);
      if (el) el.addEventListener(evt, fn);
    }

    bindEl('newTaskBtn',       'click', function () { openModal(null); });
    bindEl('clearDoneBtn',     'click', clearCompleted);
    bindEl('modalCloseBtn',    'click', closeModal);
    bindEl('cancelBtn',        'click', closeModal);
    bindEl('saveBtn',          'click', saveFromModal);
    bindEl('taskOverlay',      'click', function (e) { if (e.target.id === 'taskOverlay') closeModal(); });
    bindEl('viewCloseIconBtn', 'click', closeViewModal);
    bindEl('viewCloseBtn',     'click', closeViewModal);
    bindEl('viewOverlay',      'click', function (e) { if (e.target.id === 'viewOverlay') closeViewModal(); });
    bindEl('viewEditBtn',      'click', function () {
      var t = state.tasks.find(function (x) { return x.id === viewingTaskId; });
      closeViewModal();
      if (t) openModal(t);
    });
    bindEl('viewDeleteBtn', 'click', function () {
      if (!confirm('Excluir esta tarefa?')) return;
      var id = viewingTaskId;
      closeViewModal();
      deleteTask(id);
      pilottRender();
      showStatus('Tarefa excluída.');
    });
    bindEl('urgencyAddBtn', 'click', function () { openModal(null, 'urgente'); });

    // Urgency drag-drop
    var urgencyBox = document.getElementById('urgencyBox');
    if (urgencyBox) {
      urgencyBox.addEventListener('dragover', function (e) { e.preventDefault(); urgencyBox.classList.add('drag-over'); });
      urgencyBox.addEventListener('dragleave', function () { urgencyBox.classList.remove('drag-over'); });
      urgencyBox.addEventListener('drop', function (e) {
        e.preventDefault(); urgencyBox.classList.remove('drag-over');
        if (draggingId) { moveTask(draggingId, 'urgente'); draggingId = null; pilottRender(); }
      });
    }

    // Admin: seletor de broker
    var brokerSel = document.getElementById('pilott-broker-select');
    if (brokerSel) {
      brokerSel.addEventListener('change', function () {
        var val = brokerSel.value;
        if (!val) {
          viewingBroker = null;
        } else {
          var name = brokerSel.options[brokerSel.selectedIndex].textContent;
          viewingBroker = { id: parseInt(val), name: name };
        }
        pilottRender();
      });
    }

    // Keyboard: Esc fecha modais
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { closeModal(); closeViewModal(); }
    });
  };

})();
