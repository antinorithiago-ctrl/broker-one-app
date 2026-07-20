// ═══════════════════════════════════════════
//  AUTH + ADMIN
// ═══════════════════════════════════════════
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

async function doLogin() {
  var user = (document.getElementById('login-user')||{}).value || '';
  var pass = (document.getElementById('login-pass')||{}).value || '';
  var errEl = document.getElementById('lx-error');
  var btn = document.getElementById('lx-btn');
  var btnTxt = document.getElementById('lx-btn-text');
  var spin = document.getElementById('lx-spinner');
  user = user.trim();
  if (errEl) { errEl.style.display='none'; errEl.textContent=''; }
  if (!user || !pass) {
    if (errEl) { errEl.textContent='Preencha usuário e senha.'; errEl.style.display='block'; }
    return;
  }
  if (btn) btn.disabled = true;
  if (btnTxt) btnTxt.style.display = 'none';
  if (spin) spin.style.display = '';
  try {
    var form = new URLSearchParams();
    form.append('username', user);
    form.append('password', pass);
    var res = await fetch(API_BASE + '/login', {
      method: 'POST',
      headers: {'Content-Type': 'application/x-www-form-urlencoded'},
      body: form.toString()
    });
    if (res.ok) {
      var data = await res.json();
      authToken = data.access_token;
      currentUser = data.user || {};
      sessionStorage.setItem('bo_token', authToken);
      sessionStorage.setItem('bo_user', JSON.stringify(currentUser));
      var lo = document.getElementById('login-overlay');
      if (lo) lo.style.display = 'none';
      applySidebarUser(currentUser);
      initApp();
    } else {
      var errData = await res.json().catch(function(){ return {}; });
      if (errEl) { errEl.textContent = errData.detail || ('Erro ' + res.status); errEl.style.display='block'; }
      if (btn) btn.disabled = false;
      if (btnTxt) btnTxt.style.display = '';
      if (spin) spin.style.display = 'none';
    }
  } catch(e) {
    if (errEl) { errEl.textContent = 'Sem conexão com o servidor.'; errEl.style.display='block'; }
    if (btn) btn.disabled = false;
    if (btnTxt) btnTxt.style.display = '';
    if (spin) spin.style.display = 'none';
  }
}
