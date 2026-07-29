// Broker ONE — AUTH
// ─────────────────────────────────────

var API_BASE = "https://broker-one-backend-production-90c9.up.railway.app";
var authToken = sessionStorage.getItem('bo_token') || '';
var currentUser = null;

function apiHeaders() {
  return {'Content-Type':'application/json','Authorization':'Bearer '+authToken};
}

function toSnake(item) {
  return {
    id: item.id,
    cliente_cod: item.clienteCod||'',
    assessor: item.assessor||'',
    data: item.data||'',
    tipo: item.tipo||'',
    detalhes: item.detalhes||null,
    papel: item.papel||null,
    vol_fin: item.volFin||0,
    roa: item.roa||0,
    comissao: item.comissao||0,
    status: item.status||'push',
    saldo: item.saldo||null,
    qtd: item.qtd||null,
    preco: item.preco||null,
    debito: item.debito||null,
    conf_status: item.confStatus||null,
    created_at: item.createdAt||null,
    updated_at: item.updatedAt||null
  };
}

function fromSnake(r) {
  return {
    id: r.id,
    clienteCod: r.cliente_cod,
    assessor: r.assessor,
    data: r.data,
    tipo: r.tipo,
    detalhes: r.detalhes,
    papel: r.papel,
    volFin: r.vol_fin,
    roa: r.roa,
    comissao: r.comissao,
    status: r.status,
    saldo: r.saldo,
    qtd: r.qtd,
    preco: r.preco,
    debito: r.debito,
    confStatus: r.conf_status,
    createdAt: r.created_at,
    updatedAt: r.updated_at
  };
}

// ── Key única para avatar ──
function _avatarKey() {
  var u = currentUser || {};
  return 'bo_avatar_' + (u.id || u.username || 'user');
}

// ── Login ──
function toggleLxPass(){
  var i=document.getElementById('login-pass');
  var o=document.getElementById('lx-eye-open');
  var c=document.getElementById('lx-eye-closed');
  if(i.type==='password'){i.type='text';if(o)o.style.display='none';if(c)c.style.display='';}
  else{i.type='password';if(o)o.style.display='';if(c)c.style.display='none';}
}
document.getElementById('login-pass').addEventListener('keydown',function(e){if(e.key==='Enter')doLogin();});
document.getElementById('login-user').addEventListener('keydown',function(e){if(e.key==='Enter')document.getElementById('login-pass').focus();});

async function doLogin(){
  var user=(document.getElementById('login-user')||{}).value||'';
  var pass=(document.getElementById('login-pass')||{}).value||'';
  var errEl=document.getElementById('lx-error');
  var btn=document.getElementById('lx-btn');
  var btnTxt=document.getElementById('lx-btn-text');
  var spin=document.getElementById('lx-spinner');
  user=user.trim();
  if(errEl){errEl.style.display='none';errEl.textContent='';}
  if(!user||!pass){
    if(errEl){errEl.textContent='Preencha usuário e senha.';errEl.style.display='block';}
    return;
  }
  if(btn)btn.disabled=true;
  if(btnTxt)btnTxt.style.display='none';
  if(spin)spin.style.display='';
  try{
    var form=new URLSearchParams();
    form.append('username',user);
    form.append('password',pass);
    var res=await fetch(API_BASE+'/login',{
      method:'POST',
      headers:{'Content-Type':'application/x-www-form-urlencoded'},
      body:form.toString()
    });
    if(res.ok){
      var data=await res.json();
      authToken=data.access_token;
      currentUser=data.user||{};
      var savedProfile=JSON.parse(localStorage.getItem('bo_profile_'+(currentUser.id||currentUser.username))||'{}');
      if(savedProfile.name)  currentUser.name  = savedProfile.name;
      if(savedProfile.email) currentUser.email = savedProfile.email;
      sessionStorage.setItem('bo_token',authToken);
      sessionStorage.setItem('bo_user',JSON.stringify(currentUser));
      var lo=document.getElementById('login-overlay');
      if(lo)lo.style.display='none';
      applySidebarUser(currentUser);
      initApp();
    } else {
      var errData=await res.json().catch(function(){return{};});
      if(errEl){errEl.textContent=errData.detail||('Erro '+res.status);errEl.style.display='block';}
      if(btn)btn.disabled=false;
      if(btnTxt)btnTxt.style.display='';
      if(spin)spin.style.display='none';
    }
  }catch(e){
    if(errEl){errEl.textContent='Sem conexão com o servidor.';errEl.style.display='block';}
    if(btn)btn.disabled=false;
    if(btnTxt)btnTxt.style.display='';
    if(spin)spin.style.display='none';
  }
}

