/* =============================================
   AI Marketing Expert — Landing Page JS
   ============================================= */

'use strict';

/* ---- Particles & Bubbles ---- */
(function initParticlesAndBubbles() {
  const container = document.getElementById('particles');
  if (!container) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Particles */
  const particleCount = reduced ? 0 : 20;
  for (let i = 0; i < particleCount; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const size = Math.random() * 4 + 2;
    p.style.cssText = [
      `width:${size}px`,
      `height:${size}px`,
      `left:${Math.random() * 100}%`,
      `animation-duration:${(Math.random() * 14 + 10).toFixed(1)}s`,
      `animation-delay:${(Math.random() * 12).toFixed(1)}s`,
      'opacity:0'
    ].join(';');
    container.appendChild(p);
  }

  /* Bubbles */
  const bubbleCount = reduced ? 0 : 16;
  const bubbleColors = [
    'rgba(99,102,241,0.25)',
    'rgba(139,92,246,0.22)',
    'rgba(168,85,247,0.20)',
    'rgba(236,72,153,0.16)',
    'rgba(6,182,212,0.16)',
    'rgba(255,255,255,0.07)',
  ];
  for (let i = 0; i < bubbleCount; i++) {
    const b = document.createElement('div');
    b.className = 'bubble';
    const size = Math.floor(Math.random() * 64 + 18);
    const color = bubbleColors[i % bubbleColors.length];
    const drift = ((Math.random() - 0.5) * 130).toFixed(1);
    b.style.cssText = [
      `width:${size}px`,
      `height:${size}px`,
      `left:${(Math.random() * 98).toFixed(1)}%`,
      `background:radial-gradient(circle at 30% 30%, rgba(255,255,255,0.18), ${color} 70%)`,
      `border-color:${color}`,
      `animation-duration:${(Math.random() * 20 + 16).toFixed(1)}s`,
      `animation-delay:${(Math.random() * 18).toFixed(1)}s`,
      `--bubble-drift:${drift}px`
    ].join(';');
    container.appendChild(b);
  }
})();

/* ---- Navbar scroll / mobile drawer ---- */
(function initNavbar() {
  const navbar   = document.getElementById('navbar');
  const toggle   = document.getElementById('navToggle');
  const drawer   = document.getElementById('mobileDrawer');
  const backdrop = document.getElementById('drawerBackdrop');
  const closeBtn = document.getElementById('drawerClose');
  if (!navbar) return;

  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 40);
  }, { passive: true });

  function openDrawer() {
    drawer.classList.add('open');
    drawer.setAttribute('aria-hidden', 'false');
    backdrop.classList.add('active');
    toggle.classList.add('active');
    toggle.setAttribute('aria-expanded', 'true');
    document.body.classList.add('drawer-open');
  }

  function closeDrawer() {
    drawer.classList.remove('open');
    drawer.setAttribute('aria-hidden', 'true');
    backdrop.classList.remove('active');
    toggle.classList.remove('active');
    toggle.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('drawer-open');
  }

  toggle  && toggle.addEventListener('click', () => {
    drawer.classList.contains('open') ? closeDrawer() : openDrawer();
  });
  closeBtn  && closeBtn.addEventListener('click', closeDrawer);
  backdrop  && backdrop.addEventListener('click', closeDrawer);

  // close on Escape key
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDrawer(); });

  // close when any drawer link is clicked
  drawer && drawer.querySelectorAll('a').forEach(a => a.addEventListener('click', closeDrawer));
})();

/* ---- Scroll reveal ---- */
(function initReveal() {
  if (!('IntersectionObserver' in window)) {
    document.querySelectorAll('.reveal-up,.reveal-left,.reveal-flip,.reveal-row')
      .forEach(el => el.classList.add('revealed'));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const delay = parseInt(el.dataset.delay) || 0;
      setTimeout(() => el.classList.add('revealed'), delay);
      observer.unobserve(el);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.reveal-up,.reveal-left,.reveal-flip,.reveal-row')
    .forEach(el => observer.observe(el));
})();

/* ---- Pricing toggle (Yearly / Lifetime) ---- */
(function initPricing() {
  const toggleBtns = document.querySelectorAll('.toggle-btn');
  const singlePrice   = document.getElementById('singlePrice');
  const singlePeriod  = document.getElementById('singlePeriod');
  const singleSavings = document.getElementById('singleSavings');
  const fivePrice   = document.getElementById('fivePrice');
  const fivePeriod  = document.getElementById('fivePeriod');
  const fiveSavings = document.getElementById('fiveSavings');
  const unlimitedPrice   = document.getElementById('unlimitedPrice');
  const unlimitedPeriod  = document.getElementById('unlimitedPeriod');
  const unlimitedSavings = document.getElementById('unlimitedSavings');

  const plans = {
    yearly: {
      single:    { price: '49',  period: '/year',     savings: 'Save $250 vs lifetime' },
      five:      { price: '149',  period: '/year',     savings: 'Save $350 vs lifetime' },
      unlimited: { price: '399',  period: '/year',     savings: 'Unlimited sites — no limits' },
    },
    lifetime: {
      single:    { price: '299',  period: 'one-time',  savings: 'Pay once. Own it forever.' },
      five:      { price: '499',  period: 'one-time',  savings: 'Best value for 5 sites.' },
      unlimited: { price: '799',  period: 'one-time',  savings: 'Best value for agencies.' },
    },
  };

  function flipPrice(el, newValue) {
    if (!el) return;
    el.classList.add('flipping');
    setTimeout(() => {
      el.textContent = newValue;
      el.classList.remove('flipping');
    }, 200);
  }

  function setActivePlan(planKey) {
    const data = plans[planKey];
    if (!data) return;

    flipPrice(singlePrice, data.single.price);
    if (singlePeriod)  singlePeriod.textContent  = data.single.period;
    if (singleSavings) singleSavings.textContent  = data.single.savings;

    flipPrice(fivePrice, data.five.price);
    if (fivePeriod)  fivePeriod.textContent  = data.five.period;
    if (fiveSavings) fiveSavings.textContent  = data.five.savings;

    flipPrice(unlimitedPrice, data.unlimited.price);
    if (unlimitedPeriod)  unlimitedPeriod.textContent  = data.unlimited.period;
    if (unlimitedSavings) unlimitedSavings.textContent  = data.unlimited.savings;
  }

  toggleBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      toggleBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      setActivePlan(btn.dataset.plan);
    });
  });

  // init with yearly selected
  setActivePlan('yearly');
})();

