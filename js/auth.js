// C'EST COINCHÉ — client Supabase + état de connexion dans la nav
// Nécessite que js/supabase-config.js soit chargé avant ce fichier,
// ainsi que le SDK : https://unpkg.com/@supabase/supabase-js@2

const ccSupabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const ccAuth = {
  client: ccSupabase,

  async getSession() {
    const { data } = await ccSupabase.auth.getSession();
    return data.session;
  },

  async signUp(email, password) {
    return ccSupabase.auth.signUp({ email, password });
  },

  async signIn(email, password) {
    return ccSupabase.auth.signInWithPassword({ email, password });
  },

  async signOut() {
    await ccSupabase.auth.signOut();
    window.location.href = 'index.html';
  },

  async isAdmin(userId) {
    const { data } = await ccSupabase.from('admins').select('user_id').eq('user_id', userId).maybeSingle();
    return !!data;
  }
};

document.addEventListener('DOMContentLoaded', async () => {
  const session = await ccAuth.getSession();
  const loggedIn = !!session;

  document.querySelectorAll('[data-auth="in"]').forEach(el => {
    el.classList.toggle('hidden', !loggedIn);
  });
  document.querySelectorAll('[data-auth="out"]').forEach(el => {
    el.classList.toggle('hidden', loggedIn);
  });

  const logoutBtn = document.getElementById('nav-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => ccAuth.signOut());
  }
});
