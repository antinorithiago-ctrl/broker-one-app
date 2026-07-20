// pipe.js — Módulo Pipe (pipeline semanal)
// ════════════════════════════════════════════
//  PIPE — Pipeline Semanal
// ════════════════════════════════════════════
var _pipeSessaoAtual = null;   // objeto da sessão corrente
var _pipeLinhas      = [];     // array de linhas da sessão
var _pipeLinhaId     = null;   // id da linha sendo editada no modal

var PIPE_MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

function pipeFmt(v){
  return 'R$ ' + Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
}

async function loadPipe(){
  // atualiza data
  var el=document.getElementById('pipe-date');
  if(el) el.textContent=new Date().toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long',year:'numeric'});

  try{
    var res=await fetch(API_BASE+'/api/pipe/sessao/atual',{headers:apiHeaders()});
    if(res.ok){
      _pipeSessaoAtual=await res.json();
      await loadPipeLinhas();
      renderPipeSessao();
    } else if(res.status===404){
      _pipeSessaoAtual=null;
      _pipeLinhas=[];
      renderPipeVazio();
    } else {
      renderPipeVazio('Erro ao carregar sessão.');
    }
  } catch(e){
    renderPipeVazio('Sem conexão com o servidor.');
  }
}

function renderPipeVazio(msg){
  document.getElementById('pipe-empty').style.display='block';
  document.getElementById('pipe-sessao').style.display='none';
  document.getElementById('pipe-topbar-actions').innerHTML='';
  if(msg){
    document.getElementById('pipe-empty-title').textContent=msg;
    document.getElementById('pipe-empty-sub').textContent='';
    document.getElementById('pipe-btn-nova').style.display='none';
    return;
  }
  document.getElementById('pipe-empty-title').textContent='Nenhuma sessão aberta esta semana';
  document.getElementById('pipe-empty-sub').textContent='O Líder de Squad pode abrir uma nova sessão semanal.';
  // só Líder (nivel>=2) pode abrir
  var btnNova=document.getElementById('pipe-btn-nova');
  if(btnNova) btnNova.style.display=(currentUser&&currentUser.nivel>=2)?'inline-flex':'none';
}

function renderPipeSessao(){
  document.getElementById('pipe-empty').style.display='none';
  document.getElementById('pipe-sessao').style.display='block';

  var s=_pipeSessaoAtual;
  var travada=s.status==='trancada';

  // Badge de status
  var badge=document.getElementById('pipe-sessao-badge');
  if(travada){
    badge.textContent='TRANCADA';
    badge.style.cssText='padding:5px 14px;border-radius:20px;font-size:12px;font-weight:700;letter-spacing:.04em;background:#FEE2E2;color:#991B1B;';
  } else {
    badge.textContent='ABERTA';
    badge.style.cssText='padding:5px 14px;border-radius:20px;font-size:12px;font-weight:700;letter-spacing:.04em;background:var(--teal-light);color:var(--teal-dark);';
  }

  // Info da sessão
  var info=document.getElementById('pipe-sessao-info');
  var d=new Date(s.data_inicio+'T12:00:00');
  info.textContent='Semana de '+d.getDate()+'/'+PIPE_MESES[d.getMonth()]+'/'+d.getFullYear()+' · Abertura por '+s.lider_nome;

  // Botões de ação da sessão (topbar)
  // Permissão hierárquica: nivel >= 2 abre/tranca/edita qualquer linha; nivel 1 só edita a própria
  var nivel=currentUser?currentUser.nivel:0;
  var isLider=nivel>=2;
  var actTop=document.getElementById('pipe-topbar-actions');
  var actSess=document.getElementById('pipe-sessao-actions');
  actTop.innerHTML='';
  actSess.innerHTML='';
  if(!travada && isLider){
    var btnTravar=document.createElement('button');
    btnTravar.className='btn btn-danger';
    btnTravar.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:15px;height:15px;margin-right:6px;"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>Trancar sessão';
    btnTravar.onclick=pipeTravarSessao;
    actTop.appendChild(btnTravar);
  }

  // Totais
  var totCorr=0,totCoe=0,totEstr=0;
  _pipeLinhas.forEach(function(l){totCorr+=l.corretagem||0;totCoe+=l.coe||0;totEstr+=l.estruturados||0;});
  document.getElementById('pipe-tot-corr').textContent=pipeFmt(totCorr);
  document.getElementById('pipe-tot-coe').textContent=pipeFmt(totCoe);
  document.getElementById('pipe-tot-estr').textContent=pipeFmt(totEstr);
  document.getElementById('pipe-tot-total').textContent=pipeFmt(totCorr+totCoe+totEstr);

  // Tabela
  var tbody=document.getElementById('pipe-tbody');
  tbody.innerHTML='';
  _pipeLinhas.forEach(function(l){
    var total=(l.corretagem||0)+(l.coe||0)+(l.estruturados||0);
    var tr=document.createElement('tr');
    var podeEditar=!travada&&(isLider||(currentUser&&l.broker_id===currentUser.id));
    tr.innerHTML=
      '<td style="font-weight:600;">'+escHtml(l.assessor_nome||'—')+'</td>'+
      '<td style="color:var(--text-secondary);font-size:12px;">'+escHtml(l.broker_nome||'—')+'</td>'+
      '<td style="text-align:right;">'+pipeFmt(l.corretagem)+'</td>'+
      '<td style="text-align:right;">'+pipeFmt(l.coe)+'</td>'+
      '<td style="text-align:right;">'+pipeFmt(l.estruturados)+'</td>'+
      '<td style="text-align:right;font-weight:700;color:var(--teal-dark);">'+pipeFmt(total)+'</td>'+
      '<td style="text-align:center;">'+(podeEditar?'<button class="btn-icon" title="Editar" onclick="openPipeModal('+l.id+')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:15px;height:15px;"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg></button>':'—')+'</td>';
    tbody.appendChild(tr);
  });
}

