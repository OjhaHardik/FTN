/* =========================================================
   FTN World front end. Plain JS, no build step.
   Uses GSAP + ScrollTrigger and Lenis from /vendor (globals).
   Every effect has a static fallback: no JS, no GSAP, or
   prefers-reduced-motion all leave the page readable.
   ========================================================= */
(function () {
  'use strict';

  var d = document;
  var root = d.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var gsap = window.gsap;
  var ST = window.ScrollTrigger;
  var hasGsap = !!(gsap && ST);
  var EASE = 'expo.out';

  if (reduce) root.classList.add('rm');
  if (hasGsap) gsap.registerPlugin(ST);

  var $ = function (s, c) { return (c || d).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || d).querySelectorAll(s)); };

  /* ---------------- Smooth scroll (Lenis) ---------------- */
  var lenis = null;
  if (!reduce && window.Lenis) {
    lenis = new window.Lenis({ lerp: 0.085, smoothWheel: true });
    if (hasGsap) {
      lenis.on('scroll', ST.update);
      gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
      gsap.ticker.lagSmoothing(0);
    } else {
      var raf = function (t) { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
  }

  function scrollToHash(hash) {
    var target = hash && hash.length > 1 ? d.getElementById(hash.slice(1)) : null;
    if (!target) return false;
    if (lenis) lenis.scrollTo(target, { duration: 1.4 });
    else target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
    return true;
  }

  d.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href*="#"]');
    if (!a) return;
    var url = new URL(a.href, location.href);
    if (url.pathname !== location.pathname || !url.hash) return;
    if (scrollToHash(url.hash)) {
      e.preventDefault();
      closeMenu();
      history.replaceState(null, '', url.hash);
    }
  });

  /* ---------------- Menu ---------------- */
  var menu = $('[data-menu]');
  var openers = $$('[data-menu-open]');
  var lastFocus = null;

  function openMenu() {
    if (!menu) return;
    lastFocus = d.activeElement;
    menu.hidden = false;
    openers.forEach(function (b) { b.setAttribute('aria-expanded', 'true'); });
    if (lenis) lenis.stop();
    var first = $('.menu-links a', menu);
    if (first) first.focus();
    if (hasGsap && !reduce) gsap.from($$('.menu-links a', menu), { y: 40, opacity: 0, duration: 0.8, ease: EASE, stagger: 0.05 });
  }
  function closeMenu() {
    if (!menu || menu.hidden) return;
    menu.hidden = true;
    openers.forEach(function (b) { b.setAttribute('aria-expanded', 'false'); });
    if (lenis) lenis.start();
    if (lastFocus) lastFocus.focus();
  }
  openers.forEach(function (b) { b.addEventListener('click', openMenu); });
  $$('[data-menu-close]').forEach(function (b) { b.addEventListener('click', closeMenu); });
  d.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(); });

  /* ---------------- Light / dark ---------------- */
  // <head> applies a saved choice before paint; with none, the device setting decides (CSS).
  var themeBtns = $$('[data-theme-toggle]');
  var darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
  var isDark = function () {
    var t = root.getAttribute('data-theme');
    return t ? t === 'dark' : darkQuery.matches;
  };
  function syncTheme() {
    var dark = isDark();
    themeBtns.forEach(function (b) { b.setAttribute('aria-pressed', String(dark)); });
    $$('meta[name="theme-color"]').forEach(function (m) { m.setAttribute('content', dark ? '#0D1120' : '#EEF0F2'); });
  }
  function setTheme(dark, from) {
    var apply = function () {
      root.setAttribute('data-theme', dark ? 'dark' : 'light');
      try { localStorage.setItem('ftn-theme', dark ? 'dark' : 'light'); } catch (e) {}
      syncTheme();
    };
    if (reduce || !d.startViewTransition || !from) { apply(); return; }
    // the new theme spreads out from the switch like ink from a pen
    var r = from.getBoundingClientRect();
    var x = r.left + r.width / 2, y = r.top + r.height / 2;
    var end = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    d.startViewTransition(apply).ready.then(function () {
      root.animate(
        { clipPath: ['circle(0px at ' + x + 'px ' + y + 'px)', 'circle(' + end + 'px at ' + x + 'px ' + y + 'px)'] },
        { duration: 640, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', pseudoElement: '::view-transition-new(root)' }
      );
    });
  }
  themeBtns.forEach(function (b) {
    b.addEventListener('click', function () { setTheme(!isDark(), b); });
  });
  if (darkQuery.addEventListener) darkQuery.addEventListener('change', syncTheme);
  syncTheme();

  /* ---------------- Header bar + chapter bar visibility ---------------- */
  var bar = $('[data-bar]');
  var chapters = $('[data-chapters]');
  var sheet = $('.sheet');
  if (sheet && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      var past = !entries[0].isIntersecting;
      if (bar) bar.classList.toggle('is-on', past);
      if (chapters) chapters.classList.toggle('is-on', past);
    }, { rootMargin: '-80px 0px 0px 0px' }).observe(sheet);
  } else if (bar) {
    bar.classList.add('is-on');
  }
  var footBase = $('.foot-base');
  if (chapters && footBase && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      chapters.classList.toggle('is-hidden', entries[0].isIntersecting);
    }).observe(footBase);
  }

  /* ---------------- Hero drawing ---------------- */
  var elev = $('[data-elev]');

  // Keep strokes at a constant on-screen width: --u = viewBox units per CSS pixel.
  function sizeElev() {
    if (!elev) return;
    var w = elev.getBoundingClientRect().width || 1200;
    elev.style.setProperty('--u', (1200 / w).toFixed(3));
  }
  sizeElev();
  if (elev && 'ResizeObserver' in window) new ResizeObserver(sizeElev).observe(elev);

  var heroTl = null;
  function prepareHero() {
    root.classList.add('hero-go'); // JS is in charge: cancel the CSS 5s fallback
    if (!elev || !hasGsap || reduce) return;
    $$('.lines .ln', elev).forEach(function (el) {
      if (el.classList.contains('ln-dash')) { gsap.set(el, { opacity: 0 }); return; }
      var len = el.getTotalLength ? el.getTotalLength() : 0;
      el.style.strokeDasharray = len + ' ' + len;
      el.style.strokeDashoffset = len;
    });
    gsap.set($$('.fills > *', elev), { opacity: 0 });
    gsap.set($('.labels', elev), { opacity: 0 });
    gsap.set('.hero-title .line > span', { yPercent: 105 });
    gsap.set(['.hero-sub', '[data-titleblock]'], { opacity: 0, y: 16 });

    var log = $$('[data-drawlog] li');
    heroTl = gsap.timeline({ paused: true });
    heroTl.to('.hero-title .line > span', { yPercent: 0, duration: 1.2, ease: EASE, stagger: 0.09 }, 0);
    heroTl.to('.hero-sub', { opacity: 1, y: 0, duration: 0.9, ease: EASE }, 0.35);

    $$('[data-step]', elev).forEach(function (step, i) {
      var at = 0.15 + i * 0.55;
      var lines = $$('.ln', step);
      var solid = lines.filter(function (l) { return !l.classList.contains('ln-dash'); });
      var dashed = lines.filter(function (l) { return l.classList.contains('ln-dash'); });
      if (log[i]) heroTl.call(function () { log[i].classList.add('is-done'); }, null, at);
      heroTl.to(solid, { strokeDashoffset: 0, duration: 1.1, ease: 'power2.inOut', stagger: 0.035 }, at);
      if (dashed.length) heroTl.to(dashed, { opacity: 1, duration: 0.6, ease: 'none' }, at + 0.1);
    });

    var fillAt = 0.15 + $$('[data-step]', elev).length * 0.55 + 0.2;
    heroTl.to($('.labels', elev), { opacity: 1, duration: 0.6, ease: 'none' }, fillAt - 0.4);
    heroTl.to($$('.fills > *', elev), { opacity: 1, duration: 0.9, ease: 'power1.out', stagger: 0.05 }, fillAt);
    heroTl.to('[data-titleblock]', { opacity: 1, y: 0, duration: 0.8, ease: EASE }, fillAt);
  }
  function playHero() {
    if (heroTl) heroTl.play();
    else $$('[data-drawlog] li').forEach(function (li) { li.classList.add('is-done'); });
  }
  prepareHero();

  /* ---------------- Intro (starting page) ---------------- */
  var intro = $('#intro');
  var introOn = root.classList.contains('has-intro') && intro;

  function endIntro() {
    try { sessionStorage.setItem('ftn-intro', '1'); } catch (e) {}
    root.classList.remove('has-intro');
    if (intro) intro.remove();
    if (lenis) lenis.start();
    if (hasGsap) ST.refresh();
    playHero();
  }

  if (introOn) {
    if (lenis) lenis.stop();
    if (!hasGsap || reduce) {
      endIntro();
    } else {
      var pctEl = $('[data-intro-pct]', intro);
      var fill = $('[data-intro-fill]', intro);
      var mark = $('.intro-mark', intro);
      var minTime = 1700;
      var start = performance.now();
      var loaded = 0;
      var tasks = [];

      var img = new Image();
      tasks.push(new Promise(function (res) { img.onload = img.onerror = res; img.src = $('.intro-mark-img', intro).getAttribute('href'); }));
      if (d.fonts && d.fonts.ready) tasks.push(d.fonts.ready);
      tasks.push(new Promise(function (res) { if (d.readyState === 'complete') res(); else window.addEventListener('load', res, { once: true }); }));
      tasks.forEach(function (p) { p.then(function () { loaded++; }); });

      gsap.from(mark, { scale: 0.92, opacity: 0, duration: 1.2, ease: EASE });
      gsap.from($$('.intro-tag', intro), { opacity: 0, y: 12, duration: 1, ease: EASE, delay: 0.25, stagger: 0.08 });

      var shown = 0;
      var done = false;
      var tick = function () {
        var real = loaded / tasks.length;
        var time = Math.min(1, (performance.now() - start) / minTime);
        var target = Math.min(real, time) * 100;
        shown += (target - shown) * 0.12;
        if (target >= 100 && shown > 99.4) shown = 100;
        pctEl.textContent = Math.round(shown) + '%';
        fill.style.transform = 'scaleX(' + (shown / 100) + ')';
        if (shown === 100 && !done) {
          done = true;
          gsap.ticker.remove(tick);
          var tl = gsap.timeline({ onComplete: endIntro });
          tl.to($$('.intro-tag, .intro-ground', intro), { opacity: 0, duration: 0.5, ease: 'power2.in' }, 0.15)
            .to(mark, { scale: 14, transformOrigin: '44% 52%', duration: 1.25, ease: 'expo.in' }, 0.25)
            .to(intro, { opacity: 0, duration: 0.45, ease: 'none' }, 1.15);
        }
      };
      gsap.ticker.add(tick);
      // never trap the visitor behind the intro
      setTimeout(function () { if (!done) { loaded = tasks.length; } }, 6000);
    }
  } else {
    root.classList.remove('has-intro'); // pages without an intro must never stay scroll-locked
    if (intro) intro.remove();
    playHero();
  }

  /* ---------------- Footer year ---------------- */
  $$('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });

  /* ---------------- Enquiry form ---------------- */
  var form = $('[data-enquiry]');
  if (form) {
    var status = $('[data-enquiry-status]', form);
    var submit = $('[data-enquiry-submit]', form);
    var startedEl = $('[data-started]', form);
    if (startedEl) startedEl.value = String(Date.now());

    var setStatus = function (msg, isError) {
      status.textContent = msg;
      status.classList.toggle('is-error', !!isError);
    };
    var setErrors = function (errors) {
      $$('.enq-field', form).forEach(function (f) { f.classList.remove('has-err'); });
      $$('[data-err]', form).forEach(function (e) { e.textContent = ''; });
      var first = null;
      Object.keys(errors || {}).forEach(function (k) {
        var slot = $('[data-err="' + k + '"]', form);
        var input = form.elements[k];
        if (slot) slot.textContent = errors[k];
        if (input) {
          input.closest('.enq-field').classList.add('has-err');
          input.setAttribute('aria-invalid', 'true');
          if (!first) first = input;
        }
      });
      $$('input', form).forEach(function (i) { if (!(errors || {})[i.name]) i.removeAttribute('aria-invalid'); });
      if (first) first.focus();
    };
    var validate = function () {
      var e = {};
      if (form.elements.name.value.trim().length < 2) e.name = 'Enter your name.';
      var digits = form.elements.phone.value.replace(/\D/g, '');
      if (digits.length < 10 || digits.length > 13) e.phone = 'Enter a 10 digit mobile number.';
      if (form.elements.town.value.trim().length < 2) e.town = 'Enter the town or village of the plot.';
      var area = form.elements.plot_area.value.trim();
      if (area && !/\d/.test(area)) e.plot_area = 'Use a number, for example 2400.';
      return e;
    };

    // Result of a no-JS submission comes back as ?enquiry=sent|error
    var q = new URLSearchParams(location.search).get('enquiry');
    if (q === 'sent') setStatus('Thank you. We have your details and will call you back soon.');
    if (q === 'error') setStatus('That did not go through. Please check the form, or call +91 94565 58811.', true);

    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var errs = validate();
      setErrors(errs);
      if (Object.keys(errs).length) { setStatus('Please check the highlighted fields.', true); return; }
      submit.disabled = true;
      setStatus('Sending\u2026');
      fetch(form.action, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' }, credentials: 'same-origin' })
        .then(function (r) {
          // static previews (GitHub Pages) have no PHP: say so instead of a vague failure
          if (r.status === 404 || r.status === 405) return { ok: false, message: 'This preview is not connected to the enquiry system yet. Please call us on +91 94565 58811.' };
          return r.json().catch(function () { return { ok: false, message: 'We could not send that just now. Please call us on +91 94565 58811.' }; }); })
        .then(function (res) {
          setErrors(res.errors || {});
          setStatus(res.message, !res.ok);
          if (res.ok) { form.reset(); if (startedEl) startedEl.value = String(Date.now()); }
        })
        .catch(function () { setStatus('No connection. Please try again, or call +91 94565 58811.', true); })
        .then(function () { submit.disabled = false; });
    });
  }

  /* ---------------- Services: one open at a time ---------------- */
  // <details name="svc"> already does this in current browsers; this covers older ones.
  var svcs = $$('details.svc');
  svcs.forEach(function (det) {
    det.addEventListener('toggle', function () {
      if (!det.open) return;
      svcs.forEach(function (other) { if (other !== det && other.open) other.open = false; });
      if (hasGsap) ST.refresh();
    });
  });

  if (!hasGsap) return; // everything below is scroll-driven enhancement

  /* ---------------- Manifesto: words light up with scroll ---------------- */
  var manifesto = $('[data-words]');
  if (manifesto) {
    var words = manifesto.textContent.trim().split(/\s+/);
    manifesto.textContent = '';
    words.forEach(function (w, i) {
      var sp = d.createElement('span'); sp.className = 'w'; sp.textContent = w;
      manifesto.appendChild(sp);
      if (i < words.length - 1) manifesto.appendChild(d.createTextNode(' '));
    });
    var spans = $$('.w', manifesto);
    if (!reduce) {
      ST.create({
        // fully lit by the time the paragraph sits in the middle of the screen
        trigger: manifesto, start: 'top 85%', end: 'center center', scrub: true,
        onUpdate: function (self) {
          var n = Math.round(self.progress * spans.length);
          for (var i = 0; i < spans.length; i++) spans[i].classList.toggle('is-lit', i < n);
        }
      });
    }
  }

  /* ---------------- Fact counters ---------------- */
  $$('[data-count]').forEach(function (el) {
    if (reduce || el.hasAttribute('data-plain')) return;
    var to = parseInt(el.getAttribute('data-count'), 10);
    var o = { v: 0 };
    el.textContent = '0';
    ST.create({
      trigger: el, start: 'top 88%', once: true,
      onEnter: function () {
        gsap.to(o, { v: to, duration: 1.6, ease: 'power3.out', onUpdate: function () { el.textContent = Math.round(o.v); } });
      }
    });
  });

  /* ---------------- Projects split viewer ---------------- */
  var works = $('[data-works]');
  if (works) {
    var items = $$('[data-work]', works);
    var metas = $$('[data-work-meta]', works);
    var current = 0;
    items.forEach(function (it, i) { it.style.zIndex = i + 1; });
    var show = function (idx) {
      if (idx === current) return;
      current = idx;
      items.forEach(function (it, i) {
        it.classList.toggle('is-active', i === idx);
        it.classList.toggle('is-past', i < idx);
      });
      metas.forEach(function (m, i) { m.classList.toggle('is-active', i === idx); });
    };
    ST.create({
      trigger: '.works', start: 'top top', end: 'bottom bottom',
      onUpdate: function (self) { show(Math.min(items.length - 1, Math.floor(self.progress * items.length))); }
    });
  }

  /* ---------------- Hill sites: image opens to full bleed ---------------- */
  if ($('[data-hills]') && !reduce) {
    gsap.timeline({ scrollTrigger: { trigger: '.hills-track', start: 'top top', end: 'bottom bottom', scrub: true } })
      .fromTo('.hills-img', { clipPath: 'inset(16% 24% 16% 24%)' }, { clipPath: 'inset(0% 0% 0% 0%)', ease: 'none', duration: 0.6 }, 0)
      .fromTo('.hills-img img', { scale: 1.18 }, { scale: 1, ease: 'none', duration: 0.6 }, 0)
      .to('.hills-copy', { opacity: 1, ease: 'none', duration: 0.25 }, 0.55);
  }

  /* ---------------- Process: rule draws, steps arrive ---------------- */
  var procLine = $('[data-proc-line]');
  if (procLine && !reduce) {
    var dots = $$('.proc-steps li');
    var proc = $('[data-proc]');
    // each step lights when the rule reaches its dot (or, when stacked, in reading order)
    var marks = [];
    var measure = function () {
      var row = procLine.offsetParent !== null;
      marks = dots.map(function (li, i) {
        return row ? li.offsetLeft / proc.offsetWidth : i / dots.length;
      });
    };
    measure();
    gsap.set(procLine, { scaleX: 0 });
    gsap.set(dots, { opacity: 0.25 });
    var drawTo = function (p) {
      gsap.set(procLine, { scaleX: p });
      dots.forEach(function (li, i) { li.style.opacity = p >= marks[i] ? 1 : 0.25; });
    };
    var procMedia = gsap.matchMedia();
    // Desktop: the section holds at the top of the screen while the rule draws and every
    // step lights up; it lets go after a short pause on the finished state.
    procMedia.add('(min-width: 901px)', function () {
      ST.create({
        trigger: '.process', start: 'top top', end: '+=100%', pin: true, scrub: true,
        onRefresh: measure,
        onUpdate: function (self) { drawTo(Math.min(1, self.progress / 0.8)); }
      });
    });
    // Phones and tablets: steps stack, so no hold. Starts on screen, done by mid-screen.
    procMedia.add('(max-width: 900px)', function () {
      ST.create({
        trigger: proc, start: 'top bottom', end: 'center center', scrub: true,
        onRefresh: measure,
        onUpdate: function (self) { drawTo(self.progress); }
      });
    });
  }

  /* ---------------- Chapter bar progress ---------------- */
  if (chapters) {
    $$('a', chapters).forEach(function (a) {
      var target = d.getElementById(a.getAttribute('href').slice(1));
      if (!target) return;
      var i = $('i', a);
      ST.create({
        trigger: target, start: 'top 55%', end: 'bottom 55%',
        onUpdate: function (self) { i.style.setProperty('--p', self.progress.toFixed(3)); },
        onToggle: function (self) { a.classList.toggle('is-active', self.isActive); }
      });
    });
  }

  /* ---------------- Section reveals ---------------- */
  if (!reduce) {
    $$('[data-split]').forEach(function (el) {
      gsap.from(el, { y: 50, opacity: 0, duration: 1.2, ease: EASE, scrollTrigger: { trigger: el, start: 'top 85%', once: true } });
    });
    var groups = ['.facts .fact', '.svc', '.hills-list li', '.foot-grid .foot-col'];
    groups.forEach(function (sel) {
      var els = $$(sel);
      if (!els.length) return;
      gsap.set(els, { y: 28, opacity: 0 });
      ST.batch(els, {
        start: 'top 90%', once: true,
        onEnter: function (batch) { gsap.to(batch, { y: 0, opacity: 1, duration: 1, ease: EASE, stagger: 0.07, overwrite: true }); }
      });
    });
  }

  window.addEventListener('load', function () { ST.refresh(); });
})();
