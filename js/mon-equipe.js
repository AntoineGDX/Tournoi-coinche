// C'EST COINCHÉ — tableau de bord "Mon équipe"
document.addEventListener('DOMContentLoaded', async () => {
  const loading = document.getElementById('loading');
  const noTeam = document.getElementById('no-team');
  const teamContent = document.getElementById('team-content');

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

  if (error || !team) {
    noTeam.classList.remove('hidden');
    return;
  }

  teamContent.classList.remove('hidden');

  const isSolo = team.registration_type === 'solo' && team.looking_for_partner;

  // Doublette associée : la fiche du binôme (compte distinct) est conservée
  // séparément et liée via partner_team_id.
  let partner = null;
  if (team.partner_team_id) {
    const { data: partnerData } = await ccAuth.client
      .from('teams')
      .select('*')
      .eq('id', team.partner_team_id)
      .maybeSingle();
    partner = partnerData;
  }

  document.getElementById('team-name').textContent = team.team_name || team.player1_name;
  document.getElementById('team-player1').textContent = team.player1_name;
  document.getElementById('team-email').textContent = team.email;

  const isPaid = team.payment_status === 'paid';
  let statusLabel = isPaid ? 'Inscription confirmée' : 'Inscription en attente de paiement';
  if (isSolo) statusLabel = 'Solo · en recherche de binôme' + (isPaid ? '' : ' · paiement en attente');
  document.getElementById('team-status-label').textContent = statusLabel;
  document.getElementById('team-payment').innerHTML = isPaid
    ? '<span class="badge paid">Payé</span>'
    : '<span class="badge pending">En attente</span>';

  if (isSolo) {
    document.getElementById('player2-dl').classList.add('hidden');
    document.getElementById('binome-cta').classList.remove('hidden');
    document.getElementById('team-name-block').classList.add('hidden');
    document.getElementById('settings-title').classList.add('hidden');
  } else {
    document.getElementById('team-player2').textContent = partner ? partner.player1_name : team.player2_name;
    document.getElementById('team-email2').textContent = partner ? partner.email : (team.email2 || '—');
    const partnerPayment = partner ? partner.payment_status : team.payment_status;
    document.getElementById('team-partner-payment').innerHTML = partnerPayment === 'paid'
      ? '<span class="badge paid">Payé</span>'
      : '<span class="badge pending">En attente</span>';
  }

  if (team.registration_type === 'doublette') {
    document.getElementById('binome-unavailable-block').classList.remove('hidden');
    if (partner) {
      document.getElementById('become-solo-text').textContent =
        "Vous repasserez chacun en inscription solo et apparaîtrez dans l'espace binôme pour trouver un·e nouveau·elle partenaire.";
      document.getElementById('become-solo').textContent = 'SE SÉPARER — REDEVENIR SOLO';
    }
  }

  // Paramètres : nom de l'équipe
  const teamNameDisplay = document.getElementById('team-name-display');
  const teamNameInput = document.getElementById('input-team-name');
  const editTeamNameBtn = document.getElementById('edit-team-name');
  const saveTeamNameBtn = document.getElementById('save-team-name');
  const teamNameStatus = document.getElementById('team-name-status');
  teamNameDisplay.textContent = team.team_name;
  teamNameInput.value = team.team_name;

  editTeamNameBtn.addEventListener('click', () => {
    teamNameInput.value = team.team_name;
    teamNameDisplay.classList.add('hidden');
    editTeamNameBtn.classList.add('hidden');
    teamNameInput.classList.remove('hidden');
    saveTeamNameBtn.classList.remove('hidden');
  });

  saveTeamNameBtn.addEventListener('click', async () => {
    const newName = teamNameInput.value.trim();
    if (!newName) return;
    saveTeamNameBtn.disabled = true;
    const { error } = await ccAuth.client.rpc('rename_team', { new_name: newName });
    teamNameStatus.classList.remove('hidden');
    if (error) {
      teamNameStatus.textContent = "Erreur lors de l'enregistrement.";
      teamNameStatus.className = 'fine err';
    } else {
      team.team_name = newName;
      document.getElementById('team-name').textContent = newName;
      teamNameDisplay.textContent = newName;
      teamNameInput.classList.add('hidden');
      saveTeamNameBtn.classList.add('hidden');
      teamNameDisplay.classList.remove('hidden');
      editTeamNameBtn.classList.remove('hidden');
      teamNameStatus.textContent = 'Nom enregistré ✓';
      teamNameStatus.className = 'fine ok';
    }
    saveTeamNameBtn.disabled = false;
  });

  // Paramètres : préférence de notification binôme
  const notifyCheckbox = document.getElementById('notify-binome');
  const notifyStatus = document.getElementById('notify-status');
  notifyCheckbox.checked = team.notify_binome_requests;

  notifyCheckbox.addEventListener('change', async () => {
    const { error } = await ccAuth.client.from('teams').update({ notify_binome_requests: notifyCheckbox.checked }).eq('id', team.id);
    notifyStatus.classList.remove('hidden');
    if (error) {
      notifyCheckbox.checked = !notifyCheckbox.checked;
      notifyStatus.textContent = "Erreur lors de l'enregistrement.";
      notifyStatus.className = 'fine err';
    } else {
      notifyStatus.textContent = 'Préférence enregistrée ✓';
      notifyStatus.className = 'fine ok';
    }
  });

  // Paramètres : binôme plus disponible → repasse en solo (recherche de binôme)
  const becomeSoloBtn = document.getElementById('become-solo');
  const becomeSoloStatus = document.getElementById('become-solo-status');

  becomeSoloBtn.addEventListener('click', async () => {
    let error;
    if (team.partner_team_id) {
      if (!confirm("Confirmer : vous repassez chacun en solo, votre association est annulée et vous apparaissez dans l'espace binôme pour trouver un·e nouveau·elle partenaire. Continuer ?")) return;
      becomeSoloBtn.disabled = true;
      ({ error } = await ccAuth.client.rpc('split_partner_team'));
      if (!error) {
        ccAuth.client.functions.invoke('partner-notify', {
          body: { event: 'partner_split', myTeamId: team.id, partnerTeamId: team.partner_team_id }
        });
      }
    } else {
      if (!confirm("Confirmer : ton équipe repasse en solo, les infos de ton binôme actuel sont retirées et tu apparais dans l'espace binôme. Continuer ?")) return;
      becomeSoloBtn.disabled = true;
      ({ error } = await ccAuth.client.from('teams').update({
        registration_type: 'solo',
        looking_for_partner: true,
        player2_name: null,
        email2: null,
        team_name: ''
      }).eq('id', team.id));

      if (!error) {
        await ccAuth.client.from('partner_requests')
          .update({ status: 'cancelled' })
          .eq('status', 'pending')
          .or(`from_team_id.eq.${team.id},to_team_id.eq.${team.id}`);
      }
    }

    if (error) {
      becomeSoloStatus.classList.remove('hidden');
      becomeSoloStatus.textContent = "Erreur lors de la mise à jour.";
      becomeSoloStatus.className = 'fine err';
      becomeSoloBtn.disabled = false;
      return;
    }

    window.location.reload();
  });

  if (!isPaid) {
    document.getElementById('pay-reminder-text').textContent =
      "Ton inscription est enregistrée mais le paiement n'a pas encore été confirmé. Règle-le via HelloAsso si tu ne l'as pas encore fait.";
    document.getElementById('pay-reminder').classList.remove('hidden');
  }

  // Prochains matchs — uniquement pour les doublettes complètes
  if (isSolo) {
    document.getElementById('next-matches').classList.add('hidden');
    return;
  }

  const { data: matches } = await ccAuth.client
    .from('matches')
    .select('*')
    .or(`team1_name.eq.${team.team_name},team2_name.eq.${team.team_name}`)
    .order('round_order');

  const matchesList = document.getElementById('matches-list');
  const noMatches = document.getElementById('no-matches');

  if (!matches || matches.length === 0) {
    noMatches.classList.remove('hidden');
    return;
  }

  matchesList.innerHTML = matches.map(m => {
    const opponent = m.team1_name === team.team_name ? m.team2_name : m.team1_name;
    const opponentLabel = opponent ? opponent : 'À définir';
    let scoreLabel = '';
    if (m.score1 !== null && m.score2 !== null) {
      const myScore = m.team1_name === team.team_name ? m.score1 : m.score2;
      const theirScore = m.team1_name === team.team_name ? m.score2 : m.score1;
      scoreLabel = `<span class="score">${myScore} – ${theirScore}</span>`;
    }
    return `<div class="bracket-match" style="max-width:480px;margin-bottom:10px">
      <div class="team"><span class="name">${m.round_name}</span></div>
      <div class="team"><span class="name">vs ${opponentLabel}</span>${scoreLabel}</div>
    </div>`;
  }).join('');
});
