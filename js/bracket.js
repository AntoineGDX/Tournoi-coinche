// C'EST COINCHÉ — arbre du tournoi (chargé depuis data/bracket.json)
document.addEventListener('DOMContentLoaded', async () => {
  const bracketEl = document.getElementById('bracket');
  const emptyEl = document.getElementById('bracket-empty');

  function teamHtml(name, score, isWinner) {
    const label = name ? name : 'À définir';
    const scoreLabel = (score === null || score === undefined) ? '' : `<span class="score">${score}</span>`;
    return `<div class="team${isWinner ? ' winner' : ''}"><span class="name">${label}</span>${scoreLabel}</div>`;
  }

  try {
    const res = await fetch('data/bracket.json');
    const data = await res.json();
    const rounds = data.rounds || [];

    const hasContent = rounds.some(r => r.matches.some(m => m.team1 || m.team2));
    if (!hasContent) {
      emptyEl.classList.remove('hidden');
      return;
    }

    bracketEl.innerHTML = rounds.map(round => {
      const matches = round.matches.map(m => {
        const bothScored = m.score1 !== null && m.score1 !== undefined && m.score2 !== null && m.score2 !== undefined;
        const win1 = bothScored && m.score1 > m.score2;
        const win2 = bothScored && m.score2 > m.score1;
        return `<div class="bracket-match">
          ${teamHtml(m.team1, m.score1, win1)}
          ${teamHtml(m.team2, m.score2, win2)}
        </div>`;
      }).join('');
      return `<div class="bracket-round"><h4>${round.name}</h4>${matches}</div>`;
    }).join('');
  } catch (err) {
    emptyEl.textContent = "Impossible de charger l'arbre du tournoi pour le moment.";
    emptyEl.classList.remove('hidden');
  }
});