function populateAssessores(){
  var sel=document.getElementById('f-assessor');
  if(!sel)return;
  var params=window.getParamData?window.getParamData():[];
  var userName=currentUser?currentUser.name:'';
  var userNivel=currentUser?currentUser.nivel:1;
  var filtered=params.filter(function(p){
    if(userNivel>=2)return true;
    return (p.broker||'').trim().toUpperCase()===(userName||'').trim().toUpperCase();
  });
  var assessores=[...new Set(filtered.map(function(p){return(p.assessor||'').trim();}).filter(Boolean))].sort();
  var current=sel.value;
  sel.innerHTML='<option value="">Selecione...</option>';
  assessores.forEach(function(a){
    var opt=document.createElement('option');opt.value=a;opt.textContent=a;sel.appendChild(opt);
  });
  if(current)sel.value=current;
}

// ── doLogout ──
function doLogout(){
  if(!confirm('Deseja sair do Broker ONE?'))return;
  sessionStorage.removeItem('bo_token');
  sessionStorage.removeItem('bo_user');
  location.reload();
}

// ── escHtml ──
function escHtml(s){
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ── pipeAbrirSessao ──
async function pipeAbrirSessao(){
  try{
    var res=await fetch(API_BASE+'/api/pipe/sessao',{method:'POST',headers:apiHeaders()});
    if(res.ok){
      _pipeSessaoAtual=await res.json();
      await loadPipeLinhas();
      renderPipeSessao();
      toast('Pipe semanal aberto!');
    } else {
      var txt=await res.text();
      var detail='';try{detail=JSON.parse(txt).detail;}catch(e){detail=txt||'Erro '+res.status;}
      toast(detail||'Erro ao abrir sessão.','error');
    }
  } catch(e){ toast('Sem conexão com o servidor.','error'); }
}

// ── Popular AAI no modal do Pilott ──
function populateAaiSelect() {
  var sel = document.getElementById('fAai');
  if (!sel) return;
  var params = window.getParamData ? window.getParamData() : [];
  var userName = currentUser ? currentUser.name : '';
  var userNivel = currentUser ? currentUser.nivel : 1;
  var filtered = params.filter(function(p) {
    if (userNivel >= 2) return true;
    return (p.broker||'').trim().toUpperCase() === (userName||'').trim().toUpperCase();
  });
  var assessores = [...new Set(filtered.map(function(p){ return (p.assessor||'').trim(); }).filter(Boolean))].sort();
  var current = sel.value;
  sel.innerHTML = '<option value="">Selecione...</option>';
  assessores.forEach(function(a) {
    var opt = document.createElement('option'); opt.value = a; opt.textContent = a;
    sel.appendChild(opt);
  });
  if (current) sel.value = current;
}

function applySidebarUser(u) {
  if (!u) return;
  var nome = u.full_name || u.name || u.username || 'Usuário';
  var initials = nome.split(' ').map(function(p){ return p[0]||''; }).slice(0,2).join('').toUpperCase();
  var nivelLabels = {1:'Broker',2:'Assessor',3:'Analista',4:'Líder de Squad',5:'Admin'};

  var av      = document.getElementById('sidebar-avatar');
  var avImg   = document.getElementById('sidebar-avatar-img');
  var avInit  = document.getElementById('sidebar-avatar-initials');
  var sn      = document.getElementById('sidebar-user-name');
  var sr      = document.getElementById('sidebar-user-role');
  var ab      = document.getElementById('sidebar-admin-btn');

  if (avInit) avInit.textContent = initials;
  if (sn) sn.textContent = nome;
  if (sr) sr.textContent = nivelLabels[u.nivel] || ('Nível ' + (u.nivel||''));

  var upInit = document.getElementById('up-avatar-initials');
  if (upInit) upInit.textContent = initials;

  var saved = localStorage.getItem(_avatarKey());
  if (saved && avImg) {
    avImg.src = saved; avImg.style.display = 'block';
    if (av) { av.style.background = 'transparent'; av.style.overflow = 'hidden'; }
    if (avInit) avInit.style.display = 'none';
  } else if (avImg) {
    avImg.style.display = 'none';
    if (avInit) avInit.style.display = '';
    if (av) av.style.background = '';
  }

  if (ab) ab.style.display = (u.nivel >= 5) ? 'flex' : 'none';

  var secCad = document.getElementById('nav-section-cadastros');
  var cadastrosItems = ['nav-clientes','nav-metas','nav-parametrizacao','sidebar-admin-btn'];
  if (u.nivel < 2) {
    if (secCad) secCad.style.display = 'none';
    cadastrosItems.forEach(function(id){
      var el = document.getElementById(id); if (el) el.style.display = 'none';
    });
  }
}

// ══════════════════════════════════════════════════════════════
// PAINEL DO USUARIO (perfil proprio)
// ══════════════════════════════════════════════════════════════

function openUserPanel() {
  var overlay = document.getElementById('user-panel-overlay');
  if (!overlay) return;
  overlay.classList.add('open');
  var u = currentUser || {};
  var nome = u.name || u.full_name || u.username || '';
  var nivelLabels = {1:'Broker',2:'Assessor',3:'Analista',4:'Líder de Squad',5:'Admin'};
  var fName  = document.getElementById('up-name');
  var fEmail = document.getElementById('up-email');
  var fNivel = document.getElementById('up-nivel');
  var msgEl  = document.getElementById('up-msg');
  if (fName)  fName.value  = nome;
  if (fEmail) fEmail.value = u.email || '';
  if (fNivel) fNivel.value = nivelLabels[u.nivel] || ('Nível ' + (u.nivel||''));
  if (msgEl)  { msgEl.style.display='none'; msgEl.textContent=''; }
  ['up-pwd-atual','up-pwd-nova','up-pwd-confirm'].forEach(function(id){
    var el = document.getElementById(id); if (el) el.value = '';
  });
  loadAvatarInPanel();
}

function closeUserPanel() {
  var overlay = document.getElementById('user-panel-overlay');
  if (overlay) overlay.classList.remove('open');
}

function loadAvatarInPanel() {
  var saved = localStorage.getItem(_avatarKey());
  var img = document.getElementById('up-avatar-img');
  var initials = document.getElementById('up-avatar-initials');
  if (saved && img) {
    img.src = saved; img.style.display = 'block';
    if (initials) initials.style.display = 'none';
  } else if (img) {
    img.style.display = 'none';
    if (initials) initials.style.display = '';
  }
}

function handleAvatarUpload(input) {
  var file = input.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function(e) {
    var dataUrl = e.target.result;
    localStorage.setItem(_avatarKey(), dataUrl);
    var img = document.getElementById('up-avatar-img');
    var initials = document.getElementById('up-avatar-initials');
    if (img) { img.src = dataUrl; img.style.display = 'block'; }
    if (initials) initials.style.display = 'none';
    applySidebarUser(currentUser);
  };
  reader.readAsDataURL(file);
}

async function saveUserPanel() {
  var msgEl = document.getElementById('up-msg');
  function showMsg(txt, ok) {
    if (!msgEl) return;
    msgEl.textContent = txt;
    msgEl.style.display = 'block';
    msgEl.style.background = ok ? 'rgba(34,197,94,.12)' : 'rgba(239,68,68,.12)';
    msgEl.style.color = ok ? '#4ade80' : '#fca5a5';
    msgEl.style.border = ok ? '1px solid rgba(34,197,94,.3)' : '1px solid rgba(239,68,68,.3)';
    msgEl.style.borderRadius = '6px';
    msgEl.style.padding = '8px 10px';
  }
  var novoNome  = (document.getElementById('up-name')||{}).value  || '';
  var novoEmail = (document.getElementById('up-email')||{}).value || '';
  var pwdAtual   = (document.getElementById('up-pwd-atual')||{}).value   || '';
  var pwdNova    = (document.getElementById('up-pwd-nova')||{}).value    || '';
  var pwdConfirm = (document.getElementById('up-pwd-confirm')||{}).value || '';
  var salvouAlgo = false;
  if (novoNome && novoNome !== (currentUser.name || currentUser.full_name || '')) {
    currentUser.name = novoNome; currentUser.full_name = novoNome; salvouAlgo = true;
  }
  if (novoEmail !== (currentUser.email || '')) {
    currentUser.email = novoEmail; salvouAlgo = true;
  }
  if (salvouAlgo) {
    var profileKey = 'bo_profile_' + (currentUser.id || currentUser.username || 'user');
    localStorage.setItem(profileKey, JSON.stringify({ name: currentUser.name, email: currentUser.email }));
    sessionStorage.setItem('bo_user', JSON.stringify(currentUser));
    applySidebarUser(currentUser);
  }
  if (pwdAtual || pwdNova || pwdConfirm) {
    if (!pwdAtual || !pwdNova || !pwdConfirm) { showMsg('Preencha todos os campos de senha.', false); return; }
    if (pwdNova !== pwdConfirm) { showMsg('Nova senha e confirmação não coincidem.', false); return; }
    try {
      var res = await fetch(API_BASE + '/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + authToken },
        body: JSON.stringify({ current_password: pwdAtual, new_password: pwdNova })
      });
      if (res.ok) {
        showMsg('Senha alterada com sucesso!', true);
        ['up-pwd-atual','up-pwd-nova','up-pwd-confirm'].forEach(function(id){
          var el = document.getElementById(id); if (el) el.value = '';
        });
        return;
      } else {
        var d = await res.json().catch(function(){return{};});
        showMsg(d.detail || 'Erro ao alterar senha.', false); return;
      }
    } catch(e) { showMsg('Sem conexão com o servidor.', false); return; }
  }
  showMsg('Perfil atualizado!', true);
  setTimeout(function(){ closeUserPanel(); }, 900);
}

