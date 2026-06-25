# CLAUDE.md — CestCoinche

Contexte chargé automatiquement. Ne pas supprimer.

---

## Projet

Site officiel du tournoi de coinche **C'est Coinché !** — 1ère édition, Nice, Le 109.
URL : https://cestcoinche.fr
Repo : https://github.com/AntoineGDX/Tournoi-coinche (GitHub Pages, branche `main`)
Contact : hello@cestcoinche.fr / antoine.goudinoux37@gmail.com

---

## Stack technique

- **Frontend** : HTML/CSS/JS vanilla, pas de framework
- **CSS** : `css/site.css` (styles globaux) + `css/tokens.css` (variables)
- **Backend** : Supabase (auth + DB + storage)
- **Auth** : `js/auth.js` + `js/supabase-config.js` (client partagé via `ccAuth`)
- **Animations** : GSAP + ScrollTrigger sur `index.html`
- **Déploiement** : push sur `main` → GitHub Pages → cestcoinche.fr (HTTPS actif)

---

## Architecture des pages

| Fichier | Rôle |
|---|---|
| `index.html` | Page principale (animation GSAP cartes + dealer) |
| `inscription.html` | Formulaire d'inscription doublette/solo |
| `equipes.html` | Liste des équipes inscrites |
| `reglement.html` | Règlement complet de la coinche |
| `shop.html` | Boutique t-shirts (chargée depuis Supabase `products`) |
| `produit.html?slug=...` | Fiche produit individuelle |
| `mon-equipe.html` | Espace joueur connecté |
| `binome.html` | Recherche de binôme (joueurs solo) |
| `arbre.html` | Arbre du tournoi |
| `admin.html` | Back-office (réservé admins) |
| `compte.html` | Connexion / création de compte |
| `old-main.html` | Ancienne index.html (sauvegarde sans animation) |

---

## Supabase — tables principales

- `teams` : équipes inscrites (doublette ou solo)
- `admins` : liste des admins (RLS)
- `products` : catalogue t-shirts (slug, name, price, sizes, visual_text, visual_bg, sort_order)
- `partner_requests` : demandes de binôme entre solos

Migrations : `supabase/migration_002` → `migration_011`

---

## Animation GSAP (index.html)

- `#stage` : position fixed, z-index 400, survole tout
- Dealer : `#dealer` (image `croupierdos.png`), bottom-right, taille `clamp(120px,14.4vw,208px)`
- 4 cartes `.fc` distribuées en éventail, flip pendant le trajet
- ScrollTrigger : trigger `#hero`, start `25% top`, end `+=300%`, scrub 1.2
- Cards démarrent à `x: D.x - 60, y: D.y - 20`, scale 0.05
- Header `.rules-head-wrap` : sticky, s'envole avec les cartes en fin d'animation
- Responsive : spread calculé depuis `window.innerWidth`, marges cartes via JS

---

## Shop — produits Supabase

Slugs existants : `cest-coinche`, `coincheur`, `generale`, `je-pisse`, `34`
- `generale` : 500pts, visuel texte "GÉNÉRALE"
- `je-pisse` : visuel texte "JE PISSE"
- `34` : visuel `le<br>34<br><span red>V</span> · <span red>9</span>`, bg jaune

---

## SEO — état actuel

- Meta tags (title, description, og:*) sur toutes les pages publiques
- Canonical sur chaque page indexable
- `robots.txt` : bloque admin/compte/mon-equipe/arbre/binome/merci
- `sitemap.xml` : 5 pages publiques soumis à Google Search Console ✅
- HTTPS actif via GitHub Pages ✅
- Schema.org `SportsEvent` JSON-LD sur index.html (dates 2027-06-13/14, performer DJ Goud, validFrom 2026-06-24)
- H1 visible SEO : "Tournoi de coinche — Nice, 13 & 14 juin" (`.hero-tagline`)
- Favicon : `assets/favicon_io/` (ico + png + apple-touch-icon) sur toutes les pages
- Indexation Google : en cours (sitemap traité, 5 pages découvertes)

---

## Ce qui reste à faire

### Court terme
- [ ] Créer l'association **LaGoodAsso** (minimum 2 personnes : président + trésorier)
- [ ] Envoyer email + PDF de présentation au 109 (contact générique)
- [ ] Si pas de réponse : contacter Panda Events pour co-organisation
- [ ] Déclarer l'événement à la **SACEM** (DJ set)
- [ ] Demande d'**autorisation temporaire de débit de boissons** en mairie (si le 109 n'a pas de licence)
- [ ] Mettre en place **Meta Ads** ciblage Nice pour la visibilité

### Moyen terme
- [ ] Vrai shop complet (plan en `C:\Users\a.goudinoux\.claude\plans\gleaming-booping-kite.md`)
- [ ] Backlinks : presse locale niçoise, forums coinche, associations
- [ ] Google My Business pour l'événement
- [ ] Image OG réelle (1200×630px) pour remplacer le logo SVG

---

## Décisions importantes prises

- `index.html` = version avec animation GSAP (ancienne version → `old-main.html`)
- Pas de `will-change` sur `.fc` (causait pixelisation GPU)
- Flip des cartes via opacity crossfade à rotateY=90 (backface-visibility ne fonctionne pas avec GSAP matrix3d)
- Header `.rules-head-wrap` hors du `#stage`, position sticky dans le flux normal
- H1 SEO visible plutôt que caché (évite pénalité Google keyword stuffing)
- Email 109 positionné comme organisateur principal, co-organisation en option non mentionnée
