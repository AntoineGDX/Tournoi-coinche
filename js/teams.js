// C'EST COINCHÉ — équipes inscrites (chargées depuis Supabase, vue teams_public)
document.addEventListener('DOMContentLoaded', async () => {
  const countEl = document.getElementById('teams-count');
  const listEl = document.getElementById('teams-list');
  const emptyEl = document.getElementById('teams-empty');
  const maxTeams = 32;

  try {
    const { data: teams, error } = await ccAuth.client
      .from('teams_public')
      .select('team_name')
      .order('created_at');

    if (error) throw error;

    countEl.innerHTML = `<b>${teams.length}</b> / ${maxTeams} doublettes inscrites`;

    if (teams.length === 0) {
      emptyEl.classList.remove('hidden');
      return;
    }

    listEl.innerHTML = teams.map((t, i) => `
      <li><span class="num">${String(i + 1).padStart(2, '0')}</span><span>${t.team_name}</span></li>
    `).join('');
  } catch (err) {
    countEl.textContent = '';
    emptyEl.textContent = "Impossible de charger la liste des équipes pour le moment.";
    emptyEl.classList.remove('hidden');
  }
});
