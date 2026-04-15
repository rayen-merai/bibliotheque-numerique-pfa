const API = '/api';

// Get auth headers
function getAuthHeaders() {
  const token = localStorage.getItem('token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

// Redirect if not logged in
if (!localStorage.getItem('token')) {
  window.location.href = '../utilisateurs/html.html';
}

// Global data
let livres = [];
let historique = [];
let retards = [];
let stats = { en_cours: 0, en_retard: 0, quota_max: 3, total: 0 };
let currentUser = null;
let currentRole = localStorage.getItem('role') || 'user';

// Load all data
async function loadData() {
  try {
    // Load current user information
    const userRes = await fetch(`${API}/user`, { headers: getAuthHeaders() });
    if (userRes.ok) {
      currentUser = await userRes.json();
      currentRole = currentUser.role || currentRole;
      document.getElementById('user-label').textContent = currentUser.name;
    }

    applyRoleUI();

    // Only users can create new loans from this interface
    if (currentRole !== 'admin') {
      const livresRes = await fetch(`${API}/livres`, { headers: getAuthHeaders() });
      if (livresRes.ok) {
        livres = await livresRes.json();
        populateLivreSelect();
      }
    }

    // Load user stats
    const statsRes = await fetch(`${API}/emprunts/stats`, { headers: getAuthHeaders() });
    if (statsRes.ok) {
      stats = await statsRes.json();
      updateStats();
    }

    // Load history: personal for users, global for admins
    const historyEndpoint = currentRole === 'admin' ? `${API}/emprunts` : `${API}/emprunts/historique`;
    const histRes = await fetch(historyEndpoint, { headers: getAuthHeaders() });
    if (histRes.ok) {
      historique = await histRes.json();
      renderHistorique(historique);
    }

    // Load overdue loans (admin only)
    if (currentRole === 'admin') {
      const retardsRes = await fetch(`${API}/emprunts/retards`, { headers: getAuthHeaders() });
      if (retardsRes.ok) {
        retards = await retardsRes.json();
        renderRetards(retards);
      }
    }

  } catch (err) {
    console.error('Erreur chargement données:', err);
    showAlert('alert-emprunt', 'Erreur de connexion au serveur.', 'error');
  }
}

function applyRoleUI() {
  const tabsEl = document.querySelector('.tabs');
  const historiqueTitle = document.getElementById('historique-title');
  const historiqueHead = document.getElementById('historique-head');

  if (currentRole === 'admin') {
    tabsEl.innerHTML = `
      <button class="tab-btn active" data-tab="historique" onclick="switchTab('historique')">Historique</button>
      <button class="tab-btn" data-tab="retards" onclick="switchTab('retards')">Retards</button>
    `;
    document.getElementById('tab-emprunter').classList.remove('active');
    historiqueTitle.textContent = 'Historique';
    historiqueHead.innerHTML = `
      <tr>
        <th>#</th><th>Utilisateur</th><th>Livre</th><th>Emprunté le</th>
        <th>Retour prévu</th><th>Statut</th><th>Actions</th>
      </tr>
    `;
    switchTab('historique');
    return;
  }

  tabsEl.innerHTML = `
    <button class="tab-btn active" data-tab="emprunter" onclick="switchTab('emprunter')">Emprunter</button>
    <button class="tab-btn" data-tab="historique" onclick="switchTab('historique')">Mon historique</button>
  `;
  historiqueTitle.textContent = 'Mes emprunts';
  historiqueHead.innerHTML = `
    <tr>
      <th>#</th><th>Livre</th><th>Emprunté le</th>
      <th>Retour prévu</th><th>Statut</th><th>Actions</th>
    </tr>
  `;
  switchTab('emprunter');
}

function populateLivreSelect() {
  const select = document.getElementById('livre-select');
  const availableBooks = livres.filter(l => l.stock_disponible > 0);
  select.innerHTML = '<option value="">— Choisir un livre —</option>' +
    availableBooks.map(l => `<option value="${l.id}">${l.titre} — ${l.auteur}</option>`).join('');
}

function updateStats() {
  document.getElementById('s-encours').textContent = stats.en_cours;
  document.getElementById('s-retards').textContent = stats.en_retard;
  document.getElementById('s-quota').textContent = stats.quota_max;
  document.getElementById('s-total').textContent = stats.total;
}

function switchTab(name) {
  document.querySelectorAll('.tab-btn').forEach((b) => {
    b.classList.toggle('active', b.dataset.tab === name);
  });
  document.querySelectorAll('[id^="tab-"]').forEach(t => t.classList.remove('active'));
  const target = document.getElementById('tab-' + name);
  if (target) target.classList.add('active');
}

function statut_chip(s) {
  const map = { en_cours:'chip-cours', retourne:'chip-retour', en_retard:'chip-retard' };
  const label = { en_cours:'En cours', retourne:'Retourné', en_retard:'En retard' };
  return `<span class="chip ${map[s]||''}">${label[s]||s}</span>`;
}

function renderHistorique(data) {
  const tbody = document.getElementById('body-historique');
  const isAdmin = currentRole === 'admin';

  if (!data.length) {
    const colspan = isAdmin ? 7 : 6;
    tbody.innerHTML = `<tr><td colspan="${colspan}" style="text-align:center;color:var(--muted);padding:24px">Aucun emprunt.</td></tr>`;
    return;
  }

  tbody.innerHTML = data.map(e => {
    const utilisateurCell = isAdmin
      ? `<td>${e.utilisateur || '-'}<br><small style="color:var(--muted)">${e.email || ''}</small></td>`
      : '';
    const actionsCell = isAdmin
      ? `<td style="color:var(--muted)">—</td>`
      : `<td>
          ${e.statut === 'en_cours' ? `<button class="btn btn-success btn-sm" onclick="retourner(${e.id})">Retourner</button>` : ''}
          ${e.statut === 'en_cours' && !e.prolonge ? `<button class="btn btn-warning btn-sm" style="margin-left:6px" onclick="prolonger(${e.id})">+7 jours</button>` : ''}
        </td>`;

    return `
      <tr>
        <td>${e.id}</td>
        ${utilisateurCell}
        <td><strong>${e.titre}</strong></td>
        <td>${new Date(e.date_emprunt).toLocaleDateString('fr-FR')}</td>
        <td>${new Date(e.date_retour_prevue).toLocaleDateString('fr-FR')}</td>
        <td>${statut_chip(e.statut)}</td>
        ${actionsCell}
      </tr>`;
  }).join('');
}

function renderRetards(data) {
  const tbody = document.getElementById('body-retards');
  tbody.innerHTML = data.map(r => `
    <tr>
      <td>${r.id}</td>
      <td>${r.utilisateur}<br><small style="color:var(--muted)">${r.email}</small></td>
      <td>${r.titre}</td>
      <td>${new Date(r.date_retour_prevue).toLocaleDateString('fr-FR')}</td>
      <td><span class="chip chip-retard">${r.jours_retard} j</span></td>
      <td><button class="btn btn-sm" style="background:var(--border)" onclick="notifier(${r.id})">Notifier</button></td>
    </tr>`).join('');
}

function filtrerHistorique(statut) {
  const filtered = statut ? historique.filter(e => e.statut === statut) : historique;
  renderHistorique(filtered);
}

function showAlert(id, msg, type) {
  const el = document.getElementById(id);
  el.textContent = msg;
  el.className = `alert alert-${type} show`;
  setTimeout(() => el.classList.remove('show'), 4000);
}

async function emprunterLivre() {
  const sel = document.getElementById('livre-select');
  if (!sel.value) {
    showAlert('alert-emprunt','Veuillez choisir un livre.','error');
    return;
  }

  try {
    const res = await fetch(`${API}/emprunts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify({ livre_id: parseInt(sel.value) })
    });

    const data = await res.json();
    if (res.ok) {
      showAlert('alert-emprunt', data.message, 'success');
      sel.value = '';
      // Reload data to update stats and history
      await loadData();
    } else {
      showAlert('alert-emprunt', data.message, 'error');
    }
  } catch (err) {
    console.error('Erreur emprunt:', err);
    showAlert('alert-emprunt', 'Erreur de connexion.', 'error');
  }
}

async function retourner(id) {
  if (!confirm('Confirmer le retour de ce livre ?')) return;

  try {
    const res = await fetch(`${API}/emprunts/${id}/retour`, {
      method: 'PUT',
      headers: getAuthHeaders()
    });

    const data = await res.json();
    if (res.ok) {
      showAlert('alert-emprunt', data.message, 'success');
      // Reload data to update stats and history
      await loadData();
    } else {
      showAlert('alert-emprunt', data.message, 'error');
    }
  } catch (err) {
    console.error('Erreur retour:', err);
    showAlert('alert-emprunt', 'Erreur de connexion.', 'error');
  }
}

async function prolonger(id) {
  if (!confirm('Confirmer la prolongation de 7 jours ?')) return;

  try {
    const res = await fetch(`${API}/emprunts/${id}/prolonger`, {
      method: 'PUT',
      headers: getAuthHeaders()
    });

    const data = await res.json();
    if (res.ok) {
      showAlert('alert-emprunt', data.message + ' Nouvelle date: ' + new Date(data.nouvelle_date).toLocaleDateString('fr-FR'), 'success');
      // Reload data to update history
      await loadData();
    } else {
      showAlert('alert-emprunt', data.message, 'error');
    }
  } catch (err) {
    console.error('Erreur prolongation:', err);
    showAlert('alert-emprunt', 'Erreur de connexion.', 'error');
  }
}

function notifier(id) {
  alert(`Email de rappel envoyé pour l'emprunt #${id}.`);
  // TODO: Implement actual notification API call if needed
}

// Initialize
loadData();

// Set return date info
const d = new Date();
d.setDate(d.getDate() + 14);
const dateRetourInfo = document.getElementById('date-retour-info');
if (dateRetourInfo) {
  dateRetourInfo.value = d.toLocaleDateString('fr-FR', {day:'2-digit',month:'long',year:'numeric'});
}
