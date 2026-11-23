import { menu, signatures } from '../data/menu.js';

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const peso = (n) => `₱${Number(n).toLocaleString('en-PH')}`;

/* ───────── Full menu with tabs ───────── */

function dishHTML(item, i) {
  const chips = [
    ...(item.serve || []).map((s) => `<span class="chip">${esc(s)}</span>`),
    item.soy ? '<span class="chip chip--soy" title="Soy milk option">Soy</span>' : '',
    item.price != null ? `<span class="dish__price">${peso(item.price)}</span>` : '',
  ].join('');

  return `
    <li class="dish" style="--i:${i}">
      <div class="dish__head">
        <h4 class="dish__name">${esc(item.name)}</h4>
        ${chips ? `<span class="dish__dots" aria-hidden="true"></span><span class="dish__meta">${chips}</span>` : ''}
      </div>
      <p class="dish__desc">${esc(item.desc)}</p>
    </li>`;
}

function panelHTML(cat) {
  let n = 0;
  return cat.groups
    .map(
      (g) => `
      <div class="menu__group">
        <h3 class="menu__group-title">${esc(g.title)}</h3>
        <ul class="dishes">${g.items.map((it) => dishHTML(it, n++)).join('')}</ul>
      </div>`,
    )
    .join('');
}

export function initMenu() {
  const tablist = document.querySelector('[data-menu-tabs]');
  const panel = document.querySelector('[data-menu-panel]');
  if (!tablist || !panel) return;

  tablist.innerHTML = menu
    .map((cat, i) => {
      const count = cat.groups.reduce((m, g) => m + g.items.length, 0);
      return `<button class="tab" type="button" role="tab" id="tab-${cat.id}" aria-controls="menu-panel"
        aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}" data-cat="${cat.id}">
        ${esc(cat.label)} <small>${count}</small></button>`;
    })
    .join('');

  const tabs = [...tablist.querySelectorAll('.tab')];

  function select(id, focus = false) {
    const cat = menu.find((c) => c.id === id) || menu[0];
    tabs.forEach((t) => {
      const on = t.dataset.cat === cat.id;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      if (on) {
        if (focus) t.focus();
        t.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
      }
    });
    panel.setAttribute('aria-labelledby', `tab-${cat.id}`);
    panel.innerHTML = panelHTML(cat);
  }

  tablist.addEventListener('click', (e) => {
    const tab = e.target.closest('.tab');
    if (tab) select(tab.dataset.cat);
  });

  tablist.addEventListener('keydown', (e) => {
    const i = tabs.indexOf(document.activeElement);
    if (i < 0) return;
    let next = null;
    if (e.key === 'ArrowRight') next = (i + 1) % tabs.length;
    else if (e.key === 'ArrowLeft') next = (i - 1 + tabs.length) % tabs.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = tabs.length - 1;
    if (next === null) return;
    e.preventDefault();
    select(tabs[next].dataset.cat, true);
  });

  // First render without scrolling the tab strip into view.
  panel.setAttribute('aria-labelledby', `tab-${menu[0].id}`);
  panel.innerHTML = panelHTML(menu[0]);
}

/* ───────── Special drinks: layered glass illustrations ───────── */

