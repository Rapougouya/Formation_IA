(function () {
  const ADMIN_PASSWORD = 'FormationIA2025';
  const STORAGE_KEY = 'formationAdminAuth';

  function isAuthenticated() {
    return sessionStorage.getItem(STORAGE_KEY) === '1';
  }

  function authenticate() {
    const entered = window.prompt('Mot de passe admin :', '');
    if (entered === null) {
      return false;
    }

    if (entered.trim() === ADMIN_PASSWORD) {
      sessionStorage.setItem(STORAGE_KEY, '1');
      return true;
    }

    alert('Mot de passe incorrect.');
    return false;
  }

  window.adminAuth = {
    requestAccess() {
      if (isAuthenticated()) {
        window.location.href = 'admin.html';
        return false;
      }

      if (authenticate()) {
        window.location.href = 'admin.html';
      }

      return false;
    },

    requireAccess() {
      if (isAuthenticated()) {
        return true;
      }

      const allowed = authenticate();
      if (!allowed) {
        window.location.href = 'index.html';
        return false;
      }

      return true;
    },

    logout() {
      sessionStorage.removeItem(STORAGE_KEY);
      window.location.href = 'index.html';
    }
  };
})();
