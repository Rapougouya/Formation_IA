(function () {
  const ADMIN_PASSWORD = 'FormationIA2025';
  const STORAGE_KEY = 'formationAdminAuth';

  function isAuthenticated() {
    return localStorage.getItem(STORAGE_KEY) === '1';
  }

  function createModal() {
    if (document.getElementById('admin-auth-modal')) {
      return document.getElementById('admin-auth-modal');
    }

    const modal = document.createElement('div');
    modal.id = 'admin-auth-modal';
    modal.style.position = 'fixed';
    modal.style.inset = '0';
    modal.style.background = 'rgba(15, 23, 42, 0.72)';
    modal.style.display = 'none';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    modal.style.zIndex = '9999';

    const card = document.createElement('div');
    card.style.width = 'min(92vw, 420px)';
    card.style.background = '#fff';
    card.style.borderRadius = '16px';
    card.style.padding = '24px';
    card.style.boxShadow = '0 20px 60px rgba(0,0,0,0.25)';

    card.innerHTML = `
      <h2 style="margin:0 0 12px; font-size:22px; color:#1f2937;">Accès admin</h2>
      <p style="margin:0 0 16px; color:#4b5563; font-size:14px;">Saisissez le mot de passe pour accéder au tableau de bord.</p>
      <input id="admin-password-input" type="password" placeholder="Mot de passe" style="width:100%; padding:12px 14px; border:1px solid #d1d5db; border-radius:10px; font-size:14px; margin-bottom:12px;" />
      <div style="display:flex; justify-content:flex-end; gap:8px;">
        <button type="button" id="admin-cancel-btn" style="padding:10px 14px; border:none; background:#e5e7eb; color:#111827; border-radius:10px; cursor:pointer; font-weight:600;">Annuler</button>
        <button type="button" id="admin-submit-btn" style="padding:10px 14px; border:none; background:#4f46e5; color:#fff; border-radius:10px; cursor:pointer; font-weight:600;">Valider</button>
      </div>
    `;

    modal.appendChild(card);
    document.body.appendChild(modal);
    return modal;
  }

  function showAuthModal() {
    const modal = createModal();
    const input = document.getElementById('admin-password-input');
    const cancelBtn = document.getElementById('admin-cancel-btn');
    const submitBtn = document.getElementById('admin-submit-btn');

    modal.style.display = 'flex';
    input.value = '';
    input.focus();

    const closeModal = () => {
      modal.style.display = 'none';
    };

    const submit = () => {
      const value = input.value.trim();
      if (value === ADMIN_PASSWORD) {
        localStorage.setItem(STORAGE_KEY, '1');
        closeModal();
        window.location.reload();
        return;
      }

      alert('Mot de passe incorrect.');
      input.value = '';
      input.focus();
    };

    submitBtn.onclick = submit;
    cancelBtn.onclick = () => {
      closeModal();
      window.location.href = 'index.html';
    };
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') submit();
    });
  }

  function authenticate() {
    if (isAuthenticated()) {
      return true;
    }

    showAuthModal();
    return false;
  }

  window.adminAuth = {
    requestAccess() {
      if (isAuthenticated()) {
        window.location.href = 'admin.html';
        return false;
      }

      showAuthModal();
      return false;
    },

    requireAccess() {
      if (isAuthenticated()) {
        return true;
      }

      showAuthModal();
      return false;
    },

    logout() {
      localStorage.removeItem(STORAGE_KEY);
      window.location.href = 'index.html';
    }
  };
})();
