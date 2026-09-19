const CONFIG = {
    storageKey: 'inscriptionsFormationIA',
    supabaseUrl: (window.APP_CONFIG && window.APP_CONFIG.supabaseUrl) || 'https://YOUR_PROJECT_REF.supabase.co',
    supabaseKey: (window.APP_CONFIG && window.APP_CONFIG.supabaseKey) || 'YOUR_SUPABASE_ANON_KEY'
  };

  function isSupabaseConfigured() {
    return CONFIG.supabaseUrl && CONFIG.supabaseUrl.includes('supabase.co') && CONFIG.supabaseKey && !CONFIG.supabaseKey.includes('YOUR_');
  }

  function getInscriptions() {
    try {
      const saved = JSON.parse(localStorage.getItem(CONFIG.storageKey) || '[]');
      return Array.isArray(saved) ? saved : [];
    } catch {
      return [];
    }
  }

  function enregistrerInscriptions(data) {
    localStorage.setItem(CONFIG.storageKey, JSON.stringify(data));
  }

  async function fetchFromSupabase() {
    if (!isSupabaseConfigured() || !window.supabase) {
      throw new Error('Supabase non configuré');
    }

    const client = window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey);
    const { data, error } = await client.from('inscriptions').select('*').order('created_at', { ascending: true });
    if (error) throw error;
    return data || [];
  }

  async function chargerInscriptions() {
    document.getElementById('loading').style.display = 'block';
    document.getElementById('tableInscriptions').style.display = 'none';

    let data = getInscriptions();

    try {
      if (isSupabaseConfigured()) {
        const result = await fetchFromSupabase();
        if (Array.isArray(result) && result.length > 0) {
          data = result;
          enregistrerInscriptions(data);
        }
      }
    } catch (error) {
      console.warn('Lecture Supabase impossible, lecture locale utilisée.', error);
    }

    afficherTableau(data);
    majStats(data);

    document.getElementById('loading').style.display = 'none';
    document.getElementById('tableInscriptions').style.display = 'table';
  }
  
  function afficherTableau(data) {
    const tbody = document.getElementById('tbody');
    tbody.innerHTML = '';
  
    data.forEach((inscrit, index) => {
      const tr = document.createElement('tr');
      const statutClass = inscrit.statut === 'Validé' ? 'badge-valid'
                         : inscrit.statut === 'Rejeté' ? 'badge-reject'
                         : 'badge-pending';
  
      tr.innerHTML = `
        <td>${inscrit.dateInscription || '-'}</td>
        <td><strong>${inscrit.numero || '-'}</strong></td>
        <td><strong>${inscrit.nom}</strong></td>
        <td>${inscrit.prenom}</td>
        <td><strong style="color:var(--orange)">${inscrit.numPaiement}</strong></td>
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

    const data = getInscriptions();
    if (data[index]) {
      data[index].statut = nouveauStatut;
      enregistrerInscriptions(data);
    }

    try {
      if (isSupabaseConfigured() && window.supabase) {
        const client = window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey);
        const { error } = await client.from('inscriptions').update({ statut: nouveauStatut }).eq('id', data[index].id);
        if (error) throw error;
      }
    } catch (error) {
      console.warn('Mise à jour Supabase impossible, stockage local conservé.', error);
    }

    setTimeout(chargerInscriptions, 200);
  }

  async function supprimerInscription(index) {
    if (!confirm('Supprimer cet inscrit ?')) return;

    const data = getInscriptions();
    if (data[index]) {
      data.splice(index, 1);
      enregistrerInscriptions(data);
    }

    try {
      if (isSupabaseConfigured() && window.supabase) {
        const client = window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey);
        const { error } = await client.from('inscriptions').delete().eq('id', data[index].id);
        if (error) throw error;
      }
    } catch (error) {
      console.warn('Suppression Supabase impossible, stockage local conservé.', error);
    }

    setTimeout(chargerInscriptions, 200);
  }
  
  chargerInscriptions();