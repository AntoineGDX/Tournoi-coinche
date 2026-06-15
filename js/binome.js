// C'EST COINCHÉ — espace binôme : propositions / acceptation entre joueurs solo
document.addEventListener('DOMContentLoaded', async () => {
  const loading = document.getElementById('loading');
  const notSolo = document.getElementById('not-solo');
  const content = document.getElementById('binome-content');
  const statusEl = document.getElementById('binome-status');

  const session = await ccAuth.getSession();
  if (!session) {
    window.location.href = 'compte.html';
    return;
  }

  const { data: team, error } = await ccAuth.client
    .from('teams')
    .select('*')
    .eq('user_id', session.user.id)
    .maybeSingle();

  loading.classList.add('hidden');

  if (error || !team || team.registration_type !== 'solo' || !team.looking_for_partner) {
    notSolo.classList.remove('hidden');
    return;
  }

  content.classList.remove('hidden');

  let requests = [];

  function displayName(seeker) {
    return seeker.team_name || seeker.player1_name;
  }

  async function load() {
    const [{ data: seekers, error: seekersError }, { data: requestsData, error: requestsError }] = await Promise.all([
      ccAuth.client.from('solo_seekers').select('*'),
      ccAuth.client.from('partner_requests').select('*')
    ]);

    if (seekersError || requestsError) {
      statusEl.textContent = "Erreur lors du chargement de l'espace binôme.";
      statusEl.className = 'fine err';
      return;
    }

    requests = requestsData;
    const seekersById = new Map(seekers.map(s => [s.id, s]));
    const pending = requests.filter(r => r.status === 'pending');

    const received = pending.filter(r => r.to_team_id === team.id);
    const sent = pending.filter(r => r.from_team_id === team.id);
    const linkedIds = new Set([
      ...received.map(r => r.from_team_id),
      ...sent.map(r => r.to_team_id)
    ]);

    renderReceived(received, seekersById);
    renderSent(sent, seekersById);
    renderSeekers(seekers.filter(s => s.id !== team.id && !linkedIds.has(s.id)));
  }

  function renderReceived(received, seekersById) {
    const list = document.getElementById('received-list');
    const empty = document.getElementById('no-received');
    if (received.length === 0) {
      list.innerHTML = '';
      empty.classList.remove('hidden');
      return;
    }
    empty.classList.add('hidden');
    list.innerHTML = received.map(r => {
      const seeker = seekersById.get(r.from_team_id);
      const name = seeker ? displayName(seeker) : 'Joueur·euse';
      return `<div class="binome-row">
        <span class="name">${name}</span>
        <div class="actions">
          <button class="btn sm" data-action="accept" data-id="${r.id}">ACCEPTER</button>
          <button class="btn sm ghost" data-action="decline" data-id="${r.id}">REFUSER</button>
        </div>
      </div>`;
    }).join('');

    list.querySelectorAll('[data-action="accept"]').forEach(btn => {
      btn.addEventListener('click', () => accept(btn.dataset.id, btn));
    });
    list.querySelectorAll('[data-action="decline"]').forEach(btn => {
      btn.addEventListener('click', () => decline(btn.dataset.id, btn));
    });
  }

  function renderSent(sent, seekersById) {
    const list = document.getElementById('sent-list');
    const empty = document.getElementById('no-sent');
    if (sent.length === 0) {
      list.innerHTML = '';
      empty.classList.remove('hidden');
      return;
    }
    empty.classList.add('hidden');
    list.innerHTML = sent.map(r => {
      const seeker = seekersById.get(r.to_team_id);
      const name = seeker ? displayName(seeker) : 'Joueur·euse';
      return `<div class="binome-row">
        <span class="name">${name}</span>
        <div class="actions">
          <button class="btn sm ghost" data-action="cancel" data-id="${r.id}">ANNULER</button>
        </div>
      </div>`;
    }).join('');

    list.querySelectorAll('[data-action="cancel"]').forEach(btn => {
      btn.addEventListener('click', () => cancel(btn.dataset.id, btn));
    });
  }

  function renderSeekers(seekers) {
    const list = document.getElementById('seekers-list');
    const empty = document.getElementById('no-seekers');
    if (seekers.length === 0) {
      list.innerHTML = '';
      empty.classList.remove('hidden');
      return;
    }
    empty.classList.add('hidden');
    list.innerHTML = seekers.map(s => `
      <div class="binome-row">
        <span class="name">${displayName(s)}</span>
        <div class="actions">
          <button class="btn sm" data-action="propose" data-id="${s.id}">PROPOSER LE BINÔME</button>
        </div>
      </div>
    `).join('');

    list.querySelectorAll('[data-action="propose"]').forEach(btn => {
      btn.addEventListener('click', () => propose(btn.dataset.id, btn));
    });
  }

  function notify(event, fromTeamId, toTeamId) {
    ccAuth.client.functions.invoke('partner-notify', {
      body: { event, fromTeamId, toTeamId }
    }).catch(err => console.error('Notification binôme non envoyée :', err));
  }

  async function accept(requestId, btn) {
    btn.disabled = true;
    statusEl.textContent = 'Validation du binôme…';
    statusEl.className = 'fine';
    const req = requests.find(r => r.id === requestId);
    if (req) notify('request_accepted', req.from_team_id, team.id);
    const { error } = await ccAuth.client.rpc('accept_partner_request', { request_id: requestId });
    if (error) {
      statusEl.textContent = "Erreur lors de l'acceptation : " + error.message;
      statusEl.className = 'fine err';
      btn.disabled = false;
      return;
    }
    window.location.href = 'mon-equipe.html';
  }

  async function decline(requestId, btn) {
    btn.disabled = true;
    const req = requests.find(r => r.id === requestId);
    const { error } = await ccAuth.client.from('partner_requests').update({ status: 'declined' }).eq('id', requestId);
    if (error) {
      statusEl.textContent = "Erreur lors du refus.";
      statusEl.className = 'fine err';
      btn.disabled = false;
      return;
    }
    if (req) notify('request_declined', req.from_team_id, team.id);
    await load();
  }

  async function cancel(requestId, btn) {
    btn.disabled = true;
    const { error } = await ccAuth.client.from('partner_requests').update({ status: 'cancelled' }).eq('id', requestId);
    if (error) {
      statusEl.textContent = "Erreur lors de l'annulation.";
      statusEl.className = 'fine err';
      btn.disabled = false;
      return;
    }
    await load();
  }

  async function propose(seekerId, btn) {
    btn.disabled = true;
    const { error } = await ccAuth.client.from('partner_requests').insert({
      from_team_id: team.id,
      to_team_id: seekerId
    });
    if (error) {
      statusEl.textContent = "Erreur lors de l'envoi de la proposition.";
      statusEl.className = 'fine err';
      btn.disabled = false;
      return;
    }
    notify('request_received', team.id, seekerId);
    statusEl.textContent = 'Proposition envoyée !';
    statusEl.className = 'fine ok';
    await load();
  }

  await load();
});
