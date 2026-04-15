/* ============================================================
   app.js — Bibliothèque Numérique · Gestion des Ressources
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {

  const BASE = 'php/biblio/';

  // ─── DOM refs ──────────────────────────────────────────────
  const bookGrid       = document.getElementById('book-grid');
  const searchInput    = document.getElementById('search-input');
  const categoryFilter = document.getElementById('category-filter');
  const sortSelect     = document.getElementById('sort-select');
  const statusMsg      = document.getElementById('status-msg');

  // Ajout
  const addModal     = document.getElementById('add-modal');
  const addModalMsg  = document.getElementById('add-modal-msg');
  const btnAddOpen   = document.getElementById('add-book-btn');
  const btnAddSubmit = document.getElementById('btn-add-submit');

  // Modification
  const editModal     = document.getElementById('edit-modal');
  const editModalMsg  = document.getElementById('edit-modal-msg');
  const editFileInput = document.getElementById('edit-fichier');
  const btnEditSubmit = document.getElementById('btn-edit-submit');

  // Suppression
  const deleteModal      = document.getElementById('delete-modal');
  const btnDeleteConfirm = document.getElementById('btn-delete-confirm');

  // Description
  const descriptionModal = document.getElementById('description-modal');

  // ─── État ──────────────────────────────────────────────────
  let tousLesDocuments = [];

  // ─── Ouvrir / fermer les modals ────────────────────────────
  function ouvrirModal(id)  { document.getElementById(id).style.display = 'block'; }
  function fermerModal(id)  { document.getElementById(id).style.display = 'none';  }

  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => fermerModal(btn.dataset.close));
  });

  window.addEventListener('click', e => {
    [addModal, editModal, deleteModal, descriptionModal].forEach(m => {
      if (e.target === m) fermerModal(m.id);
    });
  });

  // ─── Messages de statut ────────────────────────────────────
  function afficherStatut(msg, type = 'success') {
    statusMsg.textContent   = msg;
    statusMsg.className     = 'status-msg ' + type;
    statusMsg.style.display = 'block';
    setTimeout(() => { statusMsg.style.display = 'none'; }, 3500);
  }

  function afficherMsgModal(el, msg, type = 'error') {
    el.textContent   = msg;
    el.className     = 'modal-msg ' + type;
    el.style.display = 'block';
    setTimeout(() => { el.style.display = 'none'; }, 3000);
  }

  // ─── Icônes SVG selon le type de fichier ───────────────────
  function getIconeFichier(type) {
    if (type === 'pdf') {
      return `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="10" y="4" width="36" height="48" rx="3" fill="#e63946" opacity="0.15"/>
        <rect x="10" y="4" width="36" height="48" rx="3" stroke="#e63946" stroke-width="2.5"/>
        <line x1="18" y1="20" x2="38" y2="20" stroke="#e63946" stroke-width="2" stroke-linecap="round"/>
        <line x1="18" y1="28" x2="38" y2="28" stroke="#e63946" stroke-width="2" stroke-linecap="round"/>
        <line x1="18" y1="36" x2="30" y2="36" stroke="#e63946" stroke-width="2" stroke-linecap="round"/>
        <text x="32" y="58" font-size="10" fill="#e63946" font-weight="bold" text-anchor="middle" font-family="Arial">PDF</text>
      </svg>`;
    }
    return `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="10" y="4" width="36" height="48" rx="3" fill="#0077b6" opacity="0.12"/>
      <rect x="10" y="4" width="36" height="48" rx="3" stroke="#0077b6" stroke-width="2.5"/>
      <path d="M20 20 Q28 14 36 20 Q28 26 20 20Z" fill="#0077b6" opacity="0.6"/>
      <line x1="18" y1="32" x2="38" y2="32" stroke="#0077b6" stroke-width="2" stroke-linecap="round"/>
      <line x1="18" y1="40" x2="30" y2="40" stroke="#0077b6" stroke-width="2" stroke-linecap="round"/>
      <text x="32" y="58" font-size="9" fill="#0077b6" font-weight="bold" text-anchor="middle" font-family="Arial">ePub</text>
    </svg>`;
  }

  // ─── Échapper le HTML ──────────────────────────────────────
  function escHtml(str) {
    const d = document.createElement('div');
    d.textContent = str || '';
    return d.innerHTML;
  }

  // ─── Construire une carte document ─────────────────────────
  function creerCarte(doc) {
    const typeFichier = (doc.type_fichier || '').toLowerCase();
    const classeIcone = typeFichier === 'pdf' ? 'pdf-icon' : 'epub-icon';

    // Bouton télécharger uniquement si un fichier est enregistré en base
    const btnTelechargement = doc.fichier
      ? `<button class="square-btn btn-download"
           data-fichier="${escHtml(doc.fichier)}"
           title="Télécharger le fichier">
           ⬇ Télécharger
         </button>`
      : '';

    const carte = document.createElement('div');
    carte.className  = 'book-card';
    carte.dataset.id = doc.id;
    carte.innerHTML  = `
      <div class="book-icon ${classeIcone}">
        ${getIconeFichier(typeFichier)}
        <span class="file-badge">${typeFichier.toUpperCase() || 'DOC'}</span>
      </div>
      <div class="book-info">
        <h3 class="book-title" title="${escHtml(doc.titre)}">${escHtml(doc.titre)}</h3>
        <p class="book-author">${escHtml(doc.auteur)}</p>
        <span class="book-category">${escHtml(doc.categorie)}</span>
        <nav class="btn-group">
          <button class="square-btn btn-edit"   data-id="${doc.id}">Modifier</button>
          <button class="square-btn btn-delete" data-id="${doc.id}">Supprimer</button>
          ${btnTelechargement}
        </nav>
      </div>
    `;
    return carte;
  }

  // ─── Afficher la grille ────────────────────────────────────
  function afficherGrille(docs) {
    bookGrid.innerHTML = '';

    if (!docs.length) {
      bookGrid.innerHTML = '<div class="empty-state">Aucun document trouvé.</div>';
      return;
    }

    docs.forEach(doc => bookGrid.appendChild(creerCarte(doc)));

    // Afficher la description au clic sur le titre
    bookGrid.querySelectorAll('.book-title').forEach(title => {
      title.addEventListener('click', () => {
        const cardId = title.closest('.book-card').dataset.id;
        const doc = tousLesDocuments.find(d => String(d.id) === String(cardId));
        if (doc) {
          document.getElementById('desc-modal-title').textContent = escHtml(doc.titre);
          document.getElementById('desc-modal-author').textContent = 'par ' + escHtml(doc.auteur);
          document.getElementById('desc-modal-description').innerHTML = 
            (doc.description ? escHtml(doc.description).replace(/\n/g, '<br>') : 'Aucune description disponible.');
          ouvrirModal('description-modal');
        }
      });
    });

    // Modifier
    bookGrid.querySelectorAll('.btn-edit').forEach(btn => {
      btn.addEventListener('click', () => ouvrirModalModification(btn.dataset.id));
    });

    // Supprimer
    bookGrid.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', () => ouvrirModalSuppression(btn.dataset.id));
    });

    // Télécharger — résout le fichier depuis uploads/ par son nom stocké en base
    bookGrid.querySelectorAll('.btn-download').forEach(btn => {
      btn.addEventListener('click', () => {
        const nomFichier = btn.dataset.fichier;
        if (!nomFichier) return;
        const lien    = document.createElement('a');
        lien.href     = `${BASE}uploads/${encodeURIComponent(nomFichier)}`;
        lien.download = nomFichier;
        document.body.appendChild(lien);
        lien.click();
        document.body.removeChild(lien);
      });
    });
  }

  // ─── Trier les documents (repris de l'ancien JS) ───────────
  function trierDocuments(docs) {
    const critere = sortSelect ? sortSelect.value : '';
    if (!critere) return docs;

    return [...docs].sort((a, b) => {
      if (critere === 'titre') {
        return a.titre.toLowerCase().localeCompare(b.titre.toLowerCase(), 'fr');
      }
      if (critere === 'auteur') {
        return a.auteur.toLowerCase().localeCompare(b.auteur.toLowerCase(), 'fr');
      }
      if (critere === 'date') {
        return new Date(b.date_ajout) - new Date(a.date_ajout);
      }
      return 0;
    });
  }

  // ─── Filtrer + trier + afficher ────────────────────────────
  function appliquerFiltres() {
    const q   = searchInput.value.toLowerCase().trim();
    const cat = categoryFilter.value;

    let resultats = tousLesDocuments.filter(d => {
      const correspondCat = !cat || d.categorie === cat;
      const correspondQ   = !q
        || d.titre.toLowerCase().includes(q)
        || d.auteur.toLowerCase().includes(q)
        || (d.description || '').toLowerCase().includes(q)
        || (d.fichier || '').toLowerCase().includes(q);
      return correspondCat && correspondQ;
    });

    resultats = trierDocuments(resultats);
    afficherGrille(resultats);
  }

  searchInput.addEventListener('input', appliquerFiltres);
  categoryFilter.addEventListener('change', appliquerFiltres);
  if (sortSelect) sortSelect.addEventListener('change', appliquerFiltres);

  // ─── Charger les documents depuis la base ──────────────────
  async function chargerDocuments() {
    bookGrid.innerHTML = '<div class="loading-state">Chargement des documents...</div>';
    try {
      const res = await fetch(BASE + 'get_document.php');
      tousLesDocuments = await res.json();
      appliquerFiltres();
    } catch (err) {
      bookGrid.innerHTML = `<div class="empty-state" style="color:#ffc;">
        Impossible de se connecter à la base de données.<br>
        Vérifiez que le serveur PHP est démarré.
      </div>`;
    }
  }

  // ─── AJOUTER un document ───────────────────────────────────
  btnAddOpen.addEventListener('click', () => {
    document.getElementById('add-titre').value       = '';
    document.getElementById('add-auteur').value      = '';
    document.getElementById('add-description').value = '';
    document.getElementById('add-fichier').value     = '';
    addModalMsg.style.display = 'none';
    ouvrirModal('add-modal');
  });

  btnAddSubmit.addEventListener('click', async () => {
    const titre        = document.getElementById('add-titre').value.trim();
    const auteur       = document.getElementById('add-auteur').value.trim();
    const categorie    = document.getElementById('add-categorie').value;
    const description  = document.getElementById('add-description').value.trim();
    const fichierInput = document.getElementById('add-fichier');

    if (!titre || !auteur) {
      afficherMsgModal(addModalMsg, "Le titre et l'auteur sont obligatoires.");
      return;
    }
    if (!fichierInput.files.length) {
      afficherMsgModal(addModalMsg, 'Veuillez sélectionner un fichier PDF ou ePub.');
      return;
    }

    const formData = new FormData();
    formData.append('titre',       titre);
    formData.append('auteur',      auteur);
    formData.append('categorie',   categorie);
    formData.append('description', description);
    formData.append('fichier',     fichierInput.files[0]);

    btnAddSubmit.disabled    = true;
    btnAddSubmit.textContent = 'Enregistrement...';
    try {
      const res  = await fetch(BASE + 'add_document.php', { method: 'POST', body: formData });
      const text = await res.text();
      if (text.includes('succès') || res.ok) {
        afficherMsgModal(addModalMsg, 'Document ajouté avec succès !', 'success');
        setTimeout(() => { fermerModal('add-modal'); chargerDocuments(); }, 1000);
      } else {
        afficherMsgModal(addModalMsg, text || "Erreur lors de l'ajout.");
      }
    } catch (err) {
      afficherMsgModal(addModalMsg, 'Erreur réseau. Vérifiez la connexion au serveur.');
    } finally {
      btnAddSubmit.disabled    = false;
      btnAddSubmit.textContent = 'Enregistrer le document';
    }
  });

  // ─── MODIFIER un document ──────────────────────────────────
  function ouvrirModalModification(id) {
    const doc = tousLesDocuments.find(d => String(d.id) === String(id));
    if (!doc) return;

    document.getElementById('edit-id').value          = doc.id;
    document.getElementById('edit-titre').value       = doc.titre;
    document.getElementById('edit-auteur').value      = doc.auteur;
    document.getElementById('edit-categorie').value   = doc.categorie;
    document.getElementById('edit-description').value = doc.description || '';
    if (editFileInput) {
      editFileInput.value = '';
    }
    editModalMsg.style.display = 'none';
    ouvrirModal('edit-modal');
  }

  btnEditSubmit.addEventListener('click', async () => {
    const id          = document.getElementById('edit-id').value;
    const titre       = document.getElementById('edit-titre').value.trim();
    const auteur      = document.getElementById('edit-auteur').value.trim();
    const categorie   = document.getElementById('edit-categorie').value;
    const description = document.getElementById('edit-description').value.trim();
    const fichier     = editFileInput ? editFileInput.files[0] : null;

    if (!titre || !auteur) {
      afficherMsgModal(editModalMsg, "Le titre et l'auteur sont obligatoires.");
      return;
    }

    const formData = new FormData();
    formData.append('id',          id);
    formData.append('titre',       titre);
    formData.append('auteur',      auteur);
    formData.append('categorie',   categorie);
    formData.append('description', description);
    if (fichier) {
      formData.append('fichier', fichier);
    }

    btnEditSubmit.disabled    = true;
    btnEditSubmit.textContent = 'Mise à jour...';
    try {
      const res  = await fetch(BASE + 'edit_document.php', { method: 'POST', body: formData });
      const text = await res.text();
      if (text.includes('succès') || res.ok) {
        afficherMsgModal(editModalMsg, 'Document mis à jour !', 'success');
        setTimeout(() => { fermerModal('edit-modal'); chargerDocuments(); }, 1000);
      } else {
        afficherMsgModal(editModalMsg, text || 'Erreur lors de la modification.');
      }
    } catch (err) {
      afficherMsgModal(editModalMsg, 'Erreur réseau.');
    } finally {
      btnEditSubmit.disabled    = false;
      btnEditSubmit.textContent = 'Mettre à jour';
    }
  });

  // ─── SUPPRIMER un document ─────────────────────────────────
  function ouvrirModalSuppression(id) {
    const doc = tousLesDocuments.find(d => String(d.id) === String(id));
    document.getElementById('delete-id').value = id;
    document.getElementById('delete-confirm-text').textContent = doc
      ? `Supprimer "${doc.titre}" ? Cette action est irréversible.`
      : 'Supprimer ce document ?';
    ouvrirModal('delete-modal');
  }

  btnDeleteConfirm.addEventListener('click', async () => {
    const id = document.getElementById('delete-id').value;
    btnDeleteConfirm.disabled = true;
    try {
      const res  = await fetch(`${BASE}delete_document.php?id=${encodeURIComponent(id)}`);
      const text = await res.text();
      fermerModal('delete-modal');
      if (text.includes('supprimé') || res.ok) {
        afficherStatut('Document supprimé avec succès.', 'success');
        chargerDocuments();
      } else {
        afficherStatut(text || 'Erreur lors de la suppression.', 'error');
      }
    } catch (err) {
      afficherStatut('Erreur réseau.', 'error');
    } finally {
      btnDeleteConfirm.disabled = false;
    }
  });

  // ─── Initialisation ────────────────────────────────────────
  chargerDocuments();

}); // fin DOMContentLoaded