async function loadPipeLinhas(){
  if(!_pipeSessaoAtual) return;
  var res=await fetch(API_BASE+'/api/pipe/sessao/'+_pipeSessaoAtual.id+'/linhas',{headers:apiHeaders()});
  if(res.ok) _pipeLinhas=await res.json();
  else _pipeLinhas=[];
}

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

async function pipeTravarSessao(){
  if(!confirm('Trancar a sessão? Não será mais possível editar os valores.')) return;
  try{
    var res=await fetch(API_BASE+'/api/pipe/sessao/'+_pipeSessaoAtual.id+'/trancar',{method:'POST',headers:apiHeaders()});
    if(res.ok){
      _pipeSessaoAtual=await res.json();
      renderPipeSessao();
      toast('Sessão trancada com sucesso.');
    } else {
      var err=await res.json().catch(()=>({}));
      toast(err.detail||'Erro ao trancar.','error');
    }
  } catch(e){ toast('Sem conexão.','error'); }
}

function openPipeModal(linhaId){
  var l=_pipeLinhas.find(function(x){return x.id===linhaId;});
  if(!l) return;
  _pipeLinhaId=linhaId;
  document.getElementById('pipe-modal-assessor').textContent=l.assessor_nome||'Assessor';
  document.getElementById('pipe-f-corr').value=l.corretagem||'';
  document.getElementById('pipe-f-coe').value=l.coe||'';
  document.getElementById('pipe-f-estr').value=l.estruturados||'';
  pipeSomaModal();
  document.getElementById('modal-pipe-linha').classList.add('open');
}

function closePipeModal(){
  document.getElementById('modal-pipe-linha').classList.remove('open');
  _pipeLinhaId=null;
}

function pipeSomaModal(){
  var c=parseFloat(document.getElementById('pipe-f-corr').value)||0;
  var o=parseFloat(document.getElementById('pipe-f-coe').value)||0;
  var e=parseFloat(document.getElementById('pipe-f-estr').value)||0;
  document.getElementById('pipe-modal-total').textContent=pipeFmt(c+o+e);
}

async function savePipeLinha(){
  if(!_pipeLinhaId) return;
  var payload={
    corretagem:parseFloat(document.getElementById('pipe-f-corr').value)||0,
    coe:parseFloat(document.getElementById('pipe-f-coe').value)||0,
    estruturados:parseFloat(document.getElementById('pipe-f-estr').value)||0
  };
  try{
    var res=await fetch(API_BASE+'/api/pipe/linha/'+_pipeLinhaId,{method:'PATCH',headers:apiHeaders(),body:JSON.stringify(payload)});
    if(res.ok){
      var updated=await res.json();
      _pipeLinhas=_pipeLinhas.map(function(l){return l.id===updated.id?updated:l;});
      renderPipeSessao();
      closePipeModal();
      toast('Pipeline atualizado.');
    } else {
      var err=await res.json().catch(()=>({}));
      toast(err.detail||'Erro ao salvar.','error');
    }
  } catch(e){ toast('Sem conexão.','error'); }
}

function escHtml(s){
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

