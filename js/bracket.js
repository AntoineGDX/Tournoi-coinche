// C'EST COINCHÉ — arbre du tournoi (chargé depuis Supabase, table matches)
document.addEventListener('DOMContentLoaded', async () => {
  const bracketEl = document.getElementById('bracket');
  const emptyEl = document.getElementById('bracket-empty');

  function teamHtml(name, score, isWinner) {
    const label = name ? name : 'À définir';
    const scoreLabel = (score === null || score === undefined) ? '' : `<span class="score">${score}</span>`;
    return `<div class="team${isWinner ? ' winner' : ''}"><span class="name">${label}</span>${scoreLabel}</div>`;
  }

  try {
    const { data: matches, error } = await ccAuth.client
      .from('matches')
      .select('*')
      .order('round_order')
      .order('match_order');

    if (error) throw error;

    const hasContent = matches.some(m => m.team1_name || m.team2_name);
    if (!hasContent) {
      emptyEl.classList.remove('hidden');
      return;
    }

    const roundsMap = new Map();
    matches.forEach(m => {
      if (!roundsMap.has(m.round_order)) {
        roundsMap.set(m.round_order, { name: m.round_name, matches: [] });
      }
      roundsMap.get(m.round_order).matches.push(m);
    });

    const rounds = [...roundsMap.entries()].sort((a, b) => a[0] - b[0]).map(([, round]) => round);

    bracketEl.innerHTML = rounds.map(round => {
      const matchesHtml = round.matches.map(m => {
        const bothScored = m.score1 !== null && m.score2 !== null;
        const win1 = bothScored && m.score1 > m.score2;
        const win2 = bothScored && m.score2 > m.score1;
        return `<div class="bracket-match">
          ${teamHtml(m.team1_name, m.score1, win1)}
          ${teamHtml(m.team2_name, m.score2, win2)}
        </div>`;
      }).join('');
      return `<div class="bracket-round"><h4>${round.name}</h4>${matchesHtml}</div>`;
    }).join('');
  } catch (err) {
    emptyEl.textContent = "Impossible de charger l'arbre du tournoi pour le moment.";
    emptyEl.classList.remove('hidden');
  }
});
