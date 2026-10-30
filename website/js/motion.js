/* ====== OppNexa — motion layer ======
   Live behaviour for css/motion.css. Everything degrades cleanly:
   reduced-motion users get a calm static page, touch devices skip
   pointer effects, and animations pause when off-screen or the tab is hidden. */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ---------- scroll progress ---------- */
  var bar = document.querySelector('.scroll-progress');
  if (bar && !reduce) {
    var ticking = false;
    var updateBar = function () {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.setProperty('--p', max > 0 ? Math.min(window.scrollY / max, 1) : 0);
      ticking = false;
    };
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(updateBar); }
    }, { passive: true });
    updateBar();
  }

  /* ---------- headline: word-by-word rise ---------- */
  var h1 = document.querySelector('.hero h1');
  if (h1 && !reduce) {
    (function split(el) {
      Array.prototype.slice.call(el.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
            var w = document.createElement('span'); w.className = 'w';
            var inner = document.createElement('span'); inner.textContent = part;
            w.appendChild(inner); frag.appendChild(w);
          });
          n.parentNode.replaceChild(frag, n);
        } else if (n.nodeType === 1 && n.tagName !== 'BR') {
          split(n);
        }
      });
    })(h1);
    h1.querySelectorAll('.w > span').forEach(function (s, i) {
      s.style.transitionDelay = (150 + i * 75) + 'ms';
    });
    requestAnimationFrame(function () { requestAnimationFrame(function () { h1.classList.add('h-in'); }); });
  }

  /* ---------- hero network: drifting nodes, links, travelling signals ---------- */
  var hero = document.querySelector('.hero');
  if (hero && !reduce && window.HTMLCanvasElement) {
    var canvas = document.createElement('canvas');
    canvas.className = 'hero-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    hero.insertBefore(canvas, hero.firstChild);
    var ctx = canvas.getContext('2d');
    var W = 0, H = 0, nodes = [], pulses = [], running = false, raf = 0;
    var LINK = 140, mouse = { x: -9999, y: -9999 };

    var resize = function () {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = hero.clientWidth; H = hero.clientHeight;
      canvas.width = W * dpr; canvas.height = H * dpr;
      canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var count = Math.round(Math.max(24, Math.min(72, (W * H) / 15000)));
      nodes = [];
      for (var i = 0; i < count; i++) {
        nodes.push({
          x: Math.random() * W, y: Math.random() * H,
          vx: (Math.random() - 0.5) * 0.28, vy: (Math.random() - 0.5) * 0.28,
          r: Math.random() * 1.4 + 1.1, hub: Math.random() < 0.14, flash: 0
        });
      }
      pulses = [];
    };

    var neighbour = function (a) {
      var best = null, bestD = LINK;
      for (var k = 0; k < 6; k++) {
        var b = nodes[(Math.random() * nodes.length) | 0];
        if (b === a) continue;
        var d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < bestD) { best = b; bestD = d; }
      }
      return best;
    };

    var frame = function () {
      ctx.clearRect(0, 0, W, H);
      var i, j, a, b, d, dx, dy;

      for (i = 0; i < nodes.length; i++) {
        a = nodes[i];
        dx = mouse.x - a.x; dy = mouse.y - a.y; d = Math.hypot(dx, dy);
        if (d < 180 && d > 1) { a.vx += (dx / d) * 0.012; a.vy += (dy / d) * 0.012; }
        var sp = Math.hypot(a.vx, a.vy);
        if (sp > 0.45) { a.vx *= 0.45 / sp; a.vy *= 0.45 / sp; }
        a.x += a.vx; a.y += a.vy;
        if (a.x < 0 || a.x > W) a.vx *= -1;
        if (a.y < 0 || a.y > H) a.vy *= -1;
      }

      ctx.lineWidth = 1;
      for (i = 0; i < nodes.length; i++) {
        for (j = i + 1; j < nodes.length; j++) {
          a = nodes[i]; b = nodes[j];
          dx = a.x - b.x; dy = a.y - b.y;
          if (Math.abs(dx) > LINK || Math.abs(dy) > LINK) continue;
          d = Math.sqrt(dx * dx + dy * dy);
          if (d < LINK) {
            ctx.strokeStyle = 'rgba(47,107,255,' + ((1 - d / LINK) * 0.28).toFixed(3) + ')';
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
        a = nodes[i];
        d = Math.hypot(mouse.x - a.x, mouse.y - a.y);
        if (d < 170) {
          ctx.strokeStyle = 'rgba(16,185,129,' + ((1 - d / 170) * 0.45).toFixed(3) + ')';
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke();
        }
      }

      // signals: an opportunity travelling node → node
      if (pulses.length < 7 && Math.random() < 0.05) {
        var from = nodes[(Math.random() * nodes.length) | 0], to = neighbour(from);
        if (to) pulses.push({ a: from, b: to, t: 0, v: 0.012 + Math.random() * 0.012, hops: 0, green: Math.random() < 0.4 });
      }
      for (i = pulses.length - 1; i >= 0; i--) {
        var p = pulses[i];
        p.t += p.v;
        if (p.t >= 1) {
          p.b.flash = 1;
          var next = p.hops < 3 && Math.random() < 0.6 ? neighbour(p.b) : null;
          if (next) { p.a = p.b; p.b = next; p.t = 0; p.hops++; } else { pulses.splice(i, 1); continue; }
        }
        var px = p.a.x + (p.b.x - p.a.x) * p.t, py = p.a.y + (p.b.y - p.a.y) * p.t;
        var col = p.green ? '16,185,129' : '47,107,255';
        var g = ctx.createRadialGradient(px, py, 0, px, py, 9);
        g.addColorStop(0, 'rgba(' + col + ',0.9)'); g.addColorStop(1, 'rgba(' + col + ',0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(px, py, 9, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(' + col + ',1)'; ctx.beginPath(); ctx.arc(px, py, 1.8, 0, Math.PI * 2); ctx.fill();
      }

      for (i = 0; i < nodes.length; i++) {
        a = nodes[i];
        if (a.flash > 0) {
          ctx.strokeStyle = 'rgba(47,107,255,' + (a.flash * 0.5).toFixed(3) + ')';
          ctx.beginPath(); ctx.arc(a.x, a.y, a.r + (1 - a.flash) * 14, 0, Math.PI * 2); ctx.stroke();
          a.flash -= 0.025;
        }
        ctx.fillStyle = a.hub ? 'rgba(47,107,255,0.85)' : 'rgba(10,37,64,0.32)';
        ctx.beginPath(); ctx.arc(a.x, a.y, a.hub ? a.r + 1.2 : a.r, 0, Math.PI * 2); ctx.fill();
      }

      raf = requestAnimationFrame(frame);
    };

    var start = function () { if (!running) { running = true; raf = requestAnimationFrame(frame); } };
    var stop = function () { running = false; cancelAnimationFrame(raf); };

    resize();
    var rT;
    window.addEventListener('resize', function () { clearTimeout(rT); rT = setTimeout(resize, 150); });
    hero.addEventListener('pointermove', function (e) {
      var r = hero.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
    });
    hero.addEventListener('pointerleave', function () { mouse.x = mouse.y = -9999; });
    var heroVisible = true;
    new IntersectionObserver(function (es) {
      heroVisible = es[0].isIntersecting;
      if (heroVisible && !document.hidden) start(); else stop();
    }).observe(hero);
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stop(); else if (heroVisible) start();
    });
  }

  /* ---------- report card: boot stagger, live feed, tilt ---------- */
  var card = document.querySelector('.report-card');
  if (card) {
    var rows = card.querySelectorAll('.rc-row');
    if (!reduce) {
      rows.forEach(function (r, i) { r.classList.add('boot'); r.style.animationDelay = (500 + i * 120) + 'ms'; });
      setTimeout(function () { rows.forEach(function (r) { r.classList.remove('boot'); r.style.animationDelay = ''; }); }, 1800);
    }

    var feed = [
      ['EHR Integration RFP — City Health System', 'Closes in 14 days · $860K', 'Health', 'green'],
      ['Office Fit-out — SaaS Startup', 'Closes in 6 days · $180K', 'Private', ''],
      ['Smart Metering — Pune Municipal Corp.', 'Closes in 11 days · ₹6.2Cr', 'Gov', ''],
      ['Data Platform Build — Insurance Group', 'Closes in 9 days · $420K', 'Software', 'green'],
      ['Diagnostics Lab Equipment — Clinic Chain', 'Closes in 12 days · ₹1.9Cr', 'Health', ''],
      ['Network Upgrade — School District', 'Closes in 15 days · $310K', 'Gov', ''],
      ['Cybersecurity Audit — FinServ Firm', 'Closes in 8 days · $150K', 'IT', 'green'],
      ['Telehealth Platform — Hospital Group', 'Closes in 10 days · ₹2.4Cr', 'Health', 'green']
    ];
    var countEl = card.querySelector('.rc-count');
    var head = card.querySelector('.rc-head');
    var fi = 0, timer = 0, paused = false, cardVisible = false;

    var makeRow = function (d) {
      var row = document.createElement('div');
      row.className = 'rc-row pre';
      var info = document.createElement('div');
      var s = document.createElement('strong'); s.textContent = d[0];
      var m = document.createElement('span'); m.textContent = d[1];
      info.appendChild(s); info.appendChild(m);
      var tag = document.createElement('span');
      tag.className = 'rc-tag' + (d[3] ? ' ' + d[3] : ''); tag.textContent = d[2];
      row.appendChild(info); row.appendChild(tag);
      return row;
    };

    var tick = function () {
      if (paused || document.hidden || !cardVisible) return;
      var current = card.querySelectorAll('.rc-row:not(.leave)');
      var last = current[current.length - 1];
      var row = makeRow(feed[fi++ % feed.length]);
      head.parentNode.insertBefore(row, head.nextSibling);
      void row.offsetHeight;
      row.style.maxHeight = (row.scrollHeight + 24) + 'px';
      row.classList.remove('pre');
      row.classList.add('fresh');
      setTimeout(function () { row.style.maxHeight = ''; }, 600);
      if (last) {
        last.style.maxHeight = last.offsetHeight + 'px';
        void last.offsetHeight;
        last.classList.add('leave');
        setTimeout(function () { if (last.parentNode) last.parentNode.removeChild(last); }, 560);
      }
      if (countEl) {
        countEl.textContent = parseInt(countEl.textContent, 10) + 1;
        countEl.classList.remove('bump'); void countEl.offsetWidth; countEl.classList.add('bump');
      }
    };

    if (!reduce) {
      timer = setInterval(tick, 3600);
      new IntersectionObserver(function (es) { cardVisible = es[0].isIntersecting; }).observe(card);
      card.addEventListener('pointerenter', function () { paused = true; });
      card.addEventListener('pointerleave', function () { paused = false; });
    }

    if (!reduce && finePointer) {
      var vis = card.parentNode;
      vis.addEventListener('pointermove', function (e) {
        var r = card.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        card.classList.add('tilting');
        card.style.setProperty('--ry', ((x - 0.5) * 10).toFixed(2) + 'deg');
        card.style.setProperty('--rx', ((0.5 - y) * 8).toFixed(2) + 'deg');
        card.style.setProperty('--gx', (x * 100).toFixed(1) + '%');
        card.style.setProperty('--gy', (y * 100).toFixed(1) + '%');
      });
      vis.addEventListener('pointerleave', function () {
        card.classList.remove('tilting');
        card.style.setProperty('--rx', '0deg'); card.style.setProperty('--ry', '0deg');
      });
    }
  }

  /* ---------- cursor spotlight on cards ---------- */
  if (finePointer && !reduce) {
    document.querySelectorAll('.feature, .step, .quote, .price-card, .who-card').forEach(function (el) {
      el.classList.add('spot');
      if (el.classList.contains('who-card')) el.classList.add('dark');
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        el.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
    });

    /* magnetic hero buttons */
    document.querySelectorAll('.hero-cta .btn').forEach(function (btn) {
      btn.addEventListener('pointermove', function (e) {
        var r = btn.getBoundingClientRect();
        var dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
        btn.style.transform = 'translate(' + (dx * 0.22).toFixed(1) + 'px,' + (dy * 0.32).toFixed(1) + 'px)';
      });
      btn.addEventListener('pointerleave', function () { btn.style.transform = ''; });
    });
  }

  /* ---------- how it works: draw the track when it scrolls in ---------- */
  var track = document.querySelector('.steps-track');
  if (track) {
    if (reduce || !('IntersectionObserver' in window)) { track.classList.add('drawn'); }
    else {
      var tio = new IntersectionObserver(function (es) {
        if (es[0].isIntersecting) { track.classList.add('drawn'); tio.disconnect(); }
      }, { threshold: 0.6 });
      tio.observe(track);
    }
  }
})();
