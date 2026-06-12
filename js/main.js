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

  /* ---- Checkout (cart → email order to organisateur) ---- */
  const checkoutBtn = document.querySelector('.checkout-btn');
  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', () => {
      const lines = Object.entries(cart)
        .filter(([, qty]) => qty > 0)
        .map(([id, qty]) => {
          const card = document.querySelector(`.tshirt[data-id="${id}"]`);
          const name = card ? card.querySelector('.meta .name').textContent : id;
          return `- ${name} × ${qty}`;
        });
      const total = Object.values(cart).reduce((a, b) => a + b, 0) * PRICE;
      const body = `Commande shop C'est Coinché !\n\n${lines.join('\n')}\n\nTotal : ${total}€\n\nMerci d'indiquer ton nom et tes coordonnées pour la livraison / le retrait.`;
      const mailto = `mailto:antoine.goudinoux37@gmail.com?subject=${encodeURIComponent("Commande shop — C'est Coinché !")}&body=${encodeURIComponent(body)}`;
      window.location.href = mailto;
    });
  }

});
