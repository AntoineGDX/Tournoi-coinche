// C'EST COINCHÉ — équipes inscrites (chargées depuis Supabase, vue teams_public)
document.addEventListener('DOMContentLoaded', async () => {
  const countEl = document.getElementById('teams-count');
  const listEl = document.getElementById('teams-list');
  const emptyEl = document.getElementById('teams-empty');
  const maxTeams = 32;

  try {
    const { data: allTeams, error } = await ccAuth.client
      .from('teams_public')
      .select('id, team_name, registration_type, looking_for_partner, partner_team_id')
      .order('created_at');

    if (error) throw error;

    // Une doublette associée a deux fiches liées (une par compte) : n'en afficher qu'une.
    const teams = allTeams.filter(t => !(t.partner_team_id && t.partner_team_id < t.id));

    const doublettes = teams.filter(t => !(t.registration_type === 'solo' && t.looking_for_partner));
    const seekers = teams.filter(t => t.registration_type === 'solo' && t.looking_for_partner);

    countEl.innerHTML = `<b>${doublettes.length}</b> / ${maxTeams} doublettes inscrites`
      + (seekers.length > 0 ? ` · <b>${seekers.length}</b> joueur·euse${seekers.length > 1 ? 's' : ''} solo en recherche de binôme` : '');

    if (teams.length === 0) {
      emptyEl.classList.remove('hidden');
      return;
    }

    listEl.innerHTML = teams.map((t, i) => `
      <li><span class="num">${String(i + 1).padStart(2, '0')}</span><span>${t.team_name}</span>${t.registration_type === 'solo' && t.looking_for_partner ? '<span class="badge info" style="margin-left:10px">Cherche un binôme</span>' : ''}</li>
    `).join('');
  } catch (err) {
    countEl.textContent = '';
    emptyEl.textContent = "Impossible de charger la liste des équipes pour le moment.";
    emptyEl.classList.remove('hidden');
  }
});
