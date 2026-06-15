// C'EST COINCHÉ — admin : édition de l'arbre + suivi des paiements (Supabase)
document.addEventListener('DOMContentLoaded', async () => {
  const gate = document.getElementById('admin-gate');
  const editor = document.getElementById('admin-editor');
  const emailInput = document.getElementById('admin-email');
  const passwordInput = document.getElementById('admin-password');
  const connectBtn = document.getElementById('admin-connect');
  const gateStatus = document.getElementById('admin-gate-status');
  const logoutBtn = document.getElementById('nav-logout');

  const roundsEl = document.getElementById('admin-rounds');
  const saveBtn = document.getElementById('admin-save');
  const saveStatus = document.getElementById('admin-save-status');
  const teamNamesEl = document.getElementById('admin-team-names');
  const teamsEl = document.getElementById('admin-teams');
  const teamsStatus = document.getElementById('admin-teams-status');
  const requestsEl = document.getElementById('admin-requests');
  const requestsStatus = document.getElementById('admin-requests-status');

  let matches = null;
  let teams = null;

  function teamNameInput(value, round, match, field) {
    const safe = (value || '').replace(/"/g, '&quot;');
    return `<input type="text" list="admin-team-names" placeholder="Équipe" value="${safe}" data-id="${round}" data-match="${match}" data-field="${field}">`;
  }

  function renderEditor() {
    const roundsMap = new Map();
    matches.forEach(m => {
      if (!roundsMap.has(m.round_order)) {
        roundsMap.set(m.round_order, { name: m.round_name, matches: [] });
      }
      roundsMap.get(m.round_order).matches.push(m);
    });
    const rounds = [...roundsMap.entries()].sort((a, b) => a[0] - b[0]).map(([, r]) => r);

    roundsEl.innerHTML = rounds.map(round => `
      <div class="admin-round">
        <h4>${round.name}</h4>
        ${round.matches.map(m => `
          <div class="admin-match">
            ${teamNameInput(m.team1_name, m.id, m.id, 'team1_name')}
            <input type="number" class="score" placeholder="—" value="${m.score1 ?? ''}" data-id="${m.id}" data-field="score1">
            ${teamNameInput(m.team2_name, m.id, m.id, 'team2_name')}
            <input type="number" class="score" placeholder="—" value="${m.score2 ?? ''}" data-id="${m.id}" data-field="score2">
          </div>
        `).join('')}
      </div>
    `).join('');

    roundsEl.querySelectorAll('input').forEach(input => {
      input.addEventListener('input', () => {
        const id = input.dataset.id;
        const field = input.dataset.field;
        const m = matches.find(mm => mm.id === id);
        if (field === 'score1' || field === 'score2') {
          m[field] = input.value === '' ? null : Number(input.value);
        } else {
          m[field] = input.value;
        }
      });
    });
  }

  async function loadMatches() {
    const { data, error } = await ccAuth.client.from('matches').select('*').order('round_order').order('match_order');
    if (error) throw error;
    matches = data;
    renderEditor();
  }

  async function loadTeamNames() {
    const { data, error } = await ccAuth.client.from('teams_public').select('team_name').order('created_at');
    if (error) throw error;
    teamNamesEl.innerHTML = data.map(t => `<option value="${t.team_name.replace(/"/g, '&quot;')}"></option>`).join('');
  }

  async function loadTeams() {
    const { data, error } = await ccAuth.client.from('teams').select('*').order('created_at');
    if (error) throw error;
    teams = data;

    if (data.length === 0) {
      teamsEl.innerHTML = '<p class="fine">Aucune équipe inscrite pour le moment.</p>';
      return;
    }

    teamsEl.innerHTML = data.map(t => `
      <div class="admin-team-row">
        <span class="name">${t.team_name}</span>
        <span class="badge info">${t.registration_type === 'solo' ? 'Solo · 10€' : 'Doublette · 20€'}</span>
        <span>${t.payment_status === 'paid' ? '<span class="badge paid">Payé</span>' : '<span class="badge pending">En attente</span>'}</span>
        <button class="btn ghost" data-team-id="${t.id}" data-status="${t.payment_status}">
          ${t.payment_status === 'paid' ? 'MARQUER NON PAYÉ' : 'MARQUER COMME PAYÉ'}
        </button>
      </div>
    `).join('');

    teamsEl.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.teamId;
        const newStatus = btn.dataset.status === 'paid' ? 'pending' : 'paid';
        btn.disabled = true;
        const { error } = await ccAuth.client.from('teams').update({ payment_status: newStatus }).eq('id', id);
        if (error) {
          teamsStatus.textContent = "Erreur lors de la mise à jour du paiement.";
          teamsStatus.className = 'admin-status err';
          btn.disabled = false;
          return;
        }
        await loadTeams();
      });
    });
  }

  const statusLabels = {
    pending: 'En attente',
    accepted: 'Acceptée',
    declined: 'Refusée',
    cancelled: 'Annulée'
  };

  async function loadPartnerRequests() {
    const { data, error } = await ccAuth.client.from('partner_requests').select('*').order('created_at', { ascending: false });
    if (error) throw error;

    if (data.length === 0) {
      requestsEl.innerHTML = '<p class="fine">Aucune demande de binôme pour le moment.</p>';
      return;
    }

    const teamsById = new Map(teams.map(t => [t.id, t]));
    const teamName = id => {
      const t = teamsById.get(id);
      return t ? (t.team_name || t.player1_name) : 'Équipe supprimée';
    };

    requestsEl.innerHTML = data.map(r => `
      <div class="admin-request-row">
        <span class="name">${teamName(r.from_team_id)}</span>
        <span class="name">→ ${teamName(r.to_team_id)}</span>
        <span><span class="badge ${r.status}">${statusLabels[r.status] || r.status}</span></span>
        <span class="fine">${new Date(r.created_at).toLocaleString('fr-FR')}</span>
      </div>
    `).join('');
  }

  saveBtn.addEventListener('click', async () => {
    saveStatus.textContent = 'Enregistrement…';
    saveStatus.className = 'admin-status';
    try {
      for (const m of matches) {
        const { error } = await ccAuth.client.from('matches').update({
          team1_name: m.team1_name,
          team2_name: m.team2_name,
          score1: m.score1,
          score2: m.score2
        }).eq('id', m.id);
        if (error) throw error;
      }
      saveStatus.textContent = 'Enregistré ✓ — visible sur l\'arbre immédiatement.';
      saveStatus.className = 'admin-status ok';
    } catch (err) {
      saveStatus.textContent = "Erreur lors de l'enregistrement.";
      saveStatus.className = 'admin-status err';
    }
  });

  async function showEditor() {
    gate.classList.add('hidden');
    editor.classList.remove('hidden');
    logoutBtn.classList.remove('hidden');
    try {
      await Promise.all([loadMatches(), loadTeamNames(), loadTeams()]);
    } catch (err) {
      saveStatus.textContent = "Erreur de chargement des données.";
      saveStatus.className = 'admin-status err';
    }
    try {
      await loadPartnerRequests();
    } catch (err) {
      requestsStatus.textContent = "Erreur de chargement des demandes de binôme.";
      requestsStatus.className = 'admin-status err';
    }
  }

  async function checkAccess() {
    const session = await ccAuth.getSession();
    if (!session) return;
    const isAdmin = await ccAuth.isAdmin(session.user.id);
    if (isAdmin) {
      await showEditor();
    } else {
      gateStatus.textContent = "Ce compte n'a pas les droits admin.";
      gateStatus.className = 'admin-status err';
      logoutBtn.classList.remove('hidden');
    }
  }

  connectBtn.addEventListener('click', async () => {
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    if (!email || !password) return;
    gateStatus.textContent = 'Connexion…';
    gateStatus.className = 'admin-status';
    const { error } = await ccAuth.signIn(email, password);
    if (error) {
      gateStatus.textContent = 'Email ou mot de passe incorrect.';
      gateStatus.className = 'admin-status err';
      return;
    }
    await checkAccess();
  });

  await checkAccess();
});
