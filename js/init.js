// Broker ONE — INIT
// ─────────────────────────────────────────────────────────

try {
  currentUser = JSON.parse(sessionStorage.getItem('bo_user') || 'null');
} catch(e) {}

function initApp() {
  applySidebarUser(currentUser);
  goTo('flow'); // page padrão ao entrar
}

if (authToken && currentUser) {
  document.getElementById('login-overlay').style.display = 'none';
  initApp();
}
// Se não há sessão, o login-overlay já está visível por padrão
