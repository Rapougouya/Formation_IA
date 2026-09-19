// ⚙️ CONFIGURATION
const CONFIG = {
  googleScriptURL: "https://script.google.com/macros/s/1vugqSMU5SHxvm14SVO3GdYftXCUkB0t2pAeSz8wyVwgFxevKADE0ZHBc/exec",
  numeroOrange: "+226 70 00 00 00",
  storageKey: 'inscriptionsFormationIA'
};

document.getElementById('numOrange').textContent = CONFIG.numeroOrange;

const form = document.getElementById('inscriptionForm');
const confirmation = document.getElementById('confirmation');

function getInscriptions() {
  try {
    const saved = JSON.parse(localStorage.getItem(CONFIG.storageKey) || '[]');
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function sauvegarderInscription(data) {
  const inscriptions = getInscriptions();
  inscriptions.push(data);
  localStorage.setItem(CONFIG.storageKey, JSON.stringify(inscriptions));
}

// Copier le numéro Orange Money
function copierNumero(event) {
  navigator.clipboard.writeText(CONFIG.numeroOrange.replace(/\s/g, ''));
  const btn = event.target;
  const ancien = btn.textContent;
  btn.textContent = '✓ Copié !';
  setTimeout(() => btn.textContent = ancien, 2000);
}

// Validation d'un champ
function validerChamp(id, condition, message) {
  const input = document.getElementById(id);
  const erreur = document.getElementById('err-' + id);
  if (!condition) {
    input.classList.add('error');
    if (erreur) erreur.textContent = message;
    return false;
  }
  input.classList.remove('error');
  if (erreur) erreur.textContent = '';
  return true;
}

// Soumission
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const data = {
    numero: document.getElementById('numero').value.trim(),
    nom: document.getElementById('nom').value.trim(),
    prenom: document.getElementById('prenom').value.trim(),
    numPaiement: document.getElementById('numPaiement').value.trim(),
    dateInscription: new Date().toLocaleString('fr-FR'),
    statut: 'En attente'
  };

  // Validation
  let valide = true;
  valide &= validerChamp('numero', data.numero.length >= 1, 'Numéro requis');
  valide &= validerChamp('nom', data.nom.length >= 2, 'Nom trop court');
  valide &= validerChamp('prenom', data.prenom.length >= 2, 'Prénom trop court');
  valide &= validerChamp('numPaiement',
    data.numPaiement.replace(/\D/g, '').length >= 8,
    'Numéro de paiement invalide');

  if (!valide) return;

  const btn = form.querySelector('.btn-submit');
  btn.disabled = true;
  btn.textContent = '⏳ Envoi en cours...';

  try {
    await fetch(CONFIG.googleScriptURL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  } catch (error) {
    console.warn('Google Script indisponible, stockage local utilisé.', error);
  }

  sauvegarderInscription(data);

  document.getElementById('confNomComplet').textContent = `${data.prenom} ${data.nom}`;
  document.getElementById('confNumero').textContent = data.numero;
  document.getElementById('confNomComplet2').textContent = `${data.prenom} ${data.nom}`;
  document.getElementById('confNumPaiement').textContent = data.numPaiement;

  form.classList.add('hidden');
  confirmation.classList.remove('hidden');
  btn.disabled = false;
  btn.textContent = '✅ Envoyer mon inscription';
});