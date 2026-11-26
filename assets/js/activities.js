(() => {
  const root = document.documentElement;
  const cards = [...document.querySelectorAll('.act-card')];
  if (!cards.length) return;
  root.classList.add('js-act');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const seen = (c, d = 0) => { c.style.transitionDelay = d + 'ms'; c.classList.add('is-seen'); };
  if ('IntersectionObserver' in window && !reduce) {
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return;
      const sib = [...e.target.parentNode.children].filter(x => !x.hidden);
      seen(e.target, (sib.indexOf(e.target) % 3) * 90); io.unobserve(e.target);
    }), { threshold: .1, rootMargin: '0px 0px -4% 0px' });
    cards.forEach(c => io.observe(c));
  } else cards.forEach(c => c.classList.add('is-seen'));

  const grid = document.getElementById('actGrid');
  if (!grid) return;
  const tabs = [...document.querySelectorAll('.act-tab')];
  const ink = document.querySelector('.act-ink');
  const more = document.getElementById('actMore');
  const empty = document.getElementById('actEmpty');
  const STEP = 9;
  let cat = 'all', shown = STEP;
  const moveInk = () => {
    const on = document.querySelector('.act-tab.is-on');
    if (!on || !ink) return;
    ink.style.width = on.offsetWidth + 'px';
    ink.style.transform = `translateX(${on.offsetLeft}px)`;
  };
  const render = (replay) => {
    const match = cards.filter(c => cat === 'all' || c.dataset.cat === cat);
    cards.forEach(c => { c.hidden = true; });
    match.forEach((c, i) => {
      c.hidden = i >= shown;
      if (!c.hidden && replay) {
        c.classList.remove('is-seen'); c.style.transitionDelay = '0ms';
        requestAnimationFrame(() => requestAnimationFrame(() => seen(c, (i % STEP) * 50)));
      }
    });
    if (empty) empty.hidden = match.length > 0;
    if (more) more.hidden = match.length <= shown;
  };
  tabs.forEach(t => t.addEventListener('click', () => {
    tabs.forEach(x => { x.classList.toggle('is-on', x === t); x.setAttribute('aria-selected', x === t ? 'true' : 'false'); });
    cat = t.dataset.filter; shown = STEP; moveInk(); render(true);
  }));
  if (more) more.addEventListener('click', () => { shown += STEP; render(true); });
  window.addEventListener('resize', moveInk); window.addEventListener('load', moveInk);
  moveInk(); render(false);
})();
