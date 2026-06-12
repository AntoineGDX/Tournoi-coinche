// C'EST COINCHÉ — site interactions (vanilla JS)
document.addEventListener('DOMContentLoaded', () => {

  /* ---- Smooth nav scroll ---- */
  document.querySelectorAll('[data-nav]').forEach(el => {
    el.addEventListener('click', () => {
      const target = document.getElementById(el.dataset.nav);
      if (target) window.scrollTo({ top: target.offsetTop - 60, behavior: 'smooth' });
    });
  });

  /* ---- Shop / cart ---- */
  const PRICE = 28;
  const cart = {};
  const cartbar = document.querySelector('.cartbar');
  const cartbarLabel = document.querySelector('.cartbar .label');
  const navCartBtn = document.querySelector('.nav-cta.cart');

  function updateCart() {
    let count = 0;
    document.querySelectorAll('.tshirt').forEach(card => {
      const id = card.dataset.id;
      const qty = cart[id] || 0;
      const qtyEl = card.querySelector('.qty');
      qtyEl.textContent = qty ? `Dans le panier · ×${qty}` : 'Ajouter au panier';
    });

    Object.values(cart).forEach(q => count += q);
    const total = count * PRICE;

    if (count > 0) {
      cartbar.classList.add('on');
      navCartBtn.classList.add('on');
    } else {
      cartbar.classList.remove('on');
      navCartBtn.classList.remove('on');
    }
    cartbarLabel.innerHTML = `<b>${count} article${count > 1 ? 's' : ''}</b> dans le panier · ${total}€`;
    navCartBtn.textContent = `PANIER · ${count}`;
  }

  document.querySelectorAll('.tshirt').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.dataset.id;
      cart[id] = (cart[id] || 0) + 1;
      updateCart();
    });
  });

  navCartBtn.addEventListener('click', () => {
    document.getElementById('shop').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  /* ---- Signup form ---- */
  const form = document.querySelector('.signup-form');
  const success = document.querySelector('.success');
  const successEmail = document.querySelector('.success .email');
  const successNum = document.querySelector('.success .num');
  const retryBtn = document.querySelector('.success .btn');

  if (form) {
    form.addEventListener('submit', e => {
      e.preventDefault();
      const email = form.querySelector('input[type="email"]').value || 'ton email';
      successEmail.textContent = email;
      successNum.textContent = '#' + String(Math.floor(Math.random() * 32) + 1).padStart(2, '0');
      form.classList.add('hidden');
      success.classList.remove('hidden');
    });
  }

  if (retryBtn) {
    retryBtn.addEventListener('click', () => {
      form.reset();
      form.classList.remove('hidden');
      success.classList.add('hidden');
    });
  }
});
