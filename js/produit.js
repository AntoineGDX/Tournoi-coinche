// C'EST COINCHÉ — fiche produit (Supabase)
document.addEventListener('DOMContentLoaded', async () => {
  const loading = document.getElementById('product-loading');
  const notFound = document.getElementById('product-not-found');
  const detail = document.getElementById('product-detail');

  const slug = new URLSearchParams(window.location.search).get('slug');

  let product = null;
  if (slug) {
    const { data } = await ccAuth.client.from('products').select('*').eq('slug', slug).maybeSingle();
    product = data;
  }

  loading.hidden = true;

  if (!product) {
    notFound.hidden = false;
    return;
  }

  detail.classList.remove('hidden');
  document.title = `${product.name} — C'est Coinché !`;
  document.getElementById('product-title').textContent = product.name;
  document.getElementById('product-name').textContent = product.name;
  document.getElementById('product-price').textContent = `${product.price}€`;
  document.getElementById('product-description').textContent = product.description || '';

  const visual = document.getElementById('product-visual');
  if (product.image_url) {
    visual.className = `visual ${product.visual_bg || 'y'}`;
    visual.innerHTML = `<img src="${product.image_url}" alt="${product.name}">`;
  } else {
    visual.className = `visual ${product.visual_bg || 'y'}`;
    document.getElementById('product-visual-text').innerHTML = product.visual_text || product.name;
    document.getElementById('product-visual-subtitle').textContent = product.visual_subtitle || '';
  }

  const sizes = product.sizes || [];
  let selectedSize = null;
  if (sizes.length > 0) {
    const block = document.getElementById('product-sizes-block');
    const sizesEl = document.getElementById('product-sizes');
    block.hidden = false;
    sizesEl.innerHTML = sizes.map(s => `<button type="button" class="size-option" data-size="${s}">${s}</button>`).join('');
    sizesEl.querySelectorAll('.size-option').forEach(btn => {
      btn.addEventListener('click', () => {
        sizesEl.querySelectorAll('.size-option').forEach(b => b.classList.remove('on'));
        btn.classList.add('on');
        selectedSize = btn.dataset.size;
      });
    });
  }

  const addBtn = document.getElementById('add-to-cart');
  const status = document.getElementById('add-to-cart-status');
  addBtn.addEventListener('click', () => {
    if (sizes.length > 0 && !selectedSize) {
      status.textContent = 'Choisis une taille avant d\'ajouter au panier.';
      status.className = 'fine err';
      status.classList.remove('hidden');
      return;
    }
    ccCart.add({ slug: product.slug, name: product.name, price: product.price, size: selectedSize, qty: 1 });
    status.textContent = 'Ajouté au panier ✓';
    status.className = 'fine ok';
    status.classList.remove('hidden');
  });
});