function openChangePwd(){ openUserPanel(); }


// ══════════════════════════════════════════════════════════════
// GERENCIAR USUARIOS (painel admin)
// ══════════════════════════════════════════════════════════════
//
// Notas de robustez desta secao:
// 1. O overlay usa classList.add/remove('open') — o mesmo padrao ja usado
//    por login-overlay, flow-overlay, param-overlay etc no restante do app.
//    Isso evita qualquer conflito de renderizacao com CSS existente.
// 2. A lista de brokers (para o select "Broker vinculado") e carregada UMA
//    UNICA VEZ e mantida em cache (_admBrokerCache). Isso elimina qualquer
//    race condition: antes, cada clique em "Editar" disparava um fetch
//    assincrono novo, e se o usuario clicasse em outro registro antes do
//    fetch anterior terminar, os dados podiam se cruzar entre modais.
// 3. Os botoes da lista usam data-user-id + um unico listener delegado no
//    container, em vez de onclick="funcao('nome com aspas')" embutido no
//    HTML. Isso evita qualquer quebra de atributo por causa de nomes com
//    apostrofo e garante que o ID clicado e sempre o correto.
// 4. admEditUser sempre limpa todos os campos do modal ANTES de popular,
//    e usa um token de requisicao para ignorar respostas fora de ordem.

