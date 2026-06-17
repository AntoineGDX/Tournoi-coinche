// C'EST COINCHÉ — page connexion / création de compte
document.addEventListener('DOMContentLoaded', () => {
  const tabLogin = document.getElementById('tab-login');
  const tabSignup = document.getElementById('tab-signup');
  const formLogin = document.getElementById('form-login');
  const formSignup = document.getElementById('form-signup');
  const formReset = document.getElementById('form-reset');
  const formNewPassword = document.getElementById('form-new-password');
  const loginStatus = document.getElementById('login-status');
  const signupStatus = document.getElementById('signup-status');
  const resetStatus = document.getElementById('reset-status');
  const newPasswordStatus = document.getElementById('new-password-status');

  // Si l'URL contient un token de récupération Supabase, afficher le formulaire nouveau MDP
  const hash = Object.fromEntries(new URLSearchParams(window.location.hash.slice(1)));
  if (hash.type === 'recovery') {
    [formLogin, formSignup].forEach(f => f.classList.add('hidden'));
    document.querySelector('.signup-form + .signup-form')?.classList.add('hidden');
    formNewPassword.classList.remove('hidden');
    document.getElementById('tab-login').closest('div').classList.add('hidden');
  }

  // Mot de passe oublié
  document.getElementById('forgot-link').addEventListener('click', e => {
    e.preventDefault();
    formLogin.classList.add('hidden');
    formReset.classList.remove('hidden');
  });

  document.getElementById('back-to-login').addEventListener('click', e => {
    e.preventDefault();
    formReset.classList.add('hidden');
    formLogin.classList.remove('hidden');
  });

  formReset.addEventListener('submit', async e => {
    e.preventDefault();
    resetStatus.textContent = 'Envoi en cours…';
    const email = formReset.email.value.trim();
    const { error } = await ccAuth.client.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://cestcoinche.fr/compte.html',
    });
    if (error) {
      resetStatus.textContent = 'Une erreur est survenue, réessaie.';
      return;
    }
    resetStatus.textContent = '✓ Email envoyé ! Vérifie ta boîte mail.';
    formReset.querySelector('button').disabled = true;
  });

  formNewPassword.addEventListener('submit', async e => {
    e.preventDefault();
    newPasswordStatus.textContent = 'Enregistrement…';
    const password = formNewPassword.password.value;
    const { error } = await ccAuth.client.auth.updateUser({ password });
    if (error) {
      newPasswordStatus.textContent = 'Erreur : ' + error.message;
      return;
    }
    newPasswordStatus.textContent = '✓ Mot de passe mis à jour !';
    setTimeout(() => { window.location.href = 'mon-equipe.html'; }, 1200);
  });

  tabLogin.addEventListener('click', () => {
    tabLogin.classList.remove('ghost');
    tabSignup.classList.add('ghost');
    formLogin.classList.remove('hidden');
    formSignup.classList.add('hidden');
  });

  tabSignup.addEventListener('click', () => {
    tabSignup.classList.remove('ghost');
    tabLogin.classList.add('ghost');
    formSignup.classList.remove('hidden');
    formLogin.classList.add('hidden');
  });

  formLogin.addEventListener('submit', async e => {
    e.preventDefault();
    loginStatus.textContent = 'Connexion…';
    const email = formLogin.email.value;
    const password = formLogin.password.value;
    const { error } = await ccAuth.signIn(email, password);
    if (error) {
      loginStatus.textContent = error.message === 'Invalid login credentials'
        ? 'Email ou mot de passe incorrect.'
        : error.message;
      return;
    }
    window.location.href = 'mon-equipe.html';
  });

  formSignup.addEventListener('submit', async e => {
    e.preventDefault();
    signupStatus.textContent = 'Création du compte…';
    const email = formSignup.email.value;
    const password = formSignup.password.value;
    const { error } = await ccAuth.signUp(email, password);
    if (error) {
      signupStatus.textContent = error.message.includes('already registered')
        ? 'Un compte existe déjà avec cet email — connecte-toi plutôt.'
        : error.message;
      return;
    }
    window.location.href = 'inscription.html';
  });
});