/* ---- FAQ accordion ---- */
(function initFaq() {
  document.querySelectorAll('.faq-q').forEach(btn => {
    btn.addEventListener('click', () => {
      const expanded = btn.getAttribute('aria-expanded') === 'true';
      // close all
      document.querySelectorAll('.faq-q').forEach(b => {
        b.setAttribute('aria-expanded', 'false');
        const a = b.nextElementSibling;
        if (a) a.classList.remove('open');
      });
      // open this one if it was closed
      if (!expanded) {
        btn.setAttribute('aria-expanded', 'true');
        const answer = btn.nextElementSibling;
        if (answer) answer.classList.add('open');
      }
    });
  });
})();

/* ---- Reviews carousel — duplicate cards for infinite scroll ---- */
(function initCarousel() {
  const carousel = document.getElementById('reviewsCarousel');
  if (!carousel) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    carousel.style.animation = 'none';
    return;
  }
  // Duplicate cards
  const origCards = Array.from(carousel.children);
  origCards.forEach(card => {
    carousel.appendChild(card.cloneNode(true));
  });
})();

/* ---- Smooth active nav highlight on scroll ---- */
(function initActiveNav() {
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-links a[href^="#"]');
  if (!sections.length || !navLinks.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.id;
        navLinks.forEach(a => {
          a.style.color = a.getAttribute('href') === `#${id}` ? 'var(--indigo)' : '';
        });
      }
    });
  }, { rootMargin: '-50% 0px -50% 0px' });

  sections.forEach(s => observer.observe(s));
})();

/* ---- Comparison table row stagger ---- */
(function initTableRows() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const compObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const rows = entry.target.querySelectorAll('tbody tr');
      rows.forEach((row, i) => {
        row.style.opacity = '0';
        row.style.transform = 'translateX(-12px)';
        row.style.transition = `opacity 0.4s ease ${i * 60}ms, transform 0.4s ease ${i * 60}ms`;
        setTimeout(() => {
          row.style.opacity = '1';
          row.style.transform = 'none';
        }, 80 + i * 60);
      });
      compObserver.unobserve(entry.target);
    });
  }, { threshold: 0.15 });

  document.querySelectorAll('.comp-table').forEach(t => compObserver.observe(t));
})();

/* ---- Chatbot message stagger ---- */
(function initChatMessages() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const msgs = document.querySelectorAll('.chat-msg');
  msgs.forEach((m, i) => {
    m.style.opacity = '0';
    m.style.transform = 'translateY(8px)';
    m.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
  });

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const ms = entry.target.querySelectorAll('.chat-msg');
      ms.forEach((m, i) => {
        setTimeout(() => {
          m.style.opacity = '1';
          m.style.transform = 'none';
        }, 300 + i * 400);
      });
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.5 });

  const chatWidget = document.querySelector('.chat-widget');
  if (chatWidget) observer.observe(chatWidget);
})();

/* ---- Module visual tilt on mouse move ---- */
(function initTilt() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  document.querySelectorAll('.mod-visual').forEach(visual => {
    visual.addEventListener('mousemove', (e) => {
      const rect = visual.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width  - 0.5;
      const y = (e.clientY - rect.top)  / rect.height - 0.5;
      const cards = visual.querySelectorAll('.visual-card, .chat-widget');
      cards.forEach(card => {
        card.style.transform = `perspective(800px) rotateY(${x * 10}deg) rotateX(${-y * 6}deg)`;
        card.style.transition = 'transform 0.1s ease';
      });
    });
    visual.addEventListener('mouseleave', () => {
      const cards = visual.querySelectorAll('.visual-card, .chat-widget');
      cards.forEach(card => {
        card.style.transform = '';
        card.style.transition = 'transform 0.5s ease';
      });
    });
  });
})();
