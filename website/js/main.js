/* ====== OppNexa — site interactions ====== */
(function () {
  'use strict';

  /* ======================================================================
     CONFIG — the contact form posts to the Resend-backed serverless
     function at /api/contact (see api/contact.js). Nothing secret lives
     here: the Resend API key stays in Vercel env vars, never in the browser.
     CONTACT_EMAIL is only the fallback address used to open the visitor's
     email app if the function isn't reachable (local preview / pre-deploy).
     ====================================================================== */
  var CONTACT_ENDPOINT = '/api/contact';
  var CONTACT_EMAIL = 'hello@oppnexa.com';

  // Footer year
  var y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();

  // Sticky nav shadow on scroll
  var nav = document.getElementById('nav');
  function onScroll() {
    if (!nav) return;
    nav.classList.toggle('scrolled', window.scrollY > 8);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Mobile menu
  var toggle = document.getElementById('navToggle');
  var links = document.getElementById('navLinks');
  if (toggle && links) {
    toggle.addEventListener('click', function () {
      var open = links.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    links.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') {
        links.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // Reveal on scroll
  var reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    reveals.forEach(function (el, i) {
      // tiny stagger for siblings
      el.style.transitionDelay = (Math.min(i % 6, 5) * 60) + 'ms';
      io.observe(el);
    });
  } else {
    reveals.forEach(function (el) { el.classList.add('in'); });
  }

  // Count-up stats
  function animateCount(el) {
    var target = parseInt(el.getAttribute('data-count'), 10);
    var suffix = el.getAttribute('data-suffix') || '';
    var dur = 1400, start = null;
    function step(ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.floor(eased * target).toLocaleString() + suffix;
      if (p < 1) requestAnimationFrame(step);
      else el.textContent = target.toLocaleString() + suffix;
    }
    requestAnimationFrame(step);
  }
  var counters = document.querySelectorAll('.stat-num[data-count]');
  if ('IntersectionObserver' in window) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          animateCount(entry.target);
          cio.unobserve(entry.target);
        }
      });
    }, { threshold: 0.6 });
    counters.forEach(function (el) { cio.observe(el); });
  } else {
    counters.forEach(animateCount);
  }

  // ---- Contact form submission ----
  var form = document.getElementById('contactForm');
  var note = document.getElementById('formNote');
  if (form) {
    var submitBtn = form.querySelector('button[type="submit"]');
    var btnLabel = submitBtn ? submitBtn.textContent : '';

    function setNote(msg, kind) { note.textContent = msg; note.className = 'form-note ' + kind; }
    function setBusy(b) {
      if (!submitBtn) return;
      submitBtn.disabled = b;
      submitBtn.textContent = b ? 'Sending…' : btnLabel;
      submitBtn.style.opacity = b ? '0.7' : '';
    }

    // Opens the visitor's email app, pre-filled — used when the serverless
    // function isn't reachable (local preview, or before the site is deployed).
    function mailtoFallback(name, company, email, sector, message) {
      var body = encodeURIComponent(
        'Name: ' + name + '\nCompany: ' + company + '\nEmail: ' + email +
        '\nIndustry: ' + sector + '\n\n' + message
      );
      setNote('Opening your email app so you can send this to us…', 'ok');
      window.location.href = 'mailto:' + CONTACT_EMAIL +
        '?subject=' + encodeURIComponent('New OppNexa enquiry — ' + company) + '&body=' + body;
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      // Honeypot — if a bot filled the hidden field, silently ignore.
      if (form._gotcha && form._gotcha.value) { return; }

      var name = form.name.value.trim();
      var company = form.company.value.trim();
      var email = form.email.value.trim();
      var sector = form.sector.value.trim();
      var message = form.message.value.trim();
      var emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      if (!name || !company || !emailOk) {
        setNote('Please add your name, company, and a valid work email.', 'err');
        return;
      }

      // POST to the Resend-backed function. If it's not live (local preview or
      // not deployed yet), fall back to the visitor's email app.
      setBusy(true);
      fetch(CONTACT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          name: name, company: company, email: email,
          sector: sector, message: message, _gotcha: ''
        })
      }).then(function (res) {
        setBusy(false);
        if (res.ok) {
          setNote('Thanks, ' + name + '! We’ll be in touch shortly to set up your first report.', 'ok');
          form.reset();
          return;
        }
        // Non-OK: if it's our function's JSON error (validation / server),
        // show it; otherwise the endpoint isn't live (404/501/HTML page from a
        // plain static host) → fall back to the visitor's email app.
        res.json().then(function (d) {
          if (d && d.error) {
            setNote(d.error, 'err');
          } else {
            mailtoFallback(name, company, email, sector, message);
          }
        }).catch(function () {
          mailtoFallback(name, company, email, sector, message);
        });
      }).catch(function () {
        // Network error → email-app fallback so the form always works.
        setBusy(false);
        mailtoFallback(name, company, email, sector, message);
      });
    });
  }
})();
