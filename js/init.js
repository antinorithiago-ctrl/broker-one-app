// ═══════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════
// ═══════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════
setDates();
try{currentUser=JSON.parse(sessionStorage.getItem('bo_user')||'null');}catch(e){}
if(authToken){
  document.getElementById('login-overlay').style.display='none';
  applySidebarUser(currentUser);
  initApp();
}else{
  loadFlow();renderFlow();updateFlowBadge();
}

