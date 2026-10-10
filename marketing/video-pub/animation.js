/* Vidéo de présentation de Béthanie — motion design calé sur la musique (128 battements par minute, 32 s) et la voix off.
 * Tout le contenu est construit ici, sans innerHTML (createElement / textContent).
 * Chaque animation se place sur la ligne de temps en battements (B) : rendu.mjs fige l'image à n'importe quel instant
 * (window.__seek) et récupère les repères sonores (window.__cues) pour la bande-son (son.py). */
'use strict';

/* ------------------------------------------------------------------ */
/* Temps, courbes, outils                                              */
/* ------------------------------------------------------------------ */
const BPM = 128;
const BEAT = 60000 / BPM; // 468,75 ms
const B = (n) => n * BEAT;
const TOTAL = B(68); // 31,9 s
const OUT = 'cubic-bezier(0.16, 1, 0.3, 1)';
const SOFT = 'cubic-bezier(0.22, 1, 0.36, 1)';
const SPRING = 'cubic-bezier(0.34, 1.56, 0.64, 1)';
const INOUT = 'cubic-bezier(0.65, 0, 0.35, 1)';
const IN = 'cubic-bezier(0.7, 0, 0.84, 0)';
const S = 500 / 390; // échelle des captures (390 px de large) dans l'écran du téléphone (500 px)
const SX = (x) => x * S;
const SY = (y) => y * S + 48; // sous la barre d'état

const CUES = [];
/** Repère sonore (son.py) : battement, type d'effet, réglages éventuels. */
const cue = (beat, type, extra = {}) => CUES.push({ t: Math.round(B(beat)), type, ...extra });
const EFFECTS = [];
/** Animation d'un élément sur la ligne de temps (début et durée en battements). */
const at = (el, frames, start, dur, easing = OUT, fill = 'both', extra = {}) =>
  el.animate(frames, { delay: B(start), duration: B(dur), easing, fill, ...extra });
const fadeIn = (el, start, dur = 0.75, from = 'translateY(40px)', easing = OUT) =>
  at(el, [{ opacity: 0, transform: from }, { opacity: 1, transform: 'none' }], start, dur, easing);
const fadeOut = (el, start, dur = 0.5, to = 'translateY(-40px)') =>
  at(el, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: to }], start, dur, IN, 'forwards');
const pop = (el, start, dur = 0.9) =>
  at(el, [{ opacity: 0, transform: 'scale(0.4)' }, { opacity: 1, transform: 'scale(1)' }], start, dur, SPRING);

/** Élément HTML (ou SVG avec svg: true) construit sans innerHTML. */
const h = (tag, props = {}, ...children) => {
  const el = props.svg ? document.createElementNS('http://www.w3.org/2000/svg', tag) : document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (key === 'svg' || value == null) continue;
    if (key === 'style' && typeof value === 'object') Object.assign(el.style, value);
    else if (key === 'text') el.textContent = value;
    else el.setAttribute(key, value);
  }
  for (const child of children.flat()) if (child != null) el.append(child);
  return el;
};
const icon = (name, style) => h('i', { class: `fa-solid ${name}`, style });
const flag = (colors) => h('span', { class: 'flag' }, colors.map((c) => h('i', { style: { background: c } })));
const CI = ['#F77F00', '#ffffff', '#009E60'];
const SN = ['#00853F', '#FDEF42', '#E31B23'];
/** Nombre pseudo-aléatoire stable : la vidéo est identique à chaque rendu. */
const rnd = (i, s) => { const x = Math.sin(i * 12.9898 + s * 78.233) * 43758.5453; return x - Math.floor(x); };

/** Ligne de titre révélée par un masque : parts = [[texte, classe?], …]. */
const maskLine = (parts) =>
  h('span', { class: 'mask' }, h('span', { class: 'mi' }, parts.map(([text, cls]) => h('span', { class: cls, text }))));
const revealLines = (root, start, step = 0.5) =>
  [...root.querySelectorAll('.mi')].forEach((mi, i) =>
    at(mi, [{ transform: 'translateY(140%) rotate(3deg)' }, { transform: 'none' }], start + i * step, 1, OUT));

/** Légende de scène : pastille (« 01 · DÉCOUVREZ ») et titre sur deux lignes. */
const caption = (tone, label, iconName, lines) => {
  const pill = h('span', { class: 'pill' }, icon(iconName), h('span', { text: label }));
  const title = h('h2', {}, lines.map(maskLine));
  return { root: h('div', { class: `cap on-${tone}` }, pill, title), pill, title };
};
const showCaption = (cap, start, end) => {
  pop(cap.pill, start, 0.8);
  revealLines(cap.title, start + 0.25, 0.5);
  if (end != null) {
    fadeOut(cap.pill, end, 0.4, 'translateY(-60px)');
    fadeOut(cap.title, end + 0.05, 0.45, 'translateY(-80px)');
  }
};

