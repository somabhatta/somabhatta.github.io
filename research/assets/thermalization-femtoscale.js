/* Page-specific animations for research/thermalization-femtoscale.html
   (Samanta, Bhatta, Jia, Luzum, Ollitrault, PRC 109, L051902 (2024)).
   All panels are schematic cartoons, not data. */
(function () {
    'use strict';
    const { register, C, u } = window.Anim;
    const fsz = (W, s) => (W < 520 ? s * 0.8 : s);
    const PB_R = 6.62; // fm, Pb radius used in the paper's Fig. 2(b)

    // overlap area of two circles of radius R at distance d, as fraction of pi R^2
    function overlapFrac(d, R) {
        if (d >= 2 * R) return 0;
        const a = 2 * R * R * Math.acos(d / (2 * R)) - (d / 2) * Math.sqrt(4 * R * R - d * d);
        return a / (Math.PI * R * R);
    }

    // draw two nuclei (outlines) and their shaded overlap
    function drawNuclei(ctx, cx, cy, r, d, opt = {}) {
        const xa = cx - d / 2, xb = cx + d / 2;
        ctx.save();
        ctx.fillStyle = 'rgba(31,95,191,0.06)';
        ctx.beginPath(); ctx.arc(xa, cy, r, 0, 2 * Math.PI); ctx.fill();
        ctx.fillStyle = 'rgba(200,55,45,0.06)';
        ctx.beginPath(); ctx.arc(xb, cy, r, 0, 2 * Math.PI); ctx.fill();
        // overlap
        ctx.save();
        ctx.beginPath(); ctx.arc(xa, cy, r, 0, 2 * Math.PI); ctx.clip();
        ctx.beginPath(); ctx.arc(xb, cy, r, 0, 2 * Math.PI);
        ctx.fillStyle = opt.fill || 'rgba(232,113,10,0.35)';
        ctx.fill();
        ctx.restore();
        ctx.lineWidth = 2;
        ctx.strokeStyle = C.blue; ctx.beginPath(); ctx.arc(xa, cy, r, 0, 2 * Math.PI); ctx.stroke();
        ctx.strokeStyle = C.red; ctx.beginPath(); ctx.arc(xb, cy, r, 0, 2 * Math.PI); ctx.stroke();
        ctx.restore();
    }

    // ------------------------------------------------------------------
    // 1. Impact parameter b sets the overlap volume V
    // ------------------------------------------------------------------
    register('thermalization-femtoscale-overlap', {
        duration: 9,
        aspect: 16 / 8,
        phases: [
            { t: 0, label: 'Step 1 · Off-centre hit (large b): small overlap' },
            { t: 3, label: 'Step 2 · Smaller b: the overlap grows' },
            { t: 6, label: 'Step 3 · Head-on (b = 0): largest overlap, largest volume V' }
        ],
        setup() { return {}; },
        draw(ctx, t, s, W, H) {
            const bfm = t < 2 ? 10 : t < 4 ? u.lerp(10, 5, u.ease(u.seg(t, 2, 4))) : t < 5 ? 5 : u.lerp(5, 0, u.ease(u.seg(t, 5, 7)));
            const r = Math.min(H * 0.34, W * 0.16);
            const cx = W * 0.34, cy = H * 0.52;
            const d = bfm / PB_R * r;
            drawNuclei(ctx, cx, cy, r, d);
            u.text(ctx, 'V', cx, cy + 6, { size: fsz(W, 18), weight: '700', color: C.orange, align: 'center' });
            // b bracket between centres
            const yb = cy + r + 14;
            if (d > 6) {
                u.line(ctx, [[cx - d / 2, yb - 5], [cx - d / 2, yb + 5]], C.ink, 1.5);
                u.line(ctx, [[cx + d / 2, yb - 5], [cx + d / 2, yb + 5]], C.ink, 1.5);
                u.line(ctx, [[cx - d / 2, yb], [cx + d / 2, yb]], C.ink, 1.5);
            }
            u.text(ctx, 'b = ' + bfm.toFixed(1) + ' fm', cx, Math.min(yb + 20, H - 6), { size: fsz(W, 13), weight: '600', align: 'center' });
            u.text(ctx, 'view along the beam', cx, 18, { size: fsz(W, 11), color: C.muted, align: 'center' });
            // bar: overlap size
            const f = overlapFrac(bfm, PB_R);
            const bx = W * 0.66, bw = W * 0.26, by = H * 0.42, bh = Math.max(14, H * 0.1);
            u.text(ctx, 'overlap volume V', bx, by - 12, { size: fsz(W, 13), weight: '600' });
            ctx.save();
            ctx.fillStyle = C.grid; ctx.fillRect(bx, by, bw, bh);
            ctx.fillStyle = C.orange; ctx.fillRect(bx, by, bw * f, bh);
            ctx.restore();
            u.text(ctx, Math.round(100 * f) + '% of maximum', bx, by + bh + 18, { size: fsz(W, 12), color: C.muted });
            u.text(ctx, 'smaller b  ⇒  larger V', bx, by + bh + 40, { size: fsz(W, 12), weight: '600', color: C.ink });
        }
    });

    // ------------------------------------------------------------------
    // 2. Density sets the momentum per particle (two modes)
    //    mode 'fixedV': same b, different number of particles
    //    mode 'fixedN': same number of particles, different b
    // ------------------------------------------------------------------
    function sampleOverlap(rand, n, dfrac) {
        // points inside overlap of two unit circles at distance dfrac (in units of radius)
        const pts = [];
        const hx = 1 - dfrac / 2, hy = Math.sqrt(Math.max(1 - (dfrac / 2) ** 2, 0));
        let guard = 0;
        while (pts.length < n && guard++ < 20000) {
            const x = (2 * rand() - 1) * hx, y = (2 * rand() - 1) * hy;
            if ((x + dfrac / 2) ** 2 + y * y < 0.9 && (x - dfrac / 2) ** 2 + y * y < 0.9) {
                pts.push({ x, y, ph: rand() * 6.283, ph2: rand() * 6.283, a: Math.atan2(y, x + 1e-6) + (rand() - 0.5) * 0.6, v: 0.75 + 0.5 * rand() });
            }
        }
        return pts;
    }

    register('thermalization-femtoscale-density', {
        duration: 10,
        aspect: 16 / 8,
        phases: [
            { t: 0, label: (s, p) => p.mode === 'fixedV' ? 'Step 1 · Same b, same volume, but one event made more particles' : 'Step 1 · Two events with the same number of particles' },
            { t: 3, label: (s, p) => p.mode === 'fixedV' ? 'Step 2 · More particles in the same volume: higher density' : 'Step 2 · Larger b means a smaller volume: higher density' },
            { t: 6, label: 'Step 3 · Higher density = hotter fluid = more momentum per particle' }
        ],
        setup(p) {
            const rand = u.rng(p.mode === 'fixedV' ? 77 : 41);
            const L = p.mode === 'fixedV' ? { b: 4, n: 26 } : { b: 2.5, n: 36 };
            const R = p.mode === 'fixedV' ? { b: 4, n: 46 } : { b: 8, n: 36 };
            L.pts = sampleOverlap(rand, L.n, L.b / PB_R);
            R.pts = sampleOverlap(rand, R.n, R.b / PB_R);
            L.dens = L.n / overlapFrac(L.b, PB_R); R.dens = R.n / overlapFrac(R.b, PB_R);
            return { L, R };
        },
        draw(ctx, t, s, W, H, p) {
            const r = Math.min(H * 0.27, W * 0.14);
            const cy = H * 0.5;
            const heatOn = u.seg(t, 3, 4.5);
            const fly = u.ease(u.seg(t, 6.3, 9.6));
            const hi = s.R.dens > s.L.dens ? s.R : s.L;
            const panel = (cx, ev, title) => {
                const hot = ev === hi;
                const d = ev.b / PB_R * r;
                if (heatOn > 0) u.glow(ctx, cx, cy, r * 1.3, u.heat(hot ? 0.95 : 0.35, 0.7), heatOn * (1 - fly * 0.7));
                drawNuclei(ctx, cx, cy, r, d, { fill: 'rgba(232,113,10,0.18)' });
                const amp = heatOn * (hot ? 2.6 : 1.0), w = hot ? 14 : 6;
                ev.pts.forEach(q => {
                    const bx = cx + q.x * r, by = cy + q.y * r;
                    const jx = amp * Math.sin(w * t + q.ph), jy = amp * Math.cos(w * 1.13 * t + q.ph2);
                    const dist = fly * q.v * (hot ? 1.0 : 0.5) * W * 0.11;
                    const x = bx + jx + dist * Math.cos(q.a), y = by + jy + dist * Math.sin(q.a);
                    ctx.save(); ctx.globalAlpha = 1 - fly * 0.8;
                    ctx.fillStyle = C.navy; ctx.beginPath(); ctx.arc(x, y, W < 520 ? 1.8 : 2.4, 0, 2 * Math.PI); ctx.fill();
                    ctx.restore();
                });
                u.text(ctx, title, cx, 20, { size: fsz(W, 13), weight: '700', align: 'center' });
                u.text(ctx, 'N = ' + ev.n + ' particles · b = ' + ev.b + ' fm', cx, 38, { size: fsz(W, 11), color: C.muted, align: 'center' });
                if (t >= 3) u.text(ctx, 'density: ' + (hot ? 'higher' : 'lower'), cx, H - 30, { size: fsz(W, 12), weight: '600', color: hot ? C.red : C.blue, align: 'center', alpha: heatOn });
                if (t >= 6) u.text(ctx, 'momentum per particle: ' + (hot ? 'higher' : 'lower'), cx, H - 12, { size: fsz(W, 12), weight: '600', color: hot ? C.red : C.blue, align: 'center', alpha: u.seg(t, 6, 6.6) });
            };
            const fixedV = p.mode === 'fixedV';
            ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W / 2, H); ctx.clip();
            panel(W * 0.25, s.L, fixedV ? 'Event 1' : 'Small b (near head-on)');
            ctx.restore();
            ctx.save(); ctx.beginPath(); ctx.rect(W / 2, 0, W / 2, H); ctx.clip();
            panel(W * 0.75, s.R, fixedV ? 'Event 2: more particles' : 'Larger b (off-centre)');
            ctx.restore();
            u.line(ctx, [[W / 2, 12], [W / 2, H - 12]], C.grid, 1);
        }
    });

    // ------------------------------------------------------------------
    // 3. Tilted clouds for each b; slicing at fixed N
    // ------------------------------------------------------------------
    register('thermalization-femtoscale-ellipses', {
        duration: 13,
        aspect: 16 / 9,
        phases: [
            { t: 0, label: 'Step 1 · Each b gives a tilted cloud: more particles, more momentum' },
            { t: 4.5, label: 'Step 2 · At fixed N, clouds from two values of b overlap: extra spread' },
            { t: 9, label: 'Step 3 · Beyond the knee only b ≈ 0 is left: the spread shrinks' }
        ],
        setup() {
            const rand = u.rng(2024);
            const classes = [
                { xc: 0.16, lab: 'large b', col: C.purple },
                { xc: 0.38, lab: 'medium b', col: C.teal },
                { xc: 0.60, lab: 'small b', col: C.blue },
                { xc: 0.80, lab: 'b ≈ 0', col: C.orange }
            ];
            const k = 1.1, sx = 0.07, sy = 0.032;
            classes.forEach(c => {
                c.pts = [];
                for (let i = 0; i < 260; i++) {
                    const dx = sx * u.gauss(rand);
                    c.pts.push({ x: c.xc + dx, y: k * dx + sy * u.gauss(rand), d: rand() });
                }
            });
            return { classes };
        },
        draw(ctx, t, s, W, H) {
            const small = W < 520;
            const box = { x: small ? 30 : 44, y: 26, w: W - (small ? 44 : 70), h: H - (small ? 62 : 72) };
            const A = u.axes(ctx, box, [0, 1], [-0.26, 0.26], { xticks: false, yticks: false, xlabel: 'number of particles N →', ylabel: 'momentum per particle' });
            // knee
            const kx = A.X(0.80);
            ctx.save(); ctx.strokeStyle = C.gray; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(kx, box.y); ctx.lineTo(kx, box.y + box.h); ctx.stroke(); ctx.restore();
            u.text(ctx, 'knee', kx + 4, box.y + box.h - 6, { size: fsz(W, 11), color: C.muted });
            // dots appear class by class
            s.classes.forEach((c, ci) => {
                const shown = u.seg(t, 0.3 + ci * 0.9, 1.3 + ci * 0.9);
                c.pts.forEach(q => {
                    if (q.d > shown || q.x < 0 || q.x > 1) return;
                    ctx.save(); ctx.globalAlpha = 0.55; ctx.fillStyle = c.col;
                    ctx.beginPath(); ctx.arc(A.X(q.x), A.Y(q.y), small ? 1.4 : 2, 0, 2 * Math.PI); ctx.fill(); ctx.restore();
                });
                if (shown > 0) u.text(ctx, c.lab, A.X(c.xc), box.y + 14, { size: fsz(W, 11), weight: '700', color: c.col, align: 'center', alpha: shown });
            });
            // slice
            if (t >= 4.5) {
                const sxc = t < 9 ? 0.49 : u.lerp(0.49, 0.91, u.ease(u.seg(t, 9, 10.2)));
                const hw = 0.035;
                ctx.save(); ctx.fillStyle = 'rgba(29,43,58,0.10)';
                ctx.fillRect(A.X(sxc - hw), box.y, A.X(sxc + hw) - A.X(sxc - hw), box.h); ctx.restore();
                // spread of dots inside slice
                let n = 0, m = 0, m2 = 0;
                s.classes.forEach(c => c.pts.forEach(q => { if (Math.abs(q.x - sxc) < hw) { n++; m += q.y; m2 += q.y * q.y; } }));
                if (n > 5) {
                    m /= n; const sd = Math.sqrt(Math.max(m2 / n - m * m, 0));
                    const xb = A.X(sxc + hw) + 6;
                    const a = u.seg(t, 4.8, 5.6);
                    ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = C.red; ctx.lineWidth = 2.5;
                    ctx.beginPath(); ctx.moveTo(xb, A.Y(m + sd)); ctx.lineTo(xb, A.Y(m - sd));
                    ctx.moveTo(xb - 4, A.Y(m + sd)); ctx.lineTo(xb + 4, A.Y(m + sd));
                    ctx.moveTo(xb - 4, A.Y(m - sd)); ctx.lineTo(xb + 4, A.Y(m - sd)); ctx.stroke(); ctx.restore();
                    const ly = A.Y(m + sd) - 8, lx = Math.min(xb, box.x + box.w - 30);
                    ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fillRect(lx - 26, ly - 13, 52, 17); ctx.restore();
                    u.text(ctx, 'spread', lx, ly, { size: fsz(W, 12), weight: '700', color: C.red, align: 'center', alpha: a });
                }
                u.text(ctx, 'fixed N', A.X(sxc), box.y + box.h - 8, { size: fsz(W, 11), weight: '600', color: C.ink, align: 'center' });
            }
        }
    });

    // ------------------------------------------------------------------
    // 4. Variance = intrinsic + b-fluctuation term
    // ------------------------------------------------------------------
    register('thermalization-femtoscale-variance', {
        duration: 10,
        aspect: 16 / 9,
        phases: [
            { t: 0, label: 'Step 1 · Intrinsic spread: present even at fixed b' },
            { t: 3, label: 'Step 2 · Spread from b varying at fixed N: vanishes past the knee' },
            { t: 6, label: 'Step 3 · Their sum drops steeply at the knee, as ATLAS sees' }
        ],
        setup() { return {}; },
        draw(ctx, t, s, W, H) {
            const small = W < 520;
            const box = { x: small ? 30 : 44, y: 22, w: W - (small ? 44 : 70), h: H - (small ? 60 : 70) };
            const A = u.axes(ctx, box, [0, 1], [0, 1.05], { xticks: false, yticks: false, xlabel: 'number of particles N →', ylabel: 'variance of [pT]' });
            const knee = 0.78;
            const intr = (x) => 0.2 + 0.32 * Math.exp(-2.6 * x);
            const geo = (x) => (0.12 + 0.3 * Math.exp(-2.2 * x)) / (1 + Math.exp((x - knee) / 0.035));
            const kx = A.X(knee);
            ctx.save(); ctx.strokeStyle = C.gray; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(kx, box.y); ctx.lineTo(kx, box.y + box.h); ctx.stroke(); ctx.restore();
            u.text(ctx, 'knee', kx + 4, box.y + 14, { size: fsz(W, 11), color: C.muted });
            const curve = (f, prog) => { const o = []; for (let i = 0; i <= 120 * prog; i++) { const x = i / 120; o.push([A.X(x), A.Y(f(x))]); } return o; };
            const p1 = u.seg(t, 0.2, 2.6), p2 = u.seg(t, 3.2, 5.6), p3 = u.seg(t, 6.2, 8.6);
            if (p1 > 0) u.line(ctx, curve(intr, p1), C.blue, 2.5, [7, 5]);
            if (p2 > 0) u.line(ctx, curve(geo, p2), C.teal, 2.5, [9, 4, 2, 4]);
            if (p3 > 0) u.line(ctx, curve(x => intr(x) + geo(x), p3), C.red, 3);
            const lx = A.X(0.03);
            if (p1 > 0.5) u.text(ctx, 'intrinsic', A.X(0.3), A.Y(intr(0.3)) - 8, { size: fsz(W, 12), weight: '700', color: C.blue });
            if (p2 > 0.5) u.text(ctx, 'from b fluctuations', A.X(0.42), A.Y(geo(0.42)) + 22, { size: fsz(W, 12), weight: '700', color: C.teal });
            if (p3 > 0.3) u.text(ctx, 'total', lx, A.Y(intr(0.03) + geo(0.03)) - 8, { size: fsz(W, 12), weight: '700', color: C.red });
            if (t > 8.6) {
                const a = u.seg(t, 8.6, 9.2);
                ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = C.red; ctx.lineWidth = 2;
                ctx.beginPath(); ctx.ellipse(kx, A.Y(intr(knee) + geo(knee)), small ? 24 : 40, small ? 18 : 28, 0, 0, 2 * Math.PI); ctx.stroke(); ctx.restore();
                u.text(ctx, 'steep drop', kx + (small ? 20 : 34), A.Y(intr(knee) + geo(knee)) - (small ? 20 : 30), { size: fsz(W, 12), weight: '700', color: C.red, align: 'left', alpha: a });
            }
        }
    });
})();
