/* Page-specific animations for research/radial-flow-shape.html
   (Bhatta, Dimri, Jia, arXiv:2504.20008). All panels are schematic toys,
   not results of the paper. Loaded after anim.js. */
(function () {
    'use strict';
    const { register, C, u } = window.Anim;

    // ---- toy model shared by all panels ----
    // average spectrum n(pT) ∝ pT exp(-pT/T) with T = 0.5 GeV  →  <pT> = 1 GeV
    const T0 = 0.5;
    const spec = (p, T) => p * Math.exp(-p / T) / (T * T);
    // schematic v0(pT): negative at low pT, zero at <pT> = 1 GeV, peak near 3.8 GeV
    const v0 = (p) => (p - 1) * Math.exp(-p / 2.8);
    const dv0 = (p) => Math.exp(-p / 2.8) * (1 - (p - 1) / 2.8);
    // mean pT of the toy spectrum above a lower cut a (closed form)
    const meanAbove = (a) => (a * a + 2 * a * T0 + 2 * T0 * T0) / (a + T0);
    const small = (W) => W < 520;
    const fs = (W, big) => (small(W) ? (big ? 11 : 10) : (big ? 13 : 11.5));

    function curve(ctx, m, f, a, b, color, w, dash, n = 140) {
        const pts = [];
        for (let i = 0; i <= n; i++) { const p = a + (b - a) * i / n; const y = f(p); if (isFinite(y)) pts.push([m.X(p), m.Y(y)]); }
        u.line(ctx, pts, color, w, dash);
    }
    function dot(ctx, x, y, r, col) { ctx.save(); ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, r, 0, 2 * Math.PI); ctx.fill(); ctx.restore(); }
    function vline(ctx, x, y0, y1, col, dash = [3, 3]) {
        ctx.save(); ctx.strokeStyle = col; ctx.setLineDash(dash); ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y1); ctx.stroke(); ctx.restore();
    }
    // root of g on [a,b] by scanning + bisection (or null)
    function root(g, a, b) {
        let x0 = a, g0 = g(a);
        for (let i = 1; i <= 200; i++) {
            const x1 = a + (b - a) * i / 200, g1 = g(x1);
            if (g0 === 0) return x0;
            if (g0 * g1 < 0) { let lo = x0, hi = x1; for (let k = 0; k < 30; k++) { const mid = (lo + hi) / 2; (g(lo) * g(mid) <= 0) ? hi = mid : lo = mid; } return (lo + hi) / 2; }
            x0 = x1; g0 = g1;
        }
        return null;
    }

    // ======================================================================
    // 1. split: one event = (more particles) × (tilted shape). Dividing by the
    //    event's own particle count removes the first, keeps the second.
    // ======================================================================
    register('radial-flow-shape-split', {
        duration: 10,
        aspect: 16 / 10,
        phases: [
            { t: 0, label: 'Step 1 · This event has MORE particles and a FLATTER spectrum than average' },
            { t: 3.6, label: 'Step 2 · Divide by the event’s own particle count: n(pT) = N(pT) / N' },
            { t: 6.6, label: 'Step 3 · The overall shift is gone; only the tilt (radial flow) is left' }
        ],
        setup() { return {}; },
        draw(ctx, t, s, W, H) {
            const dT = 0.1, dM = 0.4;
            const k1 = u.ease(u.seg(t, 0.3, 2.4)), k2 = u.ease(u.seg(t, 3.9, 6.2));
            const T = T0 * (1 + dT * k1);
            const scale = Math.pow(1 + dM * k1, 1 - k2);
            const ev = (p) => scale * spec(p, T);
            const avg = (p) => spec(p, T0);
            const lx = small(W) ? 52 : 70, rp = small(W) ? 10 : 22;
            const top = { x: lx, y: 12, w: W - lx - rp, h: H * 0.48 - 22 };
            const bot = { x: lx, y: H * 0.48 + 12, w: W - lx - rp, h: H * 0.52 - 52 };
            const m1 = u.axes(ctx, top, [0, 3], [1e-2, 6], { logy: true, ylabel: small(W) ? 'particles' : 'particles (log)', xticks: false });
            curve(ctx, m1, avg, 0.02, 3, C.gray, 2, [6, 4]);
            const evCol = k2 > 0.5 ? C.teal : C.red;
            curve(ctx, m1, ev, 0.02, 3, evCol, 2.6);
            u.text(ctx, '- - average event', top.x + top.w - 8, top.y + 16, { size: fs(W), color: C.muted, align: 'right' });
            u.text(ctx, k2 > 0.5 ? 'this event: n(pT) = N(pT)/N' : 'this event: N(pT)', top.x + top.w - 8, top.y + 31, { size: fs(W), color: evCol, align: 'right', weight: '700' });
            // particle-count pill
            const cnt = Math.round(1000 * (1 + dM * k1));
            const pillTxt = k2 > 0.5 ? 'area normalised to 1' : `N = ${cnt} (average 1000)`;
            u.pill(ctx, top.x + 8, top.y + top.h - 10, pillTxt, k2 > 0.5 ? C.teal : C.red);
            if (t > 3.6 && t < 6.6) {
                const x = m1.X(2.2);
                u.arrow(ctx, x, m1.Y(spec(2.2, T) * (1 + dM)) - 2, x, m1.Y(spec(2.2, T)) + 2 + 10 * (1 - k2), C.ink, 1.6, 6);
                u.text(ctx, '÷ N', x + 8, m1.Y(spec(2.2, T)) - 8, { size: fs(W, true), weight: '700' });
            }

            const m2 = u.axes(ctx, bot, [0, 3], [-0.6, 1.2], { zero: true, yticks: [-0.5, 0, 0.5, 1], xlabel: 'transverse momentum pT (GeV)', ylabel: small(W) ? 'rel. change' : 'relative change' });
            curve(ctx, m2, (p) => u.clamp(ev(p) / avg(p) - 1, -0.6, 1.2), 0.02, 3, evCol, 2.6);
            // flat multiplicity offset indicator
            const off = (1 + dM * k1) ** (1 - k2) - 1;
            if (off > 0.02) {
                ctx.save(); ctx.globalAlpha = 0.8;
                u.line(ctx, [[m2.X(0), m2.Y(off)], [m2.X(3), m2.Y(off)]], C.orange, 1.5, [5, 4]);
                ctx.restore();
                u.text(ctx, 'flat offset = extra particles (δN/N)', bot.x + 8, m2.Y(off) - 5, { size: fs(W), color: C.orange, weight: '700' });
            }
            if (k2 > 0.95) {
                const pc = root((p) => ev(p) / avg(p) - 1, 0.3, 3);
                if (pc) {
                    vline(ctx, m2.X(pc), bot.y, bot.y + bot.h, C.ink);
                    dot(ctx, m2.X(pc), m2.Y(0), 4, C.ink);
                    u.text(ctx, 'crosses zero ≈ ⟨pT⟩', m2.X(pc) + 6, bot.y + bot.h - 8, { size: fs(W), color: C.ink });
                }
            }
            u.text(ctx, 'schematic', W - rp - 4, H - 6, { size: 10, color: C.muted, align: 'right' });
        }
    });

    // ======================================================================
    // 2. offset: same events, different centrality estimators. Raw spectra
    //    N(pT) give v0'(pT) curves shifted by constants; n(pT) removes them.
    // ======================================================================
    const EST = [
        { lab: 'by Npart', off: 0.9, col: C.red },
        { lab: 'by Nch 4<|η|<5', off: 0.3, col: C.orange },
        { lab: 'by Nch 3.2<|η|<4', off: 0.13, col: C.teal },
        { lab: 'by Nch 2.5<|η|<3.2', off: -0.06, col: C.ink },
        { lab: 'by Nch |η|<2.5', off: -0.62, col: C.blue }
    ];
    register('radial-flow-shape-offset', {
        duration: 10,
        aspect: 16 / 9,
        phases: [
            { t: 0, label: 'Step 1 · Same events, five ways to define “central”, raw spectra N(pT)' },
            { t: 3.2, label: 'Step 2 · Curves differ by constant shifts; zero crossings scatter (one never crosses)' },
            { t: 6, label: 'Step 3 · Use fractional spectra n(pT): one curve, one zero crossing' }
        ],
        setup() { return {}; },
        draw(ctx, t, s, W, H) {
            const sm = small(W);
            const legW = sm ? 104 : 150, lx = sm ? 40 : 60;
            const box = { x: lx, y: 14, w: W - lx - legW - 10, h: H - 60 };
            const m = u.axes(ctx, box, [0.15, 6], [-1.1, 1.75], { zero: true, xticks: [1, 2, 3, 4, 5], yticks: false, xlabel: 'pT (GeV)', ylabel: 'v₀(pT)' });
            const grow = u.ease(u.seg(t, 0.2, 2.6));
            const k = u.ease(u.seg(t, 6.0, 7.8));
            const showRoots = t > 3.2;
            ctx.save(); ctx.beginPath(); ctx.rect(box.x, box.y, box.w, box.h); ctx.clip();
            EST.forEach((e) => {
                const off = e.off * (1 - k);
                const pEnd = 0.15 + (6 - 0.15) * grow;
                curve(ctx, m, (p) => v0(p) + off, 0.15, pEnd, e.col, 2.2);
            });
            ctx.restore();
            EST.forEach((e, i) => {
                const off = e.off * (1 - k);
                if (showRoots && grow >= 1) {
                    const r = root((p) => v0(p) + off, 0.15, 6);
                    if (r !== null) dot(ctx, m.X(r), m.Y(0), 4.5, e.col);
                    else if (k < 0.2) u.text(ctx, 'red: never crosses 0', box.x + 8, box.y + 16, { size: fs(W), color: e.col, weight: '700' });
                }
                // legend
                const ly = box.y + 18 + i * (sm ? 15 : 19);
                u.line(ctx, [[W - legW, ly - 4], [W - legW + 14, ly - 4]], e.col, 2.4);
                u.text(ctx, e.lab, W - legW + 19, ly, { size: sm ? 9.5 : 11.5, color: e.col, weight: '600' });
            });
            const ttl = k > 0.5 ? 'using n(pT)' : 'using N(pT)';
            u.text(ctx, ttl, W - legW, box.y + 18 + 5 * (sm ? 15 : 19) + 10, { size: fs(W, true), weight: '700', color: k > 0.5 ? C.teal : C.ink });
            u.text(ctx, 'schematic', box.x + box.w - 6, box.y + box.h - 6, { size: 10, color: C.muted, align: 'right' });
        }
    });

    // ======================================================================
    // 3. range: the pT window used to normalise the spectrum shifts v0(pT)
    //    down and moves its zero crossing to <pT>_R. Shifting back unifies.
    // ======================================================================
    const RANGES = [
        { a: 0, lab: '0–10 GeV', col: C.red },
        { a: 0.5, lab: '0.5–10 GeV', col: C.blue },
        { a: 1.0, lab: '1–10 GeV', col: C.ink }
    ];
    register('radial-flow-shape-range', {
        duration: 13,
        aspect: 16 / 9,
        phases: [
            { t: 0, label: 'Step 1 · Normalise over 0–10 GeV: v₀(pT) crosses zero at ⟨pT⟩ ≈ 1 GeV' },
            { t: 3, label: 'Step 2 · Normalise over 0.5–10 GeV: the curve drops, the crossing moves right' },
            { t: 6, label: 'Step 3 · Normalise over 1–10 GeV: it drops again, crossing at ⟨pT⟩ of that range' },
            { t: 9, label: 'Step 4 · Shift each curve back up: they coincide. The shape never changed' }
        ],
        setup() { return {}; },
        draw(ctx, t, s, W, H) {
            const sm = small(W);
            const lx = sm ? 40 : 60, rp = sm ? 10 : 22;
            const box = { x: lx, y: 34, w: W - lx - rp, h: H - 80 };
            const m = u.axes(ctx, box, [0, 5], [-1.15, 0.85], { zero: true, xticks: [0, 1, 2, 3, 4, 5], yticks: false, xlabel: 'pT (GeV)', ylabel: 'v₀(pT)' });
            // which range is active and how far the window edge has moved
            let a;
            if (t < 3) a = 0;
            else if (t < 6) a = u.lerp(0, 0.5, u.ease(u.seg(t, 3, 4)));
            else a = u.lerp(0.5, 1.0, u.ease(u.seg(t, 6, 7)));
            const active = t < 3 ? 0 : t < 6 ? 1 : 2;
            const back = u.ease(u.seg(t, 9, 10.8));
            // normalisation window band
            ctx.save(); ctx.fillStyle = 'rgba(232,113,10,0.10)';
            ctx.fillRect(m.X(a), box.y - 22, m.X(5) - m.X(a), 14); ctx.restore();
            u.text(ctx, 'normalisation range → (to 10 GeV)', m.X(a) + 6, box.y - 11, { size: fs(W), color: C.orange, weight: '700' });
            vline(ctx, m.X(a), box.y - 22, box.y + box.h, C.orange, [4, 3]);
            RANGES.forEach((r, i) => {
                if (i > active) return;
                const aa = i === active ? a : r.a;
                const sh = v0(meanAbove(aa)) * (1 - back);
                const isAct = i === active || back > 0;
                ctx.save(); ctx.globalAlpha = isAct ? 1 : 0.35;
                curve(ctx, m, (p) => v0(p) - sh, Math.max(aa, 0.02), 5, r.col, i === active ? 2.8 : 2);
                ctx.restore();
                if (back < 0.05) {
                    const pc = meanAbove(aa);
                    dot(ctx, m.X(pc), m.Y(0), 4.5, r.col);
                    if (i === active) {
                        vline(ctx, m.X(pc), m.Y(0), box.y + box.h, r.col);
                        u.text(ctx, `zero at ⟨pT⟩ = ${pc.toFixed(2)} GeV`, m.X(pc) + 6, box.y + box.h - 8, { size: fs(W), color: r.col, weight: '700' });
                    }
                }
                // legend
                const ly = box.y + 18 + i * 16;
                u.line(ctx, [[box.x + 10, ly - 4], [box.x + 24, ly - 4]], r.col, 2.4);
                u.text(ctx, 'spectra ' + r.lab, box.x + 29, ly, { size: fs(W), color: r.col, weight: '600' });
            });
            if (back > 0.5) u.text(ctx, 'after vertical shift: one curve', box.x + box.w - 8, box.y + 18, { size: fs(W, true), weight: '700', align: 'right', color: C.teal });
            u.text(ctx, 'schematic', box.x + box.w - 6, box.y + box.h - 6, { size: 10, color: C.muted, align: 'right' });
        }
    });

    // ======================================================================
    // 4. slope: curves that differ by a constant have the same slope.
    //    dv0/dpT removes the offset entirely.
    // ======================================================================
    const OFFS = [{ off: 0, col: C.red }, { off: -0.16, col: C.blue }, { off: -0.37, col: C.ink }];
    register('radial-flow-shape-slope', {
        duration: 11,
        aspect: 16 / 10,
        phases: [
            { t: 0, label: 'Step 1 · Three v₀(pT) curves that differ only by a constant shift' },
            { t: 2.6, label: 'Step 2 · Follow the slope at each pT: it is the same on all three curves' },
            { t: 7, label: 'Step 3 · The slope dv₀/dpT is a single curve: the offset has dropped out' }
        ],
        setup() { return {}; },
        draw(ctx, t, s, W, H) {
            const sm = small(W);
            const lx = sm ? 44 : 64, rp = sm ? 10 : 22;
            const top = { x: lx, y: 12, w: W - lx - rp, h: H * 0.5 - 26 };
            const bot = { x: lx, y: H * 0.5 + 10, w: W - lx - rp, h: H * 0.5 - 50 };
            const m1 = u.axes(ctx, top, [0, 5], [-1.5, 0.9], { zero: true, xticks: false, yticks: false, ylabel: 'v₀(pT)' });
            const m2 = u.axes(ctx, bot, [0, 5], [-0.35, 1.5], { zero: true, xticks: [0, 1, 2, 3, 4, 5], yticks: false, xlabel: 'pT (GeV)', ylabel: sm ? 'slope' : 'dv₀/dpT' });
            const ps = 0.15 + (5 - 0.15) * u.seg(t, 2.8, 7);
            OFFS.forEach((o) => {
                curve(ctx, m1, (p) => v0(p) + o.off, 0.02, 5, o.col, 2.2);
                const r = root((p) => v0(p) + o.off, 0.02, 5);
                if (r !== null) dot(ctx, m1.X(r), m1.Y(0), 4, o.col);
            });
            u.text(ctx, 'different zero crossings', top.x + top.w - 8, top.y + top.h - 10, { size: fs(W), color: C.muted, align: 'right' });
            if (t > 2.6) {
                if (t < 7) vline(ctx, m1.X(ps), top.y, bot.y + bot.h, C.gray);
                if (t < 7) OFFS.forEach((o) => {
                    const y0 = v0(ps) + o.off, d = 0.45;
                    ctx.save(); ctx.beginPath(); ctx.rect(top.x, top.y, top.w, top.h); ctx.clip();
                    u.line(ctx, [[m1.X(ps - d), m1.Y(y0 - d * dv0(ps))], [m1.X(ps + d), m1.Y(y0 + d * dv0(ps))]], C.orange, 2.4);
                    dot(ctx, m1.X(ps), m1.Y(y0), 3.5, o.col);
                    ctx.restore();
                });
                const end = t >= 7 ? 5 : ps;
                OFFS.forEach((o, i) => curve(ctx, m2, dv0, 0.02, end, o.col, 4 - i * 1.2, i ? [6, 5] : undefined));
                if (t < 7) dot(ctx, m2.X(ps), m2.Y(dv0(ps)), 4, C.orange);
            }
            if (t >= 7) {
                const pk = 3.8;
                dot(ctx, m2.X(pk), m2.Y(0), 4, C.ink);
                u.text(ctx, sm ? 'all three overlap' : 'all three curves overlap exactly', bot.x + bot.w - 8, bot.y + 16, { size: fs(W, true), weight: '700', align: 'right', color: C.teal });
            }
            u.text(ctx, 'schematic', W - rp - 4, H - 6, { size: 10, color: C.muted, align: 'right' });
        }
    });
})();
