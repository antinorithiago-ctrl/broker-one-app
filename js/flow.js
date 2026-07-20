// Broker ONE — FLOW
// ─────────────────────────────────────

// ═══════════════════════════════════════════
//  FLOW MODULE
// ═══════════════════════════════════════════
var flowItems=[];
var flowFilter='all';
var editingFlowId=null;
var ROA_FIXO_TIPOS=['Corretagem'];
var ROA_FIXO=0.3750;

function loadFlow(){try{flowItems=JSON.parse(localStorage.getItem('brokerone_flow')||'[]');}catch(e){flowItems=[];}}
function saveFlow(){localStorage.setItem('brokerone_flow',JSON.stringify(flowItems));updateFlowBadge();}
function updateFlowBadge(){
  var today=todayISO();
  document.getElementById('flow-badge').textContent=flowItems.filter(function(i){return i.data===today;}).length;
}
function setFlowFilter(f){
  flowFilter=f;
  ['all','push','aguardando','moc'].forEach(function(x){document.getElementById('fp-'+x).classList.toggle('active',x===f);});
  renderFlow();
}
function statusLabel(s){return{push:'Enviar Push',aguardando:'Aguardando Aprovação',moc:'MOC'}[s]||s;}
function statusChipHtml(s){
  var m={push:{bg:'var(--status-push-bg)',c:'var(--status-push-text)',d:'var(--status-push-dot)',l:'Enviar Push'},aguardando:{bg:'var(--status-wait-bg)',c:'var(--status-wait-text)',d:'var(--status-wait-dot)',l:'Aguardando'},moc:{bg:'var(--status-moc-bg)',c:'var(--status-moc-text)',d:'var(--status-moc-dot)',l:'MOC'}};
  var v=m[s]||m.push;
  return '<span class="status-chip" style="background:'+v.bg+';color:'+v.c+'"><span class="dot-sm" style="background:'+v.d+'"></span>'+v.l+'</span>';
}
function confChipHtml(item){
  if(!item.saldo&&!item.qtd) return '<span class="status-chip" style="background:var(--status-na-bg);color:var(--status-na-text)">—</span>';
  if(item.confStatus==='ok') return '<span class="status-chip" style="background:var(--status-ok-bg);color:var(--status-ok-text)">✓ OK</span>';
  return '<span class="status-chip" style="background:var(--status-cancel-bg);color:var(--status-cancel-text)">✕ Insuf.</span>';
}

