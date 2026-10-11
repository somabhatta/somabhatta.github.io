/* Page-specific animations for research/nuclear-shape-fluctuations.html
   (Dimri, Bhatta, Jia, Eur. Phys. J. A 59, 45 (2023)).
   All panels are schematic cartoons, not results of the paper. */
(function () {
    'use strict';
    const { register, glauber, C, u } = window.Anim;
    const DEG = Math.PI / 180;
    const EXAG = 1.4;               // shapes drawn with exaggerated deformation
    const K5 = Math.sqrt(5 / (4 * Math.PI));
    const COL = { rigid: C.blue, soft: C.teal, pro: C.blue, tri: C.gold, obl: C.purple };

    // semi-axes of a quadrupole-deformed nucleus (x, y, z), R0 = 1
    function axes(beta, gamma) {
        return [1 + K5 * beta * Math.cos(gamma - 2 * Math.PI / 3),
                1 + K5 * beta * Math.cos(gamma + 2 * Math.PI / 3),
                1 + K5 * beta * Math.cos(gamma)];
    }
    function mul(A, B) {
        const o = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
        for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) for (let k = 0; k < 3; k++) o[i][j] += A[i][k] * B[k][j];
        return o;
    }
    const rotX = (a) => [[1, 0, 0], [0, Math.cos(a), -Math.sin(a)], [0, Math.sin(a), Math.cos(a)]];
    const rotY = (a) => [[Math.cos(a), 0, Math.sin(a)], [0, 1, 0], [-Math.sin(a), 0, Math.cos(a)]];
    const BASE = [[0, 0, 1], [1, 0, 0], [0, 1, 0]];   // body z (long axis) -> screen x
    // 2x2 projected second-moment block of M diag(a^2) M^T
    function proj(ax, M) {
        let p = 0, q = 0, r = 0;
        for (let k = 0; k < 3; k++) {
            const a2 = ax[k] * ax[k];
            p += M[0][k] * M[0][k] * a2; q += M[1][k] * M[1][k] * a2; r += M[0][k] * M[1][k] * a2;
        }
        return { p, q, r };
    }
    function ellipseOf(P) {
        const m = (P.p + P.q) / 2, d = Math.sqrt(((P.p - P.q) / 2) ** 2 + P.r * P.r);
        return { a: Math.sqrt(m + d), b: Math.sqrt(Math.max(m - d, 1e-9)), ang: 0.5 * Math.atan2(2 * P.r, P.p - P.q) };
    }
    // shaded ellipsoid silhouette
    function drawBody(ctx, cx, cy, s, ax, M, color, alpha = 1) {
        const e = ellipseOf(proj(ax, M));
        ctx.save();
        ctx.globalAlpha *= alpha;
        ctx.translate(cx, cy); ctx.rotate(-e.ang); ctx.scale(e.a * s, e.b * s);
        const g = ctx.createRadialGradient(-0.35, -0.4, 0.05, 0, 0, 1);
        g.addColorStop(0, '#ffffff'); g.addColorStop(0.45, color); g.addColorStop(1, u.shade(color, -0.4));
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(0, 0, 1, 0, 2 * Math.PI); ctx.fill();
        ctx.restore();
    }
    function outline(ctx, cx, cy, s, e, color, width = 2, fill) {
        ctx.save();
        ctx.translate(cx, cy); ctx.rotate(-e.ang); ctx.scale(e.a * s, e.b * s);
        ctx.beginPath(); ctx.arc(0, 0, 1, 0, 2 * Math.PI);
        ctx.restore();
        if (fill) { ctx.fillStyle = fill; ctx.fill(); }
        ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke();
    }
    const viewM = (spin, tilt = 0.35) => mul(rotX(tilt), mul(rotY(spin), BASE));

    // ------------------------------------------------------------------
    // 1. Rigid versus fluctuating (soft) nucleus, with a (beta, gamma) map
    // ------------------------------------------------------------------
    function softShape(t) {
        const b = 0.28 + 0.09 * Math.sin(1.7 * t) + 0.04 * Math.sin(4.3 * t + 1);
        const g = (22 + 16 * Math.sin(1.1 * t + 0.5) + 6 * Math.sin(3.7 * t)) * DEG;
        return { b, g };
    }
    function drawWedge(ctx, ox, oy, S) {
        ctx.save();
        ctx.strokeStyle = C.grid; ctx.lineWidth = 1;
        [0.1, 0.2, 0.3, 0.4].forEach(bv => {
            ctx.beginPath(); ctx.arc(ox, oy, bv * S, -60 * DEG, 0); ctx.stroke();
        });
        ctx.strokeStyle = C.gray;
        [0, 30, 60].forEach(gd => {
            ctx.setLineDash(gd === 30 ? [4, 4] : []);
            ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ox + 0.45 * S * Math.cos(gd * DEG), oy - 0.45 * S * Math.sin(gd * DEG)); ctx.stroke();
        });
        ctx.restore();
        u.text(ctx, 'prolate (γ = 0°)', ox + 0.45 * S, oy + 16, { size: 11, color: C.muted, align: 'right' });
        u.text(ctx, 'triaxial', ox + 0.47 * S * Math.cos(30 * DEG), oy - 0.47 * S * Math.sin(30 * DEG), { size: 11, color: C.muted });
        u.text(ctx, 'oblate (γ = 60°)', ox + 0.46 * S * Math.cos(60 * DEG), oy - 0.46 * S * Math.sin(60 * DEG) - 4, { size: 11, color: C.muted, align: 'center' });
        u.text(ctx, 'β →', ox + 0.2 * S, oy + 16, { size: 11, color: C.muted, align: 'center' });
    }
    const wp = (ox, oy, S, b, g) => [ox + b * S * Math.cos(g), oy - b * S * Math.sin(g)];

    register('nuclear-shape-fluctuations-wobble', {
        duration: 12,
        aspect: 16 / 8,
        phases: [
            { t: 0, label: 'Step 1 · A rigid deformed nucleus: one fixed shape, only its orientation changes' },
            { t: 4, label: 'Step 2 · A soft nucleus: the shape itself wobbles, in size (β) and in type (γ)' },
            { t: 8, label: 'Step 3 · Its ground state is a spread of shapes: a cloud of points in the (β, γ) map' }
        ],
        setup() {
            const rand = u.rng(11), cloud = [];
            for (let i = 0; i < 260; i++) {
                let g = (22 + 13 * u.gauss(rand)) * DEG;
                g = Math.abs(g); if (g > 60 * DEG) g = 120 * DEG - g;
                cloud.push([0.28 + 0.07 * u.gauss(rand), g]);
            }
            return { cloud };
        },
        draw(ctx, t, s, W, H) {
            const spin = t * 2 * Math.PI / 6;
            const r = H * 0.19, y0 = H * 0.52;
            const xa = W * 0.15, xb = W * 0.42;
            const softA = t < 4 ? 0.25 : 1;
            const sh = t < 4 ? { b: 0.28, g: 0 } : softShape(t);
            u.glow(ctx, xa, y0, r * 1.7, 'rgba(31,95,191,0.08)');
            drawBody(ctx, xa, y0, r, axes(0.28 * EXAG, 0), viewM(spin), COL.rigid);
            u.glow(ctx, xb, y0, r * 1.7, 'rgba(7,109,120,0.08)', softA);
            drawBody(ctx, xb, y0, r, axes(sh.b * EXAG, sh.g), viewM(spin), COL.soft, softA);
            u.text(ctx, 'Rigid nucleus', xa, H * 0.12, { size: 14, weight: '700', align: 'center', color: COL.rigid });
            u.text(ctx, 'β = 0.28, γ = 0° always', xa, H * 0.12 + 18, { size: 11, color: C.muted, align: 'center' });
            u.text(ctx, 'Soft nucleus', xb, H * 0.12, { size: 14, weight: '700', align: 'center', color: COL.soft, alpha: softA });
            u.text(ctx, t < 4 ? '' : `now β = ${sh.b.toFixed(2)}, γ = ${Math.round(sh.g / DEG)}°`, xb, H * 0.12 + 18, { size: 11, color: C.muted, align: 'center' });
            u.text(ctx, 'schematic · deformation exaggerated', W * 0.31, H - 12, { size: 10, color: C.gray, align: 'center' });
            // (beta, gamma) map
            const S = W * 0.58, ox = W * 0.64, oy = H * 0.82;
            u.text(ctx, 'Shape map (β, γ)', ox, H * 0.12, { size: 13, weight: '600' });
            drawWedge(ctx, ox, oy, S);
            if (t >= 8) {
                const n = Math.floor(s.cloud.length * u.seg(t, 8, 10.5));
                for (let i = 0; i < n; i++) {
                    const p = wp(ox, oy, S, s.cloud[i][0], s.cloud[i][1]);
                    ctx.fillStyle = 'rgba(7,109,120,0.28)';
                    ctx.beginPath(); ctx.arc(p[0], p[1], 2.2, 0, 2 * Math.PI); ctx.fill();
                }
            }
            if (t >= 4) {
                const pts = [];
                for (let tt = Math.max(4, t - 3); tt <= t; tt += 0.05) { const q = softShape(tt); pts.push(wp(ox, oy, S, q.b, q.g)); }
                u.line(ctx, pts, 'rgba(7,109,120,0.55)', 1.5);
                const p = wp(ox, oy, S, sh.b, sh.g);
                u.ball(ctx, p[0], p[1], 6, COL.soft);
            }
            const pr = wp(ox, oy, S, 0.28, 0);
            u.ball(ctx, pr[0], pr[1] - 1, 6, COL.rigid);
        }
    });

    // ------------------------------------------------------------------
    // 2. Each collision freezes one snapshot -> event-by-event spread of eps2
    // ------------------------------------------------------------------
    function eventSample(rand, beta, sigB) {
        const one = () => {
            const b = beta + sigB * u.gauss(rand);
            const M = glauber.randomRotation(rand);
            const ax = axes(b, 0);
            return { b, M, P: proj(ax, M) };
        };
        const A = one(), B = one();
        const sxx = (A.P.p + B.P.p) / 2, syy = (A.P.q + B.P.q) / 2, sxy = (A.P.r + B.P.r) / 2;
        // eccentricity of the overlap + small nucleon-position noise
        let ex = (sxx - syy) / (sxx + syy) + 0.035 * u.gauss(rand);
        let ey = 2 * sxy / (sxx + syy) + 0.035 * u.gauss(rand);
        const dperp = 1 / Math.sqrt(sxx + syy) * (1 + 0.006 * u.gauss(rand));
        return { A, B, eps: Math.hypot(ex, ey), dperp, P: { p: sxx, q: syy, r: sxy } };
    }
    register('nuclear-shape-fluctuations-snapshot', {
        duration: 14,
        aspect: 16 / 9,
        phases: [
            { t: 0, label: 'Step 1 · Each head-on collision freezes one snapshot: the shapes and orientations of both nuclei' },
            { t: 3, label: 'Step 2 · Many collisions: each adds one value of the eccentricity ε₂ to the histogram' },
            { t: 10, label: 'Step 3 · Same average β, but the soft nuclei give a wider spread: larger ⟨ε₂²⟩ and size fluctuations' }
        ],
        setup() {
            const N = 2000, r1 = u.rng(5), r2 = u.rng(9);
            const rows = [{ ev: [], beta: 0.28, sig: 0, name: 'Rigid: β = 0.28 every time', col: COL.rigid },
                          { ev: [], beta: 0.28, sig: 0.15, name: 'Soft: β̄ = 0.28, spread σβ = 0.15', col: COL.soft }];
            for (let i = 0; i < N; i++) { rows[0].ev.push(eventSample(r1, 0.28, 0)); rows[1].ev.push(eventSample(r2, 0.28, 0.15)); }
            // reference size for delta d/d
            rows.forEach(rw => { rw.dm = rw.ev.reduce((a, e) => a + e.dperp, 0) / N; });
            const dref = (rows[0].dm + rows[1].dm) / 2;
            rows.forEach(rw => rw.ev.forEach(e => { e.dd = e.dperp / dref - 1; }));
            return { rows, N };
        },
        draw(ctx, t, s, W, H) {
            const n = t < 3 ? Math.floor(t / 0.75) + 1 : Math.min(s.N, Math.floor(5 + 40 * (t - 3) ** 2));
            const rowH = (H - 40) / 2;
            s.rows.forEach((rw, k) => {
                const y0 = 18 + k * rowH, cy = y0 + rowH / 2;
                const e = rw.ev[n - 1];
                // event cartoon: beam view (shapes exaggerated for display)
                const cx = W * 0.14, sc = rowH * 0.25, X2 = 2.2;
                const PA = proj(axes(e.A.b * X2, 0), e.A.M), PB = proj(axes(e.B.b * X2, 0), e.B.M);
                const eA = ellipseOf(PA), eB = ellipseOf(PB);
                const ov = ellipseOf({ p: (PA.p + PB.p) / 2, q: (PA.q + PB.q) / 2, r: (PA.r + PB.r) / 2 });
                outline(ctx, cx, cy, sc * 0.8, ov, 'rgba(0,0,0,0)', 0.1, 'rgba(232,140,40,0.30)');
                outline(ctx, cx, cy, sc, eA, C.blue, 1.5);
                outline(ctx, cx, cy, sc, eB, C.teal, 1.5);
                outline(ctx, cx, cy, sc * 0.8, ov, C.orange, 2.5);
                u.text(ctx, `β = ${e.A.b.toFixed(2)} and ${e.B.b.toFixed(2)}`, cx, y0 + rowH - 10, { size: 11, color: C.muted, align: 'center' });
                u.text(ctx, `ε₂ = ${e.eps.toFixed(2)}`, cx + sc * 1.6, cy - sc * 0.9, { size: 12, weight: '700', color: C.orange });
                // histogram
                const box = { x: W * 0.36, y: y0 + 26, w: W * 0.6, h: rowH - 64 };
                const nb = 32, xmax = 0.4, hist = new Array(nb).fill(0);
                let s2 = 0, d2 = 0;
                for (let i = 0; i < n; i++) {
                    const v = rw.ev[i].eps; s2 += v * v; d2 += rw.ev[i].dd ** 2;
                    const bi = Math.floor(v / xmax * nb); if (bi >= 0 && bi < nb) hist[bi]++;
                }
                const mx = Math.max(4, ...hist);
                const { X, Y } = u.axes(ctx, box, [0, xmax], [0, 1], { yticks: false, xticks: k === 1 ? undefined : false, xlabel: k === 1 ? 'eccentricity ε₂ of the overlap (one value per collision)' : undefined });
                ctx.fillStyle = rw.col; ctx.globalAlpha = 0.75;
                hist.forEach((c, i) => { const h = c / mx; ctx.fillRect(X(i * xmax / nb) + 1, Y(h), box.w / nb - 2, Y(0) - Y(h)); });
                ctx.globalAlpha = 1;
                u.text(ctx, rw.name, box.x, y0 + 18, { size: 13, weight: '700', color: rw.col });
                const rms = Math.sqrt(s2 / n), rd = Math.sqrt(d2 / n);
                u.text(ctx, `${n} collisions`, box.x + box.w - 6, box.y + 16, { size: 11, color: C.muted, align: 'right' });
                if (t >= 3) {
                    u.text(ctx, `spread of ε₂ (rms) = ${rms.toFixed(3)}`, box.x + box.w - 6, box.y + 32, { size: 11, color: C.ink, align: 'right' });
                    u.text(ctx, `size spread δd⊥/d⊥ (rms) = ${rd.toFixed(3)}`, box.x + box.w - 6, box.y + 47, { size: 11, color: C.ink, align: 'right' });
                    u.line(ctx, [[X(rms), box.y], [X(rms), box.y + box.h]], rw.col, 1.5, [4, 3]);
                }
            });
            u.text(ctx, 'schematic toy model · shapes exaggerated', W * 0.14, H - 6, { size: 10, color: C.gray, align: 'center' });
        }
    });

    // ------------------------------------------------------------------
    // 3. gamma fluctuations wash out the prolate-oblate difference
    // ------------------------------------------------------------------
    register('nuclear-shape-fluctuations-gamma', {
        duration: 12,
        aspect: 16 / 9,
        phases: [
            { t: 0, label: 'Step 1 · Rigid shapes: prolate and oblate give opposite triaxiality signals' },
            { t: 2, label: 'Step 2 · Let γ fluctuate more and more: both signals shrink toward the triaxial value' },
            { t: 9, label: 'Step 3 · Large γ fluctuations: prolate and oblate look like a rigid triaxial nucleus' }
        ],
        setup() { return {}; },
        draw(ctx, t, s, W, H) {
            const sigMax = 60 * DEG;
            const sig = sigMax * u.ease(u.seg(t, 2, 9));
            const cases = [{ g: 0, name: 'prolate (γ̄ = 0°)', col: COL.pro, ph: 0 },
                           { g: 30 * DEG, name: 'triaxial (γ̄ = 30°)', col: COL.tri, ph: 2.1 },
                           { g: 60 * DEG, name: 'oblate (γ̄ = 60°)', col: COL.obl, ph: 4.2 }];
            // shapes row
            const r = H * 0.08;
            cases.forEach((c, i) => {
                const cx = W * (0.1 + 0.155 * i), cy = H * 0.3;
                const g = c.g + sig * Math.sin(3.3 * t + c.ph);
                drawBody(ctx, cx, cy, r, axes(0.28 * EXAG, g), viewM(0.6 + 0.3 * Math.sin(t), 0.5), c.col);
                const nm = c.name.split(' (');
                u.text(ctx, nm[0], cx, cy + r * 1.9, { size: 12, weight: '700', color: c.col, align: 'center' });
                u.text(ctx, '(' + nm[1], cx, cy + r * 1.9 + 16, { size: 11, color: c.col, align: 'center' });
            });
            u.text(ctx, `γ fluctuation σγ = ${Math.round(sig / DEG)}°`, W * 0.255, H * 0.66, { size: 14, weight: '700', align: 'center' });
            u.text(ctx, 'β = 0.28 fixed · shapes exaggerated', W * 0.255, H * 0.66 + 18, { size: 11, color: C.muted, align: 'center' });
            // signal plot
            const box = { x: W * 0.6, y: H * 0.1, w: W * 0.36, h: H * 0.68 };
            const { X, Y } = u.axes(ctx, box, [0, 60], [-1.15, 1.15], { zero: true, xticks: [0, 20, 40, 60], yticks: false, xlabel: 'σγ (degrees)', ylabel: 'triaxiality signal' });
            u.text(ctx, '+', box.x - 18, Y(1) + 4, { size: 12, color: C.muted, align: 'center' });
            u.text(ctx, '−', box.x - 18, Y(-1) + 4, { size: 12, color: C.muted, align: 'center' });
            const sd = sig / DEG;
            cases.forEach(c => {
                const f = (x) => Math.exp(-4.5 * (x * DEG) ** 2) * Math.cos(3 * c.g);
                const pts = [];
                for (let x = 0; x <= sd + 1e-6; x += 0.5) pts.push([X(x), Y(f(x))]);
                if (pts.length > 1) u.line(ctx, pts, c.col, 2.5);
                u.ball(ctx, X(sd), Y(f(sd)), 6, c.col);
            });
            if (sd >= 20) {
                const yv = Math.exp(-4.5 * (20 * DEG) ** 2);
                u.line(ctx, [[X(20), Y(1)], [X(20), Y(yv)]], C.red, 1.5, [3, 3]);
                u.text(ctx, '20°: about 40% smaller', X(20) + 6, Y(0.9), { size: 11, weight: '600', color: C.red });
            }
            u.text(ctx, 'schematic: e^(−9σγ²/2) · cos 3γ̄', box.x + box.w, box.y + box.h + 46, { size: 10, color: C.gray, align: 'right' });
        }
    });

    // ------------------------------------------------------------------
    // 4. Separating the mean and the spread of beta
    // ------------------------------------------------------------------
    register('nuclear-shape-fluctuations-separate', {
        duration: 14,
        aspect: 16 / 9,
        phases: [
            { t: 0, label: 'Step 1 · Two-particle ⟨ε₂²⟩ sees only β̄² + σβ²: these two nuclei look identical' },
            { t: 4.5, label: 'Step 2 · Four-particle c₂{4}: negative for the rigid nucleus, positive once β fluctuates' },
            { t: 9, label: 'Step 3 · Combine them: ⟨ε₂⁴⟩ − 2.54⟨ε₂²⟩² tracks β̄ alone; then ⟨ε₂²⟩ gives σβ' }
        ],
        setup() { return {}; },
        draw(ctx, t, s, W, H) {
            const rows = [{ name: 'Rigid', mean: 0.28, sig: 0, col: COL.rigid },
                          { name: 'Soft', mean: 0.20, sig: 0.196, col: COL.soft }];
            const rowH = H * 0.42;
            rows.forEach((rw, k) => {
                const y0 = H * 0.06 + k * (rowH + H * 0.04), cy = y0 + rowH / 2;
                const b = rw.mean + rw.sig * (0.8 * Math.sin(2.1 * t + k) + 0.2 * Math.sin(5.3 * t));
                drawBody(ctx, W * 0.08, cy, rowH * 0.26, axes(b * EXAG, 0), viewM(t * 0.9, 0.3), rw.col);
                u.text(ctx, rw.name, W * 0.08, y0 + 14, { size: 13, weight: '700', color: rw.col, align: 'center' });
                // beta distribution
                const box = { x: W * 0.17, y: y0 + 20, w: W * 0.22, h: rowH - 52 };
                const { X, Y } = u.axes(ctx, box, [-0.2, 0.7], [0, 1.1], { yticks: false, xticks: k === 1 ? [0, 0.2, 0.4, 0.6] : false, xlabel: k === 1 ? 'β' : undefined });
                if (rw.sig === 0) {
                    ctx.fillStyle = rw.col; ctx.fillRect(X(rw.mean) - 2, Y(1), 4, Y(0) - Y(1));
                } else {
                    const pts = [];
                    for (let x = -0.2; x <= 0.7; x += 0.01) pts.push([X(x), Y(Math.exp(-0.5 * ((x - rw.mean) / rw.sig) ** 2))]);
                    u.line(ctx, pts, rw.col, 2.5);
                }
                u.text(ctx, rw.sig === 0 ? 'β̄ = 0.28, σβ = 0' : 'β̄ = 0.20, σβ = 0.20', box.x, box.y - 6, { size: 11, color: C.muted });
            });
            // right side: three measurements, revealed in turn
            const cols = [{ x: W * 0.47, title: 'two-particle', sub: '⟨ε₂²⟩', from: 0 },
                          { x: W * 0.64, title: 'four-particle', sub: 'c₂{4}', from: 4.5 },
                          { x: W * 0.81, title: 'combined', sub: 'β̄ and σβ', from: 9 }];
            const top = H * 0.1, bh = H * 0.62, mid = top + bh / 2;
            cols.forEach((c, i) => {
                const a = u.seg(t, c.from, c.from + 0.8);
                if (a <= 0) return;
                ctx.save(); ctx.globalAlpha = a;
                u.text(ctx, c.title, c.x + W * 0.07, top - 8, { size: 12, weight: '600', align: 'center' });
                u.text(ctx, c.sub, c.x + W * 0.07, top + 10, { size: 12, color: C.muted, align: 'center' });
                ctx.restore();
            });
            const grow = (from) => u.ease(u.seg(t, from + 0.3, from + 1.8));
            const bw = W * 0.05;
            // two-particle: equal positive bars
            let g = grow(0);
            rows.forEach((rw, k) => {
                const x = cols[0].x + W * 0.015 + k * (bw + W * 0.01), hgt = bh * 0.4 * g;
                ctx.fillStyle = rw.col; ctx.fillRect(x, mid - hgt, bw, hgt);
            });
            u.line(ctx, [[cols[0].x, mid], [cols[0].x + W * 0.14, mid]], C.gray, 1);
            if (t > 2) u.text(ctx, 'equal', cols[0].x + W * 0.07, mid + 20, { size: 12, weight: '700', color: C.red, align: 'center' });
            // four-particle: opposite signs
            if (t >= 4.5) {
                g = grow(4.5);
                const vals = [-0.17, 0.36];
                rows.forEach((rw, k) => {
                    const x = cols[1].x + W * 0.015 + k * (bw + W * 0.01), hgt = bh * vals[k] * g;
                    ctx.fillStyle = rw.col; ctx.fillRect(x, Math.min(mid, mid - hgt), bw, Math.abs(hgt));
                });
                u.line(ctx, [[cols[1].x, mid], [cols[1].x + W * 0.14, mid]], C.gray, 1);
                u.text(ctx, '0', cols[1].x - 4, mid + 4, { size: 10, color: C.muted, align: 'right' });
                if (t > 6.5) u.text(ctx, 'different', cols[1].x + W * 0.07, mid + bh * 0.28, { size: 12, weight: '700', color: C.red, align: 'center' });
            }
            // combined: read-outs
            if (t >= 9) {
                const a = u.seg(t, 9.6, 10.6), a2 = u.seg(t, 11, 12);
                rows.forEach((rw, k) => {
                    const y = top + bh * (0.3 + 0.32 * k);
                    ctx.save(); ctx.globalAlpha = a;
                    u.text(ctx, rw.name + ':', cols[2].x, y, { size: 12, weight: '700', color: rw.col });
                    u.text(ctx, `β̄ ≈ ${rw.mean.toFixed(2)}`, cols[2].x, y + 18, { size: 12, color: C.ink });
                    ctx.globalAlpha = a2;
                    u.text(ctx, `σβ ≈ ${rw.sig.toFixed(2)}`, cols[2].x, y + 36, { size: 12, color: C.ink });
                    ctx.restore();
                });
            }
            u.text(ctx, 'schematic · signs from the leading-order estimates in the paper', W * 0.97, H - 10, { size: 10, color: C.gray, align: 'right' });
        }
    });
})();
