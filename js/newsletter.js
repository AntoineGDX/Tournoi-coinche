// C'EST COINCHÉ — inscription newsletter
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.nl-form').forEach(form => {
    const input = form.querySelector('.nl-email');
    const btn = form.querySelector('.nl-btn');
    const status = form.querySelector('.nl-status');

    form.addEventListener('submit', async e => {
      e.preventDefault();
      const email = input.value.trim();
      if (!email) return;

      btn.disabled = true;
      btn.textContent = '…';

      const { error } = await ccAuth.client
        .from('newsletter_subscribers')
        .insert({ email });

      if (error && error.code === '23505') {
        status.textContent = 'Cette adresse est déjà inscrite.';
        status.className = 'nl-status ok';
      } else if (error) {
        status.textContent = 'Une erreur est survenue, réessaie.';
        status.className = 'nl-status err';
        btn.disabled = false;
        btn.textContent = 'OK';
      } else {
        status.textContent = 'Inscrit·e ! On te tient au courant.';
        status.className = 'nl-status ok';
        input.value = '';
        btn.textContent = '✓';
      }
      status.hidden = false;
    });
  });
});
