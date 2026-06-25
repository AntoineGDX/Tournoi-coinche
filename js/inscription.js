// C'EST COINCHÉ — inscription : solo ou doublette, avec ou sans compte
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('inscription-form');
  const status = document.getElementById('inscription-status');
  if (!form) return;

  const rowPlayers = document.getElementById('row-players');
  const blockPlayer2 = document.getElementById('block-player2');
  const inputPlayer2 = document.getElementById('input-player2');
  const blockEmail2 = document.getElementById('block-email2');
  const blockTeamname = document.getElementById('block-teamname');
  const inputTeamname = document.getElementById('input-teamname');
  const accountCheckRow = document.getElementById('account-check-row');
  const createAccountCheckbox = document.getElementById('create-account');
  const passwordBlock = document.getElementById('password-block');
  const inputPassword = document.getElementById('input-password');
  const soloNote = document.getElementById('solo-note');
  const noBinomeHint = document.getElementById('no-binome-hint');

  function currentType() {
    return form.querySelector('input[name="regtype"]:checked').value;
  }

  function updatePasswordVisibility() {
    const isSolo = currentType() === 'solo';
    const createAccount = isSolo || createAccountCheckbox.checked;
    passwordBlock.classList.toggle('hidden', !createAccount);
    inputPassword.required = createAccount;
  }

  function applyType() {
    const isSolo = currentType() === 'solo';

    rowPlayers.classList.toggle('solo', isSolo);
    blockPlayer2.classList.toggle('hidden', isSolo);
    inputPlayer2.required = !isSolo;

    blockEmail2.classList.toggle('hidden', isSolo);

    blockTeamname.classList.toggle('hidden', isSolo);
    inputTeamname.required = !isSolo;

    accountCheckRow.classList.toggle('hidden', isSolo);
    soloNote.classList.toggle('hidden', !isSolo);
    noBinomeHint.classList.toggle('hidden', isSolo);

    updatePasswordVisibility();
  }

  form.querySelectorAll('input[name="regtype"]').forEach(input => {
    input.addEventListener('change', applyType);
  });
  createAccountCheckbox.addEventListener('change', updatePasswordVisibility);
  applyType();

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const submitBtn = form.querySelector('.submit');
    submitBtn.disabled = true;

    const regType = currentType();
    const isSolo = regType === 'solo';
    const createAccount = isSolo || createAccountCheckbox.checked;

    const player1 = form.player1.value.trim();
    const player2 = isSolo ? null : form.player2.value.trim();
    const email = form.email.value.trim();
    const email2 = isSolo ? null : (form.email2.value.trim() || null);
    const password = form.password.value;

    // Validations
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (player1.length < 2) {
      status.textContent = 'Le prénom et nom du joueur 1 doit contenir au moins 2 caractères.';
      submitBtn.disabled = false; return;
    }
    if (!isSolo && player2 && player2.length < 2) {
      status.textContent = 'Le prénom et nom du joueur 2 doit contenir au moins 2 caractères.';
      submitBtn.disabled = false; return;
    }
    if (!emailRegex.test(email)) {
      status.textContent = 'L\'adresse email du joueur 1 n\'est pas valide.';
      submitBtn.disabled = false; return;
    }
    if (email2 && !emailRegex.test(email2)) {
      status.textContent = 'L\'adresse email du joueur 2 n\'est pas valide.';
      submitBtn.disabled = false; return;
    }
    if (createAccount && password.length < 8) {
      status.textContent = 'Le mot de passe doit contenir au moins 8 caractères.';
      submitBtn.disabled = false; return;
    }

    let teamname = form.teamname.value.trim();
    if (!teamname) teamname = player1;

    let userId = null;

    if (createAccount) {
      status.textContent = 'Création de ton compte…';
      const { data, error } = await ccAuth.signUp(email, password);

      if (error) {
        submitBtn.disabled = false;
        status.textContent = error.message.includes('already registered')
          ? "Un compte existe déjà avec cet email. Connecte-toi sur la page Mon compte."
          : error.message;
        return;
      }

      userId = data.user && data.user.id;
      if (!userId) {
        submitBtn.disabled = false;
        status.textContent = "Impossible de créer le compte pour le moment. Réessaie ou écris-nous à hello@cestcoinche.fr.";
        return;
      }
    }

    status.textContent = 'Enregistrement de ton inscription…';
    const { error: teamError } = await ccAuth.client.from('teams').insert({
      user_id: userId,
      team_name: teamname,
      player1_name: player1,
      player2_name: player2,
      email,
      email2,
      registration_type: regType,
      looking_for_partner: isSolo
    });

    if (teamError) {
      submitBtn.disabled = false;
      status.textContent = (createAccount ? "Compte créé, mais l'enregistrement de l'inscription a échoué : " : "L'enregistrement de l'inscription a échoué : ") + teamError.message;
      return;
    }

    // Email de confirmation d'inscription
    ccAuth.client.functions.invoke('partner-notify', {
      body: {
        event: 'inscription_created',
        email,
        player1Name: player1,
        teamName: teamname,
        registrationType: regType,
      }
    });

    window.location.href = 'merci.html?type=' + regType;
  });
});
