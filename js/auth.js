// Broker ONE — AUTH
// ─────────────────────────────────────

// ═══════════════════════════════════════════
//  API + AUTH
// ═══════════════════════════════════════════
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
}function populateAssessores(){
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

// ── doLogout (from orig)
function doLogout(){if(!confirm('Deseja sair do Broker ONE?'))return;sessionStorage.removeItem('bo_token');sessionStorage.removeItem('bo_user');location.reload();}

// ── openAdminPanel (from orig)
function openAdminPanel(){document.getElementById('adm-overlay').style.display='flex';adminLoadUsers();}

// ── openChangePwd (from orig)
function openChangePwd(){
  ['pwd-atual','pwd-nova','pwd-confirm'].forEach(function(id){document.getElementById(id).value='';});
  document.getElementById('pwd-msg').style.display='none';
  document.getElementById('pwd-overlay').style.display='flex';
}

// ── escHtml (from orig)
function escHtml(s){
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ── pipeAbrirSessao (from orig)
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

// ── Popular AAI no modal do Pilott
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


function applySidebarUser(u){
  if(!u)return;
  var nome=u.full_name||u.name||u.username||'Usuário';
  var initials=nome.split(' ').map(function(p){return p[0]||'';}).slice(0,2).join('').toUpperCase();
  var av=document.getElementById('sidebar-avatar');
  var sn=document.getElementById('sidebar-user-name');
  var sr=document.getElementById('sidebar-user-role');
  var ab=document.getElementById('sidebar-admin-btn');
  if(av)av.textContent=initials;
  if(sn)sn.textContent=nome;
  if(sr)sr.textContent=u.nivel_label||'Broker';
  if(ab)ab.style.display=(u.nivel>=5)?'flex':'none';

  // Controle de visibilidade da seção Cadastros (só nível >= 4 vê)
  var showCadastros=u.nivel>=4;
  var sec=document.getElementById('nav-section-cadastros');
  var nc=document.getElementById('nav-clientes');
  var nm=document.getElementById('nav-metas');
  var np=document.getElementById('nav-parametrizacao');
  var disp=showCadastros?'flex':'none';
  if(sec)sec.style.display=showCadastros?'block':'none';
  if(nc)nc.style.display=disp;
  if(nm)nm.style.display=disp;
  if(np)np.style.display=disp;
}