var _admUsers = [];
var _admBrokerCache = null;      // cache de brokers (nomes unicos)
var _admEditingUserId = null;
var _admOpenToken = 0;           // token anti-race-condition

function openAdminPanel() {
  var overlay = document.getElementById('adm-overlay');
  if (!overlay) { console.error('adm-overlay nao encontrado no HTML'); return; }
  overlay.classList.add('open');
  adminLoadUsers();
}

function closeAdminPanel() {
  var overlay = document.getElementById('adm-overlay');
  if (overlay) overlay.classList.remove('open');
}

async function adminLoadUsers() {
  var listEl = document.getElementById('adm-user-list');
  if (!listEl) return;
  listEl.innerHTML = '<div style="padding:24px;text-align:center;color:#6B7685;font-size:13px;">Carregando...</div>';
  try {
    var res = await fetch(API_BASE + '/api/users/', { headers: apiHeaders() });
    if (!res.ok) {
      var d = await res.json().catch(function(){return{};});
      throw new Error(d.detail || 'Erro ' + res.status);
    }
    _admUsers = await res.json();
    renderAdmUserList();
    _bindAdmListEvents();
  } catch(e) {
    listEl.innerHTML = '<div style="padding:24px;text-align:center;color:#fca5a5;font-size:13px;">Erro ao carregar: ' + escHtml(e.message) + '</div>';
  }
}

