// C'EST COINCHÉ — équipes inscrites (chargées depuis data/teams.json)
document.addEventListener('DOMContentLoaded', async () => {
  const countEl = document.getElementById('teams-count');
  const listEl = document.getElementById('teams-list');
  const emptyEl = document.getElementById('teams-empty');

  try {
    const res = await fetch('data/teams.json');
    const data = await res.json();
    const teams = data.teams || [];
    const max = data.maxTeams || 32;

    countEl.innerHTML = `<b>${teams.length}</b> / ${max} doublettes inscrites`;

    if (teams.length === 0) {
      emptyEl.classList.remove('hidden');
      return;
    }

    listEl.innerHTML = teams.map((name, i) => `
      <li><span class="num">${String(i + 1).padStart(2, '0')}</span><span>${name}</span></li>
    `).join('');
  } catch (err) {
    countEl.textContent = '';
    emptyEl.textContent = "Impossible de charger la liste des équipes pour le moment.";
    emptyEl.classList.remove('hidden');
  }
});
