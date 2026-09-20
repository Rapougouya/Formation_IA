const CONFIG = {
  storageKey: 'inscriptionsFormationIA',
  supabaseUrl: (window.APP_CONFIG && window.APP_CONFIG.supabaseUrl) || 'https://YOUR_PROJECT_REF.supabase.co',
  supabaseKey: (window.APP_CONFIG && window.APP_CONFIG.supabaseKey) || 'YOUR_SUPABASE_ANON_KEY'
};

let inscriptionsActuelles = [];

function isSupabaseConfigured() {
  return CONFIG.supabaseUrl && CONFIG.supabaseUrl.includes('supabase.co') && CONFIG.supabaseKey && !CONFIG.supabaseKey.includes('YOUR_');
}

function normaliserInscription(item, index = 0) {
  const inscription = { ...(item || {}) };
  inscription.numero = inscription.numero ?? String(index + 1).padStart(3, '0');
  inscription.nom = inscription.nom ?? '';
  inscription.prenom = inscription.prenom ?? '';
  inscription.statut = inscription.statut ?? 'En attente';
  inscription.date_inscription = inscription.date_inscription ?? inscription.dateInscription ?? '-';
  inscription.dateInscription = inscription.date_inscription;
  inscription.num_paiement = inscription.num_paiement ?? inscription.numPaiement ?? '';
  inscription.numPaiement = inscription.num_paiement;
  return inscription;
}

function reindexerInscriptions(data) {
  return Array.isArray(data)
    ? data.map((item, index) => normaliserInscription({ ...item, numero: String(index + 1).padStart(3, '0') }, index))
    : [];
}

async function fetchFromSupabase() {
  if (!isSupabaseConfigured() || !window.supabase) {
    throw new Error('Supabase non configuré');
  }

  const client = window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey);
  const { data, error } = await client.from('inscriptions').select('*').order('created_at', { ascending: true });
  if (error) throw error;
  return reindexerInscriptions(data || []);
}

async function chargerInscriptions() {
  document.getElementById('loading').style.display = 'block';
  document.getElementById('tableInscriptions').style.display = 'none';

  try {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase non configuré');
    }

    inscriptionsActuelles = await fetchFromSupabase();
  } catch (error) {
    console.error('Impossible de charger les inscriptions depuis Supabase.', error);
    inscriptionsActuelles = [];
    document.getElementById('tbody').innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center; color:#b91c1c; padding:24px;">
          Impossible de charger les inscriptions. Vérifiez la configuration Supabase.
        </td>
      </tr>
    `;
    document.getElementById('loading').style.display = 'none';
    document.getElementById('tableInscriptions').style.display = 'table';
    return;
  }

  afficherTableau(inscriptionsActuelles);
  majStats(inscriptionsActuelles);

  document.getElementById('loading').style.display = 'none';
  document.getElementById('tableInscriptions').style.display = 'table';
}

function valeurTexte(inscrit, cle, fallback = '-') {
  return inscrit?.[cle] ?? inscrit?.[cle.replace(/_([a-z])/g, (_, c) => c.toUpperCase())] ?? fallback;
}

function afficherTableau(data) {
  const tbody = document.getElementById('tbody');
  tbody.innerHTML = '';

  data.forEach((inscrit, index) => {
    const tr = document.createElement('tr');
    const statutClass = inscrit.statut === 'Validé' ? 'badge-valid'
                       : inscrit.statut === 'Rejeté' ? 'badge-reject'
                       : 'badge-pending';
    const dateValue = valeurTexte(inscrit, 'date_inscription', valeurTexte(inscrit, 'dateInscription'));
    const numeroPaiement = valeurTexte(inscrit, 'num_paiement', valeurTexte(inscrit, 'numPaiement'));

    tr.innerHTML = `
      <td>${dateValue}</td>
      <td><strong>${inscrit.numero || String(index + 1).padStart(3, '0')}</strong></td>
      <td><strong>${inscrit.nom || '-'}</strong></td>
      <td>${inscrit.prenom || '-'}</td>
      <td><strong style="color:var(--orange)">${numeroPaiement}</strong></td>
      <td><span class="badge ${statutClass}">${inscrit.statut}</span></td>
      <td>
        ${inscrit.statut === 'En attente' ? `
          <button class="btn-valid" onclick="changerStatut(${index}, 'Validé')">✓ Valider</button>
          <button class="btn-reject" onclick="changerStatut(${index}, 'Rejeté')">✗ Rejeter</button>
        ` : '-'}
        <button class="btn-reject" onclick="supprimerInscription(${index})">🗑 Supprimer</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function majStats(data) {
  document.getElementById('statTotal').textContent = data.length;
  document.getElementById('statAttente').textContent = data.filter(d => d.statut === 'En attente').length;
  document.getElementById('statValides').textContent = data.filter(d => d.statut === 'Validé').length;
}

async function changerStatut(index, nouveauStatut) {
  if (!confirm(`Confirmer le passage au statut "${nouveauStatut}" ?`)) return;

  const item = inscriptionsActuelles[index];
  if (!item || !item.id) {
    alert('Impossible de mettre à jour cet inscrit : identifiant manquant.');
    return;
  }

  try {
    if (!isSupabaseConfigured() || !window.supabase) {
      throw new Error('Supabase non configuré');
    }

    const client = window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey);
    const { error } = await client.from('inscriptions').update({ statut: nouveauStatut }).eq('id', item.id);
    if (error) throw error;

    inscriptionsActuelles = inscriptionsActuelles.map((inscrit, i) =>
      i === index ? { ...inscrit, statut: nouveauStatut } : inscrit
    );
    afficherTableau(inscriptionsActuelles);
    majStats(inscriptionsActuelles);
  } catch (error) {
    console.error('Mise à jour Supabase impossible.', error);
    alert('La modification n’a pas été enregistrée. Vérifiez la configuration Supabase.');
  }
}