function renderAdmUserList() {
  var listEl = document.getElementById('adm-user-list');
  if (!listEl) return;

  var nivelLabels = {1:'Broker',2:'Assessor',3:'Analista',4:'Lider de Squad',5:'Admin'};
  var nivelColors = {1:'#6B7685',2:'#3b82f6',3:'#8b5cf6',4:'#f59e0b',5:'#E05A3A'};

  if (!_admUsers.length) {
    listEl.innerHTML = '<div style="padding:24px;text-align:center;color:#6B7685;font-size:13px;">Nenhum usuario cadastrado.</div>';
    return;
  }

  var html = '<div style="display:flex;flex-direction:column;gap:8px;">';
  _admUsers.forEach(function(u) {
    var nome = u.name || u.full_name || u.username || 'Usuario';
    var initials = nome.split(' ').map(function(p){return p[0]||'';}).slice(0,2).join('').toUpperCase();
    var nivelLabel = nivelLabels[u.nivel] || ('Nivel ' + u.nivel);
    var nivelColor = nivelColors[u.nivel] || '#6B7685';
    var isSelf = (currentUser && Number(u.id) === Number(currentUser.id));

    html += '<div style="display:flex;align-items:center;gap:12px;padding:12px 14px;'
          + 'background:#161B22;border:1px solid #252C35;border-radius:10px;" data-row-id="' + u.id + '">';

    html += '<div style="width:38px;height:38px;border-radius:50%;background:' + nivelColor + ';'
          + 'display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;'
          + 'color:#fff;flex-shrink:0;">' + escHtml(initials) + '</div>';

    html += '<div style="flex:1;min-width:0;">';
    html += '<div style="font-size:13px;font-weight:700;color:#E8EBF0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'
          + escHtml(nome)
          + (isSelf ? ' <span style="font-size:10px;color:#E05A3A;font-weight:600;">(voce)</span>' : '')
          + '</div>';
    html += '<div style="font-size:11px;color:#6B7685;margin-top:2px;">@' + escHtml(u.username);
    if (u.broker_vinculado) html += ' <span style="color:#4b5563;">&#8594; ' + escHtml(u.broker_vinculado) + '</span>';
    html += '</div>';
    html += '<div style="margin-top:5px;display:flex;gap:5px;flex-wrap:wrap;">';
    html += '<span style="font-size:10px;font-weight:700;color:' + nivelColor + ';background:' + nivelColor + '22;'
          + 'padding:2px 8px;border-radius:100px;">' + escHtml(nivelLabel) + '</span>';
    if (u.ativo === false) {
      html += '<span style="font-size:10px;font-weight:700;color:#fca5a5;background:rgba(239,68,68,.12);'
            + 'padding:2px 8px;border-radius:100px;">Inativo</span>';
    }
    html += '</div>';
    html += '</div>';

    html += '<div style="display:flex;flex-direction:column;gap:5px;flex-shrink:0;">';
    html += '<button data-action="edit" data-user-id="' + u.id + '" '
          + 'style="font-size:11px;font-weight:600;padding:5px 11px;border-radius:6px;'
          + 'border:1px solid #252C35;background:transparent;color:#E8EBF0;cursor:pointer;">Editar</button>';
    if (!isSelf) {
      html += '<button data-action="impersonate" data-user-id="' + u.id + '" '
            + 'style="font-size:11px;font-weight:600;padding:5px 11px;border-radius:6px;'
            + 'border:1px solid #1e3a5f;background:transparent;color:#60a5fa;cursor:pointer;">Ver como</button>';
      html += '<button data-action="reset-pwd" data-user-id="' + u.id + '" '
            + 'style="font-size:11px;font-weight:600;padding:5px 11px;border-radius:6px;'
            + 'border:1px solid #3a2020;background:transparent;color:#fca5a5;cursor:pointer;">Senha</button>';
      html += '<button data-action="delete" data-user-id="' + u.id + '" '
            + 'style="font-size:11px;font-weight:600;padding:5px 11px;border-radius:6px;'
            + 'border:1px solid #3a2020;background:transparent;color:#fca5a5;cursor:pointer;">Excluir</button>';
    }
    html += '</div>';
    html += '</div>';
  });
  html += '</div>';
  listEl.innerHTML = html;
}

