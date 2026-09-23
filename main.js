/* James Tian · personal site
   - opens a project from the URL hash
   - loads the 3D drone stage only when that project is opened
   - a lightbox for screenshots: wheel / pinch / double-click to zoom, drag to pan
   - a before/after slider for the simulator frames and SafeLand's labels */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------------------------ header */
  var header = document.querySelector('.site');
  if (header) {
    var onScroll = function () { header.classList.toggle('scrolled', window.scrollY > 8); };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ------------------------------------------------------------ drone stage */
  var THREE_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
  var THREE_SRI = 'sha384-CI3ELBVUz9XQO+97x6nwMDPosPR5XvsxW2ua7N1Xeygeh1IxtgqtCkGfQY9WWdHu';

  function loadScript(src, integrity, ok, fail) {
    var s = document.createElement('script');
    s.src = src;
    s.async = true;
    if (integrity) {
      s.integrity = integrity;
      s.crossOrigin = 'anonymous';
    }
    s.onload = ok;
    s.onerror = fail;
    document.head.appendChild(s);
  }

  function haveThree128() {
    return !!(window.THREE && String(window.THREE.REVISION) === '128');
  }

  var drone = document.getElementById('drone');
  var stage = document.getElementById('drone-viewer');
  var loading = false;

  // Loads three.js (pinned r128) and drone.js the first time the section opens.
  // A failed load clears `loading`, so reopening the section tries again.
  function startViewer() {
    if (loading || window.droneViewer || !stage) return;
    loading = true;
    var fail = function () {
      loading = false;
      stage.classList.add('failed');
    };
    var init = function () {
      try {
        if (!window.initDroneViewer) return fail();
        var v = window.initDroneViewer(stage);
        if (!v) return fail();
        stage.classList.remove('failed');
        loading = false;
        wireStageButtons(v);
        v.setActive(drone.open);
      } catch (e) {
        fail();
      }
    };
    var boot = function () {
      if (window.initDroneViewer) init();
      else loadScript('drone.js', null, init, fail);
    };
    if (haveThree128()) boot();
    else loadScript(THREE_SRC, THREE_SRI, boot, fail);
  }

  function wireStageButtons(v) {
    stage.querySelectorAll('.stage-btns button').forEach(function (b) {
      b.addEventListener('click', function () {
        var act = b.getAttribute('data-act');
        if (act === 'reset') return v.resetView();
        var on = b.getAttribute('aria-pressed') !== 'true';
        b.setAttribute('aria-pressed', String(on));
        if (act === 'sensors') {
          v.setSensors(on);
          stage.classList.toggle('sensors-off', !on);
        }
        if (act === 'rotors') v.setRotors(on);
      });
    });
    if (reduceMotion) {
      var r = stage.querySelector('[data-act="rotors"]');
      if (r) r.setAttribute('aria-pressed', 'false');
    }
  }

  if (drone && stage) {
    drone.addEventListener('toggle', function () {
      if (drone.open) startViewer();
      if (window.droneViewer) window.droneViewer.setActive(drone.open);
    });
    if (drone.open) startViewer();
  }

  /* ------------------------------------------------------------ hash */
  // A link like /#apateu (or a click on the intro's #drone link) opens that project.
  function openFromHash() {
    var id = location.hash.replace('#', '');
    if (!id) return;
    var el = document.getElementById(id);
    if (el && el.tagName === 'DETAILS' && !el.open) el.open = true;
  }
  openFromHash();
  window.addEventListener('hashchange', openFromHash);

  /* ------------------------------------------------------------ lightbox */
  var icons = {
    close: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 5l10 10M15 5 5 15" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    plus: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 4.5v11M4.5 10h11" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    minus: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4.5 10h11" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    prev: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M12.5 4.5 7 10l5.5 5.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    next: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M7.5 4.5 13 10l-5.5 5.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  };

  var lb = null;

  function buildLightbox() {
    var d = document.createElement('dialog');
    d.className = 'lb';
    d.setAttribute('aria-label', 'Image viewer');
    d.innerHTML =
      '<div class="lb-view"><img class="lb-img" alt="" draggable="false"></div>' +
      '<div class="lb-top">' +
      '<p class="lb-count" aria-live="polite"></p>' +
      '<button type="button" class="lb-btn lb-out" aria-label="Zoom out">' + icons.minus + '</button>' +
      '<button type="button" class="lb-btn lb-level" aria-label="Toggle zoom">100%</button>' +
      '<button type="button" class="lb-btn lb-in" aria-label="Zoom in">' + icons.plus + '</button>' +
      '<button type="button" class="lb-btn lb-close" aria-label="Close">' + icons.close + '</button>' +
      '</div>' +
      '<button type="button" class="lb-btn lb-nav lb-prev" aria-label="Previous image">' + icons.prev + '</button>' +
      '<button type="button" class="lb-btn lb-nav lb-next" aria-label="Next image">' + icons.next + '</button>' +
      '<p class="lb-help">' + (window.matchMedia && window.matchMedia('(hover: none)').matches ? 'Pinch or double-tap to zoom · swipe for the next screen' : 'Scroll to zoom · drag to move · double-click for 100%') + '</p>' +
      '<div class="lb-bottom"><p class="lb-cap"></p><div class="lb-thumbs"></div></div>';
    document.body.appendChild(d);

    var view = d.querySelector('.lb-view');
    var img = d.querySelector('.lb-img');
    var count = d.querySelector('.lb-count');
    var cap = d.querySelector('.lb-cap');
    var level = d.querySelector('.lb-level');
    var thumbs = d.querySelector('.lb-thumbs');
    var help = d.querySelector('.lb-help');

    var set = [], idx = 0, title = '';
    var st = { s: 1, x: 0, y: 0, fit: 1, nw: 1, nh: 1 };
    var pointers = new Map(), gesture = null, lastTap = 0, returnFocus = null, helpTimer = 0;

    function vw() { return view.clientWidth; }
    function vh() { return view.clientHeight; }
    function pad() { return window.innerWidth < 640 ? 12 : 64; }

    function maxScale() { return Math.max(st.fit * 6, 2.5); }

    function clamp() {
      var w = st.nw * st.s, h = st.nh * st.s, W = vw(), H = vh();
      if (w <= W) st.x = (W - w) / 2;
      else st.x = Math.min(0, Math.max(W - w, st.x));
      if (h <= H) st.y = (H - h) / 2;
      else st.y = Math.min(0, Math.max(H - h, st.y));
    }

    function apply(animate, keep) {
      if (!keep) clamp();
      img.classList.toggle('anim', !!animate && !reduceMotion);
      img.style.transform = 'translate(' + st.x.toFixed(2) + 'px,' + st.y.toFixed(2) + 'px) scale(' + st.s.toFixed(5) + ')';
      var zoomed = st.s > st.fit * 1.01;
      d.classList.toggle('zoomed', zoomed);
      view.classList.toggle('zoomed', zoomed);
      level.textContent = zoomed ? Math.round(st.s * 100) + '%' : 'Fit';
      d.querySelector('.lb-in').disabled = st.s >= maxScale() - 1e-6;
      d.querySelector('.lb-out').disabled = !zoomed;
    }

    // Fitted: the whole picture sits between the top bar and the caption.
    function fit(animate) {
      var top = 62, bottom = window.innerWidth < 640 ? 96 : 118;
      var W = vw() - pad() * 2, H = vh() - top - bottom;
      st.fit = Math.min(W / st.nw, H / st.nh, 1.5);
      st.s = st.fit;
      st.x = (vw() - st.nw * st.s) / 2;
      st.y = top + (H - st.nh * st.s) / 2;
      apply(animate, true);
    }

    function zoomAt(ns, cx, cy, animate) {
      ns = Math.max(st.fit, Math.min(maxScale(), ns));
      var k = ns / st.s;
      st.x = cx - (cx - st.x) * k;
      st.y = cy - (cy - st.y) * k;
      st.s = ns;
      if (ns <= st.fit * 1.001) return fit(animate);
      apply(animate);
    }

    function show(i) {
      idx = (i + set.length) % set.length;
      var it = set[idx];
      img.classList.remove('anim');
      img.style.opacity = '0';
      img.alt = it.alt || '';
      var pre = new Image();
      pre.onload = function () {
        if (set[idx] !== it) return;
        img.src = it.src;
        st.nw = pre.naturalWidth;
        st.nh = pre.naturalHeight;
        img.style.width = st.nw + 'px';
        img.style.height = st.nh + 'px';
        fit(false);
        img.style.opacity = '1';
      };
      pre.src = it.src;
      count.innerHTML = (title ? title + ' · ' : '') + '<b>' + (idx + 1) + '</b> / ' + set.length;
      cap.textContent = it.caption || '';
      thumbs.querySelectorAll('button').forEach(function (b, k) { b.setAttribute('aria-current', String(k === idx)); });
      // warm the neighbours
      if (set.length > 1) {
        [idx + 1, idx - 1].forEach(function (j) { var n = new Image(); n.src = set[(j + set.length) % set.length].src; });
      }
    }

    function open(items, start, name, from) {
      set = items;
      title = name || '';
      returnFocus = from || document.activeElement;
      d.classList.toggle('single', set.length < 2);
      thumbs.innerHTML = '';
      set.forEach(function (it, k) {
        var b = document.createElement('button');
        b.type = 'button';
        b.setAttribute('aria-label', 'Image ' + (k + 1));
        b.innerHTML = '<img alt="" src="' + (it.thumb || it.src) + '">';
        b.addEventListener('click', function () { show(k); });
        thumbs.appendChild(b);
      });
      document.documentElement.classList.add('lb-lock');
      if (d.showModal) d.showModal(); else d.setAttribute('open', '');
      help.classList.remove('gone');
      clearTimeout(helpTimer);
      helpTimer = setTimeout(function () { help.classList.add('gone'); }, 2600);
      show(start || 0);
      d.querySelector('.lb-close').focus({ preventScroll: true });
    }

    function close() {
      if (d.close && d.open) d.close(); else d.removeAttribute('open');
    }
    d.addEventListener('close', function () {
      document.documentElement.classList.remove('lb-lock');
      img.removeAttribute('src');
      if (returnFocus && returnFocus.focus) returnFocus.focus({ preventScroll: true });
    });

    d.querySelector('.lb-close').addEventListener('click', close);
    d.querySelector('.lb-prev').addEventListener('click', function () { show(idx - 1); });
    d.querySelector('.lb-next').addEventListener('click', function () { show(idx + 1); });
    d.querySelector('.lb-in').addEventListener('click', function () { zoomAt(st.s * 1.6, vw() / 2, vh() / 2, true); });
    d.querySelector('.lb-out').addEventListener('click', function () { zoomAt(st.s / 1.6, vw() / 2, vh() / 2, true); });
    level.addEventListener('click', function () {
      if (st.s > st.fit * 1.01) fit(true);
      else zoomAt(Math.max(1, st.fit * 2.2), vw() / 2, vh() / 2, true);
    });

    d.addEventListener('keydown', function (e) {
      var zoomed = st.s > st.fit * 1.01, step = 80;
      switch (e.key) {
        case 'ArrowLeft': if (zoomed) { st.x += step; apply(true); } else if (set.length > 1) show(idx - 1); break;
        case 'ArrowRight': if (zoomed) { st.x -= step; apply(true); } else if (set.length > 1) show(idx + 1); break;
        case 'ArrowUp': if (zoomed) { st.y += step; apply(true); } else return; break;
        case 'ArrowDown': if (zoomed) { st.y -= step; apply(true); } else return; break;
        case '+': case '=': zoomAt(st.s * 1.4, vw() / 2, vh() / 2, true); break;
        case '-': case '_': zoomAt(st.s / 1.4, vw() / 2, vh() / 2, true); break;
        case '0': fit(true); break;
        default: return;
      }
      e.preventDefault();
    });

    view.addEventListener('wheel', function (e) {
      e.preventDefault();
      var r = view.getBoundingClientRect();
      var dy = e.deltaMode === 1 ? e.deltaY * 18 : e.deltaY;
      zoomAt(st.s * Math.exp(-dy * (e.ctrlKey ? 0.01 : 0.0022)), e.clientX - r.left, e.clientY - r.top, false);
    }, { passive: false });

    view.addEventListener('dblclick', function (e) {
      var r = view.getBoundingClientRect();
      if (st.s > st.fit * 1.01) fit(true);
      else zoomAt(Math.max(1, st.fit * 2.5), e.clientX - r.left, e.clientY - r.top, true);
    });

    view.addEventListener('pointerdown', function (e) {
      view.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 1) {
        gesture = { type: 'pan', x: e.clientX, y: e.clientY, sx: st.x, sy: st.y, t: Date.now(), moved: 0 };
      } else if (pointers.size === 2) {
        var p = Array.from(pointers.values());
        gesture = { type: 'pinch', d: Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y), s: st.s };
      }
    });
    view.addEventListener('pointermove', function (e) {
      if (!pointers.has(e.pointerId) || !gesture) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      var r = view.getBoundingClientRect();
      if (gesture.type === 'pinch' && pointers.size >= 2) {
        var p = Array.from(pointers.values());
        var dd = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
        zoomAt(gesture.s * dd / gesture.d, (p[0].x + p[1].x) / 2 - r.left, (p[0].y + p[1].y) / 2 - r.top, false);
      } else if (gesture.type === 'pan') {
        var dx = e.clientX - gesture.x, dy = e.clientY - gesture.y;
        gesture.moved = Math.max(gesture.moved, Math.abs(dx) + Math.abs(dy));
        if (st.s > st.fit * 1.01) {
          view.classList.add('dragging');
          st.x = gesture.sx + dx;
          st.y = gesture.sy + dy;
          apply(false);
        } else {
          img.style.transform = 'translate(' + (st.x + dx * 0.6).toFixed(1) + 'px,' + st.y.toFixed(1) + 'px) scale(' + st.s + ')';
        }
      }
    });
    function endPointer(e) {
      if (!pointers.has(e.pointerId)) return;
      pointers.delete(e.pointerId);
      view.classList.remove('dragging');
      if (gesture && gesture.type === 'pan' && pointers.size === 0) {
        var dx = e.clientX - gesture.x;
        var zoomed = st.s > st.fit * 1.01;
        if (!zoomed && set.length > 1 && Math.abs(dx) > 60 && e.pointerType !== 'mouse') {
          show(dx < 0 ? idx + 1 : idx - 1);
        } else if (!zoomed) {
          fit(true);
        }
        // double-tap on touch
        if (e.pointerType !== 'mouse' && gesture.moved < 10) {
          var now = Date.now();
          if (now - lastTap < 300) {
            var r = view.getBoundingClientRect();
            if (zoomed) fit(true);
            else zoomAt(Math.max(1, st.fit * 2.5), e.clientX - r.left, e.clientY - r.top, true);
            lastTap = 0;
          } else {
            lastTap = now;
          }
        }
      }
      if (pointers.size === 1) {
        var p = Array.from(pointers.values())[0];
        gesture = { type: 'pan', x: p.x, y: p.y, sx: st.x, sy: st.y, t: Date.now(), moved: 99 };
      } else if (pointers.size === 0) {
        gesture = null;
      }
    }
    view.addEventListener('pointerup', endPointer);
    view.addEventListener('pointercancel', endPointer);

    window.addEventListener('resize', function () {
      if (d.open && set.length) fit(false);
    });

    return { open: open };
  }

  function lightbox() {
    if (!lb) lb = buildLightbox();
    return lb;
  }

  document.querySelectorAll('.gallery').forEach(function (g) {
    var links = Array.prototype.slice.call(g.querySelectorAll('a.shot'));
    var items = links.map(function (a) {
      var im = a.querySelector('img');
      return { src: a.getAttribute('href'), thumb: im && im.getAttribute('src'), alt: im && im.alt, caption: a.getAttribute('data-caption') };
    });
    links.forEach(function (a, k) {
      a.addEventListener('click', function (e) {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
        e.preventDefault();
        lightbox().open(items, k, g.getAttribute('data-gallery'), a);
      });
    });
  });

  /* ------------------------------------------------------------ compare slider */
  document.querySelectorAll('[data-compare]').forEach(function (fig) {
    var box = fig.querySelector('.compare');
    var range = fig.querySelector('.c-range');
    var a = fig.querySelector('.c-a');
    var b = fig.querySelector('.c-b');
    var capEl = fig.querySelector('.c-cap');
    var tabs = Array.prototype.slice.call(fig.querySelectorAll('.compare-tabs button'));
    var tagA = fig.querySelector('.c-tag-a'), tagB = fig.querySelector('.c-tag-b');

    function setPos(v) {
      box.style.setProperty('--pos', v + '%');
      tagA.style.opacity = v < 22 ? '0' : '1';
      tagB.style.opacity = v > 78 ? '0' : '1';
    }
    range.addEventListener('input', function () { setPos(parseFloat(range.value)); });

    tabs.forEach(function (t, k) {
      // preload the other scenes
      [t.getAttribute('data-rgb'), t.getAttribute('data-lab')].forEach(function (u) { var i = new Image(); i.src = u; });
      t.addEventListener('click', function () { select(k, true); });
      t.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
          e.preventDefault();
          var n = (k + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
          select(n, true);
          tabs[n].focus();
        }
      });
    });

    function select(k, focusSlider) {
      tabs.forEach(function (t, j) {
        t.setAttribute('aria-selected', String(j === k));
        t.tabIndex = j === k ? 0 : -1;
      });
      var t = tabs[k];
      a.src = t.getAttribute('data-rgb');
      b.src = t.getAttribute('data-lab');
      capEl.textContent = t.getAttribute('data-cap');
      if (focusSlider) sweep();
    }
    tabs.forEach(function (t, j) { t.tabIndex = j === 0 ? 0 : -1; });

    // a short sweep the first time the slider comes into view, so it reads as interactive
    function sweep() {
      if (reduceMotion) return;
      var t0 = null, from = 88, to = parseFloat(range.value) || 50;
      if (to > 80) to = 50;
      function f(ts) {
        if (t0 === null) t0 = ts;
        var p = Math.min(1, (ts - t0) / 900);
        var e = 1 - Math.pow(1 - p, 3);
        var v = from + (to - from) * e;
        setPos(v);
        range.value = v;
        if (p < 1) requestAnimationFrame(f);
      }
      requestAnimationFrame(f);
    }
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (en) {
        if (en[0].isIntersecting) { sweep(); io.disconnect(); }
      }, { threshold: 0.5 });
      io.observe(box);
    }

    fig.querySelector('.c-zoom').addEventListener('click', function (e) {
      var t = tabs.filter(function (x) { return x.getAttribute('aria-selected') === 'true'; })[0] || tabs[0];
      lightbox().open([
        { src: t.getAttribute('data-rgb'), caption: 'Rendered camera frame. ' + t.getAttribute('data-cap') },
        { src: t.getAttribute('data-lab'), caption: 'SafeLand’s labels on the same frame. ' + t.getAttribute('data-cap') }
      ], 0, t.textContent, e.currentTarget);
    });
  });
})();
