'use strict';

/**
 * UI enhancements shared by every page.
 *
 * Features
 *  - Dark/light theme toggle with localStorage persistence
 *  - Collapsible mobile navigation
 *  - Scroll progress bar, scroll-spy nav highlighting, back-to-top button
 *  - Scroll-reveal animations (respects prefers-reduced-motion)
 *  - Animated stat counters
 *  - Copy-to-clipboard buttons
 *  - Password visibility toggles + password strength meter
 *  - Toast notifications (exposed as window.UI.toast)
 */
(function () {
  const doc = document.documentElement;
  const THEME_KEY = 'dp-theme';
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  const TOAST_ICONS = { success: '✓', error: '✕', warning: '!', info: 'i' };

  function on(target, type, handler, options) {
    if (target) target.addEventListener(type, handler, options);
  }

  function all(selector, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(selector));
  }

  /* ---------------- Toasts ---------------- */

  function toastHost() {
    let host = document.querySelector('.toast-host');
    if (!host) {
      host = document.createElement('div');
      host.className = 'toast-host';
      host.setAttribute('role', 'region');
      host.setAttribute('aria-label', 'Notifications');
      host.setAttribute('aria-live', 'polite');
      document.body.appendChild(host);
    }
    return host;
  }

  function toast(message, kind, timeout) {
    if (!message) return null;

    const el = document.createElement('div');
    el.className = 'toast toast-' + (kind || 'info');

    const icon = document.createElement('span');
    icon.className = 'toast-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = TOAST_ICONS[kind] || TOAST_ICONS.info;

    const text = document.createElement('p');
    text.className = 'toast-msg';
    text.textContent = message;

    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'toast-close';
    close.setAttribute('aria-label', 'Dismiss notification');
    close.textContent = '×';

    el.appendChild(icon);
    el.appendChild(text);
    el.appendChild(close);
    toastHost().appendChild(el);

    requestAnimationFrame(function () {
      el.classList.add('is-in');
    });

    let timer;
    function dismiss() {
      clearTimeout(timer);
      el.classList.remove('is-in');
      setTimeout(function () {
        if (el.parentNode) el.parentNode.removeChild(el);
      }, 260);
    }

    on(close, 'click', dismiss);
    timer = setTimeout(dismiss, timeout || 4500);

    return el;
  }

  /* ---------------- Theme ---------------- */

  function storedTheme() {
    try {
      return localStorage.getItem(THEME_KEY);
    } catch (err) {
      return null;
    }
  }

  function persistTheme(theme) {
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch (err) {
      /* storage unavailable — theme stays for this session only */
    }
  }

  function systemTheme() {
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }

  function setTheme(theme) {
    const next = theme === 'light' ? 'light' : 'dark';
    doc.setAttribute('data-theme', next);

    all('[data-theme-toggle]').forEach(function (btn) {
      const icon = btn.querySelector('[data-theme-icon]');
      const label = btn.querySelector('[data-theme-label]');
      if (icon) icon.textContent = next === 'light' ? '🌙' : '☀';
      if (label) label.textContent = next === 'light' ? 'Dark' : 'Light';
      btn.setAttribute('aria-pressed', String(next === 'light'));
      btn.setAttribute('aria-label', 'Switch to ' + (next === 'light' ? 'dark' : 'light') + ' theme');
    });

    return next;
  }

  function initTheme() {
    setTheme(doc.getAttribute('data-theme') || storedTheme() || systemTheme());

    all('[data-theme-toggle]').forEach(function (btn) {
      on(btn, 'click', function () {
        const next = doc.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
        setTheme(next);
        persistTheme(next);
        toast(next === 'light' ? 'Light theme enabled' : 'Dark theme enabled', 'info', 2200);
      });
    });
  }

  /* ---------------- Mobile navigation ---------------- */

  function initNav() {
    const header = document.querySelector('.site-header');
    const toggle = document.querySelector('[data-nav-toggle]');
    if (!header || !toggle) return;

    function setOpen(open) {
      header.classList.toggle('nav-open', open);
      toggle.setAttribute('aria-expanded', String(open));
    }

    on(toggle, 'click', function () {
      setOpen(!header.classList.contains('nav-open'));
    });

    all('.nav-links a').forEach(function (link) {
      on(link, 'click', function () {
        setOpen(false);
      });
    });

    on(document, 'keydown', function (event) {
      if (event.key === 'Escape') setOpen(false);
    });

    on(window, 'resize', function () {
      if (window.innerWidth > 860) setOpen(false);
    });
  }

  /* ---------------- Scroll progress + back to top ---------------- */

  function initScrollUi() {
    const bar = document.querySelector('[data-scroll-progress]');
    const topBtn = document.querySelector('[data-back-to-top]');
    if (!bar && !topBtn) return;

    let queued = false;

    function update() {
      queued = false;
      const scrolled = window.scrollY || window.pageYOffset;
      const max = doc.scrollHeight - window.innerHeight;

      if (bar) {
        const pct = max > 0 ? Math.min(100, (scrolled / max) * 100) : 0;
        bar.style.width = pct.toFixed(2) + '%';
      }
      if (topBtn) {
        topBtn.classList.toggle('is-visible', scrolled > 420);
      }
    }

    on(window, 'scroll', function () {
      if (!queued) {
        queued = true;
        requestAnimationFrame(update);
      }
    });

    on(topBtn, 'click', function () {
      window.scrollTo({ top: 0, behavior: reducedMotion.matches ? 'auto' : 'smooth' });
    });

    update();
  }

  /* ---------------- Scroll reveal ---------------- */

  function initReveal() {
    const items = all('[data-reveal]');
    if (!items.length) return;

    if (reducedMotion.matches || !('IntersectionObserver' in window)) {
      items.forEach(function (el) {
        el.classList.add('is-visible');
      });
      return;
    }

    const observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          const el = entry.target;
          const delay = Number(el.getAttribute('data-reveal-delay')) || 0;
          setTimeout(function () {
            el.classList.add('is-visible');
          }, delay);
          observer.unobserve(el);
        });
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.12 }
    );

    items.forEach(function (el) {
      observer.observe(el);
    });
  }

  /* ---------------- Scroll spy ---------------- */

  function initScrollSpy() {
    const links = all('.nav-links a[href^="#"]');
    if (!links.length || !('IntersectionObserver' in window)) return;

    const map = {};
    links.forEach(function (link) {
      const section = document.querySelector(link.getAttribute('href'));
      if (section) map[section.id] = link;
    });

    const sections = Object.keys(map).map(function (id) {
      return document.getElementById(id);
    });
    if (!sections.length) return;

    const observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          links.forEach(function (link) {
            link.classList.remove('is-active');
          });
          map[entry.target.id].classList.add('is-active');
        });
      },
      { rootMargin: '-45% 0px -50% 0px' }
    );

    sections.forEach(function (section) {
      observer.observe(section);
    });
  }

  /* ---------------- Animated counters ---------------- */

  function animateCount(el) {
    const target = Number(el.getAttribute('data-count-to')) || 0;
    const suffix = el.getAttribute('data-count-suffix') || '';
    const duration = Number(el.getAttribute('data-count-duration')) || 1400;

    if (reducedMotion.matches) {
      el.textContent = target + suffix;
      return;
    }

    const start = performance.now();

    function frame(now) {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(target * eased) + suffix;
      if (progress < 1) requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
  }

  function initCounters() {
    const counters = all('[data-count-to]');
    if (!counters.length) return;

    if (!('IntersectionObserver' in window)) {
      counters.forEach(animateCount);
      return;
    }

    const observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          animateCount(entry.target);
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.4 }
    );

    counters.forEach(function (el) {
      observer.observe(el);
    });
  }

  /* ---------------- Copy to clipboard ---------------- */

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      const area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      try {
        document.execCommand('copy') ? resolve() : reject(new Error('Copy rejected'));
      } catch (err) {
        reject(err);
      } finally {
        document.body.removeChild(area);
      }
    });
  }

  function initCopy() {
    all('[data-copy]').forEach(function (btn) {
      on(btn, 'click', function () {
        const selector = btn.getAttribute('data-copy');
        const source = selector ? document.querySelector(selector) : null;
        const text = btn.getAttribute('data-copy-text') || (source ? source.textContent.trim() : '');
        if (!text) return;

        copyText(text)
          .then(function () {
            btn.classList.add('is-copied');
            toast('Copied to clipboard', 'success', 1800);
            setTimeout(function () {
              btn.classList.remove('is-copied');
            }, 1600);
          })
          .catch(function () {
            toast('Could not copy — please select the text manually.', 'warning');
          });
      });
    });
  }

  /* ---------------- Password helpers ---------------- */

  const STRENGTH_LEVELS = [
    { level: 'empty', label: 'Enter a password' },
    { level: 'weak', label: 'Weak' },
    { level: 'fair', label: 'Fair' },
    { level: 'good', label: 'Good' },
    { level: 'strong', label: 'Strong' },
  ];

  function scorePassword(password) {
    if (!password) return { score: 0, level: 'empty', label: STRENGTH_LEVELS[0].label };

    let points = 0;
    if (password.length >= 8) points += 1;
    if (password.length >= 12) points += 1;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) points += 1;
    if (/\d/.test(password)) points += 1;
    if (/[^A-Za-z0-9]/.test(password)) points += 1;
    if (password.length < 8) points = Math.min(points, 1);

    const score = Math.max(1, Math.min(4, Math.ceil(points * 0.8)));
    return { score: score, level: STRENGTH_LEVELS[score].level, label: STRENGTH_LEVELS[score].label };
  }

  function initPasswordToggles() {
    all('[data-password-toggle]').forEach(function (btn) {
      const input = document.getElementById(btn.getAttribute('data-password-toggle'));
      if (!input) return;

      btn.setAttribute('aria-pressed', 'false');
      on(btn, 'click', function () {
        const reveal = input.type === 'password';
        input.type = reveal ? 'text' : 'password';
        btn.textContent = reveal ? 'Hide' : 'Show';
        btn.setAttribute('aria-pressed', String(reveal));
        btn.setAttribute('aria-label', (reveal ? 'Hide' : 'Show') + ' password');
      });
    });
  }

  function initStrengthMeter() {
    const meter = document.querySelector('[data-strength-for]');
    if (!meter) return;

    const input = document.getElementById(meter.getAttribute('data-strength-for'));
    const label = meter.querySelector('[data-strength-label]');
    if (!input) return;

    function render() {
      const result = scorePassword(input.value);
      meter.setAttribute('data-level', result.level);
      if (label) label.textContent = result.label;
    }

    on(input, 'input', render);
    render();
  }

  /* ---------------- Boot ---------------- */

  function init() {
    initTheme();
    initNav();
    initScrollUi();
    initReveal();
    initScrollSpy();
    initCounters();
    initCopy();
    initPasswordToggles();
    initStrengthMeter();

    const year = document.getElementById('year');
    if (year) year.textContent = new Date().getFullYear();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.UI = { toast: toast, setTheme: setTheme, scorePassword: scorePassword };
})();
