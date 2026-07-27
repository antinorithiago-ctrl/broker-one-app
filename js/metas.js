// ─── METAS MODULE v3 — chave por COD AAI ─────────────────────────────────────
(function () {
  'use strict';

  const API = window.BROKER_API || 'https://broker-one-backend-production-90c9.up.railway.app';

  let _metasList = [];
  let _expanded  = new Set();
  let _selected  = new Set();

  // ─── helpers de lookup na Parametrização ──────────────────────────────────
  // Retorna { codNomeMap, codBrokerMap } — chave = cod_aai (string)
  function buildParamMaps() {
    const paramData = window.getParamData ? window.getParamData() : [];
    const codNomeMap   = {};   // "1910" → "VIVIANE MAIA DE SOUZA FERNANDES"
    const codBrokerMap = {};   // "1910" → "Thiago Antinori"
    paramData.forEach(p => {
      const cod = String(p.cod_aai || p.codAai || p.cod || '').trim();
      if (!cod) return;
      codNomeMap[cod]   = p.assessor || p.nome || p.name || cod;
      codBrokerMap[cod] = p.broker_nome || p.broker || '—';
    });
    return { codNomeMap, codBrokerMap };
  }

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

    const { codNomeMap, codBrokerMap } = buildParamMaps();

    let html = '';
    periodos.forEach(p => {
      const key    = `${p.semestre}||${p.mes}`;
      const isOpen = _expanded.has(key);
      const label  = `${p.semestre} · ${labelMes(p.mes)}`;
      const count  = p.metas.length;
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
            <span class="period-label">${escHtml(label)}</span>
            <span class="period-count">${count} assessor${count !== 1 ? 'es' : ''}</span>
          </td>
          <td class="td-sem"><span class="chip-smt">${escHtml(p.semestre)}</span></td>
          <td class="td-meta-total">${fmtBRL(p.total)}</td>
          <td class="td-acoes">
            <button class="btn-icon btn-edit-periodo" title="Editar período"
              onclick="abrirEdicaoPeriodo('${escAttr(key)}')">✎</button>
            <button class="btn-icon btn-del-periodo" title="Excluir período"
              onclick="confirmarExcluirPeriodo('${escAttr(key)}', '${escAttr(label)}')">✕</button>
          </td>
        </tr>`;

      if (isOpen) {
        const sorted = [...p.metas].sort((a, b) => {
          const ba = codBrokerMap[a.assessor] || '', bb = codBrokerMap[b.assessor] || '';
          return ba.localeCompare(bb) || (a.assessor || '').localeCompare(b.assessor || '');
        });
        sorted.forEach(m => {
          const cod    = m.assessor || '';
          const nome   = codNomeMap[cod]   || cod;
          const broker = codBrokerMap[cod] || '—';
          const chkd   = _selected.has(m.id) ? 'checked' : '';
          html += `
            <tr class="row-assessor" data-id="${m.id}">
              <td class="td-chk">
                <input type="checkbox" class="chk-meta" data-id="${m.id}" ${chkd}>
              </td>
              <td></td>
              <td class="td-assessor-nome">
                <span class="nome-aai">${escHtml(nome)}</span>
                <span class="cod-aai">${escHtml(cod)}</span>
              </td>
              <td class="td-broker-nome">${escHtml(broker)}</td>
              <td class="td-meta-ind">${fmtBRL(m.meta_rv || m.valor_meta || 0)}</td>
              <td class="td-acoes">
                <button class="btn-icon btn-edit-meta" title="Editar meta"
                  onclick="abrirEdicaoMeta(${m.id})">✎</button>
                <button class="btn-icon btn-del-meta" title="Excluir meta"
                  onclick="confirmarExcluirMeta(${m.id}, '${escAttr(nome)}')">✕</button>
              </td>
            </tr>`;
        });
      }
    });

    tbody.innerHTML = html;

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

  window.togglePeriodo = function (key) {
    _expanded.has(key) ? _expanded.delete(key) : _expanded.add(key);
    renderPeriodos();
  };

  // ─── BATCH BAR ────────────────────────────────────────────────────────────
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

  window.limparSelecao = function () { _selected.clear(); renderPeriodos(); };

  window.excluirLoteSelecionados = async function () {
    if (_selected.size === 0) return;
    const conf = document.getElementById('metas-conf-overlay');
    const msg  = document.getElementById('metas-conf-msg');
    if (msg) msg.textContent = `Excluir ${_selected.size} meta${_selected.size !== 1 ? 's' : ''} selecionada${_selected.size !== 1 ? 's' : ''}? Esta ação não pode ser desfeita.`;
    _pendingDelete = { type: 'lote', ids: [..._selected] };
    if (conf) conf.style.display = 'flex';
  };

  // ─── EDITAR PERÍODO ───────────────────────────────────────────────────────
  window.abrirEdicaoPeriodo = function (key) {
    const periodos = getPeriodos();
    const p = periodos.find(x => `${x.semestre}||${x.mes}` === key);
    if (!p) return;
    const { codNomeMap, codBrokerMap } = buildParamMaps();
    const title = document.getElementById('meta-lanc-title');
    if (title) title.textContent = `Editar — ${p.semestre} · ${labelMes(p.mes)}`;
    window._editSessao = { tipo: 'periodo', metas: p.metas };
    _renderLancTbody(p.metas, codNomeMap, codBrokerMap);
    const ov = document.getElementById('meta-lanc-overlay');
    if (ov) ov.style.display = 'flex';
    const msg = document.getElementById('meta-lanc-msg');
    if (msg) msg.style.display = 'none';
  };

  // ─── EDITAR META INDIVIDUAL ───────────────────────────────────────────────
  window.abrirEdicaoMeta = function (id) {
    const m = _metasList.find(x => x.id === id);
    if (!m) return;
    const { codNomeMap, codBrokerMap } = buildParamMaps();
    const nome = codNomeMap[m.assessor] || m.assessor;
    const title = document.getElementById('meta-lanc-title');
    if (title) title.textContent = `Editar — ${escHtml(nome)}`;
    window._editSessao = { tipo: 'individual', metas: [m] };
    _renderLancTbody([m], codNomeMap, codBrokerMap);
    const ov = document.getElementById('meta-lanc-overlay');
    if (ov) ov.style.display = 'flex';
    const msg = document.getElementById('meta-lanc-msg');
    if (msg) msg.style.display = 'none';
  };

  function _renderLancTbody(metas, codNomeMap, codBrokerMap) {
    const tbody = document.getElementById('meta-lanc-tbody');
    if (!tbody) return;
    const sorted = [...metas].sort((a, b) => {
      const ba = codBrokerMap[a.assessor] || '', bb = codBrokerMap[b.assessor] || '';
      return ba.localeCompare(bb) || (a.assessor || '').localeCompare(b.assessor || '');
    });
    tbody.innerHTML = sorted.map(m => {
      const cod    = m.assessor || '';
      const nome   = codNomeMap[cod]   || cod;
      const broker = codBrokerMap[cod] || '—';
      return `
        <tr>
          <td class="td-aai">
            <span class="nome-aai">${escHtml(nome)}</span>
            <span class="cod-aai">${escHtml(cod)}</span>
          </td>
          <td class="td-broker-sub">${escHtml(broker)}</td>
          <td>
            <input type="text" class="meta-val-inp"
              id="meta-inp-${m.id}"
              data-id="${m.id}"
              value="${fmtBRL(m.meta_rv || m.valor_meta || 0)}"
              oninput="maskMetaInp(this)"
            />
          </td>
        </tr>`;
    }).join('');
  }

  // ─── SALVAR EDIÇÃO ────────────────────────────────────────────────────────
  window.fecharModalLanc = function () {
    const ov = document.getElementById('meta-lanc-overlay');
    if (ov) ov.style.display = 'none';
    window._editSessao = null;
  };

  window.salvarSessaoMetas = async function () {
    const sess = window._editSessao;
    if (!sess) return;

    // Sessão nova — usa inputs por assessor cod + data-id ou data-assessor
    if (sess._nova) { await _salvarNovaSessao(); return; }

    // Edição de período ou individual
    const tok = localStorage.getItem('brkToken') || sessionStorage.getItem('bo_token');
    const btn = document.getElementById('meta-lanc-salvar');
    if (btn) { btn.disabled = true; btn.textContent = 'Salvando…'; }
    let ok = 0, err = 0;

    for (const m of (sess.metas || [])) {
      const inp = document.getElementById(`meta-inp-${m.id}`);
      if (!inp) continue;
      const raw = inp.value.replace(/[^\d,]/g, '').replace(',', '.');
      const val = parseFloat(raw) || 0;
      try {
        const r = await fetch(`${API}/api/metas/${m.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionStorage.getItem('bo_token')}` },
          body: JSON.stringify({ meta_rv: val, valor_meta: val })
        });
        r.ok ? ok++ : err++;
      } catch { err++; }
    }
    if (btn) { btn.disabled = false; btn.textContent = 'Salvar'; }
    _showLancMsg(ok, err);
    await fetchMetas(); renderPeriodos();
    if (err === 0) setTimeout(fecharModalLanc, 1200);
  };

  async function _salvarNovaSessao() {
    const sess = window._editSessao;
    const tok  = sessionStorage.getItem('bo_token');
    const btn  = document.getElementById('meta-lanc-salvar');
    if (btn) { btn.disabled = true; btn.textContent = 'Salvando…'; }
    const inps = document.querySelectorAll('#meta-lanc-tbody .meta-val-inp');
    let ok = 0, err = 0;
    for (const inp of inps) {
      const raw      = inp.value.replace(/[^\d,]/g, '').replace(',', '.');
      const val      = parseFloat(raw) || 0;
      const id       = inp.dataset.id;
      const assessor = inp.dataset.assessor; // cod_aai
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
    _showLancMsg(ok, err);
    await fetchMetas(); renderPeriodos();
    if (err === 0) setTimeout(fecharModalLanc, 1200);
  }

  function _showLancMsg(ok, err) {
    const msg = document.getElementById('meta-lanc-msg');
    if (!msg) return;
    msg.textContent = err === 0
      ? `✓ ${ok} meta${ok !== 1 ? 's' : ''} salva${ok !== 1 ? 's' : ''}!`
      : `${ok} salvas, ${err} com erro.`;
    msg.className  = err === 0 ? 'lanc-msg ok' : 'lanc-msg err';
    msg.style.display = 'block';
  }

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

  window.confirmarExcluirMeta = function (id, nome) {
    const conf = document.getElementById('metas-conf-overlay');
    const msg  = document.getElementById('metas-conf-msg');
    if (msg) msg.textContent = `Excluir a meta de "${nome}"? Esta ação não pode ser desfeita.`;
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

  // ─── MODAL NOVA META ──────────────────────────────────────────────────────
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
    const user = window.currentUser || JSON.parse(sessionStorage.getItem('bo_user') || '{}');
    let assessores = paramData;
    if (user.nivel === 1) {
      assessores = paramData.filter(p => p.broker === user.username || p.broker_nome === user.name);
    }
    if (assessores.length === 0) {
      alert('Nenhum assessor encontrado. Configure a Parametrização primeiro.');
      return;
    }

    const { codNomeMap, codBrokerMap } = buildParamMaps();

    // chave = cod_aai
    const existentes = {};
    _metasList.forEach(m => {
      if (m.semestre === semStr && m.mes === mesStr) existentes[m.assessor] = m;
    });

    const metasParaEditar = assessores.map(p => {
      const cod  = String(p.cod_aai || p.codAai || p.cod || '').trim();
      const nome = p.assessor || p.nome || p.name || cod;
      const exist = existentes[cod];
      return exist
        ? { ...exist }
        : { id: null, assessor: cod, nome, semestre: semStr, mes: mesStr, meta_rv: 0, valor_meta: 0 };
    });

    window._editSessao = { _nova: true, tipo: 'nova', semestre: semStr, mes: mesStr, metas: metasParaEditar };

    const title = document.getElementById('meta-lanc-title');
    if (title) title.textContent = `Metas RV — ${labelMes(mesStr)} / ${semStr}`;

    const tbody = document.getElementById('meta-lanc-tbody');
    if (tbody) {
      const sorted = [...metasParaEditar].sort((a, b) => {
        const ba = codBrokerMap[a.assessor] || '', bb = codBrokerMap[b.assessor] || '';
        return ba.localeCompare(bb) || (a.assessor || '').localeCompare(b.assessor || '');
      });
      tbody.innerHTML = sorted.map(m => {
        const cod    = m.assessor || '';
        const nome   = codNomeMap[cod] || m.nome || cod;
        const broker = codBrokerMap[cod] || '—';
        return `
          <tr>
            <td class="td-aai">
              <span class="nome-aai">${escHtml(nome)}</span>
              <span class="cod-aai">${escHtml(cod)}</span>
            </td>
            <td class="td-broker-sub">${escHtml(broker)}</td>
            <td>
              <input type="text" class="meta-val-inp"
                id="meta-inp-${m.id || 'new_' + cod}"
                data-id="${m.id || ''}"
                data-assessor="${escAttr(cod)}"
                value="${(m.meta_rv || m.valor_meta) ? fmtBRL(m.meta_rv || m.valor_meta) : ''}"
                placeholder="R$ 0,00"
                oninput="maskMetaInp(this)"
              />
            </td>
          </tr>`;
      }).join('');
    }

    fecharModalSessao();
    const ov = document.getElementById('meta-lanc-overlay');
    if (ov) ov.style.display = 'flex';
    const msg = document.getElementById('meta-lanc-msg');
    if (msg) msg.style.display = 'none';
  };

  // ─── CSV IMPORT — aceita COD AAI na coluna 1 ─────────────────────────────
  async function handleCsvImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = '';

    const buf  = await file.arrayBuffer();
    const raw  = new TextDecoder('utf-8').decode(buf);
    const text = raw.replace(/^\uFEFF/, ''); // remove BOM Excel
    const lines = text.split(/\r?\n/);

    const firstLine = lines[0].toLowerCase();
    const hasHeader = firstLine.includes('cod') || firstLine.includes('assessor') || firstLine.includes('meta');
    const dataLines = hasHeader ? lines.slice(1) : lines;

    const tok = sessionStorage.getItem('bo_token');
    let ok = 0, err = 0, skip = 0;
    const statusEl = document.getElementById('metas-import-status');
    if (statusEl) { statusEl.textContent = 'Importando…'; statusEl.className = 'import-status'; statusEl.style.display = 'inline'; }

    for (const line of dataLines) {
      if (!line.trim()) continue;
      const cols = parseCsvLine(line);
      if (cols.length < 4) { skip++; continue; }
      const clean = cols.map(c => c.replace(/\r/g, '').replace(/^"|"$/g, '').trim());
      const [codAai, semestre, mes, metaRaw] = clean;

      // ignorar linhas sem código
      if (!codAai || !semestre || !mes) { skip++; continue; }

      // valor: aceita decimal com vírgula ou ponto
      const meta_rv = parseFloat(metaRaw.replace(/\./g, '').replace(',', '.')) || 0;

      // assessor = cod_aai (string)
      const assessor = codAai;

      const exist = _metasList.find(m =>
        m.assessor === assessor && m.semestre === semestre && m.mes === mes
      );

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
          console.warn(`Metas CSV erro ${r.status} — cod ${codAai}:`, body);
          err++;
        }
      } catch (ex) { console.warn('Metas CSV:', ex); err++; }
    }

    if (statusEl) {
      statusEl.textContent = `✓ ${ok} importadas${err ? `, ${err} erros` : ''}${skip ? `, ${skip} ignoradas` : ''}`;
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
    return `${MESES[(parseInt(m, 10) - 1)] || m}/${ano}`;
  }
  function fmtBRL(v) {
    return 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function escHtml(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function escAttr(s) { return String(s || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }

})();
