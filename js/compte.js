// C'EST COINCHÉ — page connexion / création de compte
document.addEventListener('DOMContentLoaded', () => {
  const tabLogin = document.getElementById('tab-login');
  const tabSignup = document.getElementById('tab-signup');
  const formLogin = document.getElementById('form-login');
  const formSignup = document.getElementById('form-signup');
  const loginStatus = document.getElementById('login-status');
  const signupStatus = document.getElementById('signup-status');

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
