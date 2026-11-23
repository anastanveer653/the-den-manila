import '@fontsource-variable/fraunces/full.css';
import '@fontsource-variable/fraunces/full-italic.css';
import '@fontsource-variable/inter';

import './styles/base.css';
import './styles/sections.css';

import { site } from './data/site.js';
import { itemCount } from './data/menu.js';
import { initMenu, initSignatures } from './ui/menu.js';
import { initHours } from './ui/hours.js';
import { initReveal, initTilt, initCounters, initNav, initMap } from './ui/effects.js';

/** Push the values from data/site.js into the page so they only need editing in one place. */
function bindData() {
  const set = (sel, value) => document.querySelectorAll(sel).forEach((el) => (el.textContent = value));

  document.querySelectorAll('[data-rating-value]').forEach((el) => {
    el.textContent = site.rating.value.toFixed(1);
    if (el.dataset.count) el.dataset.count = site.rating.value;
  });
  document.querySelectorAll('[data-menu-count]').forEach((el) => {
    el.textContent = itemCount;
    el.dataset.count = itemCount;
  });
  set('[data-rating-count]', site.rating.count);
  set('[data-price-range]', site.rating.priceRange);
  set('[data-year]', new Date().getFullYear());

  const fill = document.querySelector('[data-rating-fill]');
  if (fill) fill.style.width = `${(site.rating.value / 5) * 100}%`;

  const stars = document.querySelector('.rating__stars');
  if (stars) stars.setAttribute('aria-label', `Rated ${site.rating.value} out of 5 on Google`);
}

bindData();
initSignatures();
initMenu();
initHours();
initNav();
initReveal();
initTilt();
initCounters();
initMap();

// The 3D scene is fetched and built only once the page itself is up and idle,
// so text, layout and scrolling are responsive before any WebGL work starts.
function startScene() {
  const canvas = document.getElementById('scene');
  import('./scene/index.js')
    .then(({ initScene }) => initScene(canvas))
    .catch((err) => {
      console.warn('3D scene unavailable:', err);
      document.documentElement.classList.add('no-webgl');
    });
}

if ('requestIdleCallback' in window) requestIdleCallback(startScene, { timeout: 1200 });
else setTimeout(startScene, 200);
