// Broker ONE — PARAM
// ─────────────────────────────────────

// ═══════════════════════════════════════════
//  PARAMETRIZAÇÃO MODULE
// ═══════════════════════════════════════════
(function(){
  var PARAM_KEY='brokerone_param';
  var paramData=[];
  var editingParamId=null;

  function loadParam(){try{paramData=JSON.parse(localStorage.getItem(PARAM_KEY)||'[]');}catch(e){paramData=[];}}
  // Expõe dados globalmente para uso em outros módulos (ex: select de assessores no Flow)
  window.getParamData=function(){loadParam();return paramData;};
  function saveParam2(){localStorage.setItem(PARAM_KEY,JSON.stringify(paramData));}
  function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}

  // ── Seleção em lote ─────────────────────────────────────────────────────
  var paramSelecionados=new Set();

  function paramAtualizarBatchBar(){
    var bar=document.getElementById('param-batch-bar');
    var cnt=document.getElementById('param-sel-count');
    if(bar)bar.style.display=paramSelecionados.size>0?'flex':'none';
    if(cnt)cnt.textContent=paramSelecionados.size+' selecionado'+(paramSelecionados.size!==1?'s':'');
  }

  window.paramToggleItem=function(chk){
    var id=chk.dataset.id;
    if(chk.checked)paramSelecionados.add(id);
    else paramSelecionados.delete(id);
    paramAtualizarBatchBar();
    var tr=chk.closest('tr');
    if(tr)tr.style.background=chk.checked?'rgba(224,90,58,.07)':'';
    // Atualizar chk-all
    var all=document.getElementById('param-chk-all');
    var allChks=document.querySelectorAll('.param-chk');
    if(all&&allChks.length)all.checked=[...allChks].every(function(c){return c.checked;});
  };

  window.paramToggleTodos=function(checked){
    document.querySelectorAll('.param-chk').forEach(function(c){
      var id=c.dataset.id;
      c.checked=checked;
      if(checked)paramSelecionados.add(id);
      else paramSelecionados.delete(id);
      var tr=c.closest('tr');
      if(tr)tr.style.background=checked?'rgba(224,90,58,.07)':'';
    });
    paramAtualizarBatchBar();
  };

  window.paramDeselecionarTudo=function(){
    paramSelecionados.clear();
    document.querySelectorAll('.param-chk').forEach(function(c){c.checked=false;});
    var all=document.getElementById('param-chk-all');
    if(all)all.checked=false;
    document.querySelectorAll('#param-tbody tr').forEach(function(tr){tr.style.background='';});
    paramAtualizarBatchBar();
  };

  window.paramExcluir=function(id){
    if(!confirm('Excluir este registro?'))return;
    paramData=paramData.filter(function(r){return r.id!==id;});
    paramSelecionados.delete(id);
    saveParam2();renderParam();paramAtualizarBatchBar();
    toast('Registro excluído');
  };

  window.paramExcluirLote=function(){
    if(!paramSelecionados.size)return;
    if(!confirm('Excluir '+paramSelecionados.size+' registro(s) selecionado(s)?'))return;
    var ids=[...paramSelecionados];
    paramData=paramData.filter(function(r){return!ids.includes(r.id);});
    paramSelecionados.clear();
    saveParam2();renderParam();paramAtualizarBatchBar();
    toast(ids.length+' registro(s) excluído(s)');
  };

  window.paramEditarLote=function(){
    if(!paramSelecionados.size)return;
    // Abre modal de edição em lote
    document.getElementById('param-batch-modal').classList.add('open');
    document.getElementById('pbm-field').value='';
    document.getElementById('pbm-value').value='';
    document.getElementById('pbm-count').textContent=paramSelecionados.size+' registro(s)';
  };

  window.paramAplicarEdicaoLote=function(){
    var field=document.getElementById('pbm-field').value;
    var value=document.getElementById('pbm-value').value.trim();
    if(!field||!value){toast('Selecione um campo e informe o valor','error');return;}
    var ids=[...paramSelecionados];
    paramData=paramData.map(function(r){
      if(!ids.includes(r.id))return r;
      var updated=Object.assign({},r);
      updated[field]=value;
      return updated;
    });
    saveParam2();
    document.getElementById('param-batch-modal').classList.remove('open');
    paramDeselecionarTudo();
    renderParam();
    toast(ids.length+' registro(s) atualizados');
  };

  function populateParamFilters(){
    var fields={praca:'pf-praca',lider:'pf-lider',assessor:'pf-assessor',advisor:'pf-advisor',broker:'pf-broker'};
    var labels={praca:'Todas as Praças',lider:'Todos os Líderes',assessor:'Todos os Assessores',advisor:'Todos os Advisors',broker:'Todos os Brokers'};
    Object.keys(fields).forEach(function(key){
      var sel=document.getElementById(fields[key]);
      if(!sel) return;
      var current=sel.value;
      var vals=[...new Set(paramData.map(function(r){return r[key]||'';}).filter(Boolean))].sort();
      sel.innerHTML='<option value="">'+labels[key]+'</option>';
      vals.forEach(function(v){var o=document.createElement('option');o.value=v;o.textContent=v;sel.appendChild(o);});
      if(vals.includes(current)) sel.value=current;
    });
  }

  function getParamFilters(){
    return {
      praca:   (document.getElementById('pf-praca')   &&document.getElementById('pf-praca').value)   ||'',
      lider:   (document.getElementById('pf-lider')   &&document.getElementById('pf-lider').value)   ||'',
      assessor:(document.getElementById('pf-assessor')&&document.getElementById('pf-assessor').value)||'',
      advisor: (document.getElementById('pf-advisor') &&document.getElementById('pf-advisor').value) ||'',
      broker:  (document.getElementById('pf-broker')  &&document.getElementById('pf-broker').value)  ||''
    };
  }

  window.clearParamFilters=function(){
    ['pf-praca','pf-lider','pf-assessor','pf-advisor','pf-broker'].forEach(function(id){
      var el=document.getElementById(id);if(el)el.value='';
    });
    var s=document.getElementById('param-search');if(s)s.value='';
    renderParam();
  };

  window.renderParam=function(){
    loadParam();populateParamFilters();
    var search=(document.getElementById('param-search').value||'').toLowerCase();
    var f=getParamFilters();
    var hasFilter=search||f.praca||f.lider||f.assessor||f.advisor||f.broker;
    var clearBtn=document.getElementById('param-clear-btn');
    if(clearBtn)clearBtn.style.color=hasFilter?'var(--coral)':'';
    var rows=paramData.filter(function(r){
      if(f.praca    && r.praca    !==f.praca)   return false;
      if(f.lider    && r.lider    !==f.lider)   return false;
      if(f.assessor && r.assessor !==f.assessor)return false;
      if(f.advisor  && r.advisor  !==f.advisor) return false;
      if(f.broker   && r.broker   !==f.broker)  return false;
      if(search){var h=(r.praca+r.lider+(r.codAai||'')+r.assessor+(r.codAdvisor||'')+r.advisor+(r.codBroker||'')+r.broker+(r.obs||'')).toLowerCase();if(!h.includes(search))return false;}
      return true;
    });
    var count=document.getElementById('param-count');
    if(count)count.textContent=rows.length+' registro'+(rows.length!==1?'s':'');
    var tbody=document.getElementById('param-tbody');
    if(!tbody)return;
    tbody.innerHTML='';
    if(!rows.length){
      var tr=document.createElement('tr');
      tr.innerHTML='<td colspan="11" style="text-align:center;padding:40px;color:var(--text-3);">Nenhum registro.</td>';
      tbody.appendChild(tr);return;
    }
    rows.forEach(function(r){
      var tr=document.createElement('tr');
      var sel=paramSelecionados.has(r.id);
      if(sel)tr.style.background='rgba(224,90,58,.08)';
      // Checkbox
      var tdChk=document.createElement('td');
      tdChk.style.cssText='width:36px;padding:6px 10px;';
      tdChk.onclick=function(e){e.stopPropagation();};
      var chk=document.createElement('input');
      chk.type='checkbox';chk.className='param-chk';chk.dataset.id=r.id;chk.checked=sel;
      chk.style.cssText='width:14px;height:14px;accent-color:var(--coral);cursor:pointer;';
      chk.addEventListener('change',function(){window.paramToggleItem(chk);});
      tdChk.appendChild(chk);tr.appendChild(tdChk);
      // Dados
      function td(val,style){var t=document.createElement('td');t.style.cssText=style||'font-size:11px;';t.textContent=val||'';return t;}
      tr.appendChild(td(r.praca,'font-weight:600;font-size:11px;'));
      tr.appendChild(td(r.lider,'font-size:11px;'));
      var tdAai=document.createElement('td');var spAai=document.createElement('span');spAai.className='client-code';spAai.textContent=r.codAai||'';tdAai.appendChild(spAai);tr.appendChild(tdAai);
      tr.appendChild(td(r.assessor,'font-size:11px;'));
      var tdAdv=document.createElement('td');var spAdv=document.createElement('span');spAdv.className='client-code';spAdv.textContent=r.codAdvisor||'';tdAdv.appendChild(spAdv);tr.appendChild(tdAdv);
      tr.appendChild(td(r.advisor,'font-size:11px;'));
      var tdBrk=document.createElement('td');var spBrk=document.createElement('span');spBrk.className='client-code';spBrk.textContent=r.codBroker||'';tdBrk.appendChild(spBrk);tr.appendChild(tdBrk);
      var tdB=document.createElement('td');tdB.style.cssText='font-weight:600;color:var(--coral);font-size:11px;';tdB.textContent=r.broker||'';tr.appendChild(tdB);
      tr.appendChild(td(r.obs||'—','color:var(--text-3);font-size:10px;'));
      // Ações
      var tdAct=document.createElement('td');tdAct.style.cssText='white-space:nowrap;text-align:right;';
      var btnEdit=document.createElement('button');
      btnEdit.className='btn btn-ghost';btnEdit.style.cssText='padding:3px 8px;font-size:11px;margin-right:4px;';
      btnEdit.textContent='Editar';
      btnEdit.addEventListener('click',function(e){e.stopPropagation();window.openParamModal(r.id);});
      var btnDel=document.createElement('button');
      btnDel.style.cssText='background:none;border:1px solid rgba(239,68,68,.35);color:var(--red);border-radius:6px;padding:3px 7px;cursor:pointer;font-size:11px;';
      btnDel.textContent='✕';
      btnDel.addEventListener('click',function(e){e.stopPropagation();window.paramExcluir(r.id);});
      tdAct.appendChild(btnEdit);tdAct.appendChild(btnDel);tr.appendChild(tdAct);
      tbody.appendChild(tr);
    });
    var chkAll=document.getElementById('param-chk-all');
    if(chkAll)chkAll.checked=rows.length>0&&rows.every(function(r){return paramSelecionados.has(r.id);});
  };
  window.openParamModal=function(id){
    editingParamId=id||null;var r=id?paramData.find(function(x){return x.id===id;}):null;
    document.getElementById('param-modal-title').textContent=r?'Editar Registro':'Novo Registro';
    document.getElementById('param-delete-btn').style.display=r?'inline-flex':'none';
    document.getElementById('p-praca').value=r?(r.praca||''):'';
    document.getElementById('p-lider').value=r?(r.lider||''):'';
    document.getElementById('p-cod-aai').value=r?(r.codAai||''):'';
    document.getElementById('p-assessor').value=r?(r.assessor||''):'';
    document.getElementById('p-cod-advisor').value=r?(r.codAdvisor||''):'';
    document.getElementById('p-advisor').value=r?(r.advisor||''):'';
    document.getElementById('p-cod-broker').value=r?(r.codBroker||''):'';
    document.getElementById('p-broker').value=r?(r.broker||''):'';
    document.getElementById('p-obs').value=r?(r.obs||''):'';
    document.getElementById('param-overlay').classList.add('open');
  };
  window.closeParamModal=function(){document.getElementById('param-overlay').classList.remove('open');editingParamId=null;};
  window.saveParam=function(){
    var assessor=document.getElementById('p-assessor').value.trim().toUpperCase();
    if(!assessor){toast('Informe o assessor','error');return;}
    var now=new Date().toISOString();
    var data={praca:document.getElementById('p-praca').value.trim().toUpperCase(),lider:document.getElementById('p-lider').value.trim().toUpperCase(),codAai:document.getElementById('p-cod-aai').value.trim(),assessor:assessor,codAdvisor:document.getElementById('p-cod-advisor').value.trim(),advisor:document.getElementById('p-advisor').value.trim().toUpperCase(),codBroker:document.getElementById('p-cod-broker').value.trim(),broker:document.getElementById('p-broker').value.trim().toUpperCase(),obs:document.getElementById('p-obs').value.trim()};
    if(editingParamId){var r=paramData.find(function(x){return x.id===editingParamId;});if(r)Object.assign(r,data,{updatedAt:now});toast('Registro atualizado');}
    else{data.id=uid();data.createdAt=now;data.updatedAt=now;paramData.push(data);toast('Registro adicionado');}
    saveParam2();closeParamModal();renderParam();
  };
  window.deleteParam=function(){if(!editingParamId)return;if(!confirm('Excluir?'))return;paramData=paramData.filter(function(x){return x.id!==editingParamId;});saveParam2();closeParamModal();renderParam();toast('Excluído');};
  window.exportParamCSV=function(){
    if(!paramData.length){toast('Nenhum dado','error');return;}
    var h=['Praça','Líder','Cod AAI','Assessor','Cod Advisor','Advisor','Cod Broker','Broker','OBS'];
    var rows=paramData.map(function(r){return[r.praca,r.lider,r.codAai,r.assessor,r.codAdvisor,r.advisor,r.codBroker,r.broker,r.obs||''];});
    var csv=[h].concat(rows).map(function(r){return r.map(function(v){return '"'+(v||'').replace(/"/g,'""')+'"';}).join(';');}).join('\n');
    var blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8;'});
    var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='parametrizacao-squad.csv';a.click();toast('CSV exportado');
  };
  window.importParamCSV=function(){
    if(!confirm('⚠️ Importar CSV irá SUBSTITUIR todos os registros atuais de Parametrização. Deseja continuar?'))return;
    var input=document.createElement('input');input.type='file';input.accept='.csv,.txt';
    input.onchange=function(e){
      var file=e.target.files[0];if(!file)return;
      var reader=new FileReader();
      reader.onload=function(ev){
        try{
          var raw=ev.target.result;
          var sep=raw.indexOf(';')>-1?';':',';
          var lines=raw.replace(/\r\n/g,'\n').replace(/\r/g,'\n').split('\n').filter(function(l){return l.trim();});
          var newData=[];var now=new Date().toISOString();
          lines.slice(1).forEach(function(line){
            var vals=line.split(sep).map(function(v){return v.replace(/^"|"$/g,'').trim();});
            if(!vals[0]&&!vals[3])return;
            newData.push({id:uid(),praca:vals[0]||'',lider:vals[1]||'',codAai:vals[2]||'',assessor:vals[3]||'',codAdvisor:vals[4]||'',advisor:vals[5]||'',codBroker:vals[6]||'',broker:vals[7]||'',obs:vals[8]||'',createdAt:now});
          });
          paramData=newData;
          paramSelecionados.clear();
          saveParam2();populateParamFilters();window.renderParam();paramAtualizarBatchBar();
          toast(newData.length+' registros importados — dados anteriores substituídos');
        }catch(err){console.error(err);toast('Erro ao importar CSV','error');}
      };
      reader.readAsText(file,'UTF-8');
    };
    input.click();
  };
  window.exportParamCSV=function(){
    if(!paramData.length){toast('Nenhum dado','error');return;}
    var h=['Praça','Líder','Cod AAI','Assessor','Cod Advisor','Advisor','Cod Broker','Broker','OBS'];
    var rows=paramData.map(function(r){return[r.praca,r.lider,r.codAai,r.assessor,r.codAdvisor,r.advisor,r.codBroker,r.broker,r.obs||''];});
    var csv=[h].concat(rows).map(function(r){return r.map(function(v){return '"'+(v||'').replace(/"/g,'""')+'"';}).join(';');}).join('\n');
    var blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8;'});
    var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='parametrizacao-squad.csv';a.click();toast('CSV exportado');
  };
window.exportParamCSV=function(){
    if(!paramData.length){toast('Nenhum dado','error');return;}
    var h=['Praça','Líder','Cod AAI','Assessor','Cod Advisor','Advisor','Cod Broker','Broker','OBS'];
    var rows=paramData.map(function(r){return[r.praca,r.lider,r.codAai,r.assessor,r.codAdvisor,r.advisor,r.codBroker,r.broker,r.obs||''];});
    var csv=[h].concat(rows).map(function(r){return r.map(function(v){return '"'+(v||'').replace(/"/g,'""')+'"';}).join(';');}).join('\n');
    var blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8;'});
    var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='parametrizacao-squad.csv';a.click();toast('CSV exportado');
  };
  window.importParamCSV=function(){
    var input=document.createElement('input');input.type='file';input.accept='.csv';
    input.onchange=function(e){
      var file=e.target.files[0];if(!file)return;
      var reader=new FileReader();
      reader.onload=function(ev){
        try{
          var lines=ev.target.result.replace(/\r/g,'').split('\n').filter(function(l){return l.trim();});
          var imported=0;var now=new Date().toISOString();
          lines.slice(1).forEach(function(line){
            var vals=line.split(';').map(function(v){return v.replace(/^"|"$/g,'').trim();});
            if(!vals[3])return;
            paramData.push({id:uid(),praca:vals[0]||'',lider:vals[1]||'',codAai:vals[2]||'',assessor:vals[3]||'',codAdvisor:vals[4]||'',advisor:vals[5]||'',codBroker:vals[6]||'',broker:vals[7]||'',obs:vals[8]||'',createdAt:now,updatedAt:now});
            imported++;
          });
          saveParam2();renderParam();toast(imported+' registros importados');
        }catch(err){toast('Erro ao importar','error');}
      };
      reader.readAsText(file,'UTF-8');
    };
    input.click();
  };
  document.getElementById('param-overlay').addEventListener('click',function(e){if(e.target===this)closeParamModal();});
  loadParam();
})();

