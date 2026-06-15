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

  document.getElementById('team-name').textContent = team.team_name;
  document.getElementById('team-player1').textContent = team.player1_name;
  document.getElementById('team-player2').textContent = isSolo ? 'En recherche de binôme' : team.player2_name;
  document.getElementById('team-email').textContent = team.email;
  document.getElementById('team-email2').textContent = team.email2 || '—';

  const isPaid = team.payment_status === 'paid';
  let statusLabel = isPaid ? 'Inscription confirmée' : 'Inscription en attente de paiement';
  if (isSolo) statusLabel = 'Solo · en recherche de binôme' + (isPaid ? '' : ' · paiement en attente');
  document.getElementById('team-status-label').textContent = statusLabel;
  document.getElementById('team-payment').innerHTML = isPaid
    ? '<span class="badge paid">Payé</span>'
    : '<span class="badge pending">En attente</span>';

  if (isSolo) {
    document.getElementById('binome-cta').classList.remove('hidden');
  }

  if (!isPaid) {
    const amount = team.registration_type === 'solo' ? '10€' : '20€';
    document.getElementById('pay-reminder-text').textContent =
      `Ton inscription est enregistrée mais le paiement des ${amount} n'a pas encore été confirmé. Règle-le via HelloAsso si tu ne l'as pas encore fait.`;
    document.getElementById('pay-reminder').classList.remove('hidden');
  }

  // Prochains matchs
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
