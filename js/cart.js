// C'EST COINCHÉ — panier partagé (shop.html + produit.html), persisté en localStorage
const ccCart = {
  KEY: 'cc-cart',

  get() {
    try {
      return JSON.parse(localStorage.getItem(this.KEY)) || [];
    } catch {
      return [];
    }
  },

  save(items) {
    localStorage.setItem(this.KEY, JSON.stringify(items));
    this.render();
  },

  add(item) {
    const items = this.get();
    const existing = items.find(i => i.slug === item.slug && i.size === item.size);
    if (existing) {
      existing.qty += item.qty;
    } else {
      items.push(item);
    }
    this.save(items);
  },

  remove(slug, size) {
    this.save(this.get().filter(i => !(i.slug === slug && i.size === size)));
  },

  count() {
    return this.get().reduce((sum, i) => sum + i.qty, 0);
  },

  total() {
    return this.get().reduce((sum, i) => sum + i.qty * i.price, 0);
  },

  render() {
    const bar = document.querySelector('.cartbar');
    if (!bar) return;
    const label = bar.querySelector('.label');
    const count = this.count();
    const total = this.total();
    if (count > 0) {
      bar.classList.add('on');
    } else {
      bar.classList.remove('on');
    }
    label.innerHTML = `<b>${count} article${count > 1 ? 's' : ''}</b> dans le panier · ${total}€`;
  },

  checkout() {
    const items = this.get();
    if (items.length === 0) return;
    const lines = items.map(i => `- ${i.name} (taille ${i.size || 'unique'}) × ${i.qty} — ${i.price * i.qty}€`);
    const body = `Commande shop C'est Coinché !\n\n${lines.join('\n')}\n\nTotal : ${this.total()}€\n\nMerci d'indiquer ton nom et tes coordonnées pour la livraison / le retrait.`;
    const mailto = `mailto:hello@cestcoinche.fr?subject=${encodeURIComponent("Commande shop — C'est Coinché !")}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
  }
};

document.addEventListener('DOMContentLoaded', () => {
  ccCart.render();
  const checkoutBtn = document.querySelector('.checkout-btn');
  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', () => ccCart.checkout());
  }
});