function hexToRgba(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

/** Mixes two #rrggbb colours 50/50, for the soft band where two layers meet. */
function mix(a, b) {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (shift) => Math.round((((pa >> shift) & 255) + ((pb >> shift) & 255)) / 2);
  return `rgb(${ch(16)}, ${ch(8)}, ${ch(0)})`;
}

/**
 * A tumbler with the drink's layers stacked inside it.
 *
 * Drawn with plain solid shapes only. An earlier version clipped gradient
 * rectangles to the glass with <clipPath>; four of those took about 200 ms to
 * paint the first time the cards scrolled into view, which read as a freeze.
 */
function glassSVG(sig) {
  // Inside walls of the glass: straight lines from the rim (y 24) to the base (y 236).
  const left = (y) => 38 + (13 * (y - 24)) / 212;
  const right = (y) => 162 - (13 * (y - 24)) / 212;
  const f = (n) => n.toFixed(1);

  const TOP = 62; // surface of the drink
  const total = sig.layers.reduce((sum, l) => sum + l.part, 0);

  // Bottom layer first. Each layer is a trapezoid; the lowest follows the rounded base.
  let y = 246;
  let shapes = '';
  let seams = '';
  sig.layers.forEach((layer, i) => {
    const y1 = y; // lower edge
    const y0 = y - ((246 - TOP) * layer.part) / total; // upper edge
    shapes +=
      i === 0
        ? `<path d="M${f(left(y0))} ${f(y0)}H${f(right(y0))}L149 236Q148 246 138 246H62Q52 246 51 236Z" fill="${layer.color}"/>`
        : `<path d="M${f(left(y0))} ${f(y0)}H${f(right(y0))}L${f(right(y1))} ${f(y1)}H${f(left(y1))}Z" fill="${layer.color}"/>`;
    if (i > 0) {
      const a = y1 - 3.5;
      const b = y1 + 3.5;
      seams += `<path d="M${f(left(a))} ${f(a)}H${f(right(a))}L${f(right(b))} ${f(b)}H${f(left(b))}Z" fill="${mix(layer.color, sig.layers[i - 1].color)}"/>`;
    }
    y = y0;
  });

  return `
  <svg viewBox="0 0 200 262" role="img" aria-label="${esc(sig.name)}: ${esc(sig.layers.map((l) => l.label).join(', '))}">
    <rect x="121" y="0" width="9" height="226" rx="4.5" transform="rotate(9 125 110)" fill="#efc48c"/>
    ${shapes}${seams}
    <ellipse cx="100" cy="${TOP}" rx="58" ry="4.5" fill="#fff" fill-opacity=".22"/>
    <rect x="62" y="70" width="34" height="34" rx="7" transform="rotate(-14 79 87)" fill="#fff" fill-opacity=".16" stroke="#fff" stroke-opacity=".34"/>
    <rect x="102" y="80" width="32" height="32" rx="7" transform="rotate(18 118 96)" fill="#fff" fill-opacity=".13" stroke="#fff" stroke-opacity=".3"/>
    <rect x="76" y="112" width="30" height="30" rx="7" transform="rotate(8 91 127)" fill="#fff" fill-opacity=".1" stroke="#fff" stroke-opacity=".24"/>
    <path d="M${f(right(30) - 15)} 30H${f(right(30) - 2)}L${f(right(232) - 2)} 232H${f(right(232) - 11)}Z" fill="#000" fill-opacity=".14"/>
    <path d="M38 24H162L149 236Q148 246 138 246H62Q52 246 51 236Z" fill="#ffecd6" fill-opacity=".05" stroke="#ffecd6" stroke-opacity=".62" stroke-width="2" stroke-linejoin="round"/>
    <path d="M50 38 60 226" stroke="#fff" stroke-opacity=".28" stroke-width="4" stroke-linecap="round"/>
  </svg>`;
}

export function initSignatures() {
  const list = document.querySelector('[data-signatures]');
  if (!list) return;

  const specials = menu.find((c) => c.id === 'special').groups[0].items;

  list.innerHTML = signatures
    .map((sig, i) => {
      const item = specials.find((s) => s.name === sig.name) || {};
      const serve = (item.serve || []).map((s) => `<span class="chip">${esc(s)}</span>`).join('');
      const layers = [...sig.layers]
        .reverse()
        .map((l) => `<li><i style="--c:${l.color}"></i>${esc(l.label)}</li>`)
        .join('');
      const glow = hexToRgba(sig.layers[0].color, 0.5);

      return `
      <li class="sig card" data-reveal data-tilt style="--i:${i + 1}; --glow:${glow}">
        <div class="sig__top"><span class="sig__no">No. ${String(i + 1).padStart(2, '0')}</span><span>Special</span></div>
        <div class="sig__glass">${glassSVG(sig)}</div>
        <h3>${esc(sig.name)}</h3>
        <p class="sig__desc">${esc(item.desc || '')}</p>
        <p class="sig__note">${esc(sig.note)}</p>
        <ul class="sig__layers" aria-label="Layers, top to bottom">${layers}</ul>
        <div class="sig__serve">${serve}</div>
      </li>`;
    })
    .join('');
}