// Listener unico e delegado — evita qualquer problema de escaping em onclick
function _bindAdmListEvents() {
  var listEl = document.getElementById('adm-user-list');
  if (!listEl || listEl._admBound) return; // liga apenas uma vez
  listEl._admBound = true;
  listEl.addEventListener('click', function(ev) {
    var btn = ev.target.closest('button[data-action]');
    if (!btn) return;
    var action = btn.getAttribute('data-action');
    var userId = Number(btn.getAttribute('data-user-id'));
    var u = _admUsers.find(function(x){ return Number(x.id) === userId; });
    if (!u) return;

    if (action === 'edit')        admEditUser(userId);
    else if (action === 'impersonate') admImpersonate(userId);
    else if (action === 'reset-pwd')   admResetSenha(userId, u.name || u.username);
    else if (action === 'delete')      admDeleteUser(userId, u.name || u.username);
  });
}

// Carrega a lista de brokers (Parametrizacao) UMA VEZ e cacheia
async function _admGetBrokerList() {
  if (_admBrokerCache) return _admBrokerCache;

  var params = window.getParamData ? window.getParamData() : [];
  if (!params.length) {
    try {
      var r = await fetch(API_BASE + '/api/param/', { headers: apiHeaders() });
      if (r.ok) params = await r.json();
    } catch(e) { params = []; }
  }

  var brokersParam = params.map(function(p){ return (p.broker||'').trim(); }).filter(Boolean);
  var brokersUsers = _admUsers.map(function(u){ return (u.name || u.username || '').trim(); }).filter(Boolean);
  _admBrokerCache = [...new Set([...brokersParam, ...brokersUsers])].sort();
  return _admBrokerCache;
}

function _admFillBrokerSelect(brokers, selected) {
  var sel = document.getElementById('adm-u-broker');
  if (!sel) return;
  sel.innerHTML = '<option value="">-- Nenhum (sem vinculo) --</option>';
  brokers.forEach(function(b){
    var opt = document.createElement('option');
    opt.value = b; opt.textContent = b;
    sel.appendChild(opt);
  });
  sel.value = selected || '';
}

function _admClearModalFields() {
  ['adm-u-name','adm-u-username','adm-u-email','adm-u-senha'].forEach(function(id){
    var el = document.getElementById(id); if (el) el.value = '';
  });
  var nivelEl = document.getElementById('adm-u-nivel');
  if (nivelEl) nivelEl.value = '1';
  var brokerEl = document.getElementById('adm-u-broker');
  if (brokerEl) brokerEl.innerHTML = '<option value="">-- Nenhum (sem vinculo) --</option>';
  var msgEl = document.getElementById('adm-u-msg');
  if (msgEl) { msgEl.style.display = 'none'; msgEl.textContent = ''; }
}

// Novo usuario
async function openNewUserModal() {
  var myToken = ++_admOpenToken;
  _admEditingUserId = null;
  _admClearModalFields();

  var titleEl = document.getElementById('adm-user-modal-title');
  if (titleEl) titleEl.textContent = 'Novo Usuario';

  var pwdEl = document.getElementById('adm-u-senha');
  if (pwdEl) pwdEl.placeholder = 'Minimo 4 caracteres';

  var delBtn = document.getElementById('adm-u-delete-btn');
  if (delBtn) delBtn.style.display = 'none';

  var overlay = document.getElementById('adm-user-modal');
  if (overlay) overlay.classList.add('open');

  var brokers = await _admGetBrokerList();
  if (myToken !== _admOpenToken) return; // usuario abriu outro modal enquanto isso
  _admFillBrokerSelect(brokers, '');
}

