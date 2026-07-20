// Broker ONE — METAS
// ─────────────────────────────────────

// ═══════════════════════════════════════════
//  METAS MODULE
// ═══════════════════════════════════════════
(function(){
  var KEY='brokerone_metas';
  var metasData=[];
  var editingMetaId=null;
  var MESES=['','Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

  function load(){try{metasData=JSON.parse(localStorage.getItem(KEY)||'[]');}catch(e){metasData=[];}}
  function save(){localStorage.setItem(KEY,JSON.stringify(metasData));}

  window.renderMetas=function(){
    var tbody=document.getElementById('metas-tbody');if(!tbody)return;tbody.innerHTML='';
    var sorted=metasData.slice().sort(function(a,b){var ka=(a.assessor||'')+a.semestre+a.mes;var kb=(b.assessor||'')+b.semestre+b.mes;return ka<kb?-1:1;});
    if(!sorted.length){
      var tr=document.createElement('tr');
      tr.innerHTML='<td colspan="5" style="text-align:center;padding:40px;color:var(--text-muted);">Nenhuma meta cadastrada. Clique em <strong>Nova Meta</strong>.</td>';
      tbody.appendChild(tr);return;
    }
    var assAtual=null;
    sorted.forEach(function(m){
      if((m.assessor||'')!==assAtual){
        assAtual=m.assessor||'';
        var sh=document.createElement('tr');sh.className='group-row';
        sh.innerHTML='<td colspan="5">'+assAtual+'</td>';
        tbody.appendChild(sh);
      }
      var tr=document.createElement('tr');tr.style.cursor='pointer';
      tr.addEventListener('click',function(){openMetaModal(m.id);});
      tr.innerHTML=
        '<td style="color:var(--text-muted);font-size:11px;">'+m.semestre+'</td>'+
        '<td style="font-weight:600;">'+MESES[parseInt(m.mes,10)]+'</td>'+
        '<td class="r" style="font-size:15px;font-weight:700;color:var(--teal-dark);">'+fmtCurrencyFull(m.valor)+'</td>'+
        '<td><button class="btn btn-ghost" style="padding:4px 8px;font-size:11px;" class="edit-meta-btn">Editar</button></td>';
      tbody.appendChild(tr);
    });
  };

  window.openMetaModal=function(id){
    editingMetaId=id||null;var m=id?metasData.find(function(x){return x.id===id;}):null;
    document.getElementById('meta-modal-title').textContent=m?'Editar Meta':'Nova Meta';
    document.getElementById('meta-delete-btn').style.display=m?'inline-flex':'none';

    // Populate assessors from Parametrização
    var paramRaw=localStorage.getItem('brokerone_param');
    var paramList=[];try{paramList=JSON.parse(paramRaw||'[]');}catch(e){}
    var assessores=[...new Set(paramList.map(function(r){return r.assessor;}).filter(Boolean))].sort();
    var sel=document.getElementById('m-assessor');
    sel.innerHTML='<option value="">Selecione...</option>';
    assessores.forEach(function(a){var o=document.createElement('option');o.value=a;o.textContent=a;sel.appendChild(o);});
    var hint=document.getElementById('m-assessor-hint');
    if(assessores.length===0){hint.style.display='block';sel.disabled=true;}
    else{hint.style.display='none';sel.disabled=false;}

    document.getElementById('m-assessor').value=m?(m.assessor||''):'';
    document.getElementById('m-semestre').value=m?(m.semestre||''):'';
    document.getElementById('m-mes').value=m?(m.mes||''):'';
    document.getElementById('m-valor').value=m?(m.valor||''):'';
    document.getElementById('meta-overlay').classList.add('open');
  };
  window.closeMetaModal=function(){document.getElementById('meta-overlay').classList.remove('open');editingMetaId=null;};
  window.saveMeta=function(){
    var assessor=document.getElementById('m-assessor').value;
    var sem=document.getElementById('m-semestre').value;
    var mes=document.getElementById('m-mes').value;
    var val=parseFloat(document.getElementById('m-valor').value)||0;
    if(!assessor){toast('Selecione o assessor','error');return;}
    if(!sem){toast('Selecione o semestre','error');return;}
    if(!mes){toast('Selecione o mês','error');return;}
    if(!val){toast('Informe o valor da meta','error');return;}
    var now=new Date().toISOString();
    var data={assessor:assessor,semestre:sem,mes:mes,valor:val};
    if(editingMetaId){var m=metasData.find(function(x){return x.id===editingMetaId;});if(m)Object.assign(m,data,{updatedAt:now});toast('Meta atualizada');}
    else{data.id=uid();data.createdAt=now;data.updatedAt=now;metasData.push(data);toast('Meta cadastrada');}
    save();closeMetaModal();renderMetas();
  };
  window.deleteMeta=function(){if(!editingMetaId)return;if(!confirm('Excluir esta meta?'))return;metasData=metasData.filter(function(x){return x.id!==editingMetaId;});save();closeMetaModal();renderMetas();toast('Meta excluída');};

  document.getElementById('meta-overlay').addEventListener('click',function(e){if(e.target===this)closeMetaModal();});
  load();
})();

