// Copier ce code dans l'éditeur d'Apps Script de Google Sheets
// 1) Créer un projet Apps Script
// 2) Coller ce code
// 3) Dans le dossier Google Sheets associé, la première colonne "A" contient la date, etc.
// 4) Déployer en tant que "Web app"
// 5) Copier l'URL générée dans la variable googleScriptURL du front

const SHEET_NAME = 'Inscriptions';

function getSheet() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
    sheet.appendRow(['dateInscription', 'numero', 'nom', 'prenom', 'numPaiement', 'statut']);
  }

  return sheet;
}

function toJsonRow(row) {
  const [dateInscription, numero, nom, prenom, numPaiement, statut] = row;
  return {
    dateInscription: dateInscription || '',
    numero: numero || '',
    nom: nom || '',
    prenom: prenom || '',
    numPaiement: numPaiement || '',
    statut: statut || 'En attente'
  };
}

function readAll() {
  const sheet = getSheet();
  const values = sheet.getDataRange().getValues();

  if (values.length <= 1) return [];

  const headers = values[0];
  const rows = values.slice(1).filter(row => row.some(value => value !== ''));

  return rows.map((row) => {
    const entry = {};
    headers.forEach((header, index) => {
      entry[header] = row[index] || '';
    });
    return entry;
  });
}

function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || 'lire';

  if (action === 'lire') {
    return ContentService
      .createTextOutput(JSON.stringify(readAll()))
      .setMimeType(ContentService.MimeType.JSON);
  }

  return ContentService
    .createTextOutput(JSON.stringify({ ok: false, message: 'Action inconnue' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const body = e && e.postData && e.postData.contents ? JSON.parse(e.postData.contents) : {};
    const action = body.action || 'ajouter';

    if (action === 'ajouter') {
      const sheet = getSheet();
      sheet.appendRow([
        body.dateInscription || new Date().toLocaleString('fr-FR'),
        body.numero || '',
        body.nom || '',
        body.prenom || '',
        body.numPaiement || '',
        body.statut || 'En attente'
      ]);

      return ContentService
        .createTextOutput(JSON.stringify({ ok: true, message: 'Inscription ajoutée' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'updateStatut') {
      const index = Number(body.index);
      const nouveauStatut = body.statut || 'En attente';
      const sheet = getSheet();
      const values = sheet.getDataRange().getValues();

      if (values.length > 1 && !Number.isNaN(index) && index >= 0 && index < values.length - 1) {
        const rowIndex = index + 2;
        sheet.getRange(rowIndex, 6).setValue(nouveauStatut);

        return ContentService
          .createTextOutput(JSON.stringify({ ok: true, message: 'Statut mis à jour' }))
          .setMimeType(ContentService.MimeType.JSON);
      }

      return ContentService
        .createTextOutput(JSON.stringify({ ok: false, message: 'Index invalide' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, message: 'Action inconnue' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
