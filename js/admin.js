// C'EST COINCHÉ — admin : édition de l'arbre du tournoi via l'API GitHub
document.addEventListener('DOMContentLoaded', () => {
  const OWNER = 'AntoineGDX';
  const REPO = 'Tournoi-coinche';
  const PATH = 'data/bracket.json';
  const BRANCH = 'main';
  const API = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${PATH}`;

  const gate = document.getElementById('admin-gate');
  const editor = document.getElementById('admin-editor');
  const tokenInput = document.getElementById('admin-token');
  const connectBtn = document.getElementById('admin-connect');
  const gateStatus = document.getElementById('admin-gate-status');
  const roundsEl = document.getElementById('admin-rounds');
  const saveBtn = document.getElementById('admin-save');
  const logoutBtn = document.getElementById('admin-logout');
  const saveStatus = document.getElementById('admin-save-status');

  let bracketData = null;
  let bracketSha = null;

  function b64DecodeUnicode(str) {
    return decodeURIComponent(atob(str.replace(/\n/g, '')).split('').map(c =>
      '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
    ).join(''));
  }

  function b64EncodeUnicode(str) {
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (m, p1) =>
      String.fromCharCode('0x' + p1)
    ));
  }

  function authHeaders(token) {
    return {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json'
    };
  }

  function renderEditor() {
    roundsEl.innerHTML = bracketData.rounds.map((round, ri) => `
      <div class="admin-round">
        <h4>${round.name}</h4>
        ${round.matches.map((m, mi) => `
          <div class="admin-match">
            <input type="text" placeholder="Équipe 1" value="${(m.team1 || '').replace(/"/g, '&quot;')}" data-round="${ri}" data-match="${mi}" data-field="team1">
            <input type="number" class="score" placeholder="—" value="${m.score1 ?? ''}" data-round="${ri}" data-match="${mi}" data-field="score1">
            <input type="text" placeholder="Équipe 2" value="${(m.team2 || '').replace(/"/g, '&quot;')}" data-round="${ri}" data-match="${mi}" data-field="team2">
            <input type="number" class="score" placeholder="—" value="${m.score2 ?? ''}" data-round="${ri}" data-match="${mi}" data-field="score2">
          </div>
        `).join('')}
      </div>
    `).join('');

    roundsEl.querySelectorAll('input').forEach(input => {
      input.addEventListener('input', () => {
        const ri = +input.dataset.round;
        const mi = +input.dataset.match;
        const field = input.dataset.field;
        if (field === 'score1' || field === 'score2') {
          bracketData.rounds[ri].matches[mi][field] = input.value === '' ? null : Number(input.value);
        } else {
          bracketData.rounds[ri].matches[mi][field] = input.value;
        }
      });
    });
  }

  async function loadBracket(token) {
    gateStatus.textContent = 'Connexion…';
    gateStatus.className = 'admin-status';
    const res = await fetch(`${API}?ref=${BRANCH}`, { headers: authHeaders(token) });
    if (!res.ok) {
      throw new Error(res.status === 401 ? 'Jeton invalide ou expiré.' : `Erreur GitHub (${res.status})`);
    }
    const json = await res.json();
    bracketSha = json.sha;
    bracketData = JSON.parse(b64DecodeUnicode(json.content));
    renderEditor();
    gate.classList.add('hidden');
    editor.classList.remove('hidden');
  }

  connectBtn.addEventListener('click', async () => {
    const token = tokenInput.value.trim();
    if (!token) return;
    try {
      await loadBracket(token);
      sessionStorage.setItem('cc_admin_token', token);
    } catch (err) {
      gateStatus.textContent = err.message;
      gateStatus.className = 'admin-status err';
    }
  });

  logoutBtn.addEventListener('click', () => {
    sessionStorage.removeItem('cc_admin_token');
    editor.classList.add('hidden');
    gate.classList.remove('hidden');
    tokenInput.value = '';
    gateStatus.textContent = '';
  });

  saveBtn.addEventListener('click', async () => {
    const token = sessionStorage.getItem('cc_admin_token');
    saveStatus.textContent = 'Enregistrement…';
    saveStatus.className = 'admin-status';

    bracketData.updated = new Date().toISOString().slice(0, 10);
    const content = b64EncodeUnicode(JSON.stringify(bracketData, null, 2) + '\n');

    try {
      const res = await fetch(API, {
        method: 'PUT',
        headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Mise à jour de l\'arbre du tournoi',
          content,
          sha: bracketSha,
          branch: BRANCH
        })
      });
      if (!res.ok) {
        throw new Error(res.status === 409 ? 'Conflit : recharge la page (un autre changement a été enregistré).' : `Erreur GitHub (${res.status})`);
      }
      const json = await res.json();
      bracketSha = json.content.sha;
      saveStatus.textContent = 'Enregistré ✓ — visible sur le site dans ~1 minute.';
      saveStatus.className = 'admin-status ok';
    } catch (err) {
      saveStatus.textContent = err.message;
      saveStatus.className = 'admin-status err';
    }
  });

  // Auto-reconnect if a token is already stored for this session
  const storedToken = sessionStorage.getItem('cc_admin_token');
  if (storedToken) {
    tokenInput.value = storedToken;
    loadBracket(storedToken).catch(err => {
      sessionStorage.removeItem('cc_admin_token');
      gateStatus.textContent = err.message;
      gateStatus.className = 'admin-status err';
    });
  }
});