/* ------------------------------------------------------------------ */
/* Logo (même dessin que le site, BethanieLogo.tsx)                    */
/* ------------------------------------------------------------------ */
const AFRICA = 'M21.6 7.1 32.6 5.9 42.4 5.5 41.4 9.5 45.4 10.8 52.6 14 53.9 11.8 60.1 12.3 67.6 12.5 69.5 14.4 75.4 27.4 78.3 32.4 83 36.3 85.1 38.9 93 37.1 93.1 38.9 85.4 49.4 78.5 56.9 78 60.4 79.5 65.6 72.4 76.6 69.6 84.4 67.6 89.3 60.9 94.4 53.9 95.4 51.9 94.4 47 80.6 45.6 67.6 45.4 62.9 44.3 59.4 40.6 51.4 41 46.9 36.4 46.5 33.1 43.9 28.9 44.9 26.4 46 23.9 45.3 19.3 46.4 15.4 44 12.4 41.3 8.9 37.5 7 33.5 8.9 29.4 7.6 25.9 10.8 19.4 16.9 13.9 19.4 9.9Z';
const logo = (id, size, style) => {
  const svg = h('svg', { svg: true, viewBox: '0 0 100 100', width: size, height: size, class: 'abs', style },
    h('defs', { svg: true },
      h('linearGradient', { svg: true, id, x1: '0', y1: '0', x2: '1', y2: '1' },
        h('stop', { svg: true, offset: '0%', 'stop-color': '#F8DC8C' }),
        h('stop', { svg: true, offset: '55%', 'stop-color': '#E5A93C' }),
        h('stop', { svg: true, offset: '100%', 'stop-color': '#B87C17' }))),
    h('path', { svg: true, d: AFRICA, fill: `url(#${id})`, stroke: `url(#${id})`, 'stroke-width': '3', 'stroke-linejoin': 'round' }),
    h('ellipse', { svg: true, cx: '88', cy: '75', rx: '2.6', ry: '7.5', transform: 'rotate(18 88 75)', fill: '#D19A2E' }),
    h('g', { svg: true, fill: 'none', stroke: '#0F5132', 'stroke-width': '5', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' },
      h('path', { svg: true, class: 'cart', d: 'M31 24h7l7 22h22l6-15H42', 'stroke-dasharray': '160', 'stroke-dashoffset': '160' }),
      h('path', { svg: true, class: 'cart', d: 'M50 31l2 15M60 31l-1 15', 'stroke-width': '3', 'stroke-dasharray': '160', 'stroke-dashoffset': '160' })),
    ...[49, 64].map((cx) => h('circle', { svg: true, class: 'wheel', cx: String(cx), cy: '53', r: '3.6', fill: '#0F5132',
      style: { transformBox: 'fill-box', transformOrigin: 'center', transform: 'scale(0)' } })));
  return svg;
};
const animateLogo = (svg, start, speed = 1) => {
  at(svg, [{ opacity: 0, transform: 'scale(0.3) rotate(-12deg)' }, { opacity: 1, transform: 'none' }], start, 1.6 * speed, SPRING);
  svg.querySelectorAll('.cart').forEach((p, i) => at(p, [{ strokeDashoffset: 160 }, { strokeDashoffset: 0 }], start + 1 * speed + i * 0.25, 1.6 * speed, OUT));
  svg.querySelectorAll('.wheel').forEach((w, i) => at(w, [{ transform: 'scale(0)' }, { transform: 'scale(1)' }], start + 2.3 * speed + i * 0.2, 0.8, SPRING));
};
const brandName = (size, top) => {
  const el = h('div', { class: 'abs brand-name', style: { top: `${top}px`, fontSize: `${size}px` } });
  [...'BÉTHANIE'].forEach((c) => el.append(h('span', { class: 'mask', style: { display: 'inline-block', padding: '0 0.01em 0.08em' } }, h('span', { class: 'mi ch', text: c }))));
  return el;
};
const revealLetters = (el, start, step = 0.14) =>
  [...el.querySelectorAll('.mi')].forEach((mi, i) =>
    at(mi, [{ transform: 'translateY(130%)' }, { transform: 'none' }], start + i * step, 1.1, OUT));

/* ------------------------------------------------------------------ */
/* Construction de la scène                                            */
/* ------------------------------------------------------------------ */
const stage = document.getElementById('stage');
const L = {};

const build = () => {
  stage.replaceChildren();
  CUES.length = 0;
  EFFECTS.length = 0;

  /* ---------- Fonds ---------- */
  const bgGreen = h('div', { class: 'layer bg-green' });
  const bgCream1 = h('div', { class: 'layer bg-cream' });
  const bgCream2 = h('div', { class: 'layer bg-cream' });
  const kente = h('div', { class: 'kente' });
  const blobA = h('div', { class: 'blob', style: { left: '-300px', top: '-200px' } });
  const blobB = h('div', { class: 'blob', style: { left: '420px', top: '1100px' } });
  const black = h('div', { class: 'layer', style: { background: '#000' } });
  stage.append(bgGreen, bgCream1, bgCream2, kente, blobA, blobB);

  // Motif et halos dorés qui dérivent lentement (fond vivant, sans distraire).
  at(kente, [{ transform: 'translate(0, 0)' }, { transform: 'translate(112px, 112px)' }], 0, 68, 'linear');
  at(blobA, [{ transform: 'translate(0, 0) scale(1)' }, { transform: 'translate(260px, 380px) scale(1.25)' }], 0, 34, INOUT, 'both', { iterations: 2, direction: 'alternate' });
  at(blobB, [{ transform: 'translate(0, 0) scale(1.1)' }, { transform: 'translate(-320px, -420px) scale(0.9)' }], 0, 34, INOUT, 'both', { iterations: 2, direction: 'alternate' });

  /* ---------- 1. Ouverture (battements 0 à 8) ---------- */
  const intro = h('div', { class: 'layer' });
  const glow = h('div', { class: 'abs', style: { left: '140px', top: '330px', width: '800px', height: '800px', borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(248,220,140,0.55), rgba(229,169,60,0) 62%)' } });
  const particles = h('div', { class: 'layer' });
  for (let i = 0; i < 28; i++) {
    const p = h('span', { class: 'particle', style: { left: `${120 + rnd(i, 1) * 840}px`, top: `${560 + rnd(i, 2) * 760}px`, transform: `scale(${0.6 + rnd(i, 4)})` } });
    particles.append(p);
    at(p, [{ opacity: 0, transform: 'translateY(0)' }, { opacity: 0.95, offset: 0.25 }, { opacity: 0, transform: `translateY(-${220 + rnd(i, 5) * 260}px)` }],
      rnd(i, 3) * 6, 4 + rnd(i, 6) * 2, 'ease-out');
  }
  const mark = logo('goldIntro', 360, { left: '360px', top: '520px' });
  const name1 = brandName(132, 930);
  const slogan = h('div', { class: 'abs', style: { left: '0', right: '0', top: '1130px', textAlign: 'center', fontSize: '48px', fontWeight: '600', color: 'rgba(255,255,255,0.92)', letterSpacing: '0.02em' } });
  const sloganWords = ['Achetez', 'Vendez', 'Bénissez'].map((w) => h('span', { style: { display: 'inline-block' }, text: w }));
  const dots = [h('span', { class: 'gold', style: { display: 'inline-block', margin: '0 22px' }, text: '•' }), h('span', { class: 'gold', style: { display: 'inline-block', margin: '0 22px' }, text: '•' })];
  slogan.append(sloganWords[0], dots[0], sloganWords[1], dots[1], sloganWords[2]);
  const line = h('div', { class: 'abs', style: { left: '390px', top: '1235px', width: '300px', height: '6px', borderRadius: '9px', background: 'linear-gradient(90deg,#f4cd6e,#e5a93c)', transform: 'scaleX(0)' } });
  intro.append(glow, particles, mark, name1, slogan, line);
  stage.append(intro);

  at(black, [{ opacity: 1 }, { opacity: 0 }], 0, 1.2, 'ease-out', 'forwards');
  at(glow, [{ opacity: 0, transform: 'scale(0.5)' }, { opacity: 1, transform: 'scale(1)' }], 0.5, 3, OUT);
  animateLogo(mark, 0.5);
  cue(0.5, 'shimmer');
  revealLetters(name1, 2.6);
  cue(2.6, 'whoosh', { gain: 0.5 });
  sloganWords.forEach((w, i) => { pop(w, 5 + i, 0.8); cue(5 + i, 'tick'); });
  dots.forEach((d, i) => pop(d, 5.5 + i, 0.6));
  at(line, [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], 7, 0.75, OUT);
  // Sortie : l'ouverture s'agrandit et s'efface (traversée vers la scène suivante).
  at(intro, [{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(1.35)' }], 7.6, 0.6, IN, 'forwards');

  /* ---------- 2. La promesse (8 à 16) — fond crème ---------- */
  at(bgCream1, [{ clipPath: 'circle(0% at 50% 48%)' }, { clipPath: 'circle(150% at 50% 48%)' }], 7.75, 0.9, INOUT);
  at(bgCream1, [{ transform: 'translateY(0)' }, { transform: 'translateY(-100%)' }], 15.6, 0.6, INOUT, 'forwards');
  cue(7.75, 'whoosh');
  const hook = h('div', { class: 'layer' });
  const hookTitle = h('h1', { class: 'abs', style: { left: '0', right: '0', top: '470px', textAlign: 'center', fontSize: '136px', fontWeight: '700', lineHeight: '1.0', letterSpacing: '-0.035em', color: 'var(--brand)' } },
    maskLine([['Le marché']]),
    h('span', { class: 'mask' }, h('span', { class: 'mi', style: { position: 'relative' } }, h('span', { class: 'gold', text: 'africain' }), h('span', { class: 'underline', style: { transform: 'scaleX(0)' } }))),
    maskLine([['dans votre']]),
    maskLine([['poche.']]));
  const hookSub = h('p', { class: 'abs', style: { left: '0', right: '0', top: '1070px', textAlign: 'center', fontSize: '42px', color: '#475a50', fontWeight: '500' } },
    h('span', { text: 'Vendeurs vérifiés • Prix en FCFA' }));
  const thumbs = h('div', { class: 'abs', style: { left: '0', right: '0', top: '1200px', display: 'flex', justifyContent: 'center', gap: '28px' } });
  const thumbList = ['mode', 'electronique', 'alimentation', 'enfants'].map((id) =>
    h('span', { style: { width: '200px', height: '200px', borderRadius: '50%', background: '#fff', boxShadow: '0 24px 50px -22px rgba(16,36,26,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' } },
      h('img', { src: `/public/images/categories/${id}.webp`, alt: '', style: { width: '190px', height: '190px', objectFit: 'contain', mixBlendMode: 'multiply' } })));
  thumbs.append(...thumbList);
  const countries = h('div', { class: 'abs', style: { left: '0', right: '0', top: '1480px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '22px', fontSize: '38px', fontWeight: '600', color: 'var(--ink)' } },
    flag(CI), h('span', { text: 'Côte d’Ivoire' }), h('span', { class: 'gold', text: '•' }), flag(SN), h('span', { text: 'Sénégal' }));
  hook.append(hookTitle, hookSub, thumbs, countries);
  stage.append(hook);
  revealLines(hookTitle, 8.25, 0.75);
  at(hookTitle.querySelector('.underline'), [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], 9.6, 0.8, OUT);
  fadeIn(hookSub, 11.5, 0.9);
  thumbList.forEach((t, i) => { pop(t, 12.5 + i * 0.5, 0.9); cue(12.5 + i * 0.5, 'pop', { pitch: 1 + i * 0.12 }); });
  fadeIn(countries, 14.25, 0.8, 'translateY(30px)');
  at(hook, [{ opacity: 1, transform: 'translateY(0)' }, { opacity: 0, transform: 'translateY(-420px)' }], 15.5, 0.6, IN, 'forwards');
  cue(15.5, 'whoosh');

  /* ---------- Téléphone (scènes 3 à 7) ---------- */
  const phoneWrap = h('div', { class: 'phone-wrap' });
  const phone = h('div', { class: 'phone' });
  const screen = h('div', { class: 'screen' });
  const sbarLight = h('div', { class: 'sbar', style: { background: '#0f5132', color: '#fff' } },
    h('span', { text: '14:30' }), h('span', { class: 'ic' }, icon('fa-signal'), icon('fa-wifi'), icon('fa-battery-full')));
  const sbarDark = h('div', { class: 'sbar', style: { background: '#fff', color: '#0b1712' } },
    h('span', { text: '14:30' }), h('span', { class: 'ic' }, icon('fa-signal'), icon('fa-wifi'), icon('fa-battery-full')));
  const island = h('div', { class: 'island' });
  const scr = h('div', { class: 'scr' });
  const shot = (file, extra = []) => h('div', { class: 'page' }, h('img', { src: `ecrans/${file}`, alt: '' }), extra);
  const homeImg = h('img', { src: 'ecrans/01-accueil-page.png', alt: '' });
  const home = h('div', { class: 'page' }, homeImg,
    h('img', { src: 'ecrans/01a-entete.png', alt: '', style: { position: 'absolute', left: '0', top: '0' } }),
    h('img', { src: 'ecrans/01b-barre.png', alt: '', style: { position: 'absolute', left: '0', bottom: '0' } }));
  const product = shot('02-fiche-produit.png');
  const added = shot('03-fiche-ajoute.png');
  const cart = shot('04-panier.png');
  const pay = shot('05-paiement.png');
  const payWave = shot('05b-paiement-wave.png');
  const track = shot('06-suivi.png');
  const seller = shot('08-vendeur.png');
  scr.append(home, product, added, cart, pay, payWave, track, seller);
  screen.append(sbarDark, sbarLight, island, scr, h('div', { class: 'glass' }));
  phone.append(screen);
  phoneWrap.append(
    h('div', { class: 'btn-side', style: { left: '-6px', top: '230px', height: '90px' } }),
    h('div', { class: 'btn-side', style: { left: '-6px', top: '340px', height: '90px' } }),
    h('div', { class: 'btn-side', style: { right: '-6px', top: '290px', height: '140px' } }),
    phone);

  // Position du téléphone : perspective, déplacement, inclinaison, échelle (même forme partout pour l'interpolation).
  const pt = (x, y, r, s) => `perspective(2000px) translate(${x}px, ${y}px) rotateX(${r}deg) scale(${s})`;
  at(phoneWrap, [{ opacity: 0, transform: pt(0, 1300, 32, 0.9) }, { opacity: 1, transform: pt(0, 0, 0, 1) }], 15.75, 1.75, SOFT);
  cue(15.75, 'riseSwoosh');

  // Écran d'accueil : défilement en deux temps (catégories, puis produits).
  at(homeImg, [{ transform: 'translateY(0)' }, { transform: 'translateY(-620px)' }], 18, 1.5, INOUT, 'forwards');
  at(homeImg, [{ transform: 'translateY(-620px)' }, { transform: 'translateY(-1560px)' }], 20.25, 1.75, INOUT, 'forwards');
  cue(18, 'scroll'); cue(20.25, 'scroll');
  // Changements d'écran comme dans l'application : le nouvel écran arrive de la droite.
  const slide = (from, to, beat) => {
    at(to, [{ transform: 'translateX(100%)', boxShadow: '-30px 0 60px rgba(0,0,0,0.25)' }, { transform: 'translateX(0)', boxShadow: '0 0 0 rgba(0,0,0,0)' }], beat, 0.75, OUT);
    if (from) at(from, [{ transform: 'translateX(0)', filter: 'brightness(1)' }, { transform: 'translateX(-30%)', filter: 'brightness(0.8)' }], beat, 0.75, OUT, 'forwards');
    cue(beat, 'swipe');
  };
  const swap = (from, to, beat) => {
    at(to, [{ opacity: 0 }, { opacity: 1 }], beat, 0.3, 'linear');
    if (from) at(from, [{ opacity: 1 }, { opacity: 0 }], beat + 0.3, 0.01, 'linear', 'forwards');
  };
  [product, added, cart, pay, payWave, track, seller].forEach((el) => (el.style.transform = 'translateX(100%)'));
  at(sbarLight, [{ opacity: 1 }, { opacity: 0 }], 24, 0.4, 'linear', 'forwards');
  const tap = (x, y, beat) => {
    const ring = h('span', { class: 'tap', style: { left: `${x}px`, top: `${y}px`, opacity: '0' } });
    const dot = h('span', { class: 'tap-dot', style: { left: `${x}px`, top: `${y}px` } });
    screen.append(ring, dot);
    at(ring, [{ opacity: 0.9, transform: 'scale(0.3)' }, { opacity: 0, transform: 'scale(1.7)' }], beat, 1, OUT, 'none');
    at(dot, [{ opacity: 0, transform: 'scale(0.4)' }, { opacity: 1, transform: 'scale(1)', offset: 0.25 }, { opacity: 0, transform: 'scale(0.8)' }], beat - 0.1, 0.8, 'ease-out');
    cue(beat, 'tap');
  };

  /* ---------- 3. Découvrir (16 à 24) ---------- */
  const cap3b = caption('green', '01 · DÉCOUVREZ', 'fa-compass', [[['Tout au même']], [['endroit', 'gold']]]);
  showCaption(cap3b, 16, 23.6);
  const floatCards = [['mode', 'Mode', 26, 700, -5], ['maison', 'Maison', 34, 1120, 4], ['electronique', 'Électronique', 824, 640, 5], ['beaute', 'Beauté', 816, 1060, -4]]
    .map(([id, label, x, y, r], i) => {
      const card = h('div', { class: 'float-card', style: { left: `${x}px`, top: `${y}px`, transform: `rotate(${r}deg)` } },
        h('img', { src: `/public/images/categories/${id}.webp`, alt: '' }), h('b', { text: label }));
      at(card, [{ opacity: 0, transform: `translateX(${i < 2 ? 160 : -160}px) scale(0.5) rotate(0deg)` }, { opacity: 1, transform: `translateX(0) scale(1) rotate(${r}deg)` }], 18.5 + i * 0.5, 1, SPRING);
      at(card, [{ transform: `translateX(0) translateY(0) scale(1) rotate(${r}deg)` }, { transform: `translateX(0) translateY(-18px) scale(1) rotate(${r}deg)` }], 19.5 + i * 0.5, 2, 'ease-in-out', 'forwards', { iterations: 2, direction: 'alternate' });
      at(card, [{ opacity: 1, transform: `translateX(0) translateY(0) scale(1) rotate(${r}deg)` }, { opacity: 0, transform: `translateX(${i < 2 ? -300 : 300}px) translateY(0) scale(0.8) rotate(${r}deg)` }], 23.5, 0.5, IN, 'forwards');
      cue(18.5 + i * 0.5, 'pop', { pitch: 0.9 + i * 0.1 });
      return card;
    });

  /* ---------- 4. Commander (24 à 32) ---------- */
  const cap4 = caption('green', '02 · COMMANDEZ', 'fa-bag-shopping', [[['En un seul']], [['geste', 'gold']]]);
  showCaption(cap4, 24, 31.6);
  slide(home, product, 24);
  tap(SX(147), SY(807), 26);
  swap(product, added, 26.15);
  added.style.transform = 'translateX(0)';
  // La photo vole jusqu'au panier de la barre d'achat.
  const flyX = h('div', { class: 'abs', style: { left: `${SX(195) - 60}px`, top: `${SY(190) - 60}px`, width: '120px', height: '120px', zIndex: '10' } });
  const flyY = h('div', { style: { width: '100%', height: '100%' } });
  const flyImg = h('img', { src: '/public/images/leather_handbag_1790991457488.jpg', alt: '', style: { width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%', border: '4px solid #fff', boxShadow: '0 12px 26px -8px rgba(0,0,0,0.5)', opacity: '0' } });
  flyY.append(flyImg); flyX.append(flyY); screen.append(flyX);
  const dx = SX(40) - SX(195), dy = SY(807) - SY(190);
  at(flyImg, [{ opacity: 0, transform: 'scale(1.8)' }, { opacity: 1, transform: 'scale(1.6)', offset: 0.1 }, { opacity: 1, transform: 'scale(0.9) rotate(-14deg)', offset: 0.55 }, { opacity: 0.2, transform: 'scale(0.25)' }], 26.3, 1.5, 'ease-in');
  at(flyX, [{ transform: 'translateX(0)' }, { transform: `translateX(${dx}px)` }], 26.3, 1.5, 'cubic-bezier(0.3, 0, 0.7, 1)');
  at(flyY, [{ transform: 'translateY(0)' }, { transform: `translateY(${dy}px)` }], 26.3, 1.5, 'cubic-bezier(0.5, -0.6, 0.8, 1)');
  at(flyImg, [{ opacity: 0.2 }, { opacity: 0 }], 27.8, 0.05, 'linear', 'forwards');
  cue(26.3, 'fly');
  const bump = h('span', { class: 'abs', style: { left: `${SX(40) - 40}px`, top: `${SY(807) - 40}px`, width: '80px', height: '80px', borderRadius: '50%', border: '5px solid #e5a93c', zIndex: '10', opacity: '0' } });
  screen.append(bump);
  at(bump, [{ opacity: 0.9, transform: 'scale(0.4)' }, { opacity: 0, transform: 'scale(1.6)' }], 27.8, 1, OUT, 'none');
  cue(27.8, 'bling');
  tap(SX(278), SY(702), 29.25);
  slide(added, cart, 29.5);
  tap(SX(195), SY(762), 31.25);

  /* ---------- 5. Payer (32 à 40) ---------- */
  const cap5 = caption('green', '03 · PAYEZ', 'fa-mobile-screen-button', [[['par Mobile']], [['Money', 'gold']]]);
  showCaption(cap5, 32, 39.6);
  slide(cart, pay, 32);
  const badges = [['OM', '#FF7900', '#fff', 40, 700], ['MTN', '#FFCC00', '#004F71', 30, 960], ['moov', '#0066B3', '#fff', 46, 1220], ['wave', '#1DC8F2', '#fff', 908, 760], ['card', '#1e293b', '#fff', 914, 1040]]
    .map(([label, bg, fg, x, y], i) => {
      const content = label === 'wave' ? icon('fa-water') : label === 'card' ? icon('fa-credit-card') : h('span', { text: label, style: { fontSize: label === 'moov' ? '32px' : '40px' } });
      const b = h('div', { class: 'badge-pay', style: { left: `${x}px`, top: `${y}px`, background: bg, color: fg } }, content);
      pop(b, 33 + i * 0.5, 0.9);
      at(b, [{ transform: 'translateY(0) scale(1)' }, { transform: 'translateY(-14px) scale(1)' }], 34 + i * 0.5, 1.5, 'ease-in-out', 'forwards', { iterations: 3, direction: 'alternate' });
      fadeOut(b, 39.5, 0.5, `translateX(${x < 540 ? -260 : 260}px) scale(0.6)`);
      cue(33 + i * 0.5, 'pop', { pitch: 1.1 + i * 0.08 });
      return b;
    });
  tap(SX(195), SY(404), 36);
  swap(pay, payWave, 36.15);
  payWave.style.transform = 'translateX(0)';
  const waveRing = h('div', { class: 'abs', style: { left: '894px', top: '746px', width: '160px', height: '160px', borderRadius: '50%', border: '6px solid #f4cd6e' } });
  at(waveRing, [{ opacity: 0, transform: 'scale(0.7)' }, { opacity: 1, transform: 'scale(1)' }], 36.2, 0.6, SPRING);
  fadeOut(waveRing, 39.5, 0.4, 'scale(1.4)');
  tap(SX(195), SY(785), 37);
  // Paiement accepté : feuille de confirmation avec coche qui se dessine, confettis.
  const dim = h('div', { class: 'dim' });
  const sheetCheck = h('svg', { svg: true, viewBox: '0 0 120 120', width: '170', height: '170' },
    h('circle', { svg: true, cx: '60', cy: '60', r: '52', fill: '#ecf7f1', stroke: '#0f5132', 'stroke-width': '7', 'stroke-dasharray': '330', 'stroke-dashoffset': '330', transform: 'rotate(-90 60 60)' }),
    h('path', { svg: true, d: 'M37 62 L53 78 L84 45', fill: 'none', stroke: '#0f5132', 'stroke-width': '9', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-dasharray': '80', 'stroke-dashoffset': '80' }));
  const sheet = h('div', { class: 'sheet' }, sheetCheck, h('b', { text: 'Paiement accepté' }), h('strong', { text: '27 500 FCFA' }), h('small', { text: 'Wave • Commande confirmée' }));
  scr.append(dim, sheet);
  at(dim, [{ opacity: 0 }, { opacity: 1 }], 37.4, 0.5, 'linear');
  at(sheet, [{ transform: 'translateY(105%)' }, { transform: 'translateY(0)' }], 37.4, 0.9, OUT);
  at(sheetCheck.querySelector('circle'), [{ strokeDashoffset: 330 }, { strokeDashoffset: 0 }], 37.9, 1, OUT);
  at(sheetCheck.querySelector('path'), [{ strokeDashoffset: 80 }, { strokeDashoffset: 0 }], 38.6, 0.7, OUT);
  cue(38.6, 'success');
  const confetti = h('div', { class: 'layer' });
  const COLORS = ['#0f5132', '#e5a93c', '#f4cd6e', '#10b981', '#ffffff', '#c2410c'];
  for (let i = 0; i < 46; i++) {
    const c = h('span', { class: 'confetti', style: { left: '540px', top: '1100px', background: COLORS[i % COLORS.length] } });
    confetti.append(c);
    const a = (Math.PI * 2 * i) / 46 + (rnd(i, 1) - 0.5) * 0.5;
    const power = 340 + rnd(i, 2) * 300;
    const x1 = Math.cos(a) * power, y1 = Math.sin(a) * power * 0.8 - 220;
    at(c, [{ opacity: 1, transform: 'translate(0, 0) rotate(0deg) scale(0.5)' },
      { opacity: 1, transform: `translate(${x1}px, ${y1}px) rotate(${rnd(i, 3) * 360}deg) scale(1)`, offset: 0.35 },
      { opacity: 0, transform: `translate(${x1 * 1.2}px, ${y1 + 700}px) rotate(${rnd(i, 4) * 900}deg) scale(1)` }], 38.6, 4 + rnd(i, 5) * 1.5, 'cubic-bezier(0.15, 0.6, 0.4, 1)', 'none');
  }

  /* ---------- 6. Recevoir (40 à 48) ---------- */
  const cap6 = caption('green', '04 · RECEVEZ', 'fa-truck-fast', [[['Livré chez']], [['vous', 'gold']]]);
  showCaption(cap6, 40, 47.5);
  at(dim, [{ opacity: 1 }, { opacity: 0 }], 40, 0.3, 'linear', 'forwards');
  at(sheet, [{ transform: 'translateY(0)' }, { transform: 'translateY(105%)' }], 40, 0.4, IN, 'forwards');
  slide(payWave, track, 40.1);
  // Plan rapproché : le téléphone avance, puis revient.
  at(phoneWrap, [{ transform: pt(0, 0, 0, 1) }, { transform: pt(0, -30, 0, 1.1) }], 41, 2.5, INOUT, 'forwards');
  at(phoneWrap, [{ transform: pt(0, -30, 0, 1.1) }, { transform: pt(0, 0, 0, 1) }], 45.5, 1.5, INOUT, 'forwards');
  const callouts = [
    ['fa-location-dot', '#ecf7f1', '#0f5132', 'Suivi en temps réel', 'de la boutique à votre porte', 30, 640, 41.5],
    ['fa-bolt', '#fdf3dc', '#a3701a', 'Express en 24 h', 'à Abidjan', 600, 900, 42.5],
    ['fa-phone', '#ecf7f1', '#0f5132', 'Livreur joignable', 'appel ou WhatsApp', 30, 1300, 43.5],
  ].map(([ic, bg, fg, title, sub, x, y, beat]) => {
    const c = h('div', { class: 'callout', style: { left: `${x}px`, top: `${y}px` } },
      h('span', { class: 'ico', style: { background: bg, color: fg } }, icon(ic)), h('span', {}, h('b', { text: title }), h('small', { text: sub })));
    at(c, [{ opacity: 0, transform: `translateX(${x < 300 ? -120 : 120}px) scale(0.85)` }, { opacity: 1, transform: 'none' }], beat, 0.9, SPRING);
    fadeOut(c, 46.75 + (x < 300 ? 0 : 0.1), 0.5, `translateX(${x < 300 ? -200 : 200}px)`);
    cue(beat, 'pop', { pitch: 1.25 });
    return c;
  });

  /* ---------- 7. Vendre (48 à 56) — fond crème ---------- */
  at(bgCream2, [{ clipPath: 'circle(0% at 0% 100%)' }, { clipPath: 'circle(160% at 0% 100%)' }], 47.6, 1, INOUT);
  at(bgCream2, [{ clipPath: 'circle(160% at 50% 50%)' }, { clipPath: 'circle(0% at 50% 50%)' }], 55.6, 0.6, INOUT, 'forwards');
  cue(47.6, 'whoosh');
  const cap7 = caption('cream', 'VOUS ÊTES VENDEUR ?', 'fa-store', [[['Ouvrez votre']], [['boutique', 'gold']]]);
  showCaption(cap7, 48.25, 55.5);
  slide(track, seller, 48);
  at(phoneWrap, [{ transform: pt(0, 0, 0, 1) }, { transform: pt(-215, 60, 0, 0.84) }], 47.75, 1.5, INOUT, 'forwards');
  const pct = h('div', { class: 'abs', style: { left: '610px', top: '760px', width: '440px' } });
  const pctNum = h('span', { text: '0' });
  const pctBig = h('div', { style: { fontSize: '200px', fontWeight: '700', lineHeight: '1', color: 'var(--gold)', letterSpacing: '-0.04em' } }, pctNum, h('span', { text: ' %', style: { fontSize: '120px' } }));
  const pctLabel = h('div', { style: { fontSize: '44px', fontWeight: '600', color: 'var(--brand)', lineHeight: '1.2', marginTop: '10px' } }, h('span', { text: 'de chaque vente' }), h('br'), h('span', { text: 'pour vous' }));
  const pctMoMo = h('div', { style: { display: 'flex', alignItems: 'center', gap: '16px', fontSize: '32px', color: '#475a50', marginTop: '34px', fontWeight: '500' } },
    h('span', { style: { width: '62px', height: '62px', borderRadius: '18px', background: '#0f5132', color: '#f4cd6e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', flex: 'none' } }, icon('fa-mobile-screen-button')),
    h('span', { text: 'payé sur votre Mobile Money' }));
  const pctPill = h('div', { style: { display: 'inline-flex', marginTop: '40px', background: '#0f5132', color: '#fff', fontSize: '27px', fontWeight: '600', padding: '18px 28px', borderRadius: '999px', whiteSpace: 'nowrap' } },
    h('span', { text: 'Commission unique de 5 %' }));
  pct.append(pctBig, pctLabel, pctMoMo, pctPill);
  fadeIn(pctBig, 49.75, 0.9, 'translateY(60px) scale(0.8)', SPRING);
  EFFECTS.push((t) => {
    const p = Math.min(1, Math.max(0, (t - B(50)) / B(2)));
    pctNum.textContent = String(Math.round(95 * (1 - Math.pow(1 - p, 3))));
  });
  cue(51.9, 'kaching');
  fadeIn(pctLabel, 50.5, 0.8);
  fadeIn(pctMoMo, 52.25, 0.8, 'translateX(60px)');
  pop(pctPill, 53.5, 0.9);
  cue(53.5, 'pop', { pitch: 1.3 });
  fadeOut(pct, 55.4, 0.5, 'translateX(200px)');
  at(phoneWrap, [{ opacity: 1, transform: pt(-215, 60, 0, 0.84) }, { opacity: 0, transform: pt(-215, 1500, -20, 0.84) }], 55.3, 0.7, IN, 'forwards');

  /* ---------- 8. Fin (56 à 64) ---------- */
  const outro = h('div', { class: 'layer' });
  const glow2 = h('div', { class: 'abs', style: { left: '190px', top: '260px', width: '700px', height: '700px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(248,220,140,0.5), rgba(229,169,60,0) 62%)' } });
  const mark2 = logo('goldOutro', 300, { left: '390px', top: '400px' });
  const name2 = brandName(124, 750);
  const slogan2Words = ['Achetez', 'Vendez', 'Bénissez'].map((w) => h('span', { style: { display: 'inline-block' }, text: w }));
  const slogan2Dots = [0, 1].map(() => h('span', { class: 'gold', style: { display: 'inline-block', margin: '0 20px' }, text: '•' }));
  const slogan2 = h('div', { class: 'abs', style: { left: '0', right: '0', top: '930px', textAlign: 'center', fontSize: '50px', fontWeight: '700', color: '#fff' } },
    slogan2Words[0], slogan2Dots[0], slogan2Words[1], slogan2Dots[1], slogan2Words[2]);
  const sheen = h('span', { class: 'sheen', style: { transform: 'translateX(-160%) skewX(-20deg)' } });
  const cta = h('div', { class: 'abs', style: { left: '0', right: '0', top: '1110px', textAlign: 'center' } },
    h('span', { class: 'cta' }, icon('fa-bag-shopping'), h('span', { text: 'bethanie.vercel.app' }), sheen));
  const countries2 = h('div', { class: 'abs', style: { left: '0', right: '0', top: '1340px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '20px', fontSize: '36px', fontWeight: '600', color: 'rgba(255,255,255,0.9)' } },
    flag(CI), h('span', { text: 'Côte d’Ivoire' }), h('span', { class: 'gold', text: '•' }), flag(SN), h('span', { text: 'Sénégal' }));
  const install = h('div', { class: 'abs', style: { left: '0', right: '0', top: '1450px', textAlign: 'center', fontSize: '30px', color: 'rgba(255,255,255,0.7)' } },
    h('span', { text: 'Commandez dès aujourd’hui' }));
  const burst = h('div', { class: 'layer' });
  for (let i = 0; i < 24; i++) {
    const p = h('span', { class: 'particle', style: { left: '532px', top: '542px', width: '22px', height: '22px', opacity: '0' } });
    burst.append(p);
    const a = (Math.PI * 2 * i) / 24;
    at(p, [{ opacity: 1, transform: 'translate(0, 0) scale(1)' }, { opacity: 0, transform: `translate(${Math.cos(a) * (300 + rnd(i, 7) * 200)}px, ${Math.sin(a) * (300 + rnd(i, 8) * 200)}px) scale(0.3)` }], 56.3, 2.5, OUT, 'none');
  }
  outro.append(glow2, burst, mark2, name2, slogan2, cta, countries2, install);
  stage.append(outro);
  at(glow2, [{ opacity: 0, transform: 'scale(0.4)' }, { opacity: 1, transform: 'scale(1)' }], 56, 2, OUT);
  animateLogo(mark2, 56, 0.6);
  revealLetters(name2, 57.25, 0.1);
  // Instants où la voix dit « achetez », « vendez », « bénissez » (voix off accélérée de 12 %, placée à 28,6 s).
  [62.8, 63.95, 64.95].forEach((b, i) => { pop(slogan2Words[i], b, 0.8); if (i) pop(slogan2Dots[i - 1], b - 0.3, 0.6); });
  at(cta.firstChild, [{ opacity: 0, transform: 'translateY(60px) scale(0.85)' }, { opacity: 1, transform: 'none' }], 59.75, 1, SPRING);
  cue(59.75, 'pop', { pitch: 0.85 });
  [61, 64, 66.5].forEach((b) => at(sheen, [{ transform: 'translateX(-160%) skewX(-20deg)' }, { transform: 'translateX(340%) skewX(-20deg)' }], b, 1.4, OUT, 'none'));
  fadeIn(countries2, 60.75, 0.8, 'translateY(24px)');
  fadeIn(install, 61.5, 0.8, 'translateY(20px)');
  cue(56, 'impact');

  /* ---------- Premier plan : légendes, cartes, téléphone, grain ---------- */
  stage.append(cap3b.root, cap4.root, cap5.root, cap6.root, cap7.root, ...floatCards, ...badges, waveRing, phoneWrap, ...callouts, pct, confetti);
  const grain = h('canvas', { class: 'grain', width: '540', height: '960' });
  const g = grain.getContext('2d');
  const img = g.createImageData(540, 960);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.floor(rnd(i, 9) * 255);
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  grain.style.width = '1080px';
  grain.style.height = '1920px';
  stage.append(h('div', { class: 'vignette' }), grain, black);
};

/* ------------------------------------------------------------------ */
/* Lecture (aperçu) et rendu image par image (rendu.mjs)               */
/* ------------------------------------------------------------------ */
const runEffects = (t) => EFFECTS.forEach((f) => f(t));
const ready = () => Promise.all([document.fonts.ready, ...[...document.images].map((im) => im.decode().catch(() => undefined))]);
window.__total = TOTAL;
window.__prepare = async () => {
  build();
  document.getAnimations().forEach((a) => a.pause());
  await ready();
  await document.fonts.load('700 100px Cinzel');
  window.__seek(0);
  return TOTAL;
};
window.__seek = (t) => {
  document.getAnimations().forEach((a) => { a.currentTime = t; });
  runEffects(t);
};
window.__cues = () => CUES;

if (!location.search.includes('rendu')) {
  // Aperçu : la scène tient dans la fenêtre et la vidéo boucle.
  const fit = () => { stage.style.transform = `scale(${Math.min(innerWidth / 1080, innerHeight / 1920)})`; };
  addEventListener('resize', fit);
  fit();
  const play = async () => {
    build();
    await ready();
    const start = performance.now();
    const tick = () => { const t = performance.now() - start; runEffects(t); if (t < TOTAL) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
    setTimeout(play, TOTAL + 800);
  };
  play();
}