async function supprimerInscription(index) {
  if (!confirm('Supprimer cet inscrit ?')) return;

  const item = inscriptionsActuelles[index];
  if (!item) return;

  try {
    if (!isSupabaseConfigured() || !window.supabase) {
      throw new Error('Supabase non configuré');
    }

    const client = window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey);
    const { error } = await client.from('inscriptions').delete().eq('id', item.id);
    if (error) throw error;

    inscriptionsActuelles = inscriptionsActuelles.filter((_, i) => i !== index);
    inscriptionsActuelles = reindexerInscriptions(inscriptionsActuelles);
    afficherTableau(inscriptionsActuelles);
    majStats(inscriptionsActuelles);
  } catch (error) {
    console.error('Suppression Supabase impossible.', error);
    alert('La suppression n’a pas été enregistrée. Vérifiez la configuration Supabase.');
  }
}

async function viderListe() {
  if (!confirm('Tout supprimer ? Cette action effacera toutes les inscriptions.')) return;

  try {
    if (!isSupabaseConfigured() || !window.supabase) {
      throw new Error('Supabase non configuré');
    }

    const client = window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey);
    const { error } = await client.from('inscriptions').delete().neq('id', 0);
    if (error) throw error;

    inscriptionsActuelles = [];
    afficherTableau(inscriptionsActuelles);
    majStats(inscriptionsActuelles);
  } catch (error) {
    console.error('Vidage Supabase impossible.', error);
    alert('Le vidage n’a pas été effectué. Vérifiez la configuration Supabase.');
  }
}

function exporterExcel() {
  const data = inscriptionsActuelles;
  if (!Array.isArray(data) || data.length === 0) {
    alert('Aucune inscription à exporter.');
    return;
  }

  const rows = data.map((item) => ({
    'N°': item.numero || '-',
    'Nom': item.nom || '-',
    'Prénom': item.prenom || '-',
    'Numéro de paiement': item.num_paiement || item.numPaiement || '-',
    'Date': item.date_inscription || item.dateInscription || '-',
    'Statut': item.statut || 'En attente'
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Inscriptions');

  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8'
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'inscriptions-formation-ia.xlsx';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

window.exporterExcel = exporterExcel;

chargerInscriptions();