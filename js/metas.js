// ─── METAS MODULE v2 ─────────────────────────────────────────────────────────
(function () {
  'use strict';

  const API = window.BROKER_API || 'https://broker-one-backend-production-90c9.up.railway.app';

  let _metasList = [];      // todas as metas do backend
  let _expanded  = new Set(); // períodos expandidos
  let _selected  = new Set(); // IDs selecionados (checkboxes)

  // ─── INIT ─────────────────────────────────────────────────────────────────
  window.loadMetas = async function () {
    await fetchMetas();
    renderPeriodos();
    bindMetasEvents();
  };

  // ─── FETCH ────────────────────────────────────────────────────────────────
  async function fetchMetas() {
    const tok = sessionStorage.getItem('bo_token');
    try {
      const r = await fetch(`${API}/api/metas/`, {
        headers: { Authorization: `Bearer ${tok}` }
      });
      if (r.ok) _metasList = await r.json();
    } catch (e) { console.warn('Metas: erro ao buscar', e); }
  }

  // ─── AGRUPAMENTO POR PERÍODO ──────────────────────────────────────────────
  function getPeriodos() {
    const map = {};
    _metasList.forEach(m => {
      const key = `${m.semestre}||${m.mes}`;
      if (!map[key]) map[key] = { semestre: m.semestre, mes: m.mes, total: 0, metas: [] };
      map[key].total += (m.meta_rv || m.valor_meta || 0);
      map[key].metas.push(m);
    });
    // ordenar: mais recente primeiro
    return Object.values(map).sort((a, b) => {
      const ka = `${a.mes}${a.semestre}`, kb = `${b.mes}${b.semestre}`;
      return kb.localeCompare(ka);
    });
  }

  // ─── RENDER TABELA PRINCIPAL ──────────────────────────────────────────────
  function renderPeriodos() {
    const tbody = document.getElementById('metas-tbody');
    if (!tbody) return;
    const periodos = getPeriodos();

    if (periodos.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="td-empty">Nenhuma meta cadastrada ainda.</td></tr>`;
      return;
    }

    // construir param lookup: nome assessor → broker
    const paramData = window.getParamData ? window.getParamData() : [];
    const brokerMap = {};
    paramData.forEach(p => {
      const nome = p.nome || p.name || p.assessor || '';
      brokerMap[nome] = p.broker_nome || p.broker || '—';
    });

    let html = '';
    periodos.forEach(p => {
      const key = `${p.semestre}||${p.mes}`;
      const isOpen = _expanded.has(key);
      const periodLabel = `${p.semestre} · ${labelMes(p.mes)}`;
      const count = p.metas.length;
      const allIds = p.metas.map(m => m.id);

      html += `
        <tr class="row-periodo ${isOpen ? 'expanded' : ''}" data-key="${escAttr(key)}">
          <td class="td-chk">
            <input type="checkbox" class="chk-periodo" data-ids="${escAttr(JSON.stringify(allIds))}"
              ${allIds.every(id => _selected.has(id)) && allIds.length > 0 ? 'checked' : ''}>
          </td>
          <td class="td-expand" onclick="togglePeriodo('${escAttr(key)}')">
            <span class="expand-icon">${isOpen ? '▾' : '▸'}</span>
          </td>
          <td class="td-periodo" onclick="togglePeriodo('${escAttr(key)}')">
            <span class="period-label">${escHtml(periodLabel)}</span>
            <span class="period-count">${count} assessor${count !== 1 ? 'es' : ''}</span>
          </td>
          <td class="td-sem"><span class="chip-smt">${escHtml(p.semestre)}</span></td>
          <td class="td-meta-total">${fmtBRL(p.total)}</td>
          <td class="td-acoes">
            <button class="btn-icon btn-edit-periodo" title="Editar período"
              onclick="abrirEdicaoPeriodo('${escAttr(key)}')">✎</button>
            <button class="btn-icon btn-del-periodo" title="Excluir período"
              onclick="confirmarExcluirPeriodo('${escAttr(key)}', '${escAttr(periodLabel)}')">✕</button>
          </td>
        </tr>`;

      if (isOpen) {
        // sub-linhas de assessores
        const sorted = [...p.metas].sort((a, b) => {
          const ba = brokerMap[a.assessor] || '', bb = brokerMap[b.assessor] || '';
          return ba.localeCompare(bb) || a.assessor.localeCompare(b.assessor);
        });
        sorted.forEach(m => {
          const broker = brokerMap[m.assessor] || '—';
          const chkd = _selected.has(m.id) ? 'checked' : '';
          html += `
            <tr class="row-assessor" data-id="${m.id}">
              <td class="td-chk">
                <input type="checkbox" class="chk-meta" data-id="${m.id}" ${chkd}>
              </td>
              <td></td>
              <td class="td-assessor-nome">${escHtml(m.assessor)}</td>
              <td class="td-broker-nome">${escHtml(broker)}</td>
              <td class="td-meta-ind">${fmtBRL(m.meta_rv || m.valor_meta || 0)}</td>
              <td class="td-acoes">
                <button class="btn-icon btn-edit-meta" title="Editar meta"
                  onclick="abrirEdicaoMeta(${m.id})">✎</button>
                <button class="btn-icon btn-del-meta" title="Excluir meta"
                  onclick="confirmarExcluirMeta(${m.id}, '${escAttr(m.assessor)}')">✕</button>
              </td>
            </tr>`;
        });
      }
    });

    tbody.innerHTML = html;

    // rebind checkboxes
    tbody.querySelectorAll('.chk-meta').forEach(chk => {
      chk.addEventListener('change', function () {
        const id = parseInt(this.dataset.id);
        this.checked ? _selected.add(id) : _selected.delete(id);
        updateBatchBar();
      });
    });
    tbody.querySelectorAll('.chk-periodo').forEach(chk => {
      chk.addEventListener('change', function () {
        const ids = JSON.parse(this.dataset.ids || '[]');
        ids.forEach(id => this.checked ? _selected.add(id) : _selected.delete(id));
        updateBatchBar();
        renderPeriodos();
      });
    });

    updateBatchBar();
  }

  // ─── TOGGLE EXPAND ────────────────────────────────────────────────────────
  window.togglePeriodo = function (key) {
    _expanded.has(key) ? _expanded.delete(key) : _expanded.add(key);
    renderPeriodos();
  };

  // ─── BARRA DE AÇÕES EM LOTE ───────────────────────────────────────────────
  function updateBatchBar() {
    const bar = document.getElementById('metas-batch-bar');
    const cnt = document.getElementById('metas-batch-count');
    if (!bar) return;
    if (_selected.size > 0) {
      bar.style.display = 'flex';
      if (cnt) cnt.textContent = `${_selected.size} selecionada${_selected.size !== 1 ? 's' : ''}`;
    } else {
      bar.style.display = 'none';
    }
  }

  window.limparSelecao = function () {
    _selected.clear();
    renderPeriodos();
  };

  window.excluirLoteSelecionados = async function () {
    if (_selected.size === 0) return;
    const conf = document.getElementById('metas-conf-overlay');
    const msg  = document.getElementById('metas-conf-msg');
    if (msg) msg.textContent = `Excluir ${_selected.size} meta${_selected.size !== 1 ? 's' : ''} selecionada${_selected.size !== 1 ? 's' : ''}? Esta ação não pode ser desfeita.`;
    _pendingDelete = { type: 'lote', ids: [..._selected] };
    if (conf) conf.style.display = 'flex';
  };

  // ─── EDITAR PERÍODO (abre modal com todos assessores do período) ───────────
  window.abrirEdicaoPeriodo = function (key) {
    const periodos = getPeriodos();
    const p = periodos.find(x => `${x.semestre}||${x.mes}` === key);
    if (!p) return;

    const paramData = window.getParamData ? window.getParamData() : [];
    const brokerMap = {};
    paramData.forEach(x => { brokerMap[x.nome || x.name || x.assessor || ''] = x.broker_nome || x.broker || '—'; });

    const title = document.getElementById('meta-lanc-title');
    if (title) title.textContent = `Editar — ${p.semestre} · ${labelMes(p.mes)}`;

    // montar sessão a partir das metas existentes
    window._editSessao = { periodo: key, semestre: p.semestre, mes: p.mes, metas: p.metas, brokerMap };

    const tbody = document.getElementById('meta-lanc-tbody');
    if (!tbody) return;

    const sorted = [...p.metas].sort((a, b) => {
      const ba = brokerMap[a.assessor] || '', bb = brokerMap[b.assessor] || '';
      return ba.localeCompare(bb) || a.assessor.localeCompare(b.assessor);
    });

    tbody.innerHTML = sorted.map((m, i) => {
      const broker = brokerMap[m.assessor] || '—';
      return `
        <tr>
          <td class="td-aai">${escHtml(m.assessor)}</td>
          <td class="td-broker-sub">${escHtml(broker)}</td>
          <td>
            <input type="text" class="meta-val-inp"
              id="meta-inp-${m.id}"
              value="${fmtBRL(m.meta_rv || m.valor_meta || 0)}"
              oninput="maskMetaInp(this)"
              data-id="${m.id}"
            />
          </td>
        </tr>`;
    }).join('');

    const ov = document.getElementById('meta-lanc-overlay');
    if (ov) ov.style.display = 'flex';
    const msg = document.getElementById('meta-lanc-msg');
    if (msg) msg.style.display = 'none';
  };

  // ─── EDITAR META INDIVIDUAL ───────────────────────────────────────────────
  window.abrirEdicaoMeta = function (id) {
    const m = _metasList.find(x => x.id === id);
    if (!m) return;

    const paramData = window.getParamData ? window.getParamData() : [];
    const brokerMap = {};
    paramData.forEach(x => { brokerMap[x.nome || x.name || x.assessor || ''] = x.broker_nome || x.broker || '—'; });
    const broker = brokerMap[m.assessor] || '—';

    const title = document.getElementById('meta-lanc-title');
    if (title) title.textContent = `Editar — ${escHtml(m.assessor)}`;

    window._editSessao = { tipo: 'individual', metas: [m] };

    const tbody = document.getElementById('meta-lanc-tbody');
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td class="td-aai">${escHtml(m.assessor)}</td>
          <td class="td-broker-sub">${escHtml(broker)}</td>
          <td>
            <input type="text" class="meta-val-inp"
              id="meta-inp-${m.id}"
              value="${fmtBRL(m.meta_rv || m.valor_meta || 0)}"
              oninput="maskMetaInp(this)"
              data-id="${m.id}"
            />
          </td>
        </tr>`;
    }

    const ov = document.getElementById('meta-lanc-overlay');
    if (ov) ov.style.display = 'flex';
    const msg = document.getElementById('meta-lanc-msg');
    if (msg) msg.style.display = 'none';
  };

  // ─── SALVAR EDIÇÃO ────────────────────────────────────────────────────────
  window.salvarSessaoMetas = async function () {
    const sess = window._editSessao;
    if (!sess) return;
    const tok = sessionStorage.getItem('bo_token');
    const btn = document.getElementById('meta-lanc-salvar');
    if (btn) { btn.disabled = true; btn.textContent = 'Salvando…'; }

    let ok = 0, err = 0;
    const metas = sess.metas || [];

    for (const m of metas) {
      const inp = document.getElementById(`meta-inp-${m.id}`);
      if (!inp) continue;
      const raw = inp.value.replace(/[^\d,]/g, '').replace(',', '.');
      const val = parseFloat(raw) || 0;
      try {
        const r = await fetch(`${API}/api/metas/${m.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
          body: JSON.stringify({ meta_rv: val, valor_meta: val })
        });
        r.ok ? ok++ : err++;
      } catch { err++; }
    }

    if (btn) { btn.disabled = false; btn.textContent = 'Salvar'; }
    const msg = document.getElementById('meta-lanc-msg');
    if (msg) {
      msg.textContent = err === 0 ? `✓ ${ok} meta${ok !== 1 ? 's' : ''} salva${ok !== 1 ? 's' : ''}!` : `${ok} salvas, ${err} com erro.`;
      msg.className = err === 0 ? 'lanc-msg ok' : 'lanc-msg err';
      msg.style.display = 'block';
    }
    await fetchMetas();
    renderPeriodos();
    if (err === 0) setTimeout(fecharModalLanc, 1200);
  };

  window.fecharModalLanc = function () {
    const ov = document.getElementById('meta-lanc-overlay');
    if (ov) ov.style.display = 'none';
    window._editSessao = null;
  };

  // ─── CONFIRMAR / EXCLUIR ──────────────────────────────────────────────────
  let _pendingDelete = null;

  window.confirmarExcluirPeriodo = function (key, label) {
    const periodos = getPeriodos();
    const p = periodos.find(x => `${x.semestre}||${x.mes}` === key);
    if (!p) return;
    const ids = p.metas.map(m => m.id);
    const conf = document.getElementById('metas-conf-overlay');
    const msg  = document.getElementById('metas-conf-msg');
    if (msg) msg.textContent = `Excluir todas as ${ids.length} metas do período "${label}"? Esta ação não pode ser desfeita.`;
    _pendingDelete = { type: 'lote', ids };
    if (conf) conf.style.display = 'flex';
  };

  window.confirmarExcluirMeta = function (id, assessor) {
    const conf = document.getElementById('metas-conf-overlay');
    const msg  = document.getElementById('metas-conf-msg');
    if (msg) msg.textContent = `Excluir a meta de "${assessor}"? Esta ação não pode ser desfeita.`;
    _pendingDelete = { type: 'individual', ids: [id] };
    if (conf) conf.style.display = 'flex';
  };

  window.fecharConfirmacao = function () {
    const conf = document.getElementById('metas-conf-overlay');
    if (conf) conf.style.display = 'none';
    _pendingDelete = null;
  };

  window.executarExclusao = async function () {
    if (!_pendingDelete) return;
    const tok = sessionStorage.getItem('bo_token');
    const btn = document.getElementById('metas-conf-ok');
    if (btn) { btn.disabled = true; btn.textContent = 'Excluindo…'; }

    for (const id of _pendingDelete.ids) {
      try {
        await fetch(`${API}/api/metas/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${tok}` }
        });
        _selected.delete(id);
      } catch (e) { console.warn('Erro ao excluir meta', id, e); }
    }

    if (btn) { btn.disabled = false; btn.textContent = 'Excluir'; }
    fecharConfirmacao();
    await fetchMetas();
    renderPeriodos();
  };

  // ─── MODAL NOVA META (passo 1 → passo 2) ─────────────────────────────────
  function abrirModalSessao() {
    const now = new Date();
    const selMes = document.getElementById('sess-mes');
    const selSem = document.getElementById('sess-sem');
    const selAno = document.getElementById('sess-ano');
    if (selMes) selMes.value = String(now.getMonth() + 1).padStart(2, '0');
    if (selAno) selAno.value = now.getFullYear();
    if (selSem) selSem.value = (now.getMonth() + 1) <= 6 ? '1' : '2';
    const ov = document.getElementById('meta-sessao-overlay');
    if (ov) ov.style.display = 'flex';
  }

  window.fecharModalSessao = function () {
    const ov = document.getElementById('meta-sessao-overlay');
    if (ov) ov.style.display = 'none';
  };

  window.confirmarSessao = async function () {
    const ano = document.getElementById('sess-ano').value;
    const mes = document.getElementById('sess-mes').value;
    const sem = document.getElementById('sess-sem').value;
    if (!ano || !mes || !sem) return;

    const semStr = `${ano}-S${sem}`;
    const mesStr = `${ano}-${mes}`;

    const paramData = window.getParamData ? window.getParamData() : [];
    const user = window.currentUser || JSON.parse(localStorage.getItem('brkUser') || '{}');
    let assessores = paramData;
    if (user.nivel === 1) {
      assessores = paramData.filter(p => p.broker === user.username || p.broker_nome === user.name);
    }
    if (assessores.length === 0) {
      alert('Nenhum assessor encontrado. Configure a Parametrização primeiro.');
      return;
    }

    const existentes = {};
    _metasList.forEach(m => {
      if (m.semestre === semStr && m.mes === mesStr) existentes[m.assessor] = m;
    });

    const brokerMap = {};
    paramData.forEach(p => { brokerMap[p.nome || p.name || p.assessor || ''] = p.broker_nome || p.broker || '—'; });

    // montar sessão: metas existentes vêm com id, novas sem id
    const metasParaEditar = assessores.map(p => {
      const nome = p.nome || p.name || p.assessor || '';
      const exist = existentes[nome];
      return exist
        ? { ...exist }
        : { id: null, assessor: nome, semestre: semStr, mes: mesStr, meta_rv: 0, valor_meta: 0 };
    });

    window._editSessao = { tipo: 'nova', semestre: semStr, mes: mesStr, metas: metasParaEditar, brokerMap };

    const title = document.getElementById('meta-lanc-title');
    if (title) title.textContent = `Metas RV — ${labelMes(mesStr)} / ${semStr}`;

    const tbody = document.getElementById('meta-lanc-tbody');
    if (tbody) {
      const sorted = [...metasParaEditar].sort((a, b) => {
        const ba = brokerMap[a.assessor] || '', bb = brokerMap[b.assessor] || '';
        return ba.localeCompare(bb) || a.assessor.localeCompare(b.assessor);
      });
      tbody.innerHTML = sorted.map(m => `
        <tr>
          <td class="td-aai">${escHtml(m.assessor)}</td>
          <td class="td-broker-sub">${escHtml(brokerMap[m.assessor] || '—')}</td>
          <td>
            <input type="text" class="meta-val-inp"
              id="meta-inp-${m.id || 'new_' + m.assessor.replace(/\s/g,'_')}"
              data-id="${m.id || ''}"
              data-assessor="${escAttr(m.assessor)}"
              value="${m.meta_rv || m.valor_meta ? fmtBRL(m.meta_rv || m.valor_meta) : ''}"
              placeholder="R$ 0,00"
              oninput="maskMetaInp(this)"
            />
          </td>
        </tr>`).join('');
    }

    fecharModalSessao();
    const ov = document.getElementById('meta-lanc-overlay');
    if (ov) ov.style.display = 'flex';
    const msg = document.getElementById('meta-lanc-msg');
    if (msg) msg.style.display = 'none';
    // Override salvar para lidar com criação + atualização
    window._editSessao._nova = true;
  };

  // Override salvar para sessão nova (cria + atualiza)
  const _origSalvar = window.salvarSessaoMetas;
  window.salvarSessaoMetas = async function () {
    const sess = window._editSessao;
    if (!sess) return;
    if (!sess._nova) return _origSalvar();

    const tok = sessionStorage.getItem('bo_token');
    const btn = document.getElementById('meta-lanc-salvar');
    if (btn) { btn.disabled = true; btn.textContent = 'Salvando…'; }

    const inps = document.querySelectorAll('#meta-lanc-tbody .meta-val-inp');
    let ok = 0, err = 0;

    for (const inp of inps) {
      const raw = inp.value.replace(/[^\d,]/g, '').replace(',', '.');
      const val = parseFloat(raw) || 0;
      const id = inp.dataset.id;
      const assessor = inp.dataset.assessor;
      try {
        let r;
        if (id) {
          r = await fetch(`${API}/api/metas/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
            body: JSON.stringify({ meta_rv: val, valor_meta: val })
          });
        } else {
          r = await fetch(`${API}/api/metas/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
            body: JSON.stringify({ assessor, semestre: sess.semestre, mes: sess.mes, meta_rv: val, valor_meta: val })
          });
        }
        r.ok ? ok++ : err++;
      } catch { err++; }
    }

    if (btn) { btn.disabled = false; btn.textContent = 'Salvar'; }
    const msg = document.getElementById('meta-lanc-msg');
    if (msg) {
      msg.textContent = err === 0 ? `✓ ${ok} meta${ok !== 1 ? 's' : ''} salva${ok !== 1 ? 's' : ''}!` : `${ok} salvas, ${err} com erro.`;
      msg.className = err === 0 ? 'lanc-msg ok' : 'lanc-msg err';
      msg.style.display = 'block';
    }
    await fetchMetas();
    renderPeriodos();
    if (err === 0) setTimeout(fecharModalLanc, 1200);
  };

  // ─── CSV IMPORT ───────────────────────────────────────────────────────────
  async function handleCsvImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = '';

    const buf  = await file.arrayBuffer();
    const raw  = new TextDecoder('utf-8').decode(buf);
    const text = raw.replace(/^\uFEFF/, '');
    const lines = text.split(/\r?\n/);

    const firstLine = lines[0].toLowerCase();
    const hasHeader = firstLine.includes('assessor') || firstLine.includes('meta') || firstLine.includes('m\u00eas');
    const dataLines = hasHeader ? lines.slice(1) : lines;

    const tok = sessionStorage.getItem('bo_token');
    let ok = 0, err = 0, skip = 0;
    const statusEl = document.getElementById('metas-import-status');
    if (statusEl) { statusEl.textContent = 'Importando\u2026'; statusEl.className = 'import-status'; statusEl.style.display = 'inline'; }

    for (const line of dataLines) {
      if (!line.trim()) continue;
      const cols = parseCsvLine(line);
      if (cols.length < 4) { skip++; continue; }
      const clean = cols.map(c => c.replace(/\r/g, '').replace(/^"|"$/g, '').trim());
      const [assessor, semestre, mes, metaRaw] = clean;
      if (!assessor || !semestre || !mes) { skip++; continue; }
      const meta_rv = parseFloat(metaRaw.replace(/\./g, '').replace(',', '.')) || 0;
      const exist = _metasList.find(m => m.assessor === assessor && m.semestre === semestre && m.mes === mes);
      try {
        let r;
        if (exist) {
          r = await fetch(`${API}/api/metas/${exist.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
            body: JSON.stringify({ meta_rv, valor_meta: meta_rv })
          });
        } else {
          r = await fetch(`${API}/api/metas/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
            body: JSON.stringify({ assessor, semestre, mes, meta_rv, valor_meta: meta_rv })
          });
        }
        if (r.ok) { ok++; } else {
          const body = await r.text();
          console.warn(`Metas CSV erro ${r.status} \u2014 ${assessor}:`, body);
          err++;
        }
      } catch (ex) { console.warn('Metas CSV:', ex); err++; }
    }

    if (statusEl) {
      statusEl.textContent = `\u2713 ${ok} importadas${err ? `, ${err} erros` : ''}${skip ? `, ${skip} ignoradas` : ''}`;
      statusEl.className = err > 0 ? 'import-status err' : 'import-status ok';
      setTimeout(() => { statusEl.style.display = 'none'; }, 5000);
    }
    await fetchMetas();
    renderPeriodos();
  }

  function parseCsvLine(line) {
    const sep = line.includes(';') ? ';' : ',';
    const result = []; let cur = '', inQ = false;
    for (const c of line) {
      if (c === '"') { inQ = !inQ; }
      else if (c === sep && !inQ) { result.push(cur); cur = ''; }
      else { cur += c; }
    }
    result.push(cur);
    return result;
  }

  // ─── BIND EVENTS ──────────────────────────────────────────────────────────
  function bindMetasEvents() {
    const btnNova = document.getElementById('metas-nova-btn');
    if (btnNova) btnNova.addEventListener('click', abrirModalSessao);

    const btnImport = document.getElementById('metas-import-btn');
    if (btnImport) btnImport.addEventListener('click', () => document.getElementById('metas-csv-input').click());

    const csvInput = document.getElementById('metas-csv-input');
    if (csvInput) csvInput.addEventListener('change', handleCsvImport);

    const ovSessao = document.getElementById('meta-sessao-overlay');
    if (ovSessao) ovSessao.addEventListener('click', e => { if (e.target === ovSessao) fecharModalSessao(); });

    const ovLanc = document.getElementById('meta-lanc-overlay');
    if (ovLanc) ovLanc.addEventListener('click', e => { if (e.target === ovLanc) fecharModalLanc(); });

    const ovConf = document.getElementById('metas-conf-overlay');
    if (ovConf) ovConf.addEventListener('click', e => { if (e.target === ovConf) fecharConfirmacao(); });
  }

  // ─── MASK ─────────────────────────────────────────────────────────────────
  window.maskMetaInp = function (el) {
    let v = el.value.replace(/\D/g, '');
    if (!v) { el.value = ''; return; }
    el.value = 'R$ ' + (parseInt(v, 10) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // ─── HELPERS ──────────────────────────────────────────────────────────────
  const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  function labelMes(mesStr) {
    if (!mesStr) return mesStr;
    const [ano, m] = mesStr.split('-');
    return `${MESES[(parseInt(m,10)-1)] || m}/${ano}`;
  }
  function fmtBRL(v) {
    return 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function escHtml(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function escAttr(s) { return String(s||'').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }

})();
