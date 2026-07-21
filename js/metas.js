// ─── METAS MODULE ────────────────────────────────────────────────────────────
(function () {
  'use strict';

  const API = window.BROKER_API || 'https://broker-one-backend-production-90c9.up.railway.app';

  // Estado da sessão de lançamento
  let _sessao = null; // { semestre, mes, assessores: [{nome, meta}] }
  let _metasList = []; // metas salvas no backend

  // ─── INIT ──────────────────────────────────────────────────────────────────
  window.loadMetas = async function () {
    await fetchMetas();
    renderMetasTable();
    bindMetasEvents();
  };

  // ─── FETCH METAS ───────────────────────────────────────────────────────────
  async function fetchMetas() {
    const tok = localStorage.getItem('brkToken');
    try {
      const r = await fetch(`${API}/api/metas/`, {
        headers: { Authorization: `Bearer ${tok}` }
      });
      if (r.ok) _metasList = await r.json();
    } catch (e) {
      console.warn('Metas: erro ao buscar', e);
    }
  }

  // ─── TABELA PRINCIPAL ──────────────────────────────────────────────────────
  function renderMetasTable() {
    const tbody = document.getElementById('metas-tbody');
    if (!tbody) return;
    if (_metasList.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:var(--muted);padding:40px">Nenhuma meta cadastrada ainda.</td></tr>`;
      return;
    }
    tbody.innerHTML = _metasList.map(m => `
      <tr>
        <td>${escHtml(m.assessor)}</td>
        <td><span class="chip-smt">${escHtml(m.semestre || '')}</span></td>
        <td>${escHtml(m.mes || '')}</td>
        <td class="td-meta">${fmtBRL(m.meta_rv || m.valor_meta || 0)}</td>
      </tr>
    `).join('');
  }

  // ─── BIND EVENTS ──────────────────────────────────────────────────────────
  function bindMetasEvents() {
    const btnNova = document.getElementById('metas-nova-btn');
    if (btnNova) btnNova.addEventListener('click', abrirModalSessao);

    const btnImport = document.getElementById('metas-import-btn');
    if (btnImport) btnImport.addEventListener('click', () => document.getElementById('metas-csv-input').click());

    const csvInput = document.getElementById('metas-csv-input');
    if (csvInput) csvInput.addEventListener('change', handleCsvImport);

    // overlay fecha ao clicar fora
    const overlay = document.getElementById('meta-sessao-overlay');
    if (overlay) overlay.addEventListener('click', function (e) { if (e.target === this) fecharModalSessao(); });

    const overlayLanc = document.getElementById('meta-lanc-overlay');
    if (overlayLanc) overlayLanc.addEventListener('click', function (e) { if (e.target === this) fecharModalLanc(); });
  }

  // ─── MODAL SESSÃO (passo 1: escolher mês/semestre) ────────────────────────
  function abrirModalSessao() {
    const now = new Date();
    // preencher defaults
    const selMes = document.getElementById('sess-mes');
    const selSem = document.getElementById('sess-sem');
    const selAno = document.getElementById('sess-ano');
    if (selMes) selMes.value = String(now.getMonth() + 1).padStart(2, '0');
    if (selAno) selAno.value = now.getFullYear();
    const m = now.getMonth() + 1;
    if (selSem) selSem.value = m <= 6 ? '1' : '2';
    const ov = document.getElementById('meta-sessao-overlay');
    if (ov) { ov.style.display = 'flex'; }
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

    // Pegar assessores da Parametrização
    const paramData = window.getParamData ? window.getParamData() : [];
    const user = window.currentUser || JSON.parse(localStorage.getItem('brkUser') || '{}');

    let assessores = paramData;
    // Broker (nível 1) vê só seus assessores
    if (user.nivel === 1) {
      assessores = paramData.filter(p => p.broker === user.username || p.broker_nome === user.name);
    }

    if (assessores.length === 0) {
      alert('Nenhum assessor encontrado. Configure a Parametrização primeiro.');
      return;
    }

    // Buscar metas existentes pra pré-preencher
    const existentes = {};
    _metasList.forEach(m => {
      if (m.semestre === semStr && m.mes === mesStr) {
        existentes[m.assessor] = m.meta_rv || m.valor_meta || 0;
      }
    });

    _sessao = {
      semestre: semStr,
      mes: mesStr,
      assessores: assessores.map(p => ({
        nome: p.nome || p.name || p.assessor || '',
        meta: existentes[p.nome || p.name || p.assessor || ''] || 0
      }))
    };

    fecharModalSessao();
    abrirModalLancamento();
  };

  // ─── MODAL LANÇAMENTO (passo 2: grade com todos assessores) ───────────────
  function abrirModalLancamento() {
    if (!_sessao) return;

    const title = document.getElementById('meta-lanc-title');
    if (title) title.textContent = `Metas RV — ${labelMes(_sessao.mes)} / ${_sessao.semestre}`;

    renderGradeAssessores();
    const ov = document.getElementById('meta-lanc-overlay');
    if (ov) { ov.style.display = 'flex'; setTimeout(() => ov.querySelector('.meta-lanc-modal').classList.add('open'), 10); }
  }

  function renderGradeAssessores() {
    const tbody = document.getElementById('meta-lanc-tbody');
    if (!tbody || !_sessao) return;

    tbody.innerHTML = _sessao.assessores.map((a, i) => `
      <tr>
        <td class="td-aai">${escHtml(a.nome)}</td>
        <td>
          <input type="text"
            class="meta-val-inp"
            id="meta-inp-${i}"
            value="${a.meta ? fmtBRL(a.meta) : ''}"
            placeholder="R$ 0,00"
            oninput="maskMetaInp(this)"
            onblur="parseMetaInp(${i}, this)"
          />
        </td>
      </tr>
    `).join('');
  }

  window.fecharModalLanc = function () {
    const ov = document.getElementById('meta-lanc-overlay');
    if (ov) { ov.querySelector('.meta-lanc-modal').classList.remove('open'); setTimeout(() => { ov.style.display = 'none'; }, 200); }
    _sessao = null;
  };

  // ─── INPUT MASK ───────────────────────────────────────────────────────────
  window.maskMetaInp = function (el) {
    let v = el.value.replace(/\D/g, '');
    if (!v) { el.value = ''; return; }
    let n = parseInt(v, 10) / 100;
    el.value = 'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  window.parseMetaInp = function (i, el) {
    if (!_sessao || !_sessao.assessores[i]) return;
    const raw = el.value.replace(/[^\d,]/g, '').replace(',', '.');
    _sessao.assessores[i].meta = parseFloat(raw) || 0;
  };

  // ─── SALVAR SESSÃO ────────────────────────────────────────────────────────
  window.salvarSessaoMetas = async function () {
    if (!_sessao) return;

    // Garantir que todos os valores estejam parseados antes de salvar
    _sessao.assessores.forEach((a, i) => {
      const inp = document.getElementById(`meta-inp-${i}`);
      if (inp) {
        const raw = inp.value.replace(/[^\d,]/g, '').replace(',', '.');
        a.meta = parseFloat(raw) || 0;
      }
    });

    const tok = localStorage.getItem('brkToken');
    const btn = document.getElementById('meta-lanc-salvar');
    if (btn) { btn.disabled = true; btn.textContent = 'Salvando…'; }

    let ok = 0, err = 0;

    for (const a of _sessao.assessores) {
      if (!a.nome) continue;
      // Verificar se já existe
      const exist = _metasList.find(m =>
        m.assessor === a.nome &&
        m.semestre === _sessao.semestre &&
        m.mes === _sessao.mes
      );

      try {
        let resp;
        if (exist) {
          resp = await fetch(`${API}/api/metas/${exist.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
            body: JSON.stringify({ meta_rv: a.meta, valor_meta: a.meta })
          });
        } else {
          resp = await fetch(`${API}/api/metas/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
            body: JSON.stringify({
              assessor: a.nome,
              semestre: _sessao.semestre,
              mes: _sessao.mes,
              meta_rv: a.meta,
              valor_meta: a.meta
            })
          });
        }
        if (resp.ok) ok++; else err++;
      } catch (e) {
        err++;
      }
    }

    if (btn) { btn.disabled = false; btn.textContent = 'Salvar'; }

    const msg = document.getElementById('meta-lanc-msg');
    if (msg) {
      msg.textContent = err === 0
        ? `✓ ${ok} metas salvas com sucesso!`
        : `${ok} salvas, ${err} com erro.`;
      msg.className = err === 0 ? 'lanc-msg ok' : 'lanc-msg err';
      msg.style.display = 'block';
    }

    await fetchMetas();
    renderMetasTable();

    if (err === 0) setTimeout(fecharModalLanc, 1400);
  };

  // ─── IMPORTAÇÃO CSV ───────────────────────────────────────────────────────
  // Formato esperado: assessor,semestre,mes,meta_rv
  // Ex: "João Silva",2025-S1,2025-07,50000
  async function handleCsvImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = '';

    const text = await file.text();
    const lines = text.trim().split('\n');
    const header = lines[0].toLowerCase();
    const hasHeader = header.includes('assessor') || header.includes('meta');
    const dataLines = hasHeader ? lines.slice(1) : lines;

    const tok = localStorage.getItem('brkToken');
    let ok = 0, err = 0, skip = 0;
    const statusEl = document.getElementById('metas-import-status');
    if (statusEl) { statusEl.textContent = 'Importando…'; statusEl.style.display = 'inline'; }

    for (const line of dataLines) {
      if (!line.trim()) continue;

      // Suporta aspas e vírgula/ponto-e-vírgula como separador
      const cols = parseCsvLine(line);
      if (cols.length < 4) { skip++; continue; }

      const [assessor, semestre, mes, metaRaw] = cols.map(c => c.trim().replace(/^"|"$/g, ''));
      const meta_rv = parseFloat(metaRaw.replace(',', '.')) || 0;

      if (!assessor || !semestre || !mes) { skip++; continue; }

      // Verificar se já existe
      const exist = _metasList.find(m =>
        m.assessor === assessor && m.semestre === semestre && m.mes === mes
      );

      try {
        let resp;
        if (exist) {
          resp = await fetch(`${API}/api/metas/${exist.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
            body: JSON.stringify({ meta_rv, valor_meta: meta_rv })
          });
        } else {
          resp = await fetch(`${API}/api/metas/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
            body: JSON.stringify({ assessor, semestre, mes, meta_rv, valor_meta: meta_rv })
          });
        }
        if (resp.ok) ok++; else err++;
      } catch (ex) {
        err++;
      }
    }

    if (statusEl) {
      statusEl.textContent = `✓ ${ok} importadas${err ? `, ${err} erros` : ''}${skip ? `, ${skip} ignoradas` : ''}`;
      statusEl.className = err > 0 ? 'import-status err' : 'import-status ok';
      setTimeout(() => { statusEl.style.display = 'none'; }, 4000);
    }

    await fetchMetas();
    renderMetasTable();
  }

  function parseCsvLine(line) {
    // Suporta vírgula e ponto-e-vírgula, e campos entre aspas
    const sep = line.includes(';') ? ';' : ',';
    const result = [];
    let cur = '', inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') { inQ = !inQ; }
      else if (c === sep && !inQ) { result.push(cur); cur = ''; }
      else { cur += c; }
    }
    result.push(cur);
    return result;
  }

  // ─── HELPERS ──────────────────────────────────────────────────────────────
  function fmtBRL(v) {
    return 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function labelMes(mesStr) {
    // mesStr = "2025-07"
    if (!mesStr) return mesStr;
    const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    const parts = mesStr.split('-');
    if (parts.length < 2) return mesStr;
    const idx = parseInt(parts[1], 10) - 1;
    return `${meses[idx] || parts[1]}/${parts[0]}`;
  }

  function escHtml(str) {
    return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

})();