// Editar usuario existente
async function admEditUser(userId) {
  var myToken = ++_admOpenToken;
  var u = _admUsers.find(function(x){ return Number(x.id) === Number(userId); });
  if (!u) return;
  _admEditingUserId = u.id;

  // 1. Limpa TUDO primeiro — nunca reaproveita valores do usuario anterior
  _admClearModalFields();

  var titleEl = document.getElementById('adm-user-modal-title');
  if (titleEl) titleEl.textContent = 'Editar Usuario';

  // 2. Popula campos sincronos imediatamente com os dados do usuario correto
  var fName     = document.getElementById('adm-u-name');
  var fUsername = document.getElementById('adm-u-username');
  var fEmail    = document.getElementById('adm-u-email');
  var fNivel    = document.getElementById('adm-u-nivel');
  if (fName)     fName.value     = u.name || u.full_name || '';
  if (fUsername) fUsername.value = u.username || '';
  if (fEmail)    fEmail.value    = u.email || '';
  if (fNivel)    fNivel.value    = String(u.nivel || 1);

  var pwdEl = document.getElementById('adm-u-senha');
  if (pwdEl) { pwdEl.value = ''; pwdEl.placeholder = 'Deixe em branco para nao alterar'; }

  var isSelf = (currentUser && Number(u.id) === Number(currentUser.id));
  var delBtn = document.getElementById('adm-u-delete-btn');
  if (delBtn) delBtn.style.display = isSelf ? 'none' : 'inline-flex';

  var overlay = document.getElementById('adm-user-modal');
  if (overlay) overlay.classList.add('open');

  // 3. Broker select — usa cache; so aplica se este ainda for o modal ativo
  var brokers = await _admGetBrokerList();
  if (myToken !== _admOpenToken || _admEditingUserId !== u.id) return;
  _admFillBrokerSelect(brokers, u.broker_vinculado || '');
}

function closeAdmUserModal() {
  var overlay = document.getElementById('adm-user-modal');
  if (overlay) overlay.classList.remove('open');
  _admEditingUserId = null;
  _admOpenToken++; // invalida qualquer callback assincrono pendente
}

// Salvar (criar ou editar)
async function admSaveUser() {
  var msgEl = document.getElementById('adm-u-msg');
  function showMsg(txt, ok) {
    if (!msgEl) return;
    msgEl.textContent = txt;
    msgEl.style.cssText = 'display:block;font-size:12px;padding:8px 10px;border-radius:6px;margin-top:4px;'
      + (ok ? 'background:rgba(34,197,94,.12);color:#4ade80;border:1px solid rgba(34,197,94,.3);'
            : 'background:rgba(239,68,68,.12);color:#fca5a5;border:1px solid rgba(239,68,68,.3);');
  }

  // Guarda o ID sendo editado no momento do clique em Salvar (evita salvar no usuario errado)
  var editingId = _admEditingUserId;

  var nome     = (document.getElementById('adm-u-name')    ||{}).value || '';
  var username = (document.getElementById('adm-u-username')||{}).value || '';
  var email    = (document.getElementById('adm-u-email')   ||{}).value || '';
  var nivel    = parseInt((document.getElementById('adm-u-nivel')||{}).value || '1');
  var senha    = (document.getElementById('adm-u-senha')   ||{}).value || '';
  var broker   = (document.getElementById('adm-u-broker')  ||{}).value || '';

  if (!nome.trim())     { showMsg('Informe o nome do usuario.', false); return; }
  if (!username.trim()) { showMsg('Informe o username.', false);        return; }

  var isNew = !editingId;
  if (isNew && !senha.trim()) { showMsg('Informe a senha para novo usuario.', false); return; }

  var payload = {
    name:             nome.trim(),
    username:         username.trim(),
    email:            email.trim() || null,
    nivel:            nivel,
    broker_vinculado: broker.trim() || null
  };
  if (senha.trim()) payload.password = senha.trim();

  try {
    var url    = isNew ? API_BASE + '/api/users/' : API_BASE + '/api/users/' + editingId;
    var method = isNew ? 'POST' : 'PUT';
    var res = await fetch(url, {
      method:  method,
      headers: apiHeaders(),
      body:    JSON.stringify(payload)
    });
    if (res.ok) {
      showMsg(isNew ? 'Usuario criado com sucesso!' : 'Usuario atualizado!', true);
      _admBrokerCache = null; // invalida cache (pode ter novo broker)
      setTimeout(function(){
        closeAdmUserModal();
        adminLoadUsers();
      }, 800);
    } else {
      var d = await res.json().catch(function(){return{};});
      showMsg(d.detail || ('Erro ' + res.status), false);
    }
  } catch(e) {
    showMsg('Sem conexao com o servidor.', false);
  }
}

