/* Precisionpro Engineering Services — vanilla JS, no dependencies */
(function () {
    'use strict';

    var root = document.documentElement;
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

    /* ---------- Split headings into animated words ---------- */
    function splitWords(el) {
        var frag = document.createDocumentFragment();
        var i = 0;
        function wrap(node) {
            var outer = document.createElement('span');
            var inner = document.createElement('span');
            outer.className = 'w';
            inner.style.setProperty('--i', i++);
            inner.appendChild(node);
            outer.appendChild(inner);
            return outer;
        }
        Array.prototype.slice.call(el.childNodes).forEach(function (node) {
            if (node.nodeType === 3) {
                node.textContent.split(/(\s+)/).forEach(function (part) {
                    if (!part) return;
                    if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
                    frag.appendChild(wrap(document.createTextNode(part)));
                });
            } else if (node.nodeName === 'BR') {
                frag.appendChild(node.cloneNode());
            } else {
                frag.appendChild(wrap(node.cloneNode(true)));
            }
        });
        el.textContent = '';
        el.appendChild(frag);
    }
    document.querySelectorAll('[data-split]').forEach(function (el) { splitWords(el); el.classList.add('is-split'); });

    /* ---------- Load state ---------- */
    function markLoaded() { root.classList.add('is-loaded'); }
    var fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    Promise.race([fontsReady, new Promise(function (r) { setTimeout(r, 700); })]).then(function () {
        requestAnimationFrame(markLoaded);
    });

    /* ---------- Stagger indices ---------- */
    document.querySelectorAll('[data-stagger]').forEach(function (group) {
        group.querySelectorAll('[data-reveal]').forEach(function (el, i) {
            el.style.setProperty('--i', i);
        });
    });

    /* ---------- Reveal on scroll ---------- */
    var revealEls = document.querySelectorAll('[data-reveal]');
    if ('IntersectionObserver' in window && !reduceMotion) {
        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (e) {
                if (e.isIntersecting) {
                    e.target.classList.add('is-in');
                    io.unobserve(e.target);
                }
            });
        }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
        revealEls.forEach(function (el) { io.observe(el); });
    } else {
        revealEls.forEach(function (el) { el.classList.add('is-in'); });
    }

    /* ---------- Counters ---------- */
    function runCounter(el) {
        var target = parseFloat(el.getAttribute('data-count'));
        var suffix = el.getAttribute('data-suffix') || '';
        if (reduceMotion) { el.textContent = target.toLocaleString('en-US') + suffix; return; }
        var dur = 1800;
        var start = null;
        function tick(ts) {
            if (!start) start = ts;
            var t = Math.min((ts - start) / dur, 1);
            var eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
            el.textContent = Math.round(target * eased).toLocaleString('en-US') + suffix;
            if (t < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
    }
    var counters = document.querySelectorAll('[data-count]');
    if ('IntersectionObserver' in window) {
        var cio = new IntersectionObserver(function (entries) {
            entries.forEach(function (e) {
                if (e.isIntersecting) { runCounter(e.target); cio.unobserve(e.target); }
            });
        }, { threshold: 0.5 });
        counters.forEach(function (el) { cio.observe(el); });
    } else {
        counters.forEach(runCounter);
    }

    /* ---------- Navigation ---------- */
    var nav = document.getElementById('nav');
    var toggle = document.querySelector('.nav__toggle');
    var menu = document.getElementById('menu');

    function setMenu(open) {
        root.classList.toggle('menu-open', open);
        if (toggle) {
            toggle.setAttribute('aria-expanded', String(open));
            toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
        }
        if (menu) {
            if (open) menu.removeAttribute('inert'); else menu.setAttribute('inert', '');
            menu.setAttribute('aria-hidden', String(!open));
        }
        if (open && nav) nav.classList.remove('is-hidden');
    }
    if (menu) setMenu(false);
    if (toggle) {
        toggle.addEventListener('click', function () {
            setMenu(!root.classList.contains('menu-open'));
        });
    }
    if (menu) {
        menu.querySelectorAll('a').forEach(function (a) {
            a.addEventListener('click', function () { setMenu(false); });
        });
    }
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && root.classList.contains('menu-open')) {
            setMenu(false);
            if (toggle) toggle.focus();
        }
    });
    window.addEventListener('resize', function () {
        if (window.innerWidth > 1080 && root.classList.contains('menu-open')) setMenu(false);
    });

    /* ---------- Scroll-linked effects (single rAF loop) ---------- */
    var progress = document.querySelector('.progress span');
    var fab = document.querySelector('.fab');
    var timelines = document.querySelectorAll('[data-progress]');
    var parallax = reduceMotion ? [] : Array.prototype.slice.call(document.querySelectorAll('[data-parallax]'));
    var lastY = window.scrollY;
    var ticking = false;

    function onScroll() {
        var y = window.scrollY;
        var vh = window.innerHeight;
        var max = document.documentElement.scrollHeight - vh;

        if (progress) progress.style.setProperty('--p', max > 0 ? (y / max).toFixed(4) : 0);

        if (nav) {
            nav.classList.toggle('is-scrolled', y > 24);
            if (!root.classList.contains('menu-open')) {
                if (y > lastY + 6 && y > 420) nav.classList.add('is-hidden');
                else if (y < lastY - 6 || y < 420) nav.classList.remove('is-hidden');
            }
        }

        if (fab) fab.classList.toggle('is-on', y > 480);

        timelines.forEach(function (tl) {
            var r = tl.getBoundingClientRect();
            var p = (vh * 0.75 - r.top) / (r.height * 0.9);
            p = Math.max(0, Math.min(1, p));
            tl.style.setProperty('--p', p.toFixed(3));
            var steps = tl.querySelectorAll('.step');
            steps.forEach(function (s, i) {
                s.classList.toggle('is-active', p >= (i / steps.length) + 0.02);
            });
        });

        parallax.forEach(function (img) {
            var r = img.parentElement.getBoundingClientRect();
            if (r.bottom < 0 || r.top > vh) return;
            var center = r.top + r.height / 2 - vh / 2;
            img.style.setProperty('--py', (center * -0.08).toFixed(1) + 'px');
        });

        lastY = y;
        ticking = false;
    }
    window.addEventListener('scroll', function () {
        if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
    }, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    onScroll();

    /* ---------- Spotlight cards ---------- */
    if (finePointer) {
        document.querySelectorAll('.spot').forEach(function (el) {
            el.addEventListener('pointermove', function (e) {
                var r = el.getBoundingClientRect();
                el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
                el.style.setProperty('--my', (e.clientY - r.top) + 'px');
            });
        });
    }

    /* ---------- Magnetic buttons ---------- */
    if (finePointer && !reduceMotion) {
        document.querySelectorAll('.magnetic').forEach(function (el) {
            el.addEventListener('pointermove', function (e) {
                var r = el.getBoundingClientRect();
                var dx = e.clientX - (r.left + r.width / 2);
                var dy = e.clientY - (r.top + r.height / 2);
                el.style.transform = 'translate(' + (dx * 0.22).toFixed(1) + 'px,' + (dy * 0.32).toFixed(1) + 'px)';
            });
            el.addEventListener('pointerleave', function () { el.style.transform = ''; });
        });
    }

    /* ---------- Hover image preview (industry rows) ---------- */
    var rows = document.querySelectorAll('[data-img]');
    if (rows.length && finePointer && !reduceMotion) {
        var preview = document.createElement('div');
        preview.className = 'preview';
        preview.setAttribute('aria-hidden', 'true');
        var pimg = document.createElement('img');
        pimg.alt = '';
        preview.appendChild(pimg);
        document.body.appendChild(preview);

        var pos = { x: 0, y: 0, tx: 0, ty: 0 };
        var active = false;
        var raf = null;
        function loop() {
            pos.x += (pos.tx - pos.x) * 0.16;
            pos.y += (pos.ty - pos.y) * 0.16;
            var tilt = Math.max(-10, Math.min(10, (pos.tx - pos.x) * 0.08));
            preview.style.transform = 'translate(' + pos.x + 'px,' + pos.y + 'px) translate(-50%,-50%) rotate(' + tilt + 'deg)';
            if (active || Math.abs(pos.tx - pos.x) > 0.5) raf = requestAnimationFrame(loop);
            else raf = null;
        }
        rows.forEach(function (row) {
            var src = row.getAttribute('data-img');
            row.addEventListener('pointerenter', function (e) {
                if (pimg.getAttribute('src') !== src) pimg.src = src;
                if (!active && !preview.classList.contains('is-on')) { pos.x = e.clientX; pos.y = e.clientY; }
                pos.tx = e.clientX; pos.ty = e.clientY;
                active = true;
                preview.classList.add('is-on');
                if (!raf) raf = requestAnimationFrame(loop);
            });
            row.addEventListener('pointermove', function (e) { pos.tx = e.clientX; pos.ty = e.clientY; });
            row.addEventListener('pointerleave', function () {
                active = false;
                preview.classList.remove('is-on');
            });
        });
        // warm the cache
        setTimeout(function () {
            rows.forEach(function (row) { var im = new Image(); im.src = row.getAttribute('data-img'); });
        }, 1500);
    }

    /* ---------- Scroll-spy side nav ---------- */
    var spyLinks = document.querySelectorAll('.sidenav a[href^="#"]');
    if (spyLinks.length && 'IntersectionObserver' in window) {
        var map = {};
        spyLinks.forEach(function (a) { map[a.getAttribute('href').slice(1)] = a; });
        var sio = new IntersectionObserver(function (entries) {
            entries.forEach(function (e) {
                if (!e.isIntersecting) return;
                spyLinks.forEach(function (a) { a.classList.remove('is-active'); a.removeAttribute('aria-current'); });
                var link = map[e.target.id];
                if (link) {
                    link.classList.add('is-active');
                    link.setAttribute('aria-current', 'true');
                    var bar = link.parentElement;
                    if (bar.scrollWidth > bar.clientWidth) {
                        bar.scrollTo({ left: link.offsetLeft - bar.clientWidth / 2 + link.offsetWidth / 2, behavior: reduceMotion ? 'auto' : 'smooth' });
                    }
                }
            });
        }, { rootMargin: '-40% 0px -55% 0px' });
        Object.keys(map).forEach(function (id) {
            var sec = document.getElementById(id);
            if (sec) sio.observe(sec);
        });
    }

    /* ---------- Copy to clipboard + toast ---------- */
    var toastEl = null;
    var toastTimer = null;
    function toast(msg) {
        if (!toastEl) {
            toastEl = document.createElement('div');
            toastEl.className = 'toast';
            toastEl.setAttribute('role', 'status');
            toastEl.setAttribute('aria-live', 'polite');
            document.body.appendChild(toastEl);
        }
        toastEl.innerHTML = '<svg class="i" viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg><span></span>';
        toastEl.querySelector('span').textContent = msg;
        requestAnimationFrame(function () { toastEl.classList.add('is-on'); });
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () { toastEl.classList.remove('is-on'); }, 2400);
    }
    document.querySelectorAll('[data-copy]').forEach(function (btn) {
        btn.addEventListener('click', function () {
            var text = btn.getAttribute('data-copy');
            var done = function () { toast('Copied: ' + text); };
            if (navigator.clipboard && window.isSecureContext) {
                navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text); done(); });
            } else { fallbackCopy(text); done(); }
        });
    });
    function fallbackCopy(text) {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); } catch (err) { /* noop */ }
        document.body.removeChild(ta);
    }

})();
