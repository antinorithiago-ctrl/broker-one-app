// Broker ONE — INIT

try {
  currentUser = JSON.parse(sessionStorage.getItem('bo_user') || 'null');
} catch(e) {}

function initApp() {
  applySidebarUser(currentUser);
  goTo('home');
}

if (authToken && currentUser) {
  document.getElementById('login-overlay').style.display = 'none';
  initApp();
}