// Reset de senha pelo admin
async function admResetSenha(userId, nome) {
  var novaSenha = prompt('Nova senha para ' + nome + ':');
  if (!novaSenha || !novaSenha.trim()) return;
  if (novaSenha.trim().length < 4) { alert('Senha muito curta (minimo 4 caracteres).'); return; }
  try {
    var res = await fetch(API_BASE + '/api/users/' + userId + '/reset-password', {
      method: 'POST', headers: apiHeaders(),
      body: JSON.stringify({ new_password: novaSenha.trim() })
    });
    if (res.ok) { toast('Senha de ' + nome + ' redefinida!'); }
    else {
      var d = await res.json().catch(function(){return{};});
      toast(d.detail || 'Erro ao redefinir senha.', 'error');
    }
  } catch(e) { toast('Sem conexao com o servidor.', 'error'); }
}

// Excluir usuario
async function admDeleteUser(userId, nome) {
  if (!confirm('Excluir o usuario "' + nome + '"? Esta acao nao pode ser desfeita.')) return;
  try {
    var res = await fetch(API_BASE + '/api/users/' + userId, {
      method: 'DELETE', headers: apiHeaders()
    });
    if (res.ok) { toast('Usuario "' + nome + '" excluido.'); adminLoadUsers(); }
    else {
      var d = await res.json().catch(function(){return{};});
      toast(d.detail || 'Erro ao excluir.', 'error');
    }
  } catch(e) { toast('Sem conexao com o servidor.', 'error'); }
}

async function admConfirmDelete() {
  if (!_admEditingUserId) return;
  var u = _admUsers.find(function(x){ return Number(x.id) === Number(_admEditingUserId); });
  var nome = u ? (u.name || u.username) : 'este usuario';
  var idToDelete = _admEditingUserId;
  closeAdmUserModal();
  await admDeleteUser(idToDelete, nome);
}

// ── Impersonar (visualizar como outro usuario) ──────────────────────────────

function admImpersonate(userId) {
  var u = _admUsers.find(function(x){ return Number(x.id) === Number(userId); });
  if (!u) return;
  var nomeExibido = u.name || u.full_name || u.username;
  if (!confirm('Visualizar a plataforma como "' + nomeExibido + '"?\nUm banner aparecera para voce restaurar sua sessao.')) return;

  sessionStorage.setItem('bo_imp_token', authToken);
  sessionStorage.setItem('bo_imp_user',  JSON.stringify(currentUser));

  currentUser = Object.assign({}, u);
  sessionStorage.setItem('bo_user', JSON.stringify(currentUser));

  closeAdminPanel();
  applySidebarUser(currentUser);
  _admShowRestoreBar(nomeExibido);
  toast('Visualizando como ' + nomeExibido + '. Use o banner para restaurar sua sessao.');
}

function _admShowRestoreBar(nomeImpersonado) {
  var existing = document.getElementById('imp-bar');
  if (existing) existing.remove();

  var bar = document.createElement('div');
  bar.id = 'imp-bar';
  bar.style.cssText = [
    'position:fixed;bottom:0;left:0;right:0;z-index:9999',
    'background:#E05A3A;color:#fff',
    'padding:10px 20px',
    'display:flex;align-items:center;justify-content:space-between',
    'font-size:13px;font-weight:600',
    'box-shadow:0 -2px 12px rgba(0,0,0,.4)'
  ].join(';');

  bar.innerHTML = '<span>Visualizando como: <strong>' + escHtml(nomeImpersonado) + '</strong></span>'
    + '<button onclick="admRestoreSession()" style="'
    + 'background:#fff;color:#E05A3A;border:none;border-radius:6px;'
    + 'padding:6px 16px;font-weight:700;cursor:pointer;font-size:12px;'
    + '">Restaurar minha sessao</button>';

  document.body.appendChild(bar);
}

function admRestoreSession() {
  var backupToken = sessionStorage.getItem('bo_imp_token');
  var backupUser  = sessionStorage.getItem('bo_imp_user');
  if (!backupToken || !backupUser) { location.reload(); return; }

  authToken   = backupToken;
  currentUser = JSON.parse(backupUser);
  sessionStorage.setItem('bo_token', authToken);
  sessionStorage.setItem('bo_user',  backupUser);
  sessionStorage.removeItem('bo_imp_token');
  sessionStorage.removeItem('bo_imp_user');

  applySidebarUser(currentUser);
  var bar = document.getElementById('imp-bar');
  if (bar) bar.remove();
  toast('Sessao restaurada. Bem-vindo de volta, ' + (currentUser.name || currentUser.username) + '!');
}
