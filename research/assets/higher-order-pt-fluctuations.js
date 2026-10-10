/* Page-specific animations for research/higher-order-pt-fluctuations.html
   (Bhatta, Zhang, Jia, PRC 105, 024904 (2022)). All schematic. */
(function () {
    'use strict';
    const { register, C, u } = window.Anim;
    const SLUG = 'higher-order-pt-fluctuations';
    const fsz = (W) => (W < 560 ? 10.5 : 12);
    // taller canvases on phones (read once when each panel is created)
    const mobileAspect = () => (window.innerWidth < 600 ? 4 / 3 : 2);

    // normal pdf / cdf helpers
    const phi = (x) => Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
    const erf = (x) => { // Abramowitz-Stegun 7.1.26
        const s = Math.sign(x); x = Math.abs(x);
        const t = 1 / (1 + 0.3275911 * x);
        const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
        return s * y;
    };
    const Phi = (x) => 0.5 * (1 + erf(x / Math.SQRT2));

    // ------------------------------------------------------------------
    // 1. moments: what mean, variance, skewness and kurtosis look like
    // ------------------------------------------------------------------
    register(SLUG + '-moments', {
        duration: 12,
        get aspect() { return mobileAspect(); },
        phases: [
            { t: 0, label: '1st order · Mean: where the distribution sits' },
            { t: 3, label: '2nd order · Variance: how wide it is' },
            { t: 6, label: '3rd order · Skewness: how lopsided it is' },
            { t: 9, label: '4th order · Kurtosis: how heavy its tails are compared with a bell curve' }
        ],
        setup() { return {}; },
        draw(ctx, t, s, W, H) {
            const narrow = W < 560, fs = fsz(W);
            const ph = Math.floor(t / 3), lt = t - 3 * ph;
            const k = Math.sin(Math.PI * lt / 3);          // 0 -> 1 -> 0 within each step
            const osc = Math.sin(2 * Math.PI * lt / 3);    // -1..1 for mean / width
            let f;
            if (ph === 0) { const m = 1.1 * osc; f = (x) => phi(x - m); }
            else if (ph === 1) { const sg = 1 + 0.45 * osc; f = (x) => phi(x / sg) / sg; }
            else if (ph === 2) {
                const a = 7 * k, d = a / Math.sqrt(1 + a * a);
                const om = 1 / Math.sqrt(1 - 2 * d * d / Math.PI), xi = -om * d * Math.sqrt(2 / Math.PI);
                f = (x) => { const z = (x - xi) / om; return 2 / om * phi(z) * Phi(a * z); };
            } else {
                const w = 0.8, s2 = 1 + 1.0 * k, s1 = Math.sqrt((1 - (1 - w) * s2 * s2) / w);
                f = (x) => w * phi(x / s1) / s1 + (1 - w) * phi(x / s2) / s2;
            }
            const box = narrow ? { x: 14, y: 50, w: W - 28, h: H - 72 } : { x: 24, y: 18, w: W * 0.58 - 24, h: H - 44 };
            const m = u.axes(ctx, box, [-4, 4], [0, 0.85], { xticks: false, yticks: false });
            // reference bell curve (same mean and width) + current curve
            const ref = [], cur = [];
            for (let i = 0; i <= 200; i++) {
                const x = -4 + 8 * i / 200;
                ref.push([m.X(x), m.Y(phi(x))]);
                cur.push([m.X(x), m.Y(Math.min(f(x), 0.84))]);
            }
            ctx.save(); ctx.fillStyle = 'rgba(31,95,191,0.16)';
            ctx.beginPath(); ctx.moveTo(m.X(-4), m.Y(0)); cur.forEach(q => ctx.lineTo(q[0], q[1])); ctx.lineTo(m.X(4), m.Y(0)); ctx.closePath(); ctx.fill(); ctx.restore();
            u.line(ctx, ref, C.gray, 1.6, [5, 4]);
            u.line(ctx, cur, C.blue, 2.6);
            if (ph === 0) {
                const xm = m.X(1.1 * osc);
                u.line(ctx, [[xm, box.y + 8], [xm, box.y + box.h]], C.orange, 2, [4, 3]);
                u.text(ctx, 'mean', xm + 5, box.y + 22, { size: fs, color: C.orange, weight: '700' });
            }
            if (ph === 1) {
                const sg = 1 + 0.45 * osc, y = m.Y(phi(1) / sg);
                u.arrow(ctx, m.X(0), y, m.X(sg), y, C.orange, 2, 7);
                u.arrow(ctx, m.X(0), y, m.X(-sg), y, C.orange, 2, 7);
                u.text(ctx, 'width', m.X(0), y - 6, { size: fs, color: C.orange, weight: '700', align: 'center' });
            }
            if (ph === 2 && k > 0.2) {
                u.arrow(ctx, m.X(1.3), m.Y(0.22), m.X(2.9), m.Y(0.08), C.orange, 2, 7);
                u.text(ctx, 'long tail', m.X(2.0), m.Y(0.25), { size: fs, color: C.orange, weight: '700', align: 'left', alpha: k });
            }
            if (ph === 3 && k > 0.2) {
                [[-1, 'left'], [1, 'right']].forEach(([sgn]) => u.arrow(ctx, m.X(sgn * 2.0), m.Y(0.16), m.X(sgn * 3.2), m.Y(0.05), C.orange, 2, 7));
                u.text(ctx, 'heavier tails', m.X(0), m.Y(0.12), { size: fs, color: C.orange, weight: '700', align: 'center', alpha: k });
            }
            u.text(ctx, '- - bell curve (Gaussian)', box.x + box.w - 6, box.y + 16, { size: fs - 1, color: C.muted, align: 'right' });
            u.text(ctx, 'schematic · event-wise mean momentum [pT] →', box.x + box.w, box.y + box.h + 15, { size: fs - 1.5, color: C.muted, align: 'right' });

            // legend of the four orders
            const names = [['Mean', 'measured'], ['Variance', 'measured'], ['Skewness', 'not yet measured'], ['Kurtosis', 'not yet measured']];
            if (narrow) {
                let x = 14;
                names.forEach((n, i) => {
                    const on = i === ph;
                    u.text(ctx, (i + 1) + ' ' + n[0], x, 18, { size: fs, weight: on ? '800' : '500', color: on ? C.navy : C.muted });
                    x += (W - 28) / 4;
                });
                u.text(ctx, 'before this work: mean & variance measured; skewness & kurtosis not', 14, 38, { size: fs - 1, color: C.muted });
            } else {
                const sx = W * 0.62;
                u.text(ctx, 'The four cumulants', sx, 34, { size: 14, weight: '700' });
                names.forEach((n, i) => {
                    const on = i === ph, y = 70 + i * ((H - 100) / 4);
                    if (on) { ctx.save(); ctx.fillStyle = 'rgba(232,113,10,0.10)'; u.roundRect(ctx, sx - 8, y - 18, W - sx - 6, 40, 8); ctx.fill(); ctx.restore(); }
                    u.text(ctx, (i + 1) + '. ' + n[0], sx, y, { size: 14, weight: on ? '800' : '500', color: on ? C.navy : C.muted });
                    u.text(ctx, n[1], sx, y + 16, { size: 11, color: i < 2 ? C.teal : C.orange, weight: '600' });
                });
            }
        }
    });

    // ------------------------------------------------------------------
    // 2. correlator: pairs, triplets, quadruplets of particles in one event
    // ------------------------------------------------------------------
    register(SLUG + '-correlator', {
        duration: 12,
        get aspect() { return mobileAspect(); },
        phases: [
            { t: 0, label: 'Step 1 · One event: compare each particle\'s pT with the all-event average' },
            { t: 3, label: 'Step 2 · c₂: multiply the deviations of every unique pair' },
            { t: 6, label: 'Step 3 · c₃: same for every unique triplet' },
            { t: 9, label: 'Step 4 · c₄: every unique quadruplet; then average over many events' }
        ],
        setup() {
            const r = u.rng(29), d = [];
            for (let i = 0; i < 10; i++) d.push(u.clamp(0.32 * u.gauss(r) + 0.04, -0.6, 0.6));
            return { d };
        },
        draw(ctx, t, s, W, H) {
            const fs = fsz(W), narrow = W < 560;
            const n = s.d.length;
            const box = { x: narrow ? 14 : 40, y: 40, w: W - (narrow ? 28 : 80), h: H - 92 };
            const pw = box.w * (narrow ? 0.8 : 0.86);
            const X = (i) => box.x + (i + 0.5) * pw / n;
            const Y = (v) => box.y + box.h / 2 - v / 0.7 * (box.h / 2);
            const grow = u.ease(u.seg(t, 0.2, 1.6));
            // mean line
            u.line(ctx, [[box.x, Y(0)], [box.x + box.w, Y(0)]], C.ink, 1.4, [6, 4]);
            u.text(ctx, 'all-event', box.x + box.w, Y(0) - 18, { size: fs - 1, color: C.ink, align: 'right' });
            u.text(ctx, 'average', box.x + box.w, Y(0) - 5, { size: fs - 1, color: C.ink, align: 'right' });
            u.text(ctx, '⟨⟨pT⟩⟩', box.x + box.w, Y(0) + 15, { size: fs - 1, color: C.ink, align: 'right' });
            u.text(ctx, 'higher pT ↑', box.x, box.y - 6, { size: fs - 1, color: C.red });
            u.text(ctx, 'lower pT ↓', box.x, box.y + box.h + 14, { size: fs - 1, color: C.blue });
            // pick a combination
            const order = t < 3 ? 0 : t < 6 ? 2 : t < 9 ? 3 : 4;
            let sel = [];
            if (order) {
                const idx = Math.floor(t / 0.75);
                const r = u.rng(1000 + idx * 37);
                while (sel.length < order) { const j = Math.floor(r() * n); if (!sel.includes(j)) sel.push(j); }
                sel.sort((a, b) => a - b);
                ctx.save(); ctx.strokeStyle = C.purple; ctx.lineWidth = 2; ctx.globalAlpha = 0.7;
                ctx.beginPath(); sel.forEach((j, q) => { const x = X(j), y = Y(s.d[j] * grow); q ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke(); ctx.restore();
            }
            s.d.forEach((v, i) => {
                const vv = v * grow, col = v > 0 ? C.red : C.blue, on = sel.includes(i);
                u.line(ctx, [[X(i), Y(0)], [X(i), Y(vv)]], col, on ? 3 : 2);
                u.ball(ctx, X(i), Y(vv), on ? 8 : 6, on ? C.purple : col);
            });
            if (order) {
                let prod = 1; sel.forEach(j => prod *= s.d[j]);
                const signs = sel.map(j => s.d[j] > 0 ? '(+)' : '(−)').join(' × ');
                const lab = ['', '', 'pair', 'triplet', 'quadruplet'][order];
                u.text(ctx, `this ${lab}: ${signs} → ${prod > 0 ? 'positive' : 'negative'}`, W / 2, H - 12, { size: fs + 1, weight: '700', color: C.purple, align: 'center' });
                u.text(ctx, `c${'₀₁₂₃₄'[order]} = average over all unique ${lab}s`, W / 2, 22, { size: fs + 1, weight: '700', align: 'center', color: C.navy });
            } else {
                u.text(ctx, 'particles of one event (schematic)', W / 2, 22, { size: fs + 1, weight: '700', align: 'center', color: C.navy });
                u.text(ctx, 'stick = particle pT minus the average', W / 2, H - 12, { size: fs, color: C.muted, align: 'center' });
            }
        }
    });

    // ------------------------------------------------------------------
    // 3. nonflow: standard method vs two-subevent method in eta
    // ------------------------------------------------------------------
    register(SLUG + '-nonflow', {
        duration: 10.5,
        get aspect() { return mobileAspect(); },
        phases: [
            { t: 0, label: 'Step 1 · Particles spread along the beam (pseudorapidity η); some come in tight bunches from jets and decays' },
            { t: 3.5, label: 'Step 2 · Standard method: every pair counts, including close neighbours from one bunch (short-range, orange)' },
            { t: 7, label: 'Step 3 · Two-subevent method: pair a (η < −0.75) with c (η > 0.75); bunches rarely span the gap' }
        ],
        setup() {
            const r = u.rng(41), pts = [], clusters = [];
            const centers = [-2.1, -1.4, -0.3, 0.5, 1.3, 2.0];
            centers.forEach((c, ci) => {
                const m = 2 + Math.floor(r() * 2), ids = [], y0 = 0.1 + 0.75 * r();
                for (let k = 0; k < m; k++) { ids.push(pts.length); pts.push({ eta: c + (r() - 0.5) * 0.3, y: u.clamp(y0 + (r() - 0.5) * 0.18, 0, 0.92), cl: ci }); }
                clusters.push(ids);
            });
            for (let k = 0; k < 14; k++) pts.push({ eta: (r() * 2 - 1) * 2.4, y: r(), cl: -1 });
            const longPairs = [];
            for (let k = 0; k < 60 && longPairs.length < 6; k++) {
                const i = Math.floor(r() * pts.length), j = Math.floor(r() * pts.length);
                if (pts[i].eta < -0.75 && pts[j].eta > 0.75) longPairs.push([i, j]);
            }
            const stdPairs = [];
            for (let k = 0; k < 7; k++) stdPairs.push([Math.floor(r() * pts.length), Math.floor(r() * pts.length)]);
            return { pts, clusters, longPairs, stdPairs };
        },
        draw(ctx, t, s, W, H) {
            const fs = fsz(W);
            const x0 = 30, x1 = W - 30, yT = 46, yB = H - 46;
            const X = (e) => x0 + (e + 2.5) / 5 * (x1 - x0);
            const Y = (v) => yT + 10 + v * (yB - yT - 40);
            const sub = u.seg(t, 7, 7.8);
            // subevent shading
            if (sub > 0) {
                ctx.save(); ctx.globalAlpha = 0.13 * sub;
                ctx.fillStyle = C.blue; ctx.fillRect(X(-2.5), yT, X(-0.75) - X(-2.5), yB - yT);
                ctx.fillStyle = C.teal; ctx.fillRect(X(0.75), yT, X(2.5) - X(0.75), yB - yT);
                ctx.restore();
                u.text(ctx, 'subevent a', (X(-2.5) + X(-0.75)) / 2, yT - 8, { size: fs + 1, weight: '700', color: C.blue, align: 'center', alpha: sub });
                u.text(ctx, 'subevent c', (X(0.75) + X(2.5)) / 2, yT - 8, { size: fs + 1, weight: '700', color: C.teal, align: 'center', alpha: sub });
                u.text(ctx, 'gap', X(0), yT - 8, { size: fs, color: C.muted, align: 'center', alpha: sub });
            } else {
                u.text(ctx, 'whole detector, |η| < 2.5', W / 2, yT - 8, { size: fs + 1, weight: '700', color: C.navy, align: 'center' });
            }
            ctx.save(); ctx.strokeStyle = C.grid; ctx.strokeRect(X(-2.5) + 0.5, yT + 0.5, X(2.5) - X(-2.5), yB - yT); ctx.restore();
            // axis
            [-2.5, -0.75, 0, 0.75, 2.5].forEach(e => {
                u.line(ctx, [[X(e), yB], [X(e), yB + 4]], C.muted, 1);
                u.text(ctx, String(e), X(e), yB + 16, { size: fs - 1, color: C.muted, align: 'center' });
            });
            u.text(ctx, 'pseudorapidity η (angle along the beam)', W / 2, H - 8, { size: fs, color: C.muted, align: 'center' });
            const P = (i) => [X(s.pts[i].eta), Y(s.pts[i].y)];
            const arc = (i, j, col, a, w) => {
                const [xa, ya] = P(i), [xb, yb] = P(j);
                const lift = Math.min(60, Math.abs(xb - xa) * 0.35 + 10);
                ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = col; ctx.lineWidth = w;
                ctx.beginPath(); ctx.moveTo(xa, ya); ctx.quadraticCurveTo((xa + xb) / 2, Math.min(ya, yb) - lift, xb, yb); ctx.stroke(); ctx.restore();
            };
            // step 2: standard-method pairs
            const std = u.seg(t, 3.5, 4.3) * (1 - sub);
            if (std > 0) {
                s.stdPairs.forEach(([i, j]) => i !== j && arc(i, j, C.gray, 0.5 * std, 1.2));
                s.clusters.forEach(ids => { for (let a = 0; a < ids.length; a++) for (let b = a + 1; b < ids.length; b++) arc(ids[a], ids[b], C.orange, std, 2.6); });
                if (sub === 0) u.text(ctx, 'short-range pairs dominate', W / 2, yB - 8, { size: fs, weight: '700', color: C.orange, align: 'center', alpha: std });
            }
            if (sub > 0) {
                s.clusters.forEach(ids => { for (let a = 0; a < ids.length; a++) for (let b = a + 1; b < ids.length; b++) arc(ids[a], ids[b], C.orange, 0.15 * sub, 1.5); });
                s.longPairs.forEach(([i, j]) => arc(i, j, C.purple, 0.75 * sub, 1.8));
                u.text(ctx, 'only a–c pairs: long-range correlations survive', W / 2, yB - 8, { size: fs, weight: '700', color: C.purple, align: 'center', alpha: sub });
            }
            // particles
            s.pts.forEach((q) => {
                const inGap = Math.abs(q.eta) < 0.75;
                let col = q.cl >= 0 ? C.orange : C.navy;
                if (sub > 0.5) col = inGap ? C.gray : (q.cl >= 0 ? C.orange : (q.eta < 0 ? C.blue : C.teal));
                const a = sub > 0.5 && inGap ? 0.35 : 1;
                u.ball(ctx, X(q.eta), Y(q.y), 5, col, a);
            });
            if (t < 3.5) {
                const a = u.seg(t, 0.8, 1.6);
                s.clusters.forEach(ids => {
                    let mn = Infinity, mx = -Infinity, my = Infinity, My = -Infinity;
                    ids.forEach(i => { const [x, y] = P(i); mn = Math.min(mn, x); mx = Math.max(mx, x); my = Math.min(my, y); My = Math.max(My, y); });
                    ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = C.orange; ctx.setLineDash([3, 3]);
                    u.roundRect(ctx, mn - 9, my - 9, mx - mn + 18, My - my + 18, 8); ctx.stroke(); ctx.restore();
                });
                u.text(ctx, 'dashed boxes: bunches from one jet or decay', W / 2, yB - 8, { size: fs, color: C.orange, weight: '700', align: 'center', alpha: a });
            }
        }
    });

    // ------------------------------------------------------------------
    // 4. sources: event average from independent sources (few vs many)
    // ------------------------------------------------------------------
    register(SLUG + '-sources', {
        duration: 9,
        get aspect() { return mobileAspect(); },
        phases: [
            { t: 0, label: (s, p) => p.step1 || 'Step 1 · Each source emits particles with its own random average momentum (colour)' },
            { t: 3, label: (s, p) => p.step2 || 'Step 2 · The event average is the average over sources: new events keep coming' },
            { t: 6, label: (s, p) => p.step3 || 'Step 3 · With many sources the event averages scatter much less' }
        ],
        setup(p) { return { loop: 0, layout: {} }; },
        onLoop(s) { s.loop++; },
        draw(ctx, t, s, W, H, p) {
            const fs = fsz(W);
            const sides = [p.left || { n: 3, perSource: 6, title: 'Few sources', sub: '' }, p.right || { n: 30, perSource: 2, title: 'Many sources', sub: '' }];
            const ev = Math.floor(t / 1.5) + 6 * s.loop;
            const sourceVals = (side, e, n, spread) => {
                const r = u.rng(5000 + e * 7919 + side * 104729);
                const v = []; for (let i = 0; i < n; i++) v.push(u.clamp(u.gauss(r) * (spread || 1), -2.5, 2.5));
                return v;
            };
            const pos = (side, n) => {
                const key = side + ':' + n;
                if (!s.layout[key]) {
                    const r = u.rng(77 + side), out = [];
                    let guard = 0;
                    const minD = n <= 4 ? 0.55 : 0.2;
                    while (out.length < n && guard++ < 5000) {
                        const a = 2 * Math.PI * r(), rr = Math.sqrt(r()) * 0.85;
                        const q = [rr * Math.cos(a), rr * Math.sin(a)];
                        if (out.every(o => Math.hypot(o[0] - q[0], o[1] - q[1]) > minD)) out.push(q);
                    }
                    s.layout[key] = out;
                }
                return s.layout[key];
            };
            const col = (v) => {
                const x = u.clamp((v + 2) / 4, 0, 1);
                const r = Math.round(u.lerp(31, 200, x)), g = Math.round(u.lerp(95, 55, x)), b = Math.round(u.lerp(191, 45, x));
                return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);   // hex: u.ball needs it
            };
            sides.forEach((sd, side) => {
                const cx0 = side ? W * 0.75 : W * 0.25, hw = W * 0.25;
                const R = Math.min(hw * 0.62, H * 0.31), cy = 44 + R + (H - 100 - 2 * R) / 2;
                const vals = sourceVals(side, ev, sd.n, sd.spread);
                const P = pos(side, sd.n);
                const sr = sd.n <= 4 ? R * 0.26 : R * 0.1;
                const pulse = u.seg(t % 1.5, 0, 0.4);
                u.glow(ctx, cx0, cy, R * 1.25, 'rgba(232,113,10,0.10)');
                P.forEach((q, i) => {
                    const x = cx0 + q[0] * R, y = cy + q[1] * R;
                    const rr = u.rng(900 + i * 13 + side * 31 + ev * 3);
                    for (let k = 0; k < sd.perSource; k++) {
                        const a = 2 * Math.PI * rr(), d = sr * (1.1 + 0.9 * rr()) * (0.6 + 0.6 * pulse);
                        ctx.fillStyle = C.navy; ctx.globalAlpha = 0.65;
                        ctx.beginPath(); ctx.arc(x + d * Math.cos(a), y + d * Math.sin(a), 1.7, 0, 2 * Math.PI); ctx.fill();
                        ctx.globalAlpha = 1;
                    }
                    u.ball(ctx, x, y, sr, col(vals[i]));
                });
                u.text(ctx, sd.title, cx0, 18, { size: fs + 2, weight: '700', align: 'center' });
                if (sd.sub) u.text(ctx, sd.sub, cx0, 34, { size: fs - 1, color: C.muted, align: 'center' });
                // gauge
                const gy = H - 36, gx0 = cx0 - hw * 0.8, gx1 = cx0 + hw * 0.8;
                const G = (v) => cx0 + u.clamp(v / 1.6, -1, 1) * (gx1 - gx0) / 2;
                u.line(ctx, [[gx0, gy], [gx1, gy]], C.muted, 1.5);
                u.line(ctx, [[cx0, gy - 6], [cx0, gy + 6]], C.muted, 1);
                const showHist = t >= 3;
                const nh = showHist ? Math.min(12, 6 * s.loop + Math.floor(t / 1.5)) : 0;
                for (let j = 1; j <= nh; j++) {
                    const v = sourceVals(side, ev - j, sd.n, sd.spread);
                    const m = v.reduce((a, b) => a + b, 0) / v.length;
                    ctx.save(); ctx.globalAlpha = 0.25 + 0.5 * (1 - j / 13); ctx.fillStyle = C.purple;
                    ctx.fillRect(G(m) - 1.5, gy - 9, 3, 18); ctx.restore();
                }
                const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
                const tri = G(mean);
                ctx.save(); ctx.fillStyle = C.orange; ctx.beginPath(); ctx.moveTo(tri, gy - 4); ctx.lineTo(tri - 7, gy - 16); ctx.lineTo(tri + 7, gy - 16); ctx.closePath(); ctx.fill(); ctx.restore();
                u.text(ctx, 'event average [pT]: lower ← → higher', cx0, gy + 22, { size: fs - 1.5, color: C.muted, align: 'center' });
            });
            ctx.save(); ctx.strokeStyle = C.grid; ctx.beginPath(); ctx.moveTo(W / 2, 10); ctx.lineTo(W / 2, H - 10); ctx.stroke(); ctx.restore();
        }
    });
})();
