/* ==========================================================================
   anim.js: small canvas animation library for the "Research explained" pages.

   Markup (one panel per animation):

     <figure class="anim-panel" data-anim="collision"
             data-params='{"nucleus":"U238","beta2":0.28}'>
       <figcaption>Explanation shown under the animation…</figcaption>
     </figure>

   The library inserts a canvas plus a control bar (play/pause, restart, and
   the current step label) above the caption. Panels start playing when they
   scroll into view (paused for users who prefer reduced motion) and stop
   when off-screen.

   Page-specific animations can be added with
     Anim.register('name', { duration, phases, setup(params, W, H), draw(ctx, t, s, W, H) })
   where t runs from 0 to duration (seconds) and loops. Helpers (Glauber
   Monte Carlo, colours, drawing utilities) are exposed as Anim.glauber,
   Anim.C and Anim.u.
   ========================================================================== */
(function () {
    'use strict';

    // ---------- colours (match research.css) ----------
    const C = {
        ink: '#1d2b3a', muted: '#4d6073', grid: '#e3e8ef', bg: '#fbfcfe',
        blue: '#1f5fbf', navy: '#003366', orange: '#a84d0d', red: '#c8372d',
        gold: '#8a6500', teal: '#076d78', purple: '#6a4fb3', gray: '#9aa5b1',
        proton: '#d9534f', neutron: '#3f7fd9'
    };

    // ---------- small utilities ----------
    const u = {
        clamp: (x, a, b) => Math.max(a, Math.min(b, x)),
        lerp: (a, b, t) => a + (b - a) * t,
        // 0→1 progress of t inside [a,b]
        seg: (t, a, b) => u.clamp((t - a) / (b - a), 0, 1),
        ease: (x) => x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2,
        // deterministic RNG so every page shows the same "random" events
        rng(seed) {
            let s = seed >>> 0 || 1;
            return function () {
                s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0;
                return s / 4294967296;
            };
        },
        gauss(rand) {
            let a = 0, b = 0;
            while (a === 0) a = rand();
            b = rand();
            return Math.sqrt(-2 * Math.log(a)) * Math.cos(2 * Math.PI * b);
        },
        text(ctx, str, x, y, opt = {}) {
            ctx.save();
            ctx.font = (opt.weight || '500') + ' ' + (opt.size || 13) + 'px Inter, Arial, sans-serif';
            ctx.fillStyle = opt.color || C.ink;
            ctx.textAlign = opt.align || 'left';
            ctx.textBaseline = opt.base || 'alphabetic';
            ctx.globalAlpha *= (opt.alpha === undefined ? 1 : opt.alpha);
            ctx.fillText(str, x, y);
            ctx.restore();
        },
        arrow(ctx, x1, y1, x2, y2, color, width = 2, head = 8) {
            const a = Math.atan2(y2 - y1, x2 - x1);
            ctx.save();
            ctx.strokeStyle = ctx.fillStyle = color;
            ctx.lineWidth = width;
            ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(x2, y2);
            ctx.lineTo(x2 - head * Math.cos(a - 0.4), y2 - head * Math.sin(a - 0.4));
            ctx.lineTo(x2 - head * Math.cos(a + 0.4), y2 - head * Math.sin(a + 0.4));
            ctx.closePath(); ctx.fill();
            ctx.restore();
        },
        ball(ctx, x, y, r, color, alpha = 1) {
            ctx.save();
            ctx.globalAlpha *= alpha;
            const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
            g.addColorStop(0, '#ffffff');
            g.addColorStop(0.35, color);
            g.addColorStop(1, shade(color, -0.35));
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.arc(x, y, r, 0, 2 * Math.PI); ctx.fill();
            ctx.restore();
        },
        glow(ctx, x, y, r, inner, alpha = 1) {
            ctx.save();
            ctx.globalAlpha *= alpha;
            const g = ctx.createRadialGradient(x, y, 0, x, y, r);
            g.addColorStop(0, inner);
            g.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.arc(x, y, r, 0, 2 * Math.PI); ctx.fill();
            ctx.restore();
        },
        // axes box helper: returns mapping functions
        axes(ctx, box, xr, yr, opt = {}) {
            const { x, y, w, h } = box;
            const X = (v) => x + (v - xr[0]) / (xr[1] - xr[0]) * w;
            const Y = opt.logy
                ? (v) => y + h - (Math.log10(Math.max(v, 1e-12)) - Math.log10(yr[0])) / (Math.log10(yr[1]) - Math.log10(yr[0])) * h
                : (v) => y + h - (v - yr[0]) / (yr[1] - yr[0]) * h;
            ctx.save();
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(x, y, w, h);
            ctx.strokeStyle = C.grid; ctx.lineWidth = 1;
            ctx.strokeRect(x + 0.5, y + 0.5, w, h);
            if (opt.zero && yr[0] < 0 && yr[1] > 0) {
                ctx.strokeStyle = C.gray; ctx.setLineDash([4, 4]);
                ctx.beginPath(); ctx.moveTo(x, Y(0)); ctx.lineTo(x + w, Y(0)); ctx.stroke();
                ctx.setLineDash([]);
            }
            ctx.restore();
            // tick labels (linear axes; log y gets decades)
            const nice = (lo, hi) => { const r = (hi - lo) / 5, p = Math.pow(10, Math.floor(Math.log10(r))); const st = [1, 2, 2.5, 5, 10].map(k => k * p).find(k => k >= r); const out = []; for (let v = Math.ceil(lo / st) * st; v <= hi + 1e-9; v += st) out.push(+v.toFixed(6)); return out; };
            if (opt.xticks !== false) (opt.xticks || nice(xr[0], xr[1])).forEach(v => {
                ctx.fillStyle = C.grid; ctx.fillRect(X(v), y + h, 1, 4);
                u.text(ctx, String(v), X(v), y + h + 14, { size: 10, color: C.muted, align: 'center' });
            });
            if (opt.yticks !== false) {
                const yt = opt.yticks || (opt.logy ? (() => { const o = []; for (let e = Math.ceil(Math.log10(yr[0])); e <= Math.log10(yr[1]); e++) o.push(Math.pow(10, e)); return o; })() : nice(yr[0], yr[1]));
                yt.forEach(v => u.text(ctx, opt.logy ? '10' + String(Math.round(Math.log10(v))).split('').map(ch => '⁰¹²³⁴⁵⁶⁷⁸⁹'['0123456789'.indexOf(ch)] || '⁻').join('') : String(v), x - 4, Y(v) + 3, { size: 10, color: C.muted, align: 'right' }));
            }
            if (opt.xlabel) u.text(ctx, opt.xlabel, x + w / 2, y + h + (opt.xticks === false ? 18 : 30), { align: 'center', size: 12, color: C.muted });
            if (opt.ylabel) {
                ctx.save(); ctx.translate(x - (opt.yticks === false ? 10 : 36), y + h / 2); ctx.rotate(-Math.PI / 2);
                u.text(ctx, opt.ylabel, 0, 0, { align: 'center', size: 12, color: C.muted });
                ctx.restore();
            }
            if (opt.title) u.text(ctx, opt.title, x + 6, y + 16, { size: 12, weight: '600', color: C.ink });
            return { X, Y };
        },
        line(ctx, pts, color, width = 2, dash) {
            ctx.save();
            ctx.strokeStyle = color; ctx.lineWidth = width;
            if (dash) ctx.setLineDash(dash);
            ctx.beginPath();
            pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]));
            ctx.stroke();
            ctx.restore();
        },
        pill(ctx, x, y, str, color) {
            ctx.save();
            ctx.font = '600 12px Inter, Arial, sans-serif';
            const w = ctx.measureText(str).width + 16;
            ctx.fillStyle = color; ctx.globalAlpha *= 0.12;
            roundRect(ctx, x, y - 14, w, 20, 10); ctx.fill();
            ctx.globalAlpha /= 0.12;
            u.text(ctx, str, x + 8, y, { size: 12, weight: '600', color });
            ctx.restore();
            return w;
        }
    };

    function roundRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
    }
    u.roundRect = roundRect;

    function shade(hex, f) {
        if (typeof hex !== 'string' || hex[0] !== '#' || hex.length !== 7) {
            const m = String(hex).match(/\d+(\.\d+)?/g);   // rgb()/rgba() fallback
            if (!m || m.length < 3) return hex;
            hex = '#' + m.slice(0, 3).map(v => Math.round(+v).toString(16).padStart(2, '0')).join('');
        }
        const n = parseInt(hex.slice(1), 16);
        let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
        const t = f < 0 ? 0 : 255, p = Math.abs(f);
        r = Math.round((t - r) * p + r); g = Math.round((t - g) * p + g); b = Math.round((t - b) * p + b);
        return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }
    u.shade = shade;

    // heat colour for temperature-like quantity x in [0,1]
    u.heat = function (x, a = 1) {
        x = u.clamp(x, 0, 1);
        const r = Math.round(u.lerp(255, 200, x)), g = Math.round(u.lerp(205, 30, x)), b = Math.round(u.lerp(110, 25, x));   // cool = amber, hot = deep red
        return `rgba(${r},${g},${b},${a})`;
    };

    // ======================================================================
    // Monte Carlo Glauber model (simplified, for illustration)
    // ======================================================================
    const NUCLEI = {
        //       A    R(fm)  a(fm)  default beta2, gamma(deg)
        Pb208: { A: 208, R: 6.62, a: 0.546, beta2: 0.0, gamma: 0, label: '²⁰⁸Pb' },
        Xe129: { A: 129, R: 5.36, a: 0.59, beta2: 0.18, gamma: 27, label: '¹²⁹Xe' },
        U238: { A: 238, R: 6.81, a: 0.55, beta2: 0.28, gamma: 0, label: '²³⁸U' },
        Au197: { A: 197, R: 6.38, a: 0.535, beta2: -0.13, gamma: 0, label: '¹⁹⁷Au' },
        Ru96: { A: 96, R: 5.09, a: 0.46, beta2: 0.16, gamma: 0, label: '⁹⁶Ru' },
        Zr96: { A: 96, R: 5.02, a: 0.52, beta2: 0.06, gamma: 0, label: '⁹⁶Zr' },
        O16: { A: 16, R: 2.61, a: 0.51, beta2: 0.0, gamma: 0, label: '¹⁶O' }
    };

    const glauber = {
        NUCLEI,
        // nucleon positions in the body frame of a (possibly deformed) nucleus
        nucleus(spec, rand) {
            const p = Object.assign({}, NUCLEI[spec.nucleus || 'Pb208'] || NUCLEI.Pb208, spec);
            const A = p.A, R = p.R, a = p.a;
            const b2 = p.beta2 || 0, g = (p.gamma || 0) * Math.PI / 180;
            const c20 = Math.sqrt(5 / (16 * Math.PI)), c22 = Math.sqrt(15 / (32 * Math.PI));
            const rmax = R * (1 + Math.abs(b2) * 1.3) + 4 * a;
            const out = [];
            let guard = 0;
            while (out.length < A && guard++ < 400000) {
                const x = (2 * rand() - 1) * rmax, y = (2 * rand() - 1) * rmax, z = (2 * rand() - 1) * rmax;
                const r = Math.sqrt(x * x + y * y + z * z);
                if (r > rmax) continue;
                const ct = r > 0 ? z / r : 0, st2 = 1 - ct * ct, ph = Math.atan2(y, x);
                const Rth = R * (1 + b2 * (Math.cos(g) * c20 * (3 * ct * ct - 1) +
                                           Math.sin(g) * c22 * Math.SQRT2 * st2 * Math.cos(2 * ph)));
                if (rand() > 1 / (1 + Math.exp((r - Rth) / a))) continue;
                // simple hard core (0.9 fm) so nucleons don't overlap visually
                let ok = true;
                for (let i = 0; i < out.length && ok; i++) {
                    const d = out[i];
                    if ((d[0] - x) ** 2 + (d[1] - y) ** 2 + (d[2] - z) ** 2 < 0.81) ok = false;
                }
                if (ok) out.push([x, y, z, rand() < 0.4 ? 1 : 0]);   // [x,y,z,isProton]
            }
            // recentre
            const m = [0, 0, 0];
            out.forEach(q => { m[0] += q[0]; m[1] += q[1]; m[2] += q[2]; });
            out.forEach(q => { q[0] -= m[0] / out.length; q[1] -= m[1] / out.length; q[2] -= m[2] / out.length; });
            return out;
        },
        // rotation matrix from Euler angles (z-y-z)
        rotation(alpha, beta, gam) {
            const ca = Math.cos(alpha), sa = Math.sin(alpha), cb = Math.cos(beta), sb = Math.sin(beta),
                  cg = Math.cos(gam), sg = Math.sin(gam);
            return [
                [ca * cb * cg - sa * sg, -ca * cb * sg - sa * cg, ca * sb],
                [sa * cb * cg + ca * sg, -sa * cb * sg + ca * cg, sa * sb],
                [-sb * cg, sb * sg, cb]
            ];
        },
        randomRotation(rand) {
            return glauber.rotation(2 * Math.PI * rand(), Math.acos(2 * rand() - 1), 2 * Math.PI * rand());
        },
        rotate(pts, M) {
            return pts.map(q => [
                M[0][0] * q[0] + M[0][1] * q[1] + M[0][2] * q[2],
                M[1][0] * q[0] + M[1][1] * q[1] + M[1][2] * q[2],
                M[2][0] * q[0] + M[2][1] * q[1] + M[2][2] * q[2], q[3]]);
        },
        // one collision. opts: {nucleus, beta2, gamma, b, sigma(fm^2), orientA, orientB}
        // orient: 'random' | 'tip' (long axis along beam) | 'body' (long axis in plane)
        event(opts, rand) {
            const sig = opts.sigma || 6.8;           // sigma_NN ≈ 68 mb at the LHC
            const d2 = sig / Math.PI;
            const orientM = (o) => {
                if (o === 'tip') return glauber.rotation(0, 0, 0);
                if (o === 'body') return glauber.rotation(2 * Math.PI * rand(), Math.PI / 2, 0);
                if (o === 'bodyx') return glauber.rotation(0, Math.PI / 2, 0);
                return glauber.randomRotation(rand);
            };
            const A = glauber.rotate(glauber.nucleus(opts, rand), orientM(opts.orientA || 'random'));
            const B = glauber.rotate(glauber.nucleus(Object.assign({}, opts, opts.nucleusB ? { nucleus: opts.nucleusB } : {}), rand),
                                     orientM(opts.orientB || 'random'));
            const b = opts.b === undefined ? 0 : opts.b;
            A.forEach(q => { q[0] -= b / 2; });
            B.forEach(q => { q[0] += b / 2; });
            const pa = new Array(A.length).fill(false), pb = new Array(B.length).fill(false);
            for (let i = 0; i < A.length; i++) {
                for (let j = 0; j < B.length; j++) {
                    const dx = A[i][0] - B[j][0], dy = A[i][1] - B[j][1];
                    if (dx * dx + dy * dy < d2) { pa[i] = true; pb[j] = true; }
                }
            }
            const parts = [];
            A.forEach((q, i) => pa[i] && parts.push([q[0], q[1]]));
            B.forEach((q, i) => pb[i] && parts.push([q[0], q[1]]));
            return { A, B, pa, pb, parts, obs: glauber.observables(parts) };
        },
        // eccentricity, orientation, size, and the [pT] proxy d_perp = sqrt(N/S)
        observables(parts) {
            const N = parts.length;
            if (N < 3) return { N, eps2: 0, psi2: 0, eps3: 0, R: 0, dperp: 0, cx: 0, cy: 0 };
            let cx = 0, cy = 0;
            parts.forEach(p => { cx += p[0]; cy += p[1]; });
            cx /= N; cy /= N;
            let xx = 0, yy = 0, xy = 0, r2 = 0, c2 = 0, s2 = 0, c3 = 0, s3 = 0, r3 = 0;
            parts.forEach(p => {
                const x = p[0] - cx, y = p[1] - cy, rr = x * x + y * y, ph = Math.atan2(y, x);
                xx += x * x; yy += y * y; xy += x * y; r2 += rr;
                c2 += rr * Math.cos(2 * ph); s2 += rr * Math.sin(2 * ph);
                const r3v = Math.pow(rr, 1.5);
                c3 += r3v * Math.cos(3 * ph); s3 += r3v * Math.sin(3 * ph); r3 += r3v;
            });
            xx /= N; yy /= N; xy /= N;
            const S = Math.PI * Math.sqrt(Math.max(xx * yy - xy * xy, 1e-6));
            return {
                N, cx, cy,
                eps2: Math.hypot(c2, s2) / r2,
                psi2: Math.atan2(s2, c2) / 2,          // direction of the long axis
                eps3: Math.hypot(c3, s3) / r3,
                R: Math.sqrt(r2 / N),
                dperp: Math.sqrt(N / S)
            };
        }
    };

    // ======================================================================
    // Registry and panel controller
    // ======================================================================
    const registry = {};
    function register(name, def) { registry[name] = def; }

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let panelCount = 0;

    function Panel(fig) {
        const name = fig.dataset.anim;
        const def = registry[name];
        if (!def) { console.warn('anim.js: unknown animation', name); return; }
        let params = {};
        try { params = fig.dataset.params ? JSON.parse(fig.dataset.params) : {}; }
        catch (e) { console.warn('anim.js: bad data-params on', name, e); }
        const id = 'animation-' + (++panelCount);
        const duration = def.duration || 8;
        const aspect = params.aspect || def.aspect || 16 / 9;
        const cap = fig.querySelector('figcaption');
        if (cap && !cap.id) cap.id = id + '-caption';
        const stage = document.createElement('div');
        stage.className = 'anim-stage';
        stage.tabIndex = 0;
        stage.setAttribute('role', 'region');
        stage.setAttribute('aria-label', 'Animation viewport. Use the controls below to play or explore.');
        const canvas = document.createElement('canvas');
        canvas.setAttribute('role', 'img');
        canvas.setAttribute('aria-label', fig.getAttribute('aria-label') || (params.title || name.replace(/-/g, ' ')) + ' illustration');
        if (cap) canvas.setAttribute('aria-describedby', cap.id);
        canvas.textContent = cap ? cap.textContent : 'Scientific illustration; see the accompanying explanation.';
        stage.appendChild(canvas);
        const hint = document.createElement('p');
        hint.className = 'anim-mobile-hint';
        hint.textContent = 'Swipe the illustration horizontally to explore both sides.';
        const bar = document.createElement('div');
        bar.className = 'anim-controls';
        bar.innerHTML = '<button type="button" class="anim-btn anim-play"><span class="anim-btn-label">Play</span></button>';
        const steps = document.createElement('div');
        steps.className = 'anim-chapters';
        steps.setAttribute('role', 'group');
        steps.setAttribute('aria-label', 'Jump to an explanation step');
        const stepEl = document.createElement('p');
        stepEl.className = 'anim-step';
        // Automatic event counters must not interrupt screen readers each frame.
        stepEl.setAttribute('aria-live', 'off');
        const status = document.createElement('span');
        status.className = 'sr-only';
        status.setAttribute('role', 'status');
        bar.appendChild(steps);
        [stage, hint, bar, stepEl, status].forEach(el => fig.insertBefore(el, cap || null));
        const playBtn = bar.querySelector('.anim-play');
        const label = playBtn.querySelector('.anim-btn-label');
        const ctx = canvas.getContext('2d');
        if (!ctx) { status.textContent = 'Canvas is unavailable. Please read the explanation below.'; bar.hidden = true; return; }
        let W = 0, H = 0, pixelRatio = 0, state = null, t = 0, last = null;
        let playing = false, visible = false, userPaused = motionQuery.matches, raf = null, lastStep = '', failed = false;
        const qs = new URLSearchParams(location.search);
        const freezeT = parseFloat(qs.get('animt'));
        if (Number.isFinite(freezeT)) { t = Math.max(0, freezeT); userPaused = true; }
        const phaseButtons = [];   // step buttons removed: each panel has Play/Pause only
        if (!phaseButtons.length) steps.hidden = true;
        function resize() {
            // Preserve readable type and side-by-side comparisons on narrow screens.
            const w = Math.max(640, stage.clientWidth || 640);
            const h = Math.round(w / aspect);
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            if (w === W && dpr === pixelRatio && state) return;
            const changed = w !== W;
            W = w; H = h; pixelRatio = dpr;
            canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
            canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            if (!state || changed) state = def.setup ? def.setup(params, W, H, state) : {};
            render();
        }
        function render() {
            const localTime = t % duration;
            ctx.clearRect(0, 0, W, H);
            ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
            ctx.save();
            try { def.draw(ctx, localTime, state, W, H, params); }
            catch (e) { failed = true; console.error('anim.js draw error in', name, e); stop(); status.textContent = 'This illustration could not be drawn. The explanation remains available below.'; }
            finally { ctx.restore(); }
            const phases = def.phases || [];
            let phaseIndex = 0;
            phases.forEach((ph, i) => { if (localTime >= ph.t) phaseIndex = i; });
            const ph = phases[phaseIndex];
            const txt = ph ? (typeof ph.label === 'function' ? ph.label(state, params) : ph.label) : 'Explore the illustration using the controls above.';
            if (txt !== lastStep) {
                stepEl.textContent = txt; lastStep = txt;
            }
            phaseButtons.forEach((button, i) => {
                button.setAttribute('aria-pressed', String(i === phaseIndex));
                const ph = phases[i];
                button.title = typeof ph.label === 'function' ? ph.label(state, params) : ph.label;
                button.setAttribute('aria-label', 'Step ' + (i + 1) + ': ' + button.title);
            });
        }
        function frame(ts) {
            if (!playing) return;
            if (last === null) last = ts;
            const dt = Math.min((ts - last) / 1000, 0.1);
            last = ts;
            const before = Math.floor(t / duration);
            t += dt * (params.speed || 1);
            const after = Math.floor(t / duration);
            if (def.onLoop) {
                // Faster playback can cross several short event cycles in one frame.
                for (let cycle = before; cycle < after; cycle++) def.onLoop(state, params, W, H);
            }
            render();
            if (playing) raf = requestAnimationFrame(frame);
        }
        function start() {
            if (playing || failed) return;
            playing = true; last = null;
            raf = requestAnimationFrame(frame); sync();
        }
        function stop() {
            playing = false;
            if (raf !== null) cancelAnimationFrame(raf);
            raf = null; sync();
        }
        function sync() {
            fig.classList.toggle('is-playing', playing);
            label.textContent = playing ? 'Pause' : 'Play';
            playBtn.setAttribute('aria-label', (playing ? 'Pause' : 'Play') + ' animation');
        }
        function update() { (visible && !userPaused && !document.hidden) ? start() : stop(); }
        playBtn.addEventListener('click', () => { userPaused = playing; update(); });
        (bar.querySelector('.anim-restart') || document.createElement('button')).addEventListener('click', () => {
            t = 0; last = null; failed = false;
            state = def.setup ? def.setup(params, W, H, null) : {};
            render(); update(); status.textContent = 'Animation reset to its first frame.';
        });
        stage.addEventListener('keydown', e => {
            if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); playBtn.click(); }
        });
        // A drag to pan a mobile viewport must not accidentally toggle playback.
        canvas.addEventListener('click', e => { if (stage.scrollWidth <= stage.clientWidth + 1 && e.detail) playBtn.click(); });
        // Keep declared defaults without exposing additional controls.
        (def.controls || []).forEach(c => {
            if (params[c.key] === undefined) params[c.key] = c.value;
        });
        document.addEventListener('visibilitychange', update);
        motionQuery.addEventListener('change', e => { if (e.matches) { userPaused = true; update(); } });
        if ('IntersectionObserver' in window) {
            new IntersectionObserver(entries => {
                entries.forEach(e => { visible = e.isIntersecting; update(); });
            }, { threshold: 0.05 }).observe(stage);
        } else { visible = true; }
        if ('ResizeObserver' in window) new ResizeObserver(resize).observe(stage);
        else window.addEventListener('resize', resize);
        resize();
        if (Number.isFinite(freezeT) && def.onLoop) {
            const nl = Math.min(1000, Math.max(0, parseInt(qs.get('animloops') || '0', 10)));
            for (let i = 0; i < nl; i++) def.onLoop(state, params, W, H);
            render();
        }
        sync(); update();
    }

    function init() {
        document.querySelectorAll('figure.anim-panel[data-anim]').forEach(f => {
            if (!f.dataset.animReady) { f.dataset.animReady = '1'; Panel(f); }
        });
    }

    window.Anim = { register, init, glauber, C, u };

    // ======================================================================
    // Built-in animations
    // ======================================================================

    // ---------------- nucleus3d: rotating (deformed) nucleus ----------------
    // params: nucleus, beta2, gamma, sliders (bool), label
    register('nucleus3d', {
        duration: 12,
        aspect: 16 / 10,
        get controls() { return null; },
        setup(p, W, H) {
            const rand = u.rng(p.seed || 7);
            const spec = { nucleus: p.nucleus || 'U238', beta2: p.beta2 ?? (NUCLEI[p.nucleus || 'U238'] || {}).beta2, gamma: p.gamma ?? 0 };
            return { pts: glauber.nucleus(spec, rand), spec };
        },
        phases: [{ t: 0, label: (s) => {
            const b = s.spec.beta2, g = s.spec.gamma;
            if (Math.abs(b) < 0.02) return 'Spherical nucleus';
            const kind = g < 10 ? 'Prolate (cigar-like)' : g > 50 ? 'Oblate (pancake-like)' : 'Triaxial (all three axes differ)';
            return `${kind}: β₂ = ${b.toFixed(2)}, γ = ${Math.round(g)}°`;
        } }],
        draw(ctx, t, s, W, H, p) {
            const n = s.pts.length;
            const scale = Math.min(W, H) / (2.9 * (NUCLEI[s.spec.nucleus] || NUCLEI.U238).R);
            const ang = t * 2 * Math.PI / 12, tilt = 0.45;
            const M1 = glauber.rotation(0, tilt, 0), M2 = glauber.rotation(ang, 0, 0);
            const pts = glauber.rotate(glauber.rotate(glauber.rotate(s.pts, glauber.rotation(0, Math.PI / 2, 0)), M2), M1);
            pts.sort((a, b) => a[2] - b[2]);
            const cx = W / 2, cy = H / 2;
            u.glow(ctx, cx, cy, Math.min(W, H) * 0.48, 'rgba(31,95,191,0.10)');
            const r = 0.62 * scale;
            pts.forEach(q => {
                const depth = (q[2] / 10 + 1) / 2;
                u.ball(ctx, cx + q[0] * scale, cy + q[1] * scale, r, q[3] ? C.proton : C.neutron, 0.55 + 0.45 * depth);
            });
            u.text(ctx, (NUCLEI[s.spec.nucleus] || {}).label || '', 14, 24, { size: 15, weight: '700' });
            u.text(ctx, `${n} nucleons`, 14, 42, { size: 12, color: C.muted });
            if (p.label) u.text(ctx, p.label, W - 14, 24, { size: 12, color: C.muted, align: 'right' });
        }
    });

    // ---------------- collision: transverse-plane view of one event ----------------
    // params: nucleus, beta2, gamma, b, sigma, orientA/B, newEvents (bool),
    //         flowScale, showLabels
    register('collision', {
        duration: 9,
        phases: [
            { t: 0, label: 'Step 1 · Two nuclei fly at each other (beam points out of the screen)' },
            { t: 1.8, label: 'Step 2 · Collision: overlapping nucleons (orange) take part; spectators (grey) fly on' },
            { t: 3.0, label: 'Step 3 · A droplet of quark-gluon plasma forms in the overlap' },
            { t: 4.6, label: 'Step 4 · Pressure pushes it outward, fastest along the short axis' },
            { t: 6.4, label: 'Step 5 · Thousands of particles fly out and reach the detector' }
        ],
        setup(p, W, H, old) {
            const st = { seed: (old && old.seed) || p.seed || 11 };
            st.make = () => {
                const rand = u.rng(st.seed);
                st.ev = glauber.event({
                    nucleus: p.nucleus || 'Pb208', beta2: p.beta2, gamma: p.gamma,
                    b: p.b ?? 6, sigma: p.sigma, orientA: p.orientA, orientB: p.orientB
                }, rand);
                const o = st.ev.obs, nP = 220;
                st.particles = [];
                const v2 = (p.flowScale ?? 0.25) * o.eps2;
                for (let i = 0; i < nP; i++) {
                    // sample azimuth from 1 + 2 v2 cos 2(phi - psi_minor)
                    let ph;
                    do { ph = 2 * Math.PI * rand(); } while (rand() * (1 + 2 * v2) > 1 + 2 * v2 * Math.cos(2 * (ph - o.psi2 - Math.PI / 2)));
                    st.particles.push({ ph, v: 0.6 + 0.6 * rand(), d: rand() * 0.8 });
                }
            };
            st.make();
            return st;
        },
        onLoop(st, p) { if (p.newEvents !== false) { st.seed += 7919; st.make(); } },
        draw(ctx, t, s, W, H, p) {
            const ev = s.ev, o = ev.obs;
            const R = (NUCLEI[p.nucleus || 'Pb208'] || NUCLEI.Pb208).R;
            const sc = Math.min(W, H) / (4.2 * R);
            const cx = W / 2, cy = H / 2;
            const rN = 0.55 * sc;
            const app = u.ease(u.seg(t, 0, 1.8));
            const sep = (1 - app) * W * 0.55;
            const spect = u.seg(t, 1.8, 3.6);
            const qgp = u.seg(t, 2.8, 4.0);
            const exp = u.ease(u.seg(t, 4.0, 7.0));
            const emit = u.seg(t, 6.2, 9.0);

            // QGP droplet (drawn first so nucleons sit on top while it forms)
            if (qgp > 0) {
                const smin = 1 + exp * 0.9, smaj = 1 + exp * 0.9 * (1 - 1.6 * o.eps2);
                ctx.save();
                ctx.translate(cx + o.cx * sc, cy + o.cy * sc);
                ctx.rotate(o.psi2);
                ctx.scale(smaj, smin);
                ctx.globalCompositeOperation = 'source-over';
                const fade = 1 - 0.75 * emit;
                ev.parts.forEach(q => u.glow(ctx, (q[0] - o.cx) * sc * Math.cos(-o.psi2) - (q[1] - o.cy) * sc * Math.sin(-o.psi2),
                    (q[0] - o.cx) * sc * Math.sin(-o.psi2) + (q[1] - o.cy) * sc * Math.cos(-o.psi2),
                    1.8 * sc, u.heat(1 - 0.6 * exp, 0.34), qgp * fade));
                ctx.restore();
                if (exp > 0 && exp < 1 && t < 6.6) {
                    // pressure-gradient arrows: longer along the short axis
                    const L = 2.2 * R * sc;
                    for (let k = 0; k < 8; k++) {
                        const a = o.psi2 + k * Math.PI / 4;
                        const strength = 1 + 2.2 * o.eps2 * Math.cos(2 * (a - o.psi2 - Math.PI / 2));
                        const r0 = L * 0.55 * (1 + exp * 0.6), r1 = r0 + 22 * strength * Math.sin(Math.PI * exp);
                        u.arrow(ctx, cx + r0 * Math.cos(a), cy + r0 * Math.sin(a), cx + r1 * Math.cos(a), cy + r1 * Math.sin(a), C.red, 2.2, 8);
                    }
                }
            }

            // nucleons
            const drawSet = (pts, part, dir) => {
                pts.forEach((q, i) => {
                    let x = cx + q[0] * sc + dir * sep, y = cy + q[1] * sc, a = 1;
                    if (!part[i] && spect > 0) {
                        // spectators continue down the beam: shrink + fade
                        a = 1 - spect; x += dir * spect * 18;
                    }
                    if (part[i] && qgp > 0) a = 1 - qgp;
                    if (a <= 0.01) return;
                    const col = (t > 1.8 && part[i]) ? C.orange : (t > 1.8 ? C.gray : (dir < 0 ? C.blue : C.purple));
                    u.ball(ctx, x, y, rN, col, a * (dir < 0 ? 1 : 0.85));
                });
            };
            drawSet(ev.B, ev.pb, 1);
            drawSet(ev.A, ev.pa, -1);

            // emitted particles
            if (emit > 0) {
                s.particles.forEach(pt => {
                    const e = u.clamp((emit - pt.d * 0.25) / 0.75, 0, 1);
                    if (e <= 0) return;
                    const r = (1.6 * R * sc) + e * pt.v * Math.max(W, H) * 0.55;
                    const x = cx + r * Math.cos(pt.ph), y = cy + r * Math.sin(pt.ph);
                    ctx.save(); ctx.globalAlpha = 1 - e * 0.8;
                    ctx.fillStyle = C.navy;
                    ctx.beginPath(); ctx.arc(x, y, 2.2, 0, 2 * Math.PI); ctx.fill();
                    ctx.restore();
                });
            }

            // labels
            const lab = (NUCLEI[p.nucleus || 'Pb208'] || {}).label || '';
            u.text(ctx, `${lab}+${lab}`, 14, 24, { size: 15, weight: '700' });
            if (t > 1.8) {
                u.text(ctx, `Participants: ${o.N}`, 14, 44, { size: 12, color: C.orange, weight: '600' });
                u.text(ctx, `Eccentricity ε₂ = ${o.eps2.toFixed(2)}`, 14, 62, { size: 12, color: C.muted });
            }
            if (p.note) u.text(ctx, p.note, W - 14, 24, { size: 12, color: C.muted, align: 'right' });
        }
    });

    // ---------------- ucc: event-by-event v2 vs [pT] in ultra-central collisions ----------------
    // Monte Carlo Glauber events with b≈0. Left: overlap of the current event.
    // Right: scatter of eps2^2 (∝ v2^2) vs d_perp (∝ [pT]); sphere vs deformed.
    // params: nucleus, beta2, gamma, compare (bool), bmax
    register('ucc', {
        duration: 1.2,               // one new event per loop
        aspect: 16 / 8,
        phases: [{ t: 0, label: (s) => `Events simulated: ${s.n} · correlation ${s.rhoTxt}` }],
        setup(p) {
            const st = { rand: u.rng(p.seed || 5), pts: { sph: [], def: [] }, n: 0, rhoTxt: '…', cur: null, curType: 'def' };
            return st;
        },
        onLoop(st, p) {
            const types = p.compare === false ? ['def'] : ['sph', 'def'];
            types.forEach(ty => {
                const ev = glauber.event({
                    nucleus: p.nucleus || 'U238',
                    beta2: ty === 'sph' ? 0 : (p.beta2 ?? (NUCLEI[p.nucleus || 'U238'] || {}).beta2),
                    gamma: p.gamma || 0,
                    b: st.rand() * (p.bmax ?? 1.0), sigma: p.sigma || 4.2
                }, st.rand);
                st.pts[ty].push([ev.obs.eps2 * ev.obs.eps2, ev.obs.dperp]);
                if (st.pts[ty].length > 400) st.pts[ty].shift();
                st.cur = ev; st.curType = ty;
            });
            st.n++;
            const rho = (arr) => {
                const n = arr.length; if (n < 8) return NaN;
                let mx = 0, my = 0; arr.forEach(a => { mx += a[0]; my += a[1]; }); mx /= n; my /= n;
                let sxy = 0, sxx = 0, syy = 0;
                arr.forEach(a => { sxy += (a[0] - mx) * (a[1] - my); sxx += (a[0] - mx) ** 2; syy += (a[1] - my) ** 2; });
                return sxy / Math.sqrt(sxx * syy);
            };
            st.rho = { sph: rho(st.pts.sph), def: rho(st.pts.def) };
            st.rhoTxt = isNaN(st.rho.def) ? '…' : `ρ(deformed) = ${st.rho.def.toFixed(2)}` +
                (isNaN(st.rho.sph) ? '' : `, ρ(spherical) = ${st.rho.sph.toFixed(2)}`);
        },
        draw(ctx, t, s, W, H, p) {
            if (!s.cur) this.onLoop(s, p);
            const ev = s.cur, o = ev.obs;
            const R = (NUCLEI[p.nucleus || 'U238'] || NUCLEI.U238).R;
            const lw = W * 0.38, sc = Math.min(lw, H) / (3.2 * R);
            const cx = lw / 2 + 6, cy = H / 2 + 6;
            u.glow(ctx, cx, cy, 2 * R * sc, 'rgba(232,113,10,0.10)');
            ev.parts.forEach(q => u.ball(ctx, cx + q[0] * sc, cy + q[1] * sc, 0.5 * sc, s.curType === 'sph' ? C.gray : C.orange, 0.85));
            // long-axis indicator
            const L = (1.2 * R + 4 * o.eps2 * R) * sc;
            ctx.save(); ctx.strokeStyle = C.ink; ctx.setLineDash([5, 4]); ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.moveTo(cx - L * Math.cos(o.psi2), cy - L * Math.sin(o.psi2));
            ctx.lineTo(cx + L * Math.cos(o.psi2), cy + L * Math.sin(o.psi2)); ctx.stroke(); ctx.restore();
            u.text(ctx, s.curType === 'sph' ? 'Spherical nuclei' : 'Deformed nuclei', 12, 22, { size: 13, weight: '700', color: s.curType === 'sph' ? C.muted : C.orange });
            u.text(ctx, `overlap of current event · ε₂ = ${o.eps2.toFixed(2)}`, 12, H - 12, { size: 11, color: C.muted });

            // scatter
            const box = { x: lw + 64, y: 14, w: W - lw - 80, h: H - 62 };
            const all = s.pts.sph.concat(s.pts.def);
            let ymin = 1e9, ymax = -1e9;
            all.forEach(a => { ymin = Math.min(ymin, a[1]); ymax = Math.max(ymax, a[1]); });
            if (!(ymax > ymin)) { ymin = 0; ymax = 1; }
            const pad = (ymax - ymin) * 0.1;
            const e2s = all.map(a => a[0]).sort((a, b) => a - b);
            const ytop = Math.max(0.02, (e2s[Math.floor(e2s.length * 0.97)] || 0.1) * 1.15);
            s.ytop = s.ytop ? Math.max(s.ytop * 0.995, ytop) : ytop;
            const m = u.axes(ctx, box, [ymin - pad, ymax + pad], [0, s.ytop], {
                xlabel: 'compactness d⊥ (fm⁻¹)  →  larger [pT]', ylabel: 'ε₂²  (∝ v₂²)', xticks: false
            });
            const dot = (a, col) => { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(m.X(a[1]), m.Y(Math.min(a[0], s.ytop)), 2.6, 0, 2 * Math.PI); ctx.fill(); };
            ctx.save(); ctx.globalAlpha = 0.55;
            s.pts.sph.forEach(a => dot(a, C.gray));
            s.pts.def.forEach(a => dot(a, C.orange));
            ctx.restore();
            let lx = box.x + 8, ly = box.y + 22;
            const defLab = (box.w < 230 ? 'β₂=' : 'deformed β₂=') + (p.beta2 ?? (NUCLEI[p.nucleus || 'U238'] || {}).beta2);
            if (p.compare !== false) lx += u.pill(ctx, lx, ly, 'spherical', C.muted) + 6;
            if (lx + 110 > box.x + box.w) { lx = box.x + 8; ly += 24; }
            u.pill(ctx, lx, ly, defLab, C.orange);
        }
    });

    // ---------------- histogram: accumulating event-by-event distribution ----------------
    // params: sampler ('gauss'|'skew'|'glauber'), skew, xlabel, title, nucleus, b, showStats
    register('histogram', {
        duration: 0.25,
        aspect: 16 / 8,
        phases: [{ t: 0, label: (s) => `Events: ${s.vals.length}` }],
        setup(p) {
            const st = { rand: u.rng(p.seed || 3), vals: [] };
            return st;
        },
        onLoop(st, p) {
            const k = p.perStep || (p.sampler === 'glauber' ? 2 : 25);
            for (let i = 0; i < k; i++) {
                let v;
                if (p.sampler === 'glauber') {
                    const ev = glauber.event({ nucleus: p.nucleus || 'Pb208', b: Math.sqrt(st.rand()) * (p.bmax ?? 2), sigma: p.sigma }, st.rand);
                    v = ev.obs.dperp;
                } else if (p.sampler === 'skew') {
                    // gamma distribution: positively skewed
                    const kk = p.shape || 6; let s = 0;
                    for (let j = 0; j < kk; j++) s -= Math.log(st.rand());
                    v = (s - kk) / Math.sqrt(kk);
                } else v = u.gauss(st.rand);
                st.vals.push(v);
            }
            if (st.vals.length > (p.max || 6000)) st.vals.splice(0, st.vals.length - (p.max || 6000));
        },
        draw(ctx, t, s, W, H, p) {
            if (!s.vals.length) this.onLoop(s, p);
            const v = s.vals, n = v.length;
            let mu = 0; v.forEach(x => mu += x); mu /= n;
            let m2 = 0, m3 = 0, m4 = 0;
            v.forEach(x => { const d = x - mu; m2 += d * d; m3 += d * d * d; m4 += d * d * d * d; });
            m2 /= n; m3 /= n; m4 /= n;
            const sd = Math.sqrt(m2) || 1;
            const lo = mu - 4 * sd, hi = mu + 4 * sd, nb = 40;
            const bins = new Array(nb).fill(0);
            v.forEach(x => { const k = Math.floor((x - lo) / (hi - lo) * nb); if (k >= 0 && k < nb) bins[k]++; });
            const bw = (hi - lo) / nb, maxB = Math.max(...bins, 1);
            const narrow = W < 560;
            const side = narrow ? 0 : Math.max(185, W * 0.32);
            const box = narrow ? { x: 56, y: 52, w: W - 70, h: H - 100 } : { x: 64, y: 14, w: W - side - 76, h: H - 62 };
            const m = u.axes(ctx, box, [lo, hi], [0, maxB * 1.15], { xlabel: p.xlabel || 'event-wise mean transverse momentum [pT] (arb. units)', ylabel: 'number of events', xticks: false });
            ctx.fillStyle = 'rgba(31,95,191,0.75)';
            bins.forEach((b, i) => { const x0 = m.X(lo + i * bw), x1 = m.X(lo + (i + 1) * bw); ctx.fillRect(x0 + 0.5, m.Y(b), x1 - x0 - 1, m.Y(0) - m.Y(b)); });
            // gaussian with same mean/width for reference
            const g = [];
            for (let i = 0; i <= 120; i++) { const x = lo + (hi - lo) * i / 120; g.push([m.X(x), m.Y(n * bw * Math.exp(-0.5 * ((x - mu) / sd) ** 2) / (sd * Math.sqrt(2 * Math.PI)))]); }
            u.line(ctx, g, C.orange, 2, [6, 4]);
            const sx = W - side;
            const sk = (m3 / Math.pow(m2, 1.5)).toFixed(2), ku = (m4 / (m2 * m2) - 3).toFixed(2);
            if (narrow) {
                u.text(ctx, `variance ${m2.toFixed(3)}`, 12, 20, { size: 11, color: C.muted });
                u.text(ctx, `skewness ${sk}`, 12, 38, { size: 12, weight: '700', color: C.orange });
                u.text(ctx, `kurtosis ${ku}`, W - 12, 38, { size: 12, weight: '700', color: C.orange, align: 'right' });
                return;
            }
            u.text(ctx, p.title || 'Shape of the distribution', sx, 32, { size: 13, weight: '700' });
            const rows = [
                ['mean', '⟨[pT]⟩', mu.toFixed(3)],
                ['variance (width²)', 'k₂', m2.toFixed(3)],
                ['skewness (lopsided?)', 'k₃/k₂^{3/2}', (m3 / Math.pow(m2, 1.5)).toFixed(2)],
                ['kurtosis (tails?)', 'k₄/k₂²', (m4 / (m2 * m2) - 3).toFixed(2)]
            ];
            rows.forEach((r, i) => {
                u.text(ctx, r[0], sx, 62 + i * 34, { size: 11.5, color: C.muted });
                u.text(ctx, r[2], W - 16, 62 + i * 34, { size: 14, weight: '700', align: 'right', color: i >= 2 ? C.orange : C.ink });
            });
            u.text(ctx, '- - Gaussian with same width', sx, H - 18, { size: 11, color: C.orange });
        }
    });

    // ---------------- spectrum: radial flow tilts the pT spectrum ----------------
    // params: mode 'shape' | 'mult' | 'both', T0
    register('spectrum', {
        duration: 8,
        aspect: 16 / 9,
        phases: [
            { t: 0, label: (s, p) => p.mode === 'mult' ? 'Event with MORE particles overall: whole spectrum shifts up' : 'Event with STRONGER radial push: spectrum flattens (harder)' },
            { t: 4, label: (s, p) => p.mode === 'mult' ? 'Event with FEWER particles overall: whole spectrum shifts down' : 'Event with WEAKER radial push: spectrum steepens (softer)' }
        ],
        setup() { return {}; },
        draw(ctx, t, s, W, H, p) {
            const T0 = p.T0 || 0.35, mode = p.mode || 'shape';
            const osc = Math.sin(2 * Math.PI * t / 8);
            const dT = mode === 'mult' ? 0 : 0.18 * osc;
            const dM = mode === 'shape' ? 0 : (mode === 'mult' ? 0.35 * osc : 0.15 * osc);
            const T = T0 * (1 + dT);
            const f = (pt, TT, M) => M * pt * Math.exp(-pt / TT) / (TT * TT);
            const top = { x: 78, y: 16, w: W - 104, h: H * 0.5 - 30 };
            const bot = { x: 78, y: H * 0.5 + 14, w: W - 104, h: H * 0.5 - 58 };
            const m1 = u.axes(ctx, top, [0, 4], [1e-4, 5], { logy: true, ylabel: 'particles (log)', title: 'Spectrum: how many particles at each pT', xticks: false });
            const avg = [], ev = [];
            for (let i = 1; i <= 160; i++) { const pt = 4 * i / 160; avg.push([m1.X(pt), m1.Y(f(pt, T0, 1))]); ev.push([m1.X(pt), m1.Y(f(pt, T, 1 + dM))]); }
            ctx.save(); ctx.beginPath(); ctx.rect(top.x, top.y, top.w, top.h); ctx.clip();
            u.line(ctx, avg, C.gray, 2, [6, 4]);
            u.line(ctx, ev, osc > 0 ? C.red : C.blue, 2.6);
            ctx.restore();
            u.text(ctx, '- - average event', top.x + top.w - 8, top.y + 18 + 0, { size: 11, color: C.muted, align: 'right' });
            u.text(ctx, 'this event', top.x + top.w - 8, top.y + 34, { size: 11, color: osc > 0 ? C.red : C.blue, align: 'right', weight: '700' });

            const m2 = u.axes(ctx, bot, [0, 4], [-1.2, 1.2], { zero: true, yticks: [-1, 0, 1], xlabel: 'transverse momentum pT (GeV)', ylabel: 'relative change', title: 'Relative change vs. average event  →  v₀(pT)' });
            const rel = [];
            for (let i = 1; i <= 160; i++) { const pt = 4 * i / 160; rel.push([m2.X(pt), m2.Y(f(pt, T, 1 + dM) / f(pt, T0, 1) - 1)]); }
            ctx.save(); ctx.beginPath(); ctx.rect(bot.x, bot.y, bot.w, bot.h); ctx.clip();
            u.line(ctx, rel, osc > 0 ? C.red : C.blue, 2.6);
            ctx.restore();
            if (mode !== 'mult') {
                const piv = m2.X(2 * T0);
                ctx.save(); ctx.strokeStyle = C.ink; ctx.setLineDash([2, 3]);
                ctx.beginPath(); ctx.moveTo(piv, top.y); ctx.lineTo(piv, bot.y + bot.h); ctx.stroke(); ctx.restore();
                u.text(ctx, 'pivot ≈ ⟨pT⟩', piv + 6, bot.y + bot.h - 8, { size: 11, color: C.ink });
            }
            // small fireball cartoon showing push strength
            const rr = Math.min(W, H) * 0.045, fx = top.x + top.w * 0.80, fy = top.y + top.h * 0.62;
            u.glow(ctx, fx, fy, rr * (1.2 + 0.4 * dT / 0.18), u.heat(0.5 + 0.4 * dT / 0.18, 0.7));
            for (let k = 0; k < 8; k++) {
                const a = k * Math.PI / 4, L = rr * (0.9 + 0.8 * (1 + dT / 0.18) / 2);
                u.arrow(ctx, fx + rr * 0.6 * Math.cos(a), fy + rr * 0.6 * Math.sin(a), fx + (rr * 0.6 + L) * Math.cos(a), fy + (rr * 0.6 + L) * Math.sin(a), mode === 'mult' ? C.gray : (osc > 0 ? C.red : C.blue), 1.6, 6);
            }
        }
    });

    // ---------------- sizes: compact vs. extended droplet with the same energy ----------------
    register('sizes', {
        duration: 6,
        aspect: 16 / 8,
        phases: [
            { t: 0, label: 'Same total energy, different initial size' },
            { t: 2, label: 'Smaller droplet = denser and hotter = stronger pressure' },
            { t: 3.6, label: 'Its particles fly out faster: larger mean pT' }
        ],
        setup(p) {
            const rand = u.rng(9), parts = [];
            for (let i = 0; i < 70; i++) parts.push({ a: 2 * Math.PI * rand(), v: 0.7 + 0.5 * rand() });
            return { parts };
        },
        draw(ctx, t, s, W, H, p) {
            const e = u.ease(u.seg(t, 2.6, 6));
            const drop = (cx, r0, heat, speed, title, sub) => {
                const r = r0 * (1 + 0.35 * u.ease(u.seg(t, 1.2, 3)));
                u.glow(ctx, cx, H / 2, r * 1.6, u.heat(heat, 0.85));
                s.parts.forEach(q => {
                    const d = r * 0.9 + e * q.v * speed * W * 0.2;
                    ctx.save(); ctx.globalAlpha = e > 0 ? 1 - e * 0.6 : 0;
                    ctx.fillStyle = C.navy; ctx.beginPath(); ctx.arc(cx + d * Math.cos(q.a), H / 2 + d * Math.sin(q.a), 2.2, 0, 2 * Math.PI); ctx.fill(); ctx.restore();
                });
                u.text(ctx, title, cx, 26, { size: 14, weight: '700', align: 'center' });
                u.text(ctx, sub, cx, H - 14, { size: 12, color: C.muted, align: 'center' });
            };
            ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W / 2, H); ctx.clip();
            drop(W * 0.25, Math.min(W, H) * 0.17, 0.35, 0.65, p.leftTitle || 'Larger droplet', p.leftSub || 'cooler · gentler push · smaller [pT]');
            ctx.restore();
            ctx.save(); ctx.beginPath(); ctx.rect(W / 2, 0, W / 2, H); ctx.clip();
            drop(W * 0.75, Math.min(W, H) * 0.10, 0.95, 1.0, p.rightTitle || 'Compact droplet', p.rightSub || 'hotter · stronger push · larger [pT]');
            ctx.restore();
            ctx.save(); ctx.strokeStyle = C.grid; ctx.beginPath(); ctx.moveTo(W / 2, 12); ctx.lineTo(W / 2, H - 12); ctx.stroke(); ctx.restore();
        }
    });

    // ---------------- sideview: collision seen from the side, with spectators and ZDCs ----------------
    // params: nucleus, b, showZDC, label
    register('sideview', {
        duration: 8,
        aspect: 16 / 7,
        phases: [
            { t: 0, label: 'Nuclei are flattened into thin discs by their near-light speed' },
            { t: 2, label: 'They pass through each other in about 10⁻²³ seconds' },
            { t: 3.2, label: 'Participants create the fireball; spectators continue down the beam pipe' },
            { t: 5.4, label: 'Forward detectors (ZDC) count the spectator neutrons' }
        ],
        setup(p, W, H, old) {
            const st = { seed: (old && old.seed) || 21 };
            st.make = () => {
                const rand = u.rng(st.seed);
                st.ev = glauber.event({ nucleus: p.nucleus || 'Pb208', b: p.b ?? (4 + 8 * rand()), sigma: p.sigma }, rand);
                st.jets = [];
                for (let i = 0; i < 90; i++) st.jets.push({ eta: u.gauss(rand) * 1.4, ph: rand() * 2 * Math.PI, v: 0.6 + 0.5 * rand() });
            };
            st.make();
            return st;
        },
        onLoop(st) { st.seed += 104729; st.make(); },
        draw(ctx, t, s, W, H, p) {
            const ev = s.ev;
            const R = (NUCLEI[p.nucleus || 'Pb208'] || NUCLEI.Pb208).R;
            const sy = (H * 0.36) / R, cx = W / 2, cy = H / 2;
            const pass = u.seg(t, 0, 3.0);
            const xA = u.lerp(-W * 0.42, 0, u.ease(Math.min(pass * 1.5, 1)));
            const after = u.seg(t, 2.4, 6.5);
            // beam pipe
            ctx.save(); ctx.strokeStyle = C.grid; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(10, cy); ctx.lineTo(W - 10, cy); ctx.stroke(); ctx.restore();
            if (p.showZDC !== false) {
                [[16, 'ZDC'], [W - 46, 'ZDC']].forEach(([x, l]) => {
                    ctx.save(); ctx.fillStyle = 'rgba(19,138,138,0.12)'; ctx.strokeStyle = C.teal;
                    ctx.fillRect(x, cy - 26, 30, 52); ctx.strokeRect(x + 0.5, cy - 25.5, 30, 52); ctx.restore();
                    u.text(ctx, l, x + 15, cy + 42, { size: 11, color: C.teal, align: 'center', weight: '700' });
                });
            }
            const nSpecA = ev.pa.filter(x => !x).length, nSpecB = ev.pb.filter(x => !x).length;
            // fireball + particles
            if (after > 0) {
                u.glow(ctx, cx, cy, (0.6 + after) * R * sy, u.heat(1 - after * 0.5, 0.75), 1 - u.seg(t, 6, 8) * 0.6);
                s.jets.forEach(j => {
                    const e = u.seg(t, 3.0, 7.5); if (e <= 0) return;
                    const th = 2 * Math.atan(Math.exp(-j.eta));
                    const L = e * j.v * Math.min(W * 0.32, H * 0.8);
                    const x = cx + L * Math.cos(th) * 1.6, y = cy - L * Math.sin(th) * Math.cos(j.ph) * 0.9;
                    ctx.save(); ctx.globalAlpha = 1 - e * 0.7; ctx.fillStyle = C.navy;
                    ctx.beginPath(); ctx.arc(x, y, 2, 0, 2 * Math.PI); ctx.fill(); ctx.restore();
                });
            }
            const disc = (pts, part, dir) => {
                pts.forEach((q, i) => {
                    let x, a = 1;
                    const isP = part[i];
                    if (isP && t > 2.2) { a = 1 - u.seg(t, 2.2, 3.4); x = cx + dir * xA * 0 + q[2] * 0.25 * sy * 0.15; }
                    else {
                        const travel = t < 2.2 ? -dir * xA : u.lerp(0, W * 0.45, u.seg(t, 2.2, 5.6));
                        x = cx + (t < 2.2 ? dir * xA : -dir * travel) + q[2] * 0.25 * sy * 0.15;
                        if (t >= 2.2) { x = cx - dir * travel; a = 1 - u.seg(t, 5.0, 5.8); }   // absorbed in the ZDC
                    }
                    if (a <= 0.02) return;
                    const y = cy + q[1] * sy;
                    const col = t > 2.0 ? (isP ? C.orange : C.gray) : (dir > 0 ? C.blue : C.purple);
                    u.ball(ctx, x, y, 0.45 * sy, col, a);
                });
            };
            disc(ev.A, ev.pa, 1);
            disc(ev.B, ev.pb, -1);
            u.text(ctx, '← beam', 70, 22, { size: 11, color: C.muted });
            u.text(ctx, 'beam →', W - 60, 22, { size: 11, color: C.muted, align: 'right' });
            if (t > 5.2) {
                u.text(ctx, `${nSpecA} spectators`, 60, H - 14, { size: 12, color: C.teal, weight: '700' });
                u.text(ctx, `${nSpecB} spectators`, W - 60, H - 14, { size: 12, color: C.teal, weight: '700', align: 'right' });
                u.text(ctx, `${ev.obs.N} participants`, cx, H - 14, { size: 12, color: C.orange, weight: '700', align: 'center' });
            }
        }
    });


    // ---------------- twoflows: shape → anisotropic flow, size → radial flow ----------------
    // params: rightQuestion (bool) shows a "?" on the radial-flow side
    register('twoflows', {
        duration: 8,
        aspect: 16 / 8,
        phases: [
            { t: 0, label: 'Left: the overlap SHAPE (almond) varies from event to event' },
            { t: 2.7, label: 'Right: the overlap SIZE varies from event to event' },
            { t: 5.4, label: 'Shape → anisotropic flow vₙ;  size → radial flow v₀' }
        ],
        setup() {
            const rand = u.rng(4), parts = [];
            for (let i = 0; i < 90; i++) parts.push({ a: 2 * Math.PI * rand(), v: 0.6 + 0.6 * rand() });
            return { parts };
        },
        draw(ctx, t, s, W, H, p) {
            const cyc = (t % 8) / 8;
            const ecc = 0.25 + 0.2 * Math.sin(2 * Math.PI * cyc * 2);
            const size = 1 + 0.25 * Math.sin(2 * Math.PI * cyc * 2 + 1);
            const e = (t % 2.7) / 2.7;
            const drop = (cx, rx, ry, heat, anis, push) => {
                ctx.save(); ctx.translate(cx, H / 2 + 8); ctx.scale(rx, ry);
                u.glow(ctx, 0, 0, 1, u.heat(heat, 0.85)); ctx.restore();
                s.parts.forEach(q => {
                    const strength = 1 + anis * Math.cos(2 * q.a);
                    const d = Math.max(rx, ry) * 0.6 + e * q.v * push * strength * Math.min(W, H) * 0.38;
                    ctx.save(); ctx.globalAlpha = 0.9 - e * 0.7; ctx.fillStyle = C.navy;
                    ctx.beginPath(); ctx.arc(cx + d * Math.cos(q.a), H / 2 + 8 + d * Math.sin(q.a), 2, 0, 2 * Math.PI); ctx.fill(); ctx.restore();
                });
            };
            const R0 = Math.min(W * 0.18, H * 0.3);
            ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W / 2, H); ctx.clip();
            drop(W * 0.25, R0 * (1 - ecc), R0 * (1 + ecc), 0.7, 1.6 * ecc, 0.8);
            ctx.restore();
            ctx.save(); ctx.beginPath(); ctx.rect(W / 2, 0, W / 2, H); ctx.clip();
            drop(W * 0.75, R0 * 0.8 / size, R0 * 0.8 / size, u.clamp(0.4 + 0.5 * (1.25 - size) * 2, 0, 1), 0, 0.55 + 0.6 * (1.25 - size));
            ctx.restore();
            ctx.save(); ctx.strokeStyle = C.grid; ctx.beginPath(); ctx.moveTo(W / 2, 10); ctx.lineTo(W / 2, H - 10); ctx.stroke(); ctx.restore();
            u.text(ctx, 'Shape → anisotropic flow vₙ', W * 0.25, 24, { size: 14, weight: '700', align: 'center' });
            u.text(ctx, 'Size → radial flow v₀', W * 0.75, 24, { size: 14, weight: '700', align: 'center' });
            u.text(ctx, p.leftNote || 'collective nature: well established ✓', W * 0.25, H - 12, { size: 12, color: C.teal, align: 'center', weight: '600' });
            u.text(ctx, p.rightNote || 'collective nature: never directly tested ?', W * 0.75, H - 12, { size: 12, color: C.orange, align: 'center', weight: '600' });
        }
    });

    // ---------------- subevents: correlate particles from two separated detector halves ----------------
    // params: gap (eta), leftLabel, rightLabel
    register('subevents', {
        duration: 7,
        aspect: 16 / 7,
        phases: [
            { t: 0, label: 'Each collision sprays particles over a wide range of angles (pseudorapidity η)' },
            { t: 2.2, label: 'Split the detector in two halves, a and b, with a gap in between' },
            { t: 4.2, label: 'Correlate a quantity in a with one in b: only effects shared by the whole event survive' }
        ],
        setup(p) {
            const rand = u.rng(13), tr = [];
            for (let i = 0; i < 120; i++) tr.push({ eta: (rand() * 2 - 1) * 2.5, side: rand() < 0.5 ? -1 : 1, v: 0.6 + 0.4 * rand() });
            return { tr };
        },
        draw(ctx, t, s, W, H, p) {
            const gap = p.gap ?? 1;
            const cx = W / 2, cy = H / 2, sx = (W * 0.42) / 2.5;
            const e = u.seg(t, 0.2, 2.0);
            // detector barrel
            ctx.save(); ctx.strokeStyle = C.grid; ctx.lineWidth = 1;
            ctx.strokeRect(cx - 2.5 * sx, cy - H * 0.36, 5 * sx, H * 0.72);
            ctx.beginPath(); ctx.moveTo(20, cy); ctx.lineTo(W - 20, cy); ctx.stroke(); ctx.restore();
            const showSplit = t > 2.2;
            if (showSplit) {
                const a = u.seg(t, 2.2, 3.0);
                ctx.save(); ctx.globalAlpha = 0.14 * a;
                ctx.fillStyle = C.blue; ctx.fillRect(cx - 2.5 * sx, cy - H * 0.36, (2.5 - gap / 2) * sx, H * 0.72);
                ctx.fillStyle = C.orange; ctx.fillRect(cx + gap / 2 * sx, cy - H * 0.36, (2.5 - gap / 2) * sx, H * 0.72);
                ctx.restore();
                u.text(ctx, p.leftLabel || 'subevent a', cx - (1.25 + gap / 4) * sx, cy - H * 0.36 - 8, { size: 13, weight: '700', color: C.blue, align: 'center', alpha: a });
                u.text(ctx, p.rightLabel || 'subevent b', cx + (1.25 + gap / 4) * sx, cy - H * 0.36 - 8, { size: 13, weight: '700', color: C.orange, align: 'center', alpha: a });
                u.text(ctx, `gap Δη = ${gap}`, cx, cy + H * 0.36 + 16, { size: 12, color: C.muted, align: 'center', alpha: a });
            }
            u.glow(ctx, cx, cy, 16, u.heat(0.9, 0.9));
            s.tr.forEach(q => {
                const x = cx + q.eta * sx * e, y = cy + q.side * q.v * H * 0.34 * e;
                const inGap = Math.abs(q.eta) < gap / 2;
                let col = C.navy;
                if (showSplit) col = inGap ? C.gray : (q.eta < 0 ? C.blue : C.orange);
                ctx.save(); ctx.strokeStyle = col; ctx.globalAlpha = showSplit && inGap ? 0.25 : 0.6; ctx.lineWidth = 1.2;
                ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(x, y); ctx.stroke(); ctx.restore();
            });
            if (t > 4.2) {
                const a = u.seg(t, 4.2, 5.0);
                ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = C.purple; ctx.lineWidth = 2; ctx.setLineDash([6, 5]);
                const y0 = cy - H * 0.36 - 22;
                ctx.beginPath(); ctx.moveTo(cx - (1.25 + gap / 4) * sx, y0 + 4);
                ctx.quadraticCurveTo(cx, y0 - 30, cx + (1.25 + gap / 4) * sx, y0 + 4); ctx.stroke(); ctx.restore();
                u.text(ctx, p.corrLabel || 'correlate', cx, cy - H * 0.36 - 40, { size: 12, weight: '700', color: C.purple, align: 'center', alpha: a });
            }
        }
    });

    // ---------------- scaling: curves that collapse onto one universal shape ----------------
    // Schematic only. params: n (curves), xlabel, ylabel1, ylabel2, labels[], title1, title2
    register('scaling', {
        duration: 8,
        aspect: 16 / 8,
        phases: [
            { t: 0, label: (s, p) => p.step1 || 'Different centralities: very different magnitudes' },
            { t: 3.5, label: (s, p) => p.step2 || 'Divide each curve by its own integrated value …' },
            { t: 5.5, label: (s, p) => p.step3 || '… and they collapse onto one universal shape' }
        ],
        setup() { return {}; },
        draw(ctx, t, s, W, H, p) {
            const n = p.n || 6;
            const amps = [];
            for (let i = 0; i < n; i++) amps.push(0.012 + 0.010 * i * i / (n - 1));
            const shape = (x) => { const lx = Math.log10(x); return (lx - 0.0) * 9 * Math.exp(-Math.pow(Math.max(lx - 0.0, 0) / 0.9, 2) * 0.6) + (x < 1 ? (x - 1) * 3 : 0); };
            const k = u.ease(u.seg(t, 3.5, 5.5));
            const box = { x: 72, y: 16, w: W - 100, h: H - 66 };
            const sample = Array.from({length: 81}, (_, j) => shape(0.5 * Math.pow(20, j / 80)));
            const yB = [Math.min(...sample) * 1.2, Math.max(...sample) * 1.5];
            const maxAmplitude = Math.max(...amps);
            const yA = yB.map(v => v * maxAmplitude);
            const lo = u.lerp(yA[0], yB[0], k), hi = u.lerp(yA[1], yB[1], k);
            const m = u.axes(ctx, box, [0.5, 10], [lo, hi], { zero: true, xticks: false, yticks: false,
                xlabel: '', ylabel: k < 0.5 ? (p.ylabel1 || 'v₀(pT)') : (p.ylabel2 || 'v₀(pT) / v₀') });
            const X = (x) => box.x + (Math.log10(x) - Math.log10(0.5)) / (Math.log10(10) - Math.log10(0.5)) * box.w;
            const cols = [C.red, C.orange, C.gold, C.teal, C.blue, C.purple, C.navy, C.gray];
            ctx.save(); ctx.beginPath(); ctx.rect(box.x, box.y, box.w, box.h); ctx.clip();
            for (let i = 0; i < n; i++) {
                const pts = [];
                for (let j = 0; j <= 80; j++) {
                    const x = 0.5 * Math.pow(20, j / 80);
                    const raw = amps[i] * shape(x);
                    const scaled = shape(x); // raw / integrated amplitude
                    pts.push([X(x), m.Y(u.lerp(raw, scaled, k))]);
                }
                u.line(ctx, pts, cols[i % cols.length], 2.4);
            }
            ctx.restore();
            [0.5, 1, 2, 5, 10].forEach(value => {
                ctx.fillStyle = C.grid; ctx.fillRect(X(value), box.y + box.h, 1, 4);
                u.text(ctx, String(value), X(value), box.y + box.h + 14, {size: 10, color: C.muted, align: 'center'});
            });
            u.text(ctx, p.xlabel || 'transverse momentum pT (GeV, log scale)', box.x + box.w / 2, box.y + box.h + 31, {size: 12, color: C.muted, align: 'center'});
            if (p.labels) p.labels.forEach((l, i) => u.text(ctx, l, box.x + 10, box.y + 34 + i * 15, { size: 11, weight: '700', color: cols[i % cols.length] }));
            u.text(ctx, k === 0 ? (p.title1 || 'Before dividing') : k < 1 ? 'Dividing by each curve’s v₀…' : (p.title2 || 'After dividing by v₀: one shape'), box.x + box.w - 8, box.y + 18, { size: 12, weight: '700', align: 'right' });
            u.text(ctx, 'schematic', box.x + box.w - 8, box.y + box.h - 8, { size: 10, color: C.muted, align: 'right' });
        }
    });

    // ---------------- viscosity: ideal vs bulk-viscous expansion ----------------
    register('viscosity', {
        duration: 7,
        aspect: 16 / 8,
        phases: [
            { t: 0, label: 'Two identical droplets of quark-gluon plasma' },
            { t: 1.5, label: 'Bulk viscosity resists expansion: the right droplet pushes outward less hard' },
            { t: 4.5, label: 'This changes how the spectrum responds to fluctuations, which v₀(pT) can detect' }
        ],
        setup() {
            const rand = u.rng(17), parts = [];
            for (let i = 0; i < 80; i++) parts.push({ a: 2 * Math.PI * rand(), v: 0.6 + 0.5 * rand() });
            return { parts };
        },
        draw(ctx, t, s, W, H, p) {
            const e = u.ease(u.seg(t, 1.2, 6.5));
            const drop = (cx, push, label, sub, col) => {
                const r = Math.min(W, H) * 0.13 * (1 + e * push * 1.1);
                u.glow(ctx, cx, H / 2 + 6, r * 1.4, u.heat(0.85 - 0.45 * e, 0.85));
                s.parts.forEach(q => {
                    const d = r * 0.8 + e * q.v * push * W * 0.17;
                    ctx.save(); ctx.globalAlpha = 0.9 - e * 0.5; ctx.fillStyle = C.navy;
                    ctx.beginPath(); ctx.arc(cx + d * Math.cos(q.a), H / 2 + 6 + d * Math.sin(q.a), 2.1, 0, 2 * Math.PI); ctx.fill(); ctx.restore();
                });
                for (let k = 0; k < 8; k++) {
                    const a = k * Math.PI / 4, r0 = r * 0.55, L = 10 + 24 * push * Math.sin(Math.PI * Math.min(e * 1.2, 1));
                    u.arrow(ctx, cx + r0 * Math.cos(a), H / 2 + 6 + r0 * Math.sin(a), cx + (r0 + L) * Math.cos(a), H / 2 + 6 + (r0 + L) * Math.sin(a), col, 2, 7);
                }
                u.text(ctx, label, cx, 24, { size: 14, weight: '700', align: 'center' });
                u.text(ctx, sub, cx, H - 12, { size: 12, color: C.muted, align: 'center' });
            };
            ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W / 2, H); ctx.clip();
            drop(W * 0.25, 1.0, p.leftTitle || 'Ideal fluid', p.leftSub || 'no bulk viscosity', C.red); ctx.restore();
            ctx.save(); ctx.beginPath(); ctx.rect(W / 2, 0, W / 2, H); ctx.clip();
            drop(W * 0.75, 0.62, p.rightTitle || 'With bulk viscosity ζ/s', p.rightSub || 'resists uniform expansion/compression', C.blue); ctx.restore();
            ctx.save(); ctx.strokeStyle = C.grid; ctx.beginPath(); ctx.moveTo(W / 2, 10); ctx.lineTo(W / 2, H - 10); ctx.stroke(); ctx.restore();
        }
    });

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(init, 0));
    else setTimeout(init, 0);
})();
