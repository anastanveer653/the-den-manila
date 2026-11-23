const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ───────── Reveal on scroll ───────── */

export function initReveal() {
  const els = document.querySelectorAll('[data-reveal]');
  if (!('IntersectionObserver' in window)) {
    els.forEach((el) => el.classList.add('is-in'));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -6% 0px' },
  );
  els.forEach((el) => io.observe(el));
}

/* ───────── 3D tilt on cards ───────── */

export function initTilt() {
  if (reduced() || !matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  document.querySelectorAll('[data-tilt]').forEach((el) => {
    const max = el.classList.contains('feature') ? 7 : 9;

    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      el.classList.remove('is-settling');
      el.classList.add('is-tilting');
      el.style.setProperty('--rx', `${((0.5 - py) * max).toFixed(2)}deg`);
      el.style.setProperty('--ry', `${((px - 0.5) * max * 1.2).toFixed(2)}deg`);
      el.style.setProperty('--gx', `${(px * 100).toFixed(1)}%`);
      el.style.setProperty('--gy', `${(py * 100).toFixed(1)}%`);
    });

    el.addEventListener('pointerleave', () => {
      el.classList.remove('is-tilting');
      el.classList.add('is-settling');
      el.style.setProperty('--rx', '0deg');
      el.style.setProperty('--ry', '0deg');
      clearTimeout(el._settle);
      el._settle = setTimeout(() => el.classList.remove('is-settling'), 550);
    });
  });
}

/* ───────── Count-up numbers ───────── */

export function initCounters() {
  const els = document.querySelectorAll('[data-count]');
  if (reduced() || !('IntersectionObserver' in window)) return;

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        const el = e.target;
        const end = parseFloat(el.dataset.count);
        const decimals = Number(el.dataset.decimals || 0);
        // Years look odd counting from zero, so start close to the target.
        const start = end > 1000 ? end - 40 : 0;
        const t0 = performance.now();
        const dur = 1400;
        const step = (now) => {
          const p = Math.min(1, (now - t0) / dur);
          const eased = 1 - Math.pow(1 - p, 4);
          el.textContent = (start + (end - start) * eased).toFixed(decimals);
          if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      });
    },
    { threshold: 0.6 },
  );
  els.forEach((el) => io.observe(el));
}

/* ───────── Navigation ───────── */

export function initNav() {
  const nav = document.querySelector('[data-nav]');
  const toggle = document.querySelector('[data-sheet-toggle]');
  const sheet = document.querySelector('[data-sheet]');

  const onScroll = () => nav.classList.toggle('is-stuck', window.scrollY > 24);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  // Highlight the section currently in view.
  const links = [...document.querySelectorAll('.nav__links a')];
  const byId = new Map(links.map((a) => [a.getAttribute('href').slice(1), a]));
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          links.forEach((a) => a.removeAttribute('aria-current'));
          byId.get(e.target.id)?.setAttribute('aria-current', 'true');
        });
      },
      { rootMargin: '-45% 0px -50% 0px' },
    );
    document.querySelectorAll('main section[id]').forEach((s) => io.observe(s));
  }

  // Mobile sheet.
  if (!toggle || !sheet) return;
  let closeTimer;

  function setOpen(open) {
    clearTimeout(closeTimer);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.querySelector('.sr-only').textContent = open ? 'Close navigation' : 'Open navigation';
    document.documentElement.style.overflow = open ? 'hidden' : '';
    if (open) {
      sheet.hidden = false;
      // Next frame so the opacity transition runs.
      requestAnimationFrame(() => sheet.classList.add('is-open'));
    } else {
      sheet.classList.remove('is-open');
      closeTimer = setTimeout(() => (sheet.hidden = true), 360);
    }
  }

  toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
  sheet.addEventListener('click', (e) => {
    if (e.target.closest('a')) setOpen(false);
  });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
      setOpen(false);
      toggle.focus();
    }
  });
  matchMedia('(min-width: 921px)').addEventListener('change', (e) => {
    if (e.matches) setOpen(false);
  });
}

/* ───────── Map: load Google's embed only on request ───────── */

export function initMap() {
  document.querySelectorAll('[data-map]').forEach((box) => {
    const button = box.querySelector('[data-map-load]');
    if (!button) return;
    button.addEventListener('click', () => {
      const frame = document.createElement('iframe');
      frame.title = 'Map showing The Den at First United Building, Escolta Street, Manila';
      frame.referrerPolicy = 'no-referrer-when-downgrade';
      frame.src = box.dataset.mapSrc;
      box.querySelector('.map-facade')?.remove();
      box.append(frame);
      frame.focus();
    });
  });
}
