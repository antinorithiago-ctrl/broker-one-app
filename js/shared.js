// ═══════════════════════════════════════════
//  SHARED UTILITIES — Broker ONE
// ═══════════════════════════════════════════
var API_BASE = 'https://broker-one-backend-production-90c9.up.railway.app';
var authToken = sessionStorage.getItem('bo_token') || '';
var currentUser = null;

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
});

function goTo(page){
  document.querySelectorAll('.page').forEach(function(p){p.classList.remove('active');});
  document.querySelectorAll('.nav-item').forEach(function(n){n.classList.remove('active');});
  var pg=document.getElementById('page-'+page);
  if(pg)pg.classList.add('active');
  var ni=document.getElementById('nav-'+page);
  if(ni)ni.classList.add('active');
  if(page==='pilott') pilottRender();
  if(page==='flow') renderFlow();
  if(page==='metas'){
    var el=document.getElementById('metas-date');
    if(el)el.textContent=new Date().toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
    renderMetas();
  }
  if(page==='pipe'){ loadPipe(); }
  if(page==='parametrizacao'){
    var el=document.getElementById('param-date');
    if(el)el.textContent=new Date().toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
    renderParam();
  }
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


// ── Máscara de volume financeiro
function maskVolFin(el){
  var raw = el.value.replace(/[^0-9]/g, '');
  if (!raw) { el.value = ''; return; }
  var num = parseInt(raw, 10) / 100;
  el.value = num.toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2});
}

function getVolFinRaw() {
  var el = document.getElementById('f-vol-fin');
  if (!el || !el.value) return 0;
  return parseFloat(el.value.replace(/[.]/g, '').replace(',', '.')) || 0;
}