function renderFlow(){
  var search=(document.getElementById('flow-search').value||'').toLowerCase();
  var today=todayISO();
  var d=new Date();
  var dow=d.getDay()||7;
  var weekStart=new Date(d);weekStart.setDate(d.getDate()-(dow-1));
  var ws=weekStart.getFullYear()+'-'+String(weekStart.getMonth()+1).padStart(2,'0')+'-'+String(weekStart.getDate()).padStart(2,'0');
  var ms=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-01';
  var semItems=flowItems.filter(function(i){return i.data>=ws&&i.data<=today;});
  var mesItems=flowItems.filter(function(i){return i.data>=ms&&i.data<=today;});

  document.getElementById('s-sem-total').textContent=semItems.length;
  var ucSem=[...new Set(semItems.map(function(i){return i.clienteCod;}))];
  document.getElementById('s-sem-clientes').textContent=ucSem.length+' cliente'+(ucSem.length!==1?'s':'');
  document.getElementById('s-sem-volume').textContent=fmtCurrency(semItems.reduce(function(a,i){return a+(parseFloat(i.volFin)||0);},0));
  document.getElementById('s-sem-comissao').textContent=fmtCurrency(semItems.reduce(function(a,i){return a+(parseFloat(i.comissao)||0);},0));
  document.getElementById('s-mes-total').textContent=mesItems.length;
  var ucMes=[...new Set(mesItems.map(function(i){return i.clienteCod;}))];
  document.getElementById('s-mes-clientes').textContent=ucMes.length+' cliente'+(ucMes.length!==1?'s':'');
  document.getElementById('s-mes-volume').textContent=fmtCurrency(mesItems.reduce(function(a,i){return a+(parseFloat(i.volFin)||0);},0));
  document.getElementById('s-mes-comissao').textContent=fmtCurrency(mesItems.reduce(function(a,i){return a+(parseFloat(i.comissao)||0);},0));
  document.getElementById('s-push').textContent=flowItems.filter(function(i){return i.status==='push';}).length;
  document.getElementById('s-wait').textContent=flowItems.filter(function(i){return i.status==='aguardando';}).length;

  var items=flowItems.filter(function(i){
    if(flowFilter==='push'&&i.status!=='push') return false;
    if(flowFilter==='aguardando'&&i.status!=='aguardando') return false;
    if(flowFilter==='moc'&&i.status!=='moc') return false;
    if(search){var h=((i.clienteCod||'')+' '+(i.assessor||'')+' '+(i.tipo||'')+' '+(i.papel||'')+(i.detalhes||'')).toLowerCase();if(!h.includes(search))return false;}
    return true;
  });
  var groups={};
  items.forEach(function(i){var k=i.clienteCod;if(!groups[k])groups[k]={cod:i.clienteCod,assessor:i.assessor,items:[]};groups[k].items.push(i);});
  var tbody=document.getElementById('flow-tbody');tbody.innerHTML='';
  if(!Object.keys(groups).length){
    var tr=document.createElement('tr');tr.innerHTML='<td colspan="11" style="text-align:center;padding:40px;color:var(--text-muted);">Nenhuma boleta. Clique em <strong>Nova Boleta</strong> para começar.</td>';tbody.appendChild(tr);return;
  }
  Object.values(groups).forEach(function(g){
    var gh=document.createElement('tr');gh.className='group-row';gh.innerHTML='<td colspan="11">'+g.cod+' · '+g.assessor+'</td>';tbody.appendChild(gh);
    g.items.forEach(function(item){
      var tr=document.createElement('tr');tr.style.cursor='pointer';
      tr.addEventListener('click',function(){openFlowModal(item.id);});
      var papelCell=item.papel?('<strong>'+item.papel+'</strong>'):'<span class="na-cell">—</span>';
      var roaCell=item.roa?(parseFloat(item.roa).toFixed(2)+'%'):'<span class="na-cell">—</span>';
      tr.innerHTML=
        '<td class="mono-val">'+fmtDateShort(item.data)+'</td>'+
        '<td><div class="client-code">'+item.clienteCod+'</div></td>'+
        '<td style="font-size:11px;">'+item.assessor.split(' ')[0]+'</td>'+
        '<td><strong style="font-size:11px;">'+item.tipo+'</strong></td>'+
        '<td class="r mono-val">'+fmtCurrency(item.volFin)+'</td>'+
        '<td class="r mono-val">'+roaCell+'</td>'+
        '<td class="r mono-val" style="color:var(--teal-dark);font-weight:600;">'+fmtCurrencyFull(item.comissao)+'</td>'+
        '<td>'+statusChipHtml(item.status)+'</td>'+
        '<td>'+papelCell+'</td>'+
        '<td>'+confChipHtml(item)+'</td>'+
        '<td id="adv-td-'+item.id+'"></td>';
      tbody.appendChild(tr);
      var td=document.getElementById('adv-td-'+item.id);
      if(td){var btn=document.createElement('button');btn.className='btn btn-ghost';btn.style.cssText='padding:4px 8px;font-size:11px;';btn.textContent='Avançar →';btn.addEventListener('click',function(e){e.stopPropagation();advanceStatus(item.id);});td.appendChild(btn);}
    });
  });
}

function advanceStatus(id){var item=flowItems.find(function(i){return i.id===id;});if(!item)return;var fl={push:'aguardando',aguardando:'moc',moc:'moc'};var prev=item.status;item.status=fl[item.status]||item.status;item.updatedAt=new Date().toISOString();if(item.status!==prev){saveFlow();renderFlow();toast('Status → '+statusLabel(item.status));}}

