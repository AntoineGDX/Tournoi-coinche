// C'EST COINCHÉ — inscription : crée le compte + la doublette
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('inscription-form');
  const status = document.getElementById('inscription-status');
  if (!form) return;

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const submitBtn = form.querySelector('.submit');
    submitBtn.disabled = true;
    status.textContent = 'Création de ton compte…';

    const teamname = form.teamname.value.trim();
    const player1 = form.player1.value.trim();
    const player2 = form.player2.value.trim();
    const email = form.email.value.trim();
    const email2 = form.email2.value.trim();
    const password = form.password.value;

    const { data, error } = await ccAuth.signUp(email, password);

    if (error) {
      submitBtn.disabled = false;
      status.textContent = error.message.includes('already registered')
        ? "Un compte existe déjà avec cet email. Connecte-toi sur la page Mon compte."
        : error.message;
      return;
    }

    const userId = data.user && data.user.id;
    if (!userId) {
      submitBtn.disabled = false;
      status.textContent = "Impossible de créer le compte pour le moment. Réessaie ou écris-nous à antoine.goudinoux37@gmail.com.";
      return;
    }

    status.textContent = 'Enregistrement de la doublette…';
    const { error: teamError } = await ccAuth.client.from('teams').insert({
      user_id: userId,
      team_name: teamname,
      player1_name: player1,
      player2_name: player2,
      email,
      email2: email2 || null
    });

    if (teamError) {
      submitBtn.disabled = false;
      status.textContent = "Compte créé, mais l'enregistrement de la doublette a échoué : " + teamError.message;
      return;
    }

    window.location.href = 'merci.html';
  });
});
