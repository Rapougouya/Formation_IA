const CONFIG = {
    storageKey: 'inscriptionsFormationIA',
    supabaseUrl: (window.APP_CONFIG && window.APP_CONFIG.supabaseUrl) || 'https://YOUR_PROJECT_REF.supabase.co',
    supabaseKey: (window.APP_CONFIG && window.APP_CONFIG.supabaseKey) || 'YOUR_SUPABASE_ANON_KEY'
  };

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

  function getInscriptions() {
    try {
      const saved = JSON.parse(localStorage.getItem(CONFIG.storageKey) || '[]');
      return Array.isArray(saved) ? saved.map((item, index) => normaliserInscription(item, index)) : [];
    } catch {
      return [];
    }
  }

  function enregistrerInscriptions(data) {
    const normalized = Array.isArray(data) ? data.map((item, index) => normaliserInscription(item, index)) : [];
    localStorage.setItem(CONFIG.storageKey, JSON.stringify(normalized));
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
          data = reindexerInscriptions(result);
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
    const item = data[index];
    if (!item) return;

    const updated = data.filter((_, i) => i !== index);
    const reindexed = reindexerInscriptions(updated);
    enregistrerInscriptions(reindexed);

    try {
      if (isSupabaseConfigured() && window.supabase) {
        const client = window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey);

        if (item.id !== undefined && item.id !== null) {
          const { error } = await client.from('inscriptions').delete().eq('id', item.id);
          if (error) throw error;
        }

        for (const inscrit of reindexed) {
          if (inscrit.id !== undefined && inscrit.id !== null) {
            await client.from('inscriptions').update({ numero: inscrit.numero }).eq('id', inscrit.id);
          }
        }
      }
    } catch (error) {
      console.warn('Suppression Supabase impossible, stockage local conservé.', error);
    }

    setTimeout(chargerInscriptions, 200);
  }

  async function viderListe() {
    if (!confirm('Tout supprimer ? Cette action effacera toutes les inscriptions.')) return;

    localStorage.removeItem(CONFIG.storageKey);

    try {
      if (isSupabaseConfigured() && window.supabase) {
        const client = window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey);
        const { error } = await client.from('inscriptions').delete().neq('id', 0);
        if (error) throw error;
      }
    } catch (error) {
      console.warn('Vidage Supabase impossible, stockage local conservé.', error);
    }

    setTimeout(chargerInscriptions, 200);
  }

  function exporterExcel() {
    const data = getInscriptions();
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
    XLSX.writeFile(wb, 'inscriptions-formation-ia.xlsx');
  }
  
  chargerInscriptions();