function onTipoChange(preserveValues){
  var tipo=document.getElementById('f-tipo').value;
  var isRoaFixo=ROA_FIXO_TIPOS.indexOf(tipo)>-1;
  var isEstruturados=tipo==='Estruturados';
  var isPapel=tipo==='Corretagem'||isEstruturados;
  var roaEl=document.getElementById('f-roa');
  document.getElementById('f-roa-info').style.display=isRoaFixo?'block':'none';
  document.getElementById('f-papel-wrap').style.display=isPapel?'flex':'none';
  var corretagemWrap=document.getElementById('f-corretagem-wrap');
  if(corretagemWrap) corretagemWrap.style.display=isEstruturados?'block':'none';
  if(!isEstruturados){
    var chk=document.getElementById('f-add-corretagem');
    if(chk&&chk.checked){chk.checked=false;toggleCorretagemFields();}
  }
  if(isRoaFixo){
    roaEl.value=ROA_FIXO.toFixed(4);roaEl.readOnly=true;roaEl.style.background='var(--bg)';
  }else{
    if(!preserveValues){roaEl.value='';}
    roaEl.readOnly=false;roaEl.style.background='#fff';
  }
  calcComissao();
}
function calcComissao(){calcCorretagem();}function toggleCorretagemFields(){
  calcCorretagem();
}
function calcCorretagem(){
  var chk=document.getElementById('f-add-corretagem');
  var corrEl=document.getElementById('f-corr-comissao');
  var commEl=document.getElementById('f-comissao');
  var breakdown=document.getElementById('f-comissao-breakdown');
  var ativo=chk&&chk.checked;
  var ROA_CORR=0.3750;
  var vol=getVolFinRaw();
  var roa=parseFloat((document.getElementById('f-roa')||{}).value)||0;
  var commBase=vol*roa/100;
  if(ativo){
    var commCorr=vol*ROA_CORR/100;
    if(corrEl) corrEl.value=commCorr>0?commCorr.toFixed(2):'';
    var total=commBase+commCorr;
    if(commEl) commEl.value=total>0?total.toFixed(2):'';
    if(breakdown){
      breakdown.style.display='block';
      breakdown.innerHTML=
        '<span style="color:var(--text-muted)">Estruturado:</span> <strong>R$ '+commBase.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})+'</strong>'+
        ' &nbsp;+&nbsp; <span style="color:var(--text-muted)">Corretagem (0,375%):</span> <strong>R$ '+commCorr.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})+'</strong>';
    }
  } else {
    if(corrEl) corrEl.value='';
    if(commEl) commEl.value=commBase>0?commBase.toFixed(2):'';
    if(breakdown) breakdown.style.display='none';
  }
}
function calcConf(){
  var qtd=parseFloat(document.getElementById('f-qtd').value)||0;var preco=parseFloat(document.getElementById('f-preco').value)||0;var saldo=parseFloat(document.getElementById('f-saldo').value)||0;var debito=qtd*preco;
  document.getElementById('f-debito').value=debito>0?debito.toFixed(2):'';
  var badge=document.getElementById('f-conf-badge');var wrap=document.getElementById('f-conf-result');
  if(debito>0&&saldo>0){wrap.style.display='block';if(saldo>=debito){badge.style.cssText='background:var(--status-ok-bg);color:var(--status-ok-text);padding:8px 12px;border-radius:6px;font-size:12px;font-weight:600;';badge.textContent='✓ Saldo suficiente — Disponível: '+fmtCurrency(saldo)+' / Débito: '+fmtCurrency(debito);}else{badge.style.cssText='background:var(--status-cancel-bg);color:var(--status-cancel-text);padding:8px 12px;border-radius:6px;font-size:12px;font-weight:600;';badge.textContent='✕ Saldo insuficiente — Disponível: '+fmtCurrency(saldo)+' / Débito: '+fmtCurrency(debito);}}else{wrap.style.display='none';}
}

