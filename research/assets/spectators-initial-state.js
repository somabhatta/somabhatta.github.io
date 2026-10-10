/* Page-specific animations for research/spectators-initial-state.html
   (Bhatta & Bairathi, EPJC 82, 855 (2022)). All panels are schematic. */
(function () {
    'use strict';
    const { register, glauber, C, u } = window.Anim;
    const fsz = (W, s) => (W < 520 ? s * 0.82 : s);

    // ------------------------------------------------------------------
    // 1. Same multiplicity class, many different initial states
    // ------------------------------------------------------------------
    register('spectators-initial-state-centrality', {
        duration: 10,
        aspect: 16 / 9,
        phases: [
            { t: 0, label: 'Step 1 · Events are sorted by how many particles they produce (multiplicity)' },
            { t: 3, label: 'Step 2 · Six events from the SAME multiplicity class: their overlap regions differ' },
            { t: 6.5, label: 'Step 3 · Standard centrality binning averages them into one number' }
        ],
        setup() {
            const rand = u.rng(31), evs = [];
            let tries = 0;
            while (evs.length < 6 && tries++ < 400) {
                const b = 5 + 5 * rand();
                const ev = glauber.event({ nucleus: 'Au197', b, sigma: 4.2 }, rand);
                const mult = ev.obs.N * (1 + 0.12 * u.gauss(rand));
                if (mult > 130 && mult < 165) { ev.b = b; evs.push(ev); }
            }
            const drops = [];
            for (let i = 0; i < 40; i++) drops.push({ x: rand(), d: rand() * 2.2, inBin: rand() < 0.35 });
            let mN = 0; evs.forEach(e => mN += e.obs.N); mN /= Math.max(evs.length, 1);
            return { evs, drops, mN };
        },
        draw(ctx, t, s, W, H) {
            // left: schematic multiplicity distribution with centrality slices
            const box = { x: 30, y: 34, w: W * 0.33 - 30, h: H - 80 };
            const shape = (x) => 0.08 + 0.92 * Math.exp(-6 * x) * 0.6 + 0.35 * (x < 0.82 ? 1 : Math.exp(-(x - 0.82) * 25)) * (1 - 0.4 * x);
            const X = (x) => box.x + x * box.w, Y = (y) => box.y + box.h - y * box.h * 0.9;
            const edges = [0.05, 0.12, 0.22, 0.34, 0.48, 0.64, 0.84];
            const hi = 3; // highlighted slice index
            for (let i = 0; i < edges.length - 1; i++) {
                ctx.save();
                ctx.fillStyle = i === hi ? 'rgba(232,113,10,0.28)' : (i % 2 ? 'rgba(154,165,177,0.18)' : 'rgba(154,165,177,0.06)');
                ctx.beginPath(); ctx.moveTo(X(edges[i]), Y(0));
                for (let k = 0; k <= 20; k++) { const x = u.lerp(edges[i], edges[i + 1], k / 20); ctx.lineTo(X(x), Y(shape(x))); }
                ctx.lineTo(X(edges[i + 1]), Y(0)); ctx.closePath(); ctx.fill(); ctx.restore();
            }
            const curve = [];
            for (let k = 0; k <= 100; k++) { const x = k / 100; curve.push([X(x), Y(shape(x))]); }
            u.line(ctx, curve, C.blue, 2);
            u.line(ctx, [[box.x, Y(0)], [box.x + box.w, Y(0)]], C.gray, 1);
            u.text(ctx, 'multiplicity →', box.x + box.w, Y(0) + 16, { size: fsz(W, 11), color: C.muted, align: 'right' });
            u.text(ctx, 'number of events', box.x, box.y - 12, { size: fsz(W, 11), color: C.muted });
            const sc = (X(edges[hi]) + X(edges[hi + 1])) / 2;
            u.text(ctx, 'one class', sc, Y(0) + 30, { size: fsz(W, 11), color: C.orange, weight: '700', align: 'center' });
            // events dropping into the distribution
            if (t < 3.2) s.drops.forEach(dp => {
                const e = u.seg(t, dp.d * 0.6, dp.d * 0.6 + 0.8);
                if (e <= 0 || e >= 1) return;
                const x = dp.inBin ? u.lerp(edges[hi], edges[hi + 1], dp.x) : dp.x * 0.84 + 0.04;
                ctx.save(); ctx.fillStyle = dp.inBin ? C.orange : C.navy; ctx.globalAlpha = 1 - e * 0.5;
                ctx.beginPath(); ctx.arc(X(x), u.lerp(box.y - 20, Y(shape(x) * 0.5), e), 3, 0, 2 * Math.PI); ctx.fill(); ctx.restore();
            });

            // right: thumbnails of events in that class
            const rx = W * 0.36, rw = W - rx - 10, top = 30;
            const cw = rw / 3, ch = (H - top - 8) / 2;
            const dim = 1 - 0.7 * u.seg(t, 6.5, 7.3);
            u.text(ctx, 'events in the same class (toy Glauber, Au+Au)', rx + 4, 20, { size: fsz(W, 12), weight: '700', alpha: u.seg(t, 3, 3.6) });
            s.evs.forEach((ev, i) => {
                const a = u.seg(t, 3 + i * 0.4, 3.5 + i * 0.4) * dim;
                if (a <= 0) return;
                const cx = rx + (i % 3 + 0.5) * cw, cy = top + (Math.floor(i / 3) + 0.45) * ch;
                const R = 6.38, k = Math.min(cw, ch - 22) / (3.6 * R);
                ctx.save(); ctx.globalAlpha = a;
                const sp = (pts, part, dx) => pts.forEach((q, j) => { if (!part[j]) { ctx.fillStyle = 'rgba(154,165,177,0.35)'; ctx.beginPath(); ctx.arc(cx + (q[0] - ev.obs.cx + dx * 0) * k, cy + (q[1] - ev.obs.cy) * k, Math.max(0.42 * k, 0.8), 0, 2 * Math.PI); ctx.fill(); } });
                sp(ev.A, ev.pa, -1); sp(ev.B, ev.pb, 1);
                ev.parts.forEach(q => { ctx.fillStyle = C.orange; ctx.beginPath(); ctx.arc(cx + (q[0] - ev.obs.cx) * k, cy + (q[1] - ev.obs.cy) * k, Math.max(0.5 * k, 1), 0, 2 * Math.PI); ctx.fill(); });
                ctx.restore();
                const nsp = 394 - ev.obs.N;
                u.text(ctx, W < 520 ? `${ev.obs.N} part.` : `${ev.obs.N} participants`, cx, cy + ch * 0.5 - 2, { size: fsz(W, 10.5), color: C.orange, weight: '700', align: 'center', alpha: a });
                u.text(ctx, W < 520 ? `${nsp} spect.` : `${nsp} spectators`, cx, cy + ch * 0.5 + 11, { size: fsz(W, 10.5), color: C.muted, align: 'center', alpha: a });
            });
            if (t > 6.5) {
                const a = u.seg(t, 6.6, 7.4);
                const bw = Math.min(rw * 0.9, 380), bx = rx + (rw - bw) / 2, by = H / 2 - 30;
                ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = '#ffffff'; ctx.strokeStyle = C.orange; ctx.lineWidth = 1.5;
                u.roundRect(ctx, bx, by, bw, 62, 10); ctx.fill(); ctx.stroke(); ctx.restore();
                u.text(ctx, `class average: ⟨participants⟩ ≈ ${Math.round(s.mN)}`, bx + bw / 2, by + 26, { size: fsz(W, 13), weight: '700', align: 'center', alpha: a });
                u.text(ctx, 'the event-to-event differences are hidden', bx + bw / 2, by + 46, { size: fsz(W, 11.5), color: C.muted, align: 'center', alpha: a });
            }
        }
    });

    // ------------------------------------------------------------------
    // 2. Centrality binning, then L+R (spectator) sub-binning
    // ------------------------------------------------------------------
    register('spectators-initial-state-binning', {
        duration: 11,
        aspect: 16 / 9,
        phases: [
            { t: 0, label: 'Step 1 · Each dot is one event: its multiplicity vs. its spectator neutrons' },
            { t: 2.5, label: 'Step 2 · Centrality binning: slice the events by multiplicity only' },
            { t: 5, label: 'Step 3 · L+R binning: split one slice further by the number of spectator neutrons' },
            { t: 8, label: 'Step 4 · Same multiplicity class, but each sub-bin has a different number of participants' }
        ],
        setup() {
            const rand = u.rng(77), pts = [];
            for (let i = 0; i < 1100; i++) {
                const b = 12.5 * Math.sqrt(rand());
                let np = 394 * Math.exp(-Math.pow(b / 7.4, 2));
                np = Math.max(2, np + u.gauss(rand) * Math.sqrt(np) * 1.1);
                const ns = Math.max(0, 0.6 * (394 - np) + u.gauss(rand) * (4 + 0.06 * (394 - np)));
                const nch = Math.max(0, 2.2 * np * (1 + 0.1 * u.gauss(rand)) + 6 * u.gauss(rand));
                pts.push({ np, ns, nch });
            }
            const sorted = pts.map(p => p.nch).sort((a, b) => b - a);
            const q = (f) => sorted[Math.floor(f * (sorted.length - 1))];
            const edges = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6].map(q); // descending Nch
            const cls = 2; // 20-30%
            const lo = edges[cls + 1], hi = edges[cls];
            const sel = pts.filter(p => p.nch <= hi && p.nch > lo);
            const nsS = sel.map(p => p.ns).sort((a, b) => a - b);
            const n0 = nsS[Math.floor(nsS.length * 0.03)], n1 = nsS[Math.floor(nsS.length * 0.97)];
            const nb = 4, step = (n1 - n0) / nb, subs = [];
            for (let k = 0; k < nb; k++) {
                const a = n0 + k * step, b = a + step;
                const m = sel.filter(p => p.ns >= a && p.ns < b);
                let x = 0, y = 0, np = 0; m.forEach(p => { x += p.nch; y += p.ns; np += p.np; });
                subs.push({ a, b, n: m.length, x: x / m.length, y: y / m.length, np: np / m.length });
            }
            return { pts, edges, lo, hi, subs, n0, n1 };
        },
        draw(ctx, t, s, W, H) {
            const box = { x: 64, y: 16, w: W - (W < 520 ? 84 : 230), h: H - 66 };
            const m = u.axes(ctx, box, [0, 950], [0, 290], { xticks: false, yticks: false,
                xlabel: 'multiplicity Nch (particles produced)', ylabel: 'spectator neutrons nspec' });
            const showSlices = u.seg(t, 2.5, 3.3), showSub = u.seg(t, 5, 5.8), showMean = u.seg(t, 8, 8.8);
            // centrality slices
            if (showSlices > 0) for (let i = 0; i < s.edges.length - 1; i++) {
                const x0 = m.X(s.edges[i + 1]), x1 = m.X(Math.min(s.edges[i], 950));
                ctx.save(); ctx.globalAlpha = showSlices;
                ctx.fillStyle = i === 2 && showSub > 0 ? 'rgba(232,113,10,0.12)' : (i % 2 ? 'rgba(154,165,177,0.16)' : 'rgba(154,165,177,0.05)');
                ctx.fillRect(x0, box.y, x1 - x0, box.h);
                ctx.restore();
                if (x1 - x0 > (W < 520 ? 30 : 42)) u.text(ctx, `${i * 10}–${i * 10 + 10}%`, (x0 + x1) / 2, box.y + 14, { size: fsz(W, 10), color: C.muted, align: 'center', alpha: showSlices });
            }
            // points
            ctx.save(); ctx.beginPath(); ctx.rect(box.x, box.y, box.w, box.h); ctx.clip();
            const subCols = [C.purple, C.blue, C.teal, C.gold];
            const ap = u.seg(t, 0, 1.5);
            s.pts.forEach((p, i) => {
                if (i / s.pts.length > ap) return;
                const inCls = p.nch <= s.hi && p.nch > s.lo;
                let col = C.navy, al = 0.35;
                if (showSub > 0 && inCls) {
                    const k = Math.floor((p.ns - s.n0) / ((s.n1 - s.n0) / 4));
                    if (k >= 0 && k < 4) { col = subCols[k]; al = 0.85; }
                } else if (showSub > 0) al = 0.35 - 0.2 * showSub;
                ctx.fillStyle = col; ctx.globalAlpha = al;
                ctx.beginPath(); ctx.arc(m.X(p.nch), m.Y(p.ns), 1.8, 0, 2 * Math.PI); ctx.fill();
            });
            ctx.restore();
            // sub-bin boundaries
            if (showSub > 0) {
                const x0 = m.X(s.lo), x1 = m.X(s.hi);
                for (let k = 0; k <= 4; k++) {
                    const y = m.Y(s.n0 + k * (s.n1 - s.n0) / 4);
                    ctx.save(); ctx.globalAlpha = showSub; ctx.strokeStyle = C.orange; ctx.lineWidth = 1.4;
                    ctx.beginPath(); ctx.moveTo(x0 - 6, y); ctx.lineTo(x1 + 6, y); ctx.stroke(); ctx.restore();
                }
            }
            // sub-bin means and their participant numbers
            if (showMean > 0) {
                s.subs.forEach((sb, k) => {
                    if (!(sb.n > 0)) return;
                    u.ball(ctx, m.X(sb.x), m.Y(sb.y), 6, subCols[k], showMean);
                    if (W >= 520) {
                        const lx = box.x + box.w + 14, ly = m.Y(sb.y) + 4;
                        u.text(ctx, `⟨participants⟩ ≈ ${Math.round(sb.np)}`, lx, ly, { size: 11.5, weight: '700', color: subCols[k], alpha: showMean });
                    }
                });
                if (W >= 520) u.text(ctx, 'within one class:', box.x + box.w + 14, box.y + 34, { size: 11.5, color: C.muted, alpha: showMean });
                else u.text(ctx, `participants: ${Math.round(s.subs[3].np)} (top) … ${Math.round(s.subs[0].np)} (bottom)`, box.x + box.w - 6, box.y + 30, { size: 10, weight: '700', color: C.ink, align: 'right', alpha: showMean });
            }
            u.text(ctx, 'schematic toy model', box.x + box.w - 6, box.y + box.h - 8, { size: 10, color: C.muted, align: 'right' });
        }
    });

    // ------------------------------------------------------------------
    // 3. Same participants, different density
    // ------------------------------------------------------------------
    register('spectators-initial-state-density', {
        duration: 10,
        aspect: 16 / 8,
        phases: [
            { t: 0, label: 'Step 1 · Two events with the same number of participants, but different overlap area' },
            { t: 3, label: 'Step 2 · Denser overlap: each participant collides more often (more binary collisions)' },
            { t: 6, label: 'Step 3 · Result: more particles produced, and a rounder shape (smaller ε₂, smaller v₂)' }
        ],
        setup() {
            const mk = (seed, ax, ay, n) => {
                const rand = u.rng(seed), pts = [];
                let guard = 0;
                while (pts.length < n && guard++ < 20000) {
                    const x = (2 * rand() - 1) * ax, y = (2 * rand() - 1) * ay;
                    if ((x / ax) ** 2 + (y / ay) ** 2 > 1) continue;
                    if (pts.some(p => (p.x - x) ** 2 + (p.y - y) ** 2 < 0.018)) continue;
                    pts.push({ x, y, A: pts.length % 2 });
                }
                const links = [];
                pts.forEach((p, i) => pts.forEach((q, j) => {
                    if (j > i && p.A !== q.A && (p.x - q.x) ** 2 + (p.y - q.y) ** 2 < 0.075) links.push([i, j]);
                }));
                let c2 = 0, s2 = 0, r2 = 0;
                pts.forEach(p => { const rr = p.x * p.x + p.y * p.y, ph = Math.atan2(p.y, p.x); c2 += rr * Math.cos(2 * ph); s2 += rr * Math.sin(2 * ph); r2 += rr; });
                const rand2 = u.rng(seed + 1), parts = [];
                const nP = Math.round(18 + 1.6 * links.length);
                const e2 = Math.hypot(c2, s2) / r2;
                for (let i = 0; i < nP; i++) {
                    let ph; do { ph = 2 * Math.PI * rand2(); } while (rand2() * (1 + 0.8 * e2) > 1 + 0.8 * e2 * Math.cos(2 * ph));
                    parts.push({ ph, v: 0.6 + 0.5 * rand2() });
                }
                return { pts, links, e2, parts, ax, ay };
            };
            return { L: mk(5, 0.62, 1.0, 26), R: mk(9, 0.5, 0.56, 26) };
        },
        draw(ctx, t, s, W, H) {
            const sc = Math.min(W * 0.2, H * 0.34);
            const linkA = u.seg(t, 3, 4.5), qgp = u.seg(t, 6, 7), emit = u.ease(u.seg(t, 6.6, 9.6));
            const one = (ev, cx, title) => {
                const cy = H / 2 + 6;
                // overlap outline
                ctx.save(); ctx.strokeStyle = C.gray; ctx.setLineDash([4, 4]); ctx.lineWidth = 1.2;
                ctx.beginPath(); ctx.ellipse(cx, cy, ev.ax * sc * 1.12, ev.ay * sc * 1.12, 0, 0, 2 * Math.PI); ctx.stroke(); ctx.restore();
                if (qgp > 0) {
                    ctx.save(); ctx.translate(cx, cy); ctx.scale(ev.ax * sc * 1.4, ev.ay * sc * 1.4);
                    u.glow(ctx, 0, 0, 1, u.heat(0.75, 0.8), qgp * (1 - 0.6 * emit)); ctx.restore();
                }
                if (linkA > 0) {
                    ctx.save(); ctx.globalAlpha = linkA * (1 - qgp * 0.8); ctx.strokeStyle = C.red; ctx.lineWidth = 1.3;
                    ev.links.forEach(([i, j]) => { const a = ev.pts[i], b = ev.pts[j]; ctx.beginPath(); ctx.moveTo(cx + a.x * sc, cy + a.y * sc); ctx.lineTo(cx + b.x * sc, cy + b.y * sc); ctx.stroke(); });
                    ctx.restore();
                }
                ev.pts.forEach(p => u.ball(ctx, cx + p.x * sc, cy + p.y * sc, Math.max(sc * 0.055, 3.2), p.A ? C.blue : C.purple, 1 - qgp * 0.85));
                if (emit > 0) ev.parts.forEach(q => {
                    const d = Math.max(ev.ax, ev.ay) * sc * 1.1 + emit * q.v * Math.min(W * 0.11, H * 0.24);
                    ctx.save(); ctx.globalAlpha = 1 - emit * 0.3; ctx.fillStyle = C.navy;
                    ctx.beginPath(); ctx.arc(cx + d * Math.cos(q.ph), cy + d * Math.sin(q.ph), 2, 0, 2 * Math.PI); ctx.fill(); ctx.restore();
                });
                u.text(ctx, title, cx, 22, { size: fsz(W, 13.5), weight: '700', align: 'center' });
                let line = `${ev.pts.length} participants`;
                if (t >= 3) line += ` · ${ev.links.length} collisions`;
                u.text(ctx, line, cx, H - 26, { size: fsz(W, 11.5), color: C.ink, align: 'center', weight: '600' });
                if (t >= 6) u.text(ctx, `${ev.parts.length} particles · ε₂ = ${ev.e2.toFixed(2)}`, cx, H - 9, { size: fsz(W, 11.5), color: C.muted, align: 'center' });
            };
            ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W / 2, H); ctx.clip();
            one(s.L, W * 0.25, 'Larger area (lower density)'); ctx.restore();
            ctx.save(); ctx.beginPath(); ctx.rect(W / 2, 0, W / 2, H); ctx.clip();
            one(s.R, W * 0.75, 'Smaller area (higher density)'); ctx.restore();
            ctx.save(); ctx.strokeStyle = C.grid; ctx.beginPath(); ctx.moveTo(W / 2, 10); ctx.lineTo(W / 2, H - 10); ctx.stroke(); ctx.restore();
            u.text(ctx, 'schematic', W - 8, 40, { size: 10, color: C.muted, align: 'right' });
        }
    });

    // ------------------------------------------------------------------
    // 4. The slope comparison behind Rc
    // ------------------------------------------------------------------
    register('spectators-initial-state-slopes', {
        duration: 14,
        aspect: 16 / 9,
        phases: [
            { t: 0, label: 'Elliptic flow v₂ · Step 1: class averages (red crosses) follow one trend' },
            { t: 2.2, label: 'Elliptic flow v₂ · Step 2: the spectator sub-bins inside one class follow a steeper line' },
            { t: 4.6, label: 'Elliptic flow v₂ · Step 3: slopes differ → Rc far from 0 → v₂ carries geometry information' },
            { t: 7, label: 'Triangular flow v₃ · Step 1: class averages follow one trend' },
            { t: 9.2, label: 'Triangular flow v₃ · Step 2: the sub-bins follow the same line' },
            { t: 11.6, label: 'Triangular flow v₃ · Step 3: slopes agree → Rc ≈ 0 → v₃ is mostly fluctuations' }
        ],
        setup() { return {}; },
        draw(ctx, t, s, W, H) {
            const v3 = t >= 7, tt = v3 ? t - 7 : t;
            const box = { x: 56, y: 20, w: W - 80, h: H - 70 };
            const m = u.axes(ctx, box, [0, 10], [0, 10], { xticks: false, yticks: false,
                xlabel: 'multiplicity Nch  (central collisions to the right)', ylabel: v3 ? 'triangular flow v₃' : 'elliptic flow v₂' });
            const f = (x) => 8.6 - 0.62 * x; // centrality-average trend (schematic)
            const xs = [1.3, 2.9, 4.5, 6.1, 7.7, 9.0];
            const aC = u.seg(tt, 0.2, 1.4), aS = u.seg(tt, 2.2, 3.4), aR = u.seg(tt, 4.6, 5.2);
            // trend line
            ctx.save(); ctx.globalAlpha = aC;
            u.line(ctx, [[m.X(0.5), m.Y(f(0.5))], [m.X(9.6), m.Y(f(9.6))]], C.red, 2, [6, 4]);
            ctx.restore();
            xs.forEach((x, i) => {
                const a = u.seg(tt, 0.2 + i * 0.15, 0.6 + i * 0.15);
                if (a <= 0) return;
                const X = m.X(x), Y = m.Y(f(x));
                ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = C.red; ctx.lineWidth = 4;
                ctx.beginPath(); ctx.moveTo(X - 8, Y); ctx.lineTo(X + 8, Y); ctx.moveTo(X, Y - 8); ctx.lineTo(X, Y + 8); ctx.stroke(); ctx.restore();
            });
            // sub-bins within the class at x = 4.5
            const xc = 4.5, k = v3 ? 1.0 : 2.3;
            const sub = [-0.9, -0.45, 0, 0.45, 0.9];
            sub.forEach((dx, i) => {
                const a = u.seg(tt, 2.2 + i * 0.2, 2.6 + i * 0.2);
                if (a <= 0) return;
                u.ball(ctx, m.X(xc + dx), m.Y(f(xc) - 0.62 * k * dx), 6, C.blue, a);
            });
            if (aS > 0) {
                ctx.save(); ctx.globalAlpha = u.seg(tt, 3.2, 3.8);
                u.line(ctx, [[m.X(xc - 1.4), m.Y(f(xc) + 0.62 * k * 1.4)], [m.X(xc + 1.4), m.Y(f(xc) - 0.62 * k * 1.4)]], C.blue, 2.4);
                ctx.restore();
            }
            // legend
            const lx = box.x + box.w - 10;
            u.text(ctx, '✚ centrality average (slope Sc)', lx, box.y + 20, { size: fsz(W, 12), color: C.red, weight: '700', align: 'right', alpha: aC });
            u.text(ctx, '● spectator sub-bins of one class (slope Sns)', lx, box.y + 38, { size: fsz(W, 12), color: C.blue, weight: '700', align: 'right', alpha: aS });
            if (aR > 0) {
                const txt = v3 ? 'Sns ≈ Sc  →  Rc ≈ 0' : 'Sns ≠ Sc  →  Rc ≠ 0';
                u.text(ctx, txt, m.X(0.6), m.Y(2.6), { size: fsz(W, 17), weight: '700', color: v3 ? C.teal : C.orange, alpha: aR });
                u.text(ctx, v3 ? 'spectators add little: mostly random fluctuations' : 'spectators reveal geometry beyond centrality', m.X(0.6), m.Y(2.6) + 20, { size: fsz(W, 12), color: C.muted, alpha: aR });
            }
            u.text(ctx, 'schematic', box.x + 8, box.y + box.h - 8, { size: 10, color: C.muted });
        }
    });
})();
