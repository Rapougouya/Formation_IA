// ⚙️ CONFIGURATION
const CONFIG = {
  numeroOrange: "+226 07 99 99 67",
  storageKey: 'inscriptionsFormationIA',
  supabaseUrl: (window.APP_CONFIG && window.APP_CONFIG.supabaseUrl) || 'https://YOUR_PROJECT_REF.supabase.co',
  supabaseKey: (window.APP_CONFIG && window.APP_CONFIG.supabaseKey) || 'YOUR_SUPABASE_ANON_KEY'
};

document.getElementById('numOrange').textContent = CONFIG.numeroOrange;

const form = document.getElementById('inscriptionForm');
const confirmation = document.getElementById('confirmation');

function isSupabaseConfigured() {
  return CONFIG.supabaseUrl && CONFIG.supabaseUrl.includes('supabase.co') && CONFIG.supabaseKey && !CONFIG.supabaseKey.includes('YOUR_');
}

async function getNextNumeroFromSupabase() {
  if (!isSupabaseConfigured() || !window.supabase) {
    throw new Error('La configuration Supabase est absente ou incomplète.');
  }

  const client = window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey);
  const { data, error } = await client
    .from('inscriptions')
    .select('numero')
    .order('created_at', { ascending: true });

  if (error) throw error;

  const maxNumero = (data || []).reduce((max, item) => {
    const numero = Number(String(item.numero || '').replace(/\D/g, ''));
    return Number.isFinite(numero) && numero > max ? numero : max;
  }, 0);

  return String(maxNumero + 1).padStart(3, '0');
}

function saveToSupabase(data) {
  if (!isSupabaseConfigured() || !window.supabase) {
    throw new Error('Supabase non configuré');
  }

  const client = window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey);
  return client.from('inscriptions').insert([{ ...data }]);
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

  const numero = await getNextNumeroFromSupabase().catch(() => null);
  if (!numero) {
    alert('Le système de données n’est pas correctement configuré. Veuillez réessayer plus tard.');
    return;
  }

  const data = {
    numero,
    nom: document.getElementById('nom').value.trim(),
    prenom: document.getElementById('prenom').value.trim(),
    num_paiement: document.getElementById('numPaiement').value.trim(),
    date_inscription: new Date().toLocaleString('fr-FR'),
    statut: 'En attente'
  };

  let valide = true;
  valide &= validerChamp('nom', data.nom.length >= 2, 'Nom trop court');
  valide &= validerChamp('prenom', data.prenom.length >= 2, 'Prénom trop court');
  valide &= validerChamp('numPaiement',
    data.num_paiement.replace(/\D/g, '').length >= 8,
    'Numéro de paiement invalide');

  if (!valide) return;

  const btn = form.querySelector('.btn-submit');
  btn.disabled = true;
  btn.textContent = '⏳ Envoi en cours...';

  try {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase non configuré');
    }

    const { error } = await saveToSupabase({
      numero: data.numero,
      nom: data.nom,
      prenom: data.prenom,
      num_paiement: data.num_paiement,
      date_inscription: data.date_inscription,
      statut: data.statut
    });

    if (error) throw error;
  } catch (error) {
    console.error('Erreur d’inscription :', error);
    alert('L’inscription n’a pas pu être enregistrée. Vérifiez la configuration Supabase et réessayez.');
    btn.disabled = false;
    btn.textContent = '✅ Envoyer mon inscription';
    return;
  }

  document.getElementById('confNomComplet').textContent = `${data.prenom} ${data.nom}`;
  document.getElementById('confNumero').textContent = data.numero;
  document.getElementById('confNomComplet2').textContent = `${data.prenom} ${data.nom}`;
  document.getElementById('confNumPaiement').textContent = data.num_paiement;

  form.classList.add('hidden');
  confirmation.classList.remove('hidden');
  btn.disabled = false;
  btn.textContent = '✅ Envoyer mon inscription';
});