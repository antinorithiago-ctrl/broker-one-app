/* ============================================================
   pipe.js — Pipe | Pipeline Semanal
   Broker ONE · Blue3 Investimentos
   ============================================================ */

(function () {
  'use strict';

  /* ── estado ── */
  var pipeState = {
    sessoes: [],          // todas as sessões conhecidas
    sessaoAtual: null,    // objeto PipeSessao ativo no view
    linhas: [],           // linhas da sessão atual
    editandoLinhaId: null,
    historicoAberto: false
  };

  var API_BASE_PIPE = (typeof API_BASE !== 'undefined')
    ? API_BASE
    : 'https://broker-one-backend-production-90c9.up.railway.app';

  /* ── helpers de autenticação ── */
  function getToken() {
    return (typeof authToken !== 'undefined' && authToken)
      ? authToken
      : (sessionStorage.getItem('bo_token') || '');
  }
  function getUser() {
    return (typeof currentUser !== 'undefined' && currentUser) ? currentUser : null;
  }
  function authHeaders() {
    return { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() };
  }

  /* ── formatação BRL ── */
  function fmtBRL(v) {
    var n = typeof v === 'number' ? v : 0;
    return 'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function parseBRL(s) {
    if (!s) return 0;
    var clean = String(s).replace(/[^\d,]/g, '').replace(',', '.');
    var n = parseFloat(clean);
    return isNaN(n) ? 0 : n;
  }
  window.pipeMaskBRL = function (el) {
    var raw = el.value.replace(/\D/g, '');
    if (!raw) { el.value = ''; pipeAtualizarModalTotal(); return; }
    var n = parseInt(raw, 10) / 100;
    el.value = 'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    pipeAtualizarModalTotal();
  };
  function pipeAtualizarModalTotal() {
    var c = parseBRL(document.getElementById('pipe-inp-corretagem') ? document.getElementById('pipe-inp-corretagem').value : '');
    var co = parseBRL(document.getElementById('pipe-inp-coe') ? document.getElementById('pipe-inp-coe').value : '');
    var e = parseBRL(document.getElementById('pipe-inp-estruturados') ? document.getElementById('pipe-inp-estruturados').value : '');
    var el = document.getElementById('pipe-modal-total');
    if (el) el.textContent = fmtBRL(c + co + e);
  }

  /* ── data / semana ── */
  function formatarData(iso) {
    if (!iso) return '';
    var d = new Date(iso + 'T12:00:00');
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  function semanaLabel(iso) {
    if (!iso) return '';
    var d = new Date(iso + 'T12:00:00');
    var mes = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][d.getMonth()];
    return 'Semana de ' + String(d.getDate()).padStart(2,'0') + '/' + mes + '/' + d.getFullYear();
  }
  function hoje() {
    var d = new Date();
    return d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }

  /* ── assessores filtrados pelo broker logado ── */
  function pipeGetAssessores() {
    var user = getUser();
    if (!user) return [];
    var params = (typeof window.getParamData === 'function') ? window.getParamData() : [];
    if (!params || params.length === 0) return [];

    var nivel = user.nivel || 1;
    var meuNome = (user.full_name || user.name || '').toLowerCase().trim();

    // nível 1 = broker: só vê seus próprios assessores
    // nível >= 2: vê todos
    if (nivel >= 2) {
      return params.map(function (p) { return p; });
    } else {
      return params.filter(function (p) {
        var brokerParam = (p.broker || '').toLowerCase().trim();
        return brokerParam === meuNome;
      });
    }
  }

  /* ── UI helpers ── */
  function el(id) { return document.getElementById(id); }
  function toast(msg, ok) {
    if (typeof window.toast === 'function') { window.toast(msg, ok); return; }
    // fallback simples
    console.log((ok ? '✓ ' : '✗ ') + msg);
  }

  /* ── renderização da data no header ── */
  function pipeRenderHeader() {
    var dl = el('pipe-date-label');
    if (dl) dl.textContent = hoje();
  }

  /* ── visibilidade dos botões por nível ── */
  function pipeAtualizarBotoes() {
    var user = getUser();
    var nivel = user ? (user.nivel || 1) : 1;
    var btnNova = el('pipe-btn-nova');
    var btnTrancar = el('pipe-btn-trancar');

    // Botão Nova Sessão: visível para nível >= 2
    if (btnNova) btnNova.style.display = (nivel >= 2) ? 'inline-flex' : 'none';

    // Botão Trancar: visível para nível >= 2 E só se sessão atual está ABERTA
    var sessaoAberta = pipeState.sessaoAtual && pipeState.sessaoAtual.status === 'aberta';
    if (btnTrancar) btnTrancar.style.display = (nivel >= 2 && sessaoAberta) ? 'inline-flex' : 'none';
  }

  /* ── renderização da sessão ── */
  function pipeRenderSessao() {
    var sessao = pipeState.sessaoAtual;
    var infoEl = el('pipe-sessao-info');
    var emptyEl = el('pipe-empty-state');
    var totaisEl = el('pipe-totais');
    var tableEl = el('pipe-table-wrap');
    var badge = el('pipe-badge-status');
    var desc = el('pipe-sessao-desc');

    if (!sessao) {
      if (infoEl) infoEl.style.display = 'none';
      if (emptyEl) emptyEl.style.display = 'flex';
      if (totaisEl) totaisEl.style.display = 'none';
      if (tableEl) tableEl.style.display = 'none';
      pipeAtualizarBotoes();
      return;
    }

    if (emptyEl) emptyEl.style.display = 'none';
    if (infoEl) infoEl.style.display = 'flex';
    if (totaisEl) totaisEl.style.display = 'grid';
    if (tableEl) tableEl.style.display = 'block';

    var status = sessao.status || 'aberta';
    if (badge) {
      badge.textContent = status.toUpperCase();
      badge.className = 'pipe-badge ' + status;
    }
    if (desc) {
      desc.textContent = semanaLabel(sessao.data_inicio) + ' · Abertura por ' + (sessao.criado_por || '');
    }

    pipeAtualizarBotoes();
    pipeRenderLinhas();
    pipeRenderTotais();
  }

  /* ── totais ── */
  function pipeRenderTotais() {
    var totC = 0, totCO = 0, totE = 0;
    pipeState.linhas.forEach(function (l) {
      totC += l.corretagem || 0;
      totCO += l.coe || 0;
      totE += l.estruturados || 0;
    });
    var tot = totC + totCO + totE;
    if (el('pipe-total-corretagem')) el('pipe-total-corretagem').textContent = fmtBRL(totC);
    if (el('pipe-total-coe')) el('pipe-total-coe').textContent = fmtBRL(totCO);
    if (el('pipe-total-estruturados')) el('pipe-total-estruturados').textContent = fmtBRL(totE);
    if (el('pipe-total-semana')) el('pipe-total-semana').textContent = fmtBRL(tot);
  }

  /* ── linhas da tabela ── */
  function pipeRenderLinhas() {
    var tbody = el('pipe-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    var sessao = pipeState.sessaoAtual;
    var trancada = sessao && sessao.status === 'trancada';
    var user = getUser();
    var meuNome = user ? (user.full_name || user.name || '').toLowerCase().trim() : '';
    var nivel = user ? (user.nivel || 1) : 1;

    // Usa assessores da Parametrização filtrados pelo broker logado
    var assessores = pipeGetAssessores();

    // Também inclui linhas já salvas que podem ser de outros brokers (se nível >= 2)
    var linhasMap = {};
    pipeState.linhas.forEach(function (l) { linhasMap[l.assessor_nome] = l; });

    // Para cada assessor do broker, garante uma linha
    assessores.forEach(function (param) {
      var nomeFull = param.assessor || param.nome_assessor || '';
      if (!nomeFull) return;

      var linha = linhasMap[nomeFull] || {
        id: null,
        assessor_nome: nomeFull,
        broker_nome: param.broker || '',
        corretagem: 0,
        coe: 0,
        estruturados: 0
      };

      // Pode editar? Nível 1 = só suas linhas. Nível >= 2 = qualquer linha. Trancada = ninguém edita
      var podeEditar = !trancada && (nivel >= 2 ||
        (param.broker || '').toLowerCase().trim() === meuNome);

      var totLinha = (linha.corretagem || 0) + (linha.coe || 0) + (linha.estruturados || 0);
      var temDados = totLinha > 0;

      var tr = document.createElement('tr');
      tr.innerHTML =
        '<td class="pipe-td-assessor">' + nomeFull + '</td>' +
        '<td class="pipe-td-broker">' + (linha.broker_nome || param.broker || '') + '</td>' +
        '<td class="' + (temDados ? '' : 'pipe-td-zero') + '">' + (temDados ? fmtBRL(linha.corretagem || 0) : '—') + '</td>' +
        '<td class="' + (temDados ? '' : 'pipe-td-zero') + '">' + (temDados ? fmtBRL(linha.coe || 0) : '—') + '</td>' +
        '<td class="' + (temDados ? '' : 'pipe-td-zero') + '">' + (temDados ? fmtBRL(linha.estruturados || 0) : '—') + '</td>' +
        '<td class="pipe-td-total">' + (temDados ? fmtBRL(totLinha) : '—') + '</td>' +
        '<td><button class="pipe-btn-edit" ' + (podeEditar ? '' : 'disabled') +
        ' onclick="pipeAbrirModal(\'' + nomeFull.replace(/'/g, "\\'") + '\', \'' + (linha.broker_nome || param.broker || '') + '\', ' + (linha.id || 'null') + ')">' +
        (trancada ? 'Ver' : 'Preencher') + '</button></td>';
      tbody.appendChild(tr);
    });

    // Linhas salvas de assessores que não estão mais na param (edge case)
    pipeState.linhas.forEach(function (l) {
      var jaRenderizado = assessores.some(function (p) {
        return (p.assessor || p.nome_assessor || '') === l.assessor_nome;
      });
      if (jaRenderizado) return;

      var totLinha = (l.corretagem || 0) + (l.coe || 0) + (l.estruturados || 0);
      var tr = document.createElement('tr');
      tr.innerHTML =
        '<td class="pipe-td-assessor">' + l.assessor_nome + '</td>' +
        '<td class="pipe-td-broker">' + (l.broker_nome || '') + '</td>' +
        '<td>' + fmtBRL(l.corretagem || 0) + '</td>' +
        '<td>' + fmtBRL(l.coe || 0) + '</td>' +
        '<td>' + fmtBRL(l.estruturados || 0) + '</td>' +
        '<td class="pipe-td-total">' + fmtBRL(totLinha) + '</td>' +
        '<td><button class="pipe-btn-edit" disabled>Ver</button></td>';
      tbody.appendChild(tr);
    });
  }

  /* ── histórico ── */
  window.pipeToggleHistorico = function () {
    pipeState.historicoAberto = !pipeState.historicoAberto;
    var panel = el('pipe-historico-panel');
    if (!panel) return;
    if (pipeState.historicoAberto) {
      panel.style.display = 'block';
      pipeRenderHistorico();
    } else {
      panel.style.display = 'none';
    }
  };

  function pipeRenderHistorico() {
    var lista = el('pipe-historico-lista');
    if (!lista) return;
    var sessoes = pipeState.sessoes;
    if (!sessoes || sessoes.length === 0) {
      lista.innerHTML = '<div class="pipe-empty-hint">Nenhuma sessão encontrada.</div>';
      return;
    }
    lista.innerHTML = '';
    var user = getUser();
    var nivel = user ? (user.nivel || 1) : 1;
    var podeGerenciar = nivel >= 2;

    var sorted = sessoes.slice().sort(function (a, b) {
      return (b.data_inicio || '').localeCompare(a.data_inicio || '');
    });
    sorted.forEach(function (s) {
      var ativa = pipeState.sessaoAtual && pipeState.sessaoAtual.id === s.id;
      var totLinha = ativa
        ? pipeState.linhas.reduce(function(acc, l){ return acc + (l.corretagem||0) + (l.coe||0) + (l.estruturados||0); }, 0)
        : (s.total_cache || 0);

      var div = document.createElement('div');
      div.className = 'pipe-historico-item' + (ativa ? ' ativa' : '');

      var botoesHtml = '';
      if (podeGerenciar) {
        var labelVer = ativa ? 'Visualizando' : 'Ver';
        var btnReabrir = (s.status === 'trancada')
          ? '<button class="phi-btn" onclick="event.stopPropagation();pipeReabrirSessao(' + s.id + ')">Reabrir</button>'
          : '';
        botoesHtml =
          (ativa ? '' : '<button class="phi-btn" onclick="event.stopPropagation();pipeCarregarSessao(' + s.id + ')">' + labelVer + '</button>') +
          btnReabrir +
          '<button class="phi-btn phi-btn-del" onclick="event.stopPropagation();pipeAbrirDelModal(' + s.id + ',\'' + semanaLabel(s.data_inicio).replace(/'/g,"\\'") + '\')">Excluir</button>';
      }

      div.innerHTML =
        '<div class="phi-left" onclick="pipeCarregarSessao(' + s.id + ')">' +
        '<span class="phi-semana">' + semanaLabel(s.data_inicio) + '</span>' +
        '<span class="phi-meta">Aberta por ' + (s.criado_por || '—') + ' · ' + formatarData(s.data_inicio) + '</span>' +
        '</div>' +
        '<div class="phi-right">' +
        (totLinha > 0 ? '<span class="phi-total">' + fmtBRL(totLinha) + '</span>' : '') +
        '<span class="phi-badge ' + (s.status || 'aberta') + '">' + (s.status || 'ABERTA').toUpperCase() + '</span>' +
        botoesHtml +
        '</div>';
      lista.appendChild(div);
    });
  }

  /* ── modal de exclusão de sessão ── */
  var _delSessaoId = null;
  window.pipeAbrirDelModal = function (sessaoId, label) {
    _delSessaoId = sessaoId;
    var descEl = el('pipe-del-desc');
    if (descEl) descEl.textContent = label;
    var overlay = el('pipe-del-overlay');
    if (overlay) overlay.style.display = 'flex';
  };
  window.pipeFecharDelModal = function (e) {
    if (e && e.target !== el('pipe-del-overlay')) return;
    var overlay = el('pipe-del-overlay');
    if (overlay) overlay.style.display = 'none';
    _delSessaoId = null;
  };
  window.pipeFecharDelModalBtn = function () {
    var overlay = el('pipe-del-overlay');
    if (overlay) overlay.style.display = 'none';
    _delSessaoId = null;
  };
  window.pipeConfirmarExclusao = async function () {
    if (!_delSessaoId) return;
    var sessaoId = _delSessaoId;
    var overlay = el('pipe-del-overlay');
    if (overlay) overlay.style.display = 'none';
    _delSessaoId = null;

    try {
      var res = await fetch(API_BASE_PIPE + '/api/pipe/sessao/' + sessaoId, {
        method: 'DELETE',
        headers: authHeaders()
      });
      if (res.ok || res.status === 204) {
        // Remove do estado local
        pipeState.sessoes = pipeState.sessoes.filter(function(s){ return s.id !== sessaoId; });
        // Se era a sessão atual, limpa
        if (pipeState.sessaoAtual && pipeState.sessaoAtual.id === sessaoId) {
          pipeState.sessaoAtual = null;
          pipeState.linhas = [];
        }
        pipeRenderSessao();
        pipeRenderHistorico();
        toast('Sessão excluída.', true);
      } else {
        var d = await res.json().catch(function(){ return {}; });
        toast(d.detail || 'Erro ao excluir sessão.', false);
      }
    } catch(e) {
      toast('Sem conexão com o servidor.', false);
    }
  };

  /* ── reabrir sessão trancada (Admin/Líder) ── */
  window.pipeReabrirSessao = async function (sessaoId) {
    var user = getUser();
    if (!user || (user.nivel || 1) < 2) { toast('Sem permissão.', false); return; }
    if (!confirm('Reabrir essa sessão? Ela voltará ao estado ABERTA e poderá ser editada.')) return;
    try {
      var res = await fetch(API_BASE_PIPE + '/api/pipe/sessao/' + sessaoId + '/reabrir', {
        method: 'PATCH',
        headers: authHeaders()
      });
      if (res.ok) {
        var sessao = await res.json();
        // Atualiza no array
        pipeState.sessoes = pipeState.sessoes.map(function(s){ return s.id === sessaoId ? sessao : s; });
        // Carrega como sessão atual
        pipeState.sessaoAtual = sessao;
        var resL = await fetch(API_BASE_PIPE + '/api/pipe/sessao/' + sessaoId + '/linhas', { headers: authHeaders() });
        pipeState.linhas = resL.ok ? (await resL.json()) : [];
        pipeRenderSessao();
        pipeRenderHistorico();
        toast('Sessão reaberta com sucesso!', true);
      } else {
        var d = await res.json().catch(function(){ return {}; });
        toast(d.detail || 'Erro ao reabrir sessão.', false);
      }
    } catch(e) {
      toast('Sem conexão com o servidor.', false);
    }
  };

  /* ── carregar sessão específica do histórico ── */
  window.pipeCarregarSessao = async function (sessaoId) {
    var token = getToken();
    if (!token) { toast('Faça login primeiro.', false); return; }
    try {
      var res = await fetch(API_BASE_PIPE + '/api/pipe/sessao/' + sessaoId + '/linhas', {
        headers: authHeaders()
      });
      if (res.ok) {
        var linhas = await res.json();
        // Busca sessao do cache
        var sessao = pipeState.sessoes.find(function (s) { return s.id === sessaoId; }) || null;
        pipeState.sessaoAtual = sessao;
        pipeState.linhas = linhas || [];
        pipeRenderSessao();
        // fecha historico
        pipeState.historicoAberto = false;
        var panel = el('pipe-historico-panel');
        if (panel) panel.style.display = 'none';
      } else {
        toast('Erro ao carregar sessão.', false);
      }
    } catch (e) {
      toast('Sem conexão com o servidor.', false);
    }
  };

  /* ── abrir nova sessão ── */
  window.pipeAbrirSessao = async function () {
    var user = getUser();
    if (!user || (user.nivel || 1) < 2) { toast('Apenas Líderes podem abrir sessões.', false); return; }
    var token = getToken();
    if (!token) { toast('Faça login primeiro.', false); return; }

    // Verifica se já existe sessão aberta esta semana
    var jaAberta = pipeState.sessoes.some(function (s) { return s.status === 'aberta'; });
    if (jaAberta) {
      toast('Já existe uma sessão aberta esta semana.', false);
      return;
    }

    try {
      var res = await fetch(API_BASE_PIPE + '/api/pipe/sessao', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ criado_por: user.full_name || user.name || 'Líder' })
      });
      if (res.ok) {
        var nova = await res.json();
        pipeState.sessoes.unshift(nova);
        pipeState.sessaoAtual = nova;
        pipeState.linhas = [];
        pipeRenderSessao();
        toast('Sessão aberta com sucesso!', true);
      } else {
        var d = await res.json().catch(function () { return {}; });
        toast(d.detail || 'Erro ao abrir sessão.', false);
      }
    } catch (e) {
      toast('Sem conexão com o servidor.', false);
    }
  };

  /* ── trancar sessão ── */
  window.pipeTrancarSessao = async function () {
    var sessao = pipeState.sessaoAtual;
    if (!sessao || sessao.status !== 'aberta') { toast('Nenhuma sessão aberta para trancar.', false); return; }
    var user = getUser();
    if (!user || (user.nivel || 1) < 2) { toast('Apenas Líderes podem trancar sessões.', false); return; }

    if (!confirm('Tem certeza que deseja trancar a sessão? Após trancada, ninguém poderá editar os valores.')) return;

    try {
      var res = await fetch(API_BASE_PIPE + '/api/pipe/sessao/' + sessao.id + '/trancar', {
        method: 'PATCH',
        headers: authHeaders()
      });
      if (res.ok) {
        sessao.status = 'trancada';
        pipeState.sessaoAtual = sessao;
        // Atualiza no array de sessões
        pipeState.sessoes.forEach(function (s) {
          if (s.id === sessao.id) s.status = 'trancada';
        });
        pipeRenderSessao();
        toast('Sessão trancada com sucesso!', true);
      } else {
        var d = await res.json().catch(function () { return {}; });
        toast(d.detail || 'Erro ao trancar sessão.', false);
      }
    } catch (e) {
      toast('Sem conexão com o servidor.', false);
    }
  };

  /* ── modal de edição de linha ── */
  window.pipeAbrirModal = function (assessorNome, brokerNome, linhaId) {
    pipeState.editandoLinhaId = linhaId;

    var tituloEl = el('pipe-modal-titulo');
    var labelEl = el('pipe-modal-assessor-label');
    if (tituloEl) tituloEl.textContent = 'Preencher expectativa';
    if (labelEl) labelEl.textContent = assessorNome + (brokerNome ? ' · Broker: ' + brokerNome : '');

    // Pré-preenche valores existentes
    var linha = pipeState.linhas.find(function (l) { return l.id === linhaId; }) || null;
    // Também tenta pelo nome (para linhas ainda sem ID)
    if (!linha) {
      linha = pipeState.linhas.find(function (l) { return l.assessor_nome === assessorNome; }) || null;
    }
    function setInp(id, val) {
      var inp = el(id);
      if (!inp) return;
      if (val && val > 0) {
        inp.value = fmtBRL(val);
      } else {
        inp.value = '';
      }
    }
    setInp('pipe-inp-corretagem', linha ? linha.corretagem : 0);
    setInp('pipe-inp-coe', linha ? linha.coe : 0);
    setInp('pipe-inp-estruturados', linha ? linha.estruturados : 0);

    // Guarda assessor/broker no modal para usar no save
    var modal = el('pipe-modal');
    if (modal) {
      modal.dataset.assessorNome = assessorNome;
      modal.dataset.brokerNome = brokerNome;
    }

    pipeAtualizarModalTotal();

    var overlay = el('pipe-modal-overlay');
    if (overlay) overlay.style.display = 'flex';

    // Foca no primeiro campo
    setTimeout(function () {
      var inp = el('pipe-inp-corretagem');
      if (inp) inp.focus();
    }, 80);
  };

  window.pipeFecharModal = function (e) {
    if (e && e.target !== el('pipe-modal-overlay')) return;
    var overlay = el('pipe-modal-overlay');
    if (overlay) overlay.style.display = 'none';
    pipeState.editandoLinhaId = null;
  };

  /* ── salvar linha ── */
  window.pipeSalvarLinha = async function () {
    var sessao = pipeState.sessaoAtual;
    if (!sessao) { toast('Nenhuma sessão ativa.', false); return; }
    if (sessao.status === 'trancada') { toast('Sessão trancada. Não é possível editar.', false); return; }

    var modal = el('pipe-modal');
    var assessorNome = modal ? modal.dataset.assessorNome : '';
    var brokerNome = modal ? modal.dataset.brokerNome : '';

    var corretagem = parseBRL(el('pipe-inp-corretagem') ? el('pipe-inp-corretagem').value : '');
    var coe = parseBRL(el('pipe-inp-coe') ? el('pipe-inp-coe').value : '');
    var estruturados = parseBRL(el('pipe-inp-estruturados') ? el('pipe-inp-estruturados').value : '');

    var payload = {
      sessao_id: sessao.id,
      assessor_nome: assessorNome,
      broker_nome: brokerNome,
      corretagem: corretagem,
      coe: coe,
      estruturados: estruturados
    };

    try {
      var res = await fetch(API_BASE_PIPE + '/api/pipe/linha', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        var salva = await res.json();
        // Atualiza no array de linhas
        var idx = pipeState.linhas.findIndex(function (l) { return l.assessor_nome === assessorNome; });
        if (idx >= 0) {
          pipeState.linhas[idx] = salva;
        } else {
          pipeState.linhas.push(salva);
        }
        // Fecha modal
        var overlay = el('pipe-modal-overlay');
        if (overlay) overlay.style.display = 'none';
        pipeState.editandoLinhaId = null;
        // Re-renderiza
        pipeRenderLinhas();
        pipeRenderTotais();
        toast('Salvo com sucesso!', true);
      } else {
        var d = await res.json().catch(function () { return {}; });
        toast(d.detail || 'Erro ao salvar.', false);
      }
    } catch (e) {
      toast('Sem conexão com o servidor.', false);
    }
  };

  /* ── carregamento inicial ── */
  async function pipeCarregarDados() {
    var token = getToken();
    if (!token) return;
    try {
      // 1. Busca todas as sessões
      var res = await fetch(API_BASE_PIPE + '/api/pipe/sessoes', {
        headers: authHeaders()
      });
      if (res.ok) {
        var sessoes = await res.json();
        pipeState.sessoes = sessoes || [];

        // 2. Determina sessão a mostrar: a mais recente ABERTA, ou a mais recente geral
        var abertas = pipeState.sessoes.filter(function (s) { return s.status === 'aberta'; });
        var alvo = abertas.length > 0
          ? abertas.sort(function (a, b) { return (b.data_inicio || '').localeCompare(a.data_inicio || ''); })[0]
          : (pipeState.sessoes.length > 0
            ? pipeState.sessoes.sort(function (a, b) { return (b.data_inicio || '').localeCompare(a.data_inicio || ''); })[0]
            : null);

        pipeState.sessaoAtual = alvo;

        // 3. Se tem sessão, carrega linhas
        if (alvo) {
          var resL = await fetch(API_BASE_PIPE + '/api/pipe/sessao/' + alvo.id + '/linhas', {
            headers: authHeaders()
          });
          if (resL.ok) {
            pipeState.linhas = await resL.json() || [];
          }
        }
      }
    } catch (e) {
      console.warn('Pipe: erro ao carregar dados', e);
    }
    pipeRenderSessao();
  }

  /* ── init (chamado pelo shared.js via goTo('pipe')) ── */
  window.initPipe = function () {
    pipeState = { sessoes: [], sessaoAtual: null, linhas: [], editandoLinhaId: null, historicoAberto: false };
    pipeRenderHeader();
    pipeAtualizarBotoes();
    pipeCarregarDados();
  };

})();
