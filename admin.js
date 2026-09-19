const CONFIG = {
    googleScriptURL: "https://script.google.com/macros/s/1vugqSMU5SHxvm14SVO3GdYftXCUkB0t2pAeSz8wyVwgFxevKADE0ZHBc/exec",
    storageKey: 'inscriptionsFormationIA'
  };

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

  async function chargerInscriptions() {
    document.getElementById('loading').style.display = 'block';
    document.getElementById('tableInscriptions').style.display = 'none';

    let data = getInscriptions();

    try {
      const reponse = await fetch(CONFIG.googleScriptURL + '?action=lire');
      if (reponse.ok) {
        const result = await reponse.json();
        if (Array.isArray(result) && result.length > 0) {
          data = result;
          enregistrerInscriptions(data);
        }
      }
    } catch (error) {
      console.warn('Lecture Google impossible, lecture locale utilisée.', error);
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
      await fetch(CONFIG.googleScriptURL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'updateStatut', index, statut: nouveauStatut })
      });
    } catch (error) {
      console.warn('Mise à jour Google impossible, stockage local conservé.', error);
    }

    setTimeout(chargerInscriptions, 200);
  }
  
  chargerInscriptions();