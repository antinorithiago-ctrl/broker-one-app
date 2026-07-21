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

// ── Key única para avatar (evita inconsistências) ──
function _avatarKey() {
  var u = currentUser || {};
  return 'bo_avatar_' + (u.id || u.username || 'user');
}

// ── Login ──
function toggleLxPass(){var i=document.getElementById('login-pass'),o=document.getElementById('lx-eye-open'),c=document.getElementById('lx-eye-closed');if(i.type==='password'){i.type='text';o.style.display='none';c.style.display='';}else{i.type='password';o.style.display='';c.style.display='none';}}
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
      // Mesclar dados de perfil salvos localmente (nome/email)
      var savedProfile = JSON.parse(localStorage.getItem('bo_profile_' + (currentUser.id || currentUser.username)) || '{}');
      if(savedProfile.name)  currentUser.name      = savedProfile.name;
      if(savedProfile.email) currentUser.email     = savedProfile.email;
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
function doLogout(){if(!confirm('Deseja sair do Broker ONE?'))return;sessionStorage.removeItem('bo_token');sessionStorage.removeItem('bo_user');location.reload();}

// ── openAdminPanel ──
function openAdminPanel(){document.getElementById('adm-overlay').style.display='flex';adminLoadUsers();}

// ── openChangePwd — agora abre o painel unificado ──
function openChangePwd(){ openUserPanel(); }

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
      console.error('pipeAbrirSessao erro:',res.status,txt);
      toast(detail||'Erro ao abrir sessão.','error');
    }
  } catch(e){ console.error('pipeAbrirSessao catch:',e); toast('Sem conexão com o servidor.','error'); }
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

  // Atualizar initials no painel também
  var upInit = document.getElementById('up-avatar-initials');
  if (upInit) upInit.textContent = initials;

  // Carregar foto salva — usa _avatarKey() para key consistente
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

  // Mostrar "Gerenciar Usuários" só para Admin (nível 5)
  if (ab) ab.style.display = (u.nivel >= 5) ? 'flex' : 'none';

  // Esconder seção Cadastros para nível 1
  var secCad = document.getElementById('nav-section-cadastros');
  var cadastrosItems = ['nav-clientes','nav-metas','nav-parametrizacao','sidebar-admin-btn'];
  if (u.nivel < 2) {
    if (secCad) secCad.style.display = 'none';
    cadastrosItems.forEach(function(id){
      var el = document.getElementById(id); if (el) el.style.display = 'none';
    });
  }
}

// ══ PAINEL DO USUÁRIO ══════════════════════════════════════════════════

function openUserPanel() {
  var overlay = document.getElementById('user-panel-overlay');
  if (!overlay) return;
  overlay.classList.add('open');

  var u = currentUser || {};
  var nome = u.name || u.full_name || u.username || '';
  var nivelLabels = {1:'Broker',2:'Assessor',3:'Analista',4:'Líder de Squad',5:'Admin'};

  var fName   = document.getElementById('up-name');
  var fEmail  = document.getElementById('up-email');
  var fNivel  = document.getElementById('up-nivel');
  var msgEl   = document.getElementById('up-msg');

  if (fName)  fName.value  = nome;
  if (fEmail) fEmail.value = u.email || '';
  if (fNivel) fNivel.value = nivelLabels[u.nivel] || ('Nível ' + (u.nivel||''));
  if (msgEl)  { msgEl.style.display='none'; msgEl.textContent=''; }

  ['up-pwd-atual','up-pwd-nova','up-pwd-confirm'].forEach(function(id){
    var el = document.getElementById(id);
    if (el) el.value = '';
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
    img.src = saved;
    img.style.display = 'block';
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
    // Atualizar no painel
    var img = document.getElementById('up-avatar-img');
    var initials = document.getElementById('up-avatar-initials');
    if (img) { img.src = dataUrl; img.style.display = 'block'; }
    if (initials) initials.style.display = 'none';
    // Atualizar na sidebar imediatamente
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

  // ── 1. Salvar nome e email localmente e atualizar currentUser ──
  if (novoNome && novoNome !== (currentUser.name || currentUser.full_name || '')) {
    currentUser.name = novoNome;
    currentUser.full_name = novoNome;
    salvouAlgo = true;
  }
  if (novoEmail !== (currentUser.email || '')) {
    currentUser.email = novoEmail;
    salvouAlgo = true;
  }
  if (salvouAlgo) {
    // Persistir no localStorage e sessionStorage
    var profileKey = 'bo_profile_' + (currentUser.id || currentUser.username || 'user');
    localStorage.setItem(profileKey, JSON.stringify({ name: currentUser.name, email: currentUser.email }));
    sessionStorage.setItem('bo_user', JSON.stringify(currentUser));
    applySidebarUser(currentUser);
  }

  // ── 2. Trocar senha se campos preenchidos ──
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

  // ── 3. Fechar com feedback ──
  showMsg('Perfil atualizado!', true);
  setTimeout(function(){ closeUserPanel(); }, 900);
}
