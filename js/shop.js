// C'EST COINCHÉ — liste des produits du shop (Supabase)
document.addEventListener('DOMContentLoaded', async () => {
  const grid = document.getElementById('shop-grid');
  const empty = document.getElementById('shop-empty');

  const { data: products, error } = await ccAuth.client
    .from('products')
    .select('*')
    .order('sort_order');

  if (error || !products || products.length === 0) {
    empty.hidden = false;
    return;
  }

  grid.innerHTML = products.map(p => `
    <a class="tshirt" href="produit.html?slug=${encodeURIComponent(p.slug)}">
      <div class="visual ${p.visual_bg || 'y'}">
        ${p.image_url
          ? `<img src="${p.image_url}" alt="${p.name}">`
          : `<div>
              <div class="t">${p.visual_text || p.name}</div>
              ${p.visual_subtitle ? `<div class="s">${p.visual_subtitle}</div>` : ''}
            </div>`
        }
      </div>
      <div class="meta">
        <div>
          <div class="name">${p.name}</div>
          <div class="qty">Voir l'article</div>
        </div>
        <div class="price">${p.price}€</div>
      </div>
    </a>
  `).join('');
});