function openFlowModal(id){
  populateAssessores();
  editingFlowId=id||null;var item=id?flowItems.find(function(i){return i.id===id;}):null;
  document.getElementById('flow-modal-title').textContent=item?'Editar Boleta':'Nova Boleta';
  document.getElementById('flow-delete-btn').style.display=item?'inline-flex':'none';
  document.getElementById('f-cliente-cod').value=item?item.clienteCod:'';
  document.getElementById('f-assessor').value=item?(item.assessor||''):'';
  document.getElementById('f-data').value=item?item.data:todayISO();
  document.getElementById('f-tipo').value=item?(item.tipo||''):'';
  document.getElementById('f-detalhes').value=item?(item.detalhes||''):'';
  document.getElementById('f-papel').value=item?(item.papel||''):'';
  document.getElementById('f-vol-fin').value=item?(item.volFin||''):'';
  document.getElementById('f-roa').value=item?(item.roa||''):'';
  document.getElementById('f-comissao').value=item?(item.comissao||''):'';
  document.getElementById('f-status').value=item?(item.status||'push'):'push';
  document.getElementById('f-saldo').value=item?(item.saldo||''):'';
  document.getElementById('f-qtd').value=item?(item.qtd||''):'';
  document.getElementById('f-preco').value=item?(item.preco||''):'';
  document.getElementById('f-debito').value=item?(item.debito||''):'';
  document.getElementById('f-roa-info').style.display='none';
  document.getElementById('f-papel-wrap').style.display='none';
  document.getElementById('f-conf-result').style.display='none';
  var addCorrChk=document.getElementById('f-add-corretagem');
  if(addCorrChk){
    addCorrChk.checked=!!(item&&item.corretagemAdicional);
    /* f-corr-vol e f-corr-roa removidos — calculado automaticamente pelo f-vol e ROA fixo */
    document.getElementById('f-corr-comissao').value=item&&item.corretagemComissao?item.corretagemComissao:'';
  }
  if(item&&item.tipo) onTipoChange(true);
  toggleCorretagemFields();
  document.getElementById('flow-overlay').classList.add('open');
}
function closeFlowModal(){document.getElementById('flow-overlay').classList.remove('open');editingFlowId=null;}
function saveFlowItem(){
  var cod=document.getElementById('f-cliente-cod').value.trim();
  var tipo=document.getElementById('f-tipo').value;
  var ass=document.getElementById('f-assessor').value;
  if(!cod){toast('Informe o código do cliente','error');return;}
  if(!tipo){toast('Selecione o tipo de boleta','error');return;}
  if(!ass){toast('Selecione o assessor','error');return;}
  var qtd=parseFloat(document.getElementById('f-qtd').value)||0;
  var preco=parseFloat(document.getElementById('f-preco').value)||0;
  var debito=qtd>0&&preco>0?qtd*preco:0;
  var saldo=parseFloat(document.getElementById('f-saldo').value)||0;
  var now=new Date().toISOString();
  var addCorrChk=document.getElementById('f-add-corretagem');
  var isCorretagemAdicional=!!(tipo==='Estruturados'&&addCorrChk&&addCorrChk.checked);
  var data={clienteCod:cod,assessor:ass,data:document.getElementById('f-data').value,tipo:tipo,detalhes:document.getElementById('f-detalhes').value.trim(),papel:document.getElementById('f-papel').value.toUpperCase().trim(),volFin:getVolFinRaw(),roa:parseFloat(document.getElementById('f-roa').value)||0,comissao:parseFloat(document.getElementById('f-comissao').value)||0,status:document.getElementById('f-status').value,saldo:saldo||null,qtd:qtd||null,preco:preco||null,debito:debito||null,confStatus:debito>0&&saldo>0?(saldo>=debito?'ok':'cancelar'):null,
    corretagemAdicional:isCorretagemAdicional,
    corretagemVolFin:isCorretagemAdicional?(parseFloat(document.getElementById('f-vol-fin').value)||0):null,
    corretagemRoa:isCorretagemAdicional?0.3750:null,
    corretagemComissao:isCorretagemAdicional?(parseFloat(document.getElementById('f-corr-comissao').value)||0):null
  };
  if(editingFlowId){var item=flowItems.find(function(i){return i.id===editingFlowId;});if(item)Object.assign(item,data,{updatedAt:now});toast('Boleta atualizada');}
  else{data.id=uid();data.createdAt=now;data.updatedAt=now;flowItems.push(data);toast('Boleta registrada');}
  saveFlow();closeFlowModal();renderFlow();
}
function deleteFlowItem(){if(!editingFlowId)return;if(!confirm('Excluir esta boleta?'))return;flowItems=flowItems.filter(function(i){return i.id!==editingFlowId;});saveFlow();closeFlowModal();renderFlow();toast('Boleta excluída');}
function exportFlowData(){
  var backup={version:1,exportedAt:new Date().toISOString(),flow:flowItems,pilott:localStorage.getItem('brokerone_pilott'),param:localStorage.getItem('brokerone_param')};
  var blob=new Blob([JSON.stringify(backup,null,2)],{type:'application/json'});
  var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='brokerone-backup-'+todayISO()+'.json';a.click();toast('Backup exportado');
}
function importFlowData(){
  var input=document.createElement('input');input.type='file';input.accept='.json';
  input.onchange=function(e){var file=e.target.files[0];if(!file)return;var reader=new FileReader();reader.onload=function(ev){try{var backup=JSON.parse(ev.target.result);if(backup.flow){flowItems=backup.flow;localStorage.setItem('brokerone_flow',JSON.stringify(flowItems));}if(backup.pilott)localStorage.setItem('brokerone_pilott',backup.pilott);if(backup.param)localStorage.setItem('brokerone_param',backup.param);updateFlowBadge();renderFlow();toast('Dados restaurados');} catch(err){toast('Erro ao importar','error');}};reader.readAsText(file);};
  input.click();
}
document.getElementById('flow-overlay').addEventListener('click',function(e){if(e.target===this)closeFlowModal();});

