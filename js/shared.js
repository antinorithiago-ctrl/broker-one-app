// Broker ONE — SHARED
// ─────────────────────────────────────


// ═══════════════════════════════════════════
//  SHARED UTILITIES
// ═══════════════════════════════════════════
function uid(){return 't_'+Date.now().toString(36)+Math.random().toString(36).slice(2,8);}
function todayISO(){var d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function fmtDateShort(iso){if(!iso)return '';var p=iso.split('-');var m=['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];return p[2]+'/'+m[parseInt(p[1])-1];}
function fmtCurrency(v){if(!v&&v!==0)return '—';var n=parseFloat(v);if(isNaN(n))return '—';if(n>=1000000)return 'R$ '+(n/1000000).toFixed(1)+'M';if(n>=1000)return 'R$ '+(n/1000).toFixed(0)+'k';return 'R$ '+n.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});}
function fmtCurrencyFull(v){if(!v&&v!==0)return '—';var n=parseFloat(v);if(isNaN(n))return '—';return 'R$ '+n.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});}
function toast(msg,type){var t=document.getElementById('toast');t.innerHTML=(type==='error'?'✕ ':'✓ ')+msg;t.className='toast show '+(type==='error'?'error':'success');setTimeout(function(){t.className='toast';},2800);}
function setDates(){var d=new Date();var s=d.toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long',year:'numeric'});s=s.charAt(0).toUpperCase()+s.slice(1);['flow-date','pilott-date','onelab-date'].forEach(function(id){var el=document.getElementById(id);if(el)el.textContent=s;});}

// Ponte de persistência para o One Lab (iframe data:), cujo localStorage próprio
// é efêmero/isolado. O iframe envia {source:'onelab',action:'load'|'save',key,value}
// e recebemos aqui, gravando no localStorage real do Broker ONE.
window.addEventListener('message', function(ev){
  var d = ev.data;
  if(!d || d.source !== 'onelab') return;
  var storageKey = 'brokerone_onelab_' + d.key;
  var frame = document.getElementById('onelab-frame');
  if(!frame || !frame.contentWindow) return;
  if(d.action === 'load'){
    var value = {};
    try{ value = JSON.parse(localStorage.getItem(storageKey)) || {}; }catch(e){ value = {}; }
    frame.contentWindow.postMessage({source:'broker-one', action:'loaded', key:d.key, value:value}, '*');
  } else if(d.action === 'save'){
    try{ localStorage.setItem(storageKey, JSON.stringify(d.value)); }catch(e){ /* armazenamento indisponível */ }
  }
}
);

function goTo(page) {
  var container = document.getElementById('page-container');
  var ni = document.querySelector('.nav-item[data-page="' + page + '"]');

  // Atualizar nav ativo
  document.querySelectorAll('.nav-item').forEach(function(n){ n.classList.remove('active'); });
  if (ni) ni.classList.add('active');

  // Se a page já foi carregada, só mostrar
  var existing = document.getElementById('page-' + page);
  if (existing) {
    document.querySelectorAll('.page').forEach(function(p){ p.classList.remove('active'); });
    existing.classList.add('active');
    onPageLoaded(page);
    return;
  }

  // Carregar via fetch
  container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-3);font-family:var(--font-mono);font-size:12px;">Carregando...</div>';

  fetch('pages/' + page + '.html')
    .then(function(r) {
      if (!r.ok) throw new Error('Erro ' + r.status);
      return r.text();
    })
    .then(function(html) {
      container.innerHTML = html;
      var pg = document.getElementById('page-' + page);
      if (pg) {
        pg.classList.add('active');
        // Garantir que a page preenche o container
        pg.style.flex = '1';
        pg.style.minHeight = '0';
      }
      onPageLoaded(page);
    })
    .catch(function(e) {
      container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--red);font-family:var(--font-mono);font-size:12px;">Erro ao carregar página.</div>';
      console.error('goTo erro:', e);
    });
}

// Chamada após cada page ser carregada — inicializa o módulo correto
function onPageLoaded(page) {
  // Usar setTimeout para garantir que o DOM da page foi renderizado antes de inicializar
  setTimeout(function() {
    if (page === 'home') {
      var nome = currentUser ? (currentUser.name || currentUser.username || '').split(' ')[0] : '';
      var h = new Date().getHours();
      var greeting = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
      var el = document.getElementById('home-greeting');
      if (el) el.textContent = greeting + (nome ? ', ' + nome : '') + ' 👋';
      var datEl = document.getElementById('home-date');
      if (datEl) datEl.textContent = new Date().toLocaleDateString('pt-BR', {weekday:'long', day:'numeric', month:'long', year:'numeric'});
    }
    else if (page === 'flow')           { typeof loadFlow !== 'undefined' && loadFlow(); }
    else if (page === 'pilott')         { typeof pilottLoad !== 'undefined' && pilottLoad(); typeof initUrgency !== 'undefined' && initUrgency(); }
    else if (page === 'pipe')           { typeof loadPipe !== 'undefined' && loadPipe(); }
    else if (page === 'parametrizacao') { typeof window.renderParam !== 'undefined' && window.renderParam(); }
    else if (page === 'metas')          { typeof window.loadMetas !== 'undefined' && window.loadMetas(); }
    typeof setDates !== 'undefined' && setDates(page);
  }, 500);
}

document.addEventListener('keydown',function(e){
  if(e.key==='Escape'){
    document.querySelectorAll('.overlay.open').forEach(function(o){o.classList.remove('open');});
    var to=document.getElementById('taskOverlay');
    var vo=document.getElementById('viewOverlay');
    if(to)to.style.display='none';
    if(vo)vo.style.display='none';
  }
});

function maskVolFin(el){
  var raw=el.value.replace(/[^0-9]/g,'');
  if(!raw){el.value='';return;}
  var num=parseInt(raw,10)/100;
  el.value=num.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
}

function getVolFinRaw(){
  var el=document.getElementById('f-vol-fin');
  if(!el||!el.value)return 0;
  var s=el.value.replace(/[.]/g,'').replace(',','.');
  return parseFloat(s)||0;
}

