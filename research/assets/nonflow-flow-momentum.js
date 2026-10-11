/* Page-specific animations for research/nonflow-flow-momentum.html
   (Zhang, Behera, Bhatta, Jia, Phys. Lett. B 822, 136702 (2021)).
   All panels are schematic cartoons, not data. */
(function () {
    'use strict';
    const { register, C, u } = window.Anim;

    // particle stream from a centre: list of {a, v}
    function spray(seed, n, v2, vmin, vspread) {
        const rand = u.rng(seed), out = [];
        while (out.length < n) {
            const a = 2 * Math.PI * rand();
            if (rand() * (1 + 2 * v2) < 1 + 2 * v2 * Math.cos(2 * a)) out.push({ a, v: vmin + vspread * rand() });
        }
        return out;
    }

    // ------------------------------------------------------------------
    // 1. Shape sets v2, size sets [pT]: the hydrodynamic expectation
    // ------------------------------------------------------------------
    register('nonflow-flow-momentum-hydro', {
        duration: 11,
        aspect: 16 / 8,
        phases: [
            { t: 0, label: 'Step 1 · Two small collisions with the same number of particles' },
            { t: 3, label: 'Step 2 · Elongated shape gives more v₂; a compact drop pushes harder and gives more [pT]' },
            { t: 6.5, label: 'Step 3 · Over many events: larger v₂² goes with lower [pT], a negative correlation' }
        ],
        setup() {
            const rand = u.rng(21), dots = [];
            for (let i = 0; i < 70; i++) {
                const x = 0.1 + 0.8 * rand();
                dots.push({ x, y: 0.82 - 0.55 * x + 0.17 * u.gauss(rand), d: rand() });
            }
            return { A: spray(5, 46, 0.32, 0.55, 0.25), B: spray(9, 46, 0.0, 0.85, 0.3), dots };
        },
        draw(ctx, t, s, W, H) {
            const e = u.ease(u.seg(t, 2.6, 5.6));
            const drop = (cx, cy, rx, ry, heat, parts, push, col, title, sub, arrowL) => {
                u.glow(ctx, cx, cy, Math.max(rx, ry) * 1.5, u.heat(heat, 0.55));
                ctx.save();
                ctx.fillStyle = u.heat(heat, 0.85);
                ctx.beginPath(); ctx.ellipse(cx, cy, rx * (1 - 0.35 * e), ry * (1 - 0.35 * e), 0, 0, 2 * Math.PI); ctx.fill();
                ctx.restore();
                parts.forEach(q => {
                    const d0 = Math.hypot(rx * Math.cos(q.a), ry * Math.sin(q.a));
                    const d = d0 + e * q.v * push;
                    ctx.save(); ctx.globalAlpha = 0.85; ctx.fillStyle = col;
                    ctx.beginPath(); ctx.arc(cx + d * Math.cos(q.a), cy + d * Math.sin(q.a), 2.3, 0, 2 * Math.PI); ctx.fill(); ctx.restore();
                });
                const ka = u.seg(t, 2.6, 3.6);
                if (ka > 0) for (let j = 0; j < 8; j++) {
                    const a = j * Math.PI / 4, r0 = Math.hypot(rx * Math.cos(a), ry * Math.sin(a)) * 0.6, L = arrowL * ka;
                    u.arrow(ctx, cx + r0 * Math.cos(a), cy + r0 * Math.sin(a), cx + (r0 + L) * Math.cos(a), cy + (r0 + L) * Math.sin(a), C.red, 2, 6);
                }
                u.text(ctx, title, cx, 26, { size: 14, weight: '700', align: 'center' });
                u.text(ctx, sub, cx, H - 14, { size: 12, weight: '600', color: C.muted, align: 'center', alpha: u.seg(t, 3, 4) });
            };
            const cy = H * 0.5;
            drop(W * 0.15, cy, 52, 26, 0.45, s.A, W * 0.05, C.navy, 'A: elongated, larger', 'v₂ larger · [pT] lower', 12);
            drop(W * 0.44, cy, 26, 24, 0.95, s.B, W * 0.075, C.navy, 'B: round, compact', 'v₂ smaller · [pT] higher', 30);
            u.text(ctx, 'same number of particles', W * 0.295, 46, { size: 11, color: C.muted, align: 'center' });
            ctx.save(); ctx.strokeStyle = C.grid; ctx.beginPath(); ctx.moveTo(W * 0.585, 14); ctx.lineTo(W * 0.585, H - 14); ctx.stroke(); ctx.restore();
            // scatter
            const box = { x: W * 0.66, y: 34, w: W * 0.3, h: H - 92 };
            const m = u.axes(ctx, box, [0, 1], [0, 1], { xticks: false, yticks: false, xlabel: 'v₂² of the event', ylabel: '[pT] of the event' });
            const k = u.seg(t, 6.5, 9.5);
            s.dots.forEach(p => {
                if (p.d > k) return;
                ctx.save(); ctx.fillStyle = C.blue; ctx.globalAlpha = 0.55;
                ctx.beginPath(); ctx.arc(m.X(p.x), m.Y(u.clamp(p.y, 0.03, 0.97)), 3, 0, 2 * Math.PI); ctx.fill(); ctx.restore();
            });
            const a = u.seg(t, 3.5, 4.5);
            if (a > 0) {
                u.ball(ctx, m.X(0.78), m.Y(0.34), 6, C.red, a);
                u.text(ctx, 'A', m.X(0.78) + 9, m.Y(0.34) + 4, { size: 12, weight: '700', color: C.red, alpha: a });
                u.ball(ctx, m.X(0.22), m.Y(0.74), 6, C.red, a);
                u.text(ctx, 'B', m.X(0.22) + 9, m.Y(0.74) + 4, { size: 12, weight: '700', color: C.red, alpha: a });
            }
            const b = u.seg(t, 8.5, 9.5);
            if (b > 0) {
                u.line(ctx, [[m.X(0.08), m.Y(0.8)], [m.X(0.94), m.Y(0.3)]], C.red, 2.2, [6, 4]);
                u.text(ctx, 'negative correlation', box.x + box.w - 6, box.y + 16, { size: 12, weight: '700', color: C.red, align: 'right', alpha: b });
            }
            u.text(ctx, 'schematic', box.x + box.w - 6, box.y + box.h - 6, { size: 10, color: C.muted, align: 'right' });
        }
    });

    // ------------------------------------------------------------------
    // 2. Flow vs non-flow (a jet)
    // ------------------------------------------------------------------
    register('nonflow-flow-momentum-jet', {
        duration: 10,
        aspect: 16 / 8,
        phases: [
            { t: 0, label: 'Step 1 · Flow: all particles share one elliptic pattern' },
            { t: 3.2, label: 'Step 2 · Non-flow: a jet sprays a few fast particles in one direction' },
            { t: 6.4, label: 'Step 3 · The jet raises v₂² and [pT] together: a fake positive correlation' }
        ],
        setup() {
            const rand = u.rng(33), jet = [];
            for (let i = 0; i < 6; i++) jet.push({ a: -0.95 + 0.16 * u.gauss(rand), v: 0.75 + 0.25 * rand() });
            return { flow: spray(17, 70, 0.3, 0.5, 0.35), soft: spray(41, 18, 0, 0.35, 0.25), jet };
        },
        draw(ctx, t, s, W, H) {
            const cyy = H * 0.5;
            // left: flow
            const e1 = u.ease(u.seg(t, 0.3, 2.8));
            const cx1 = W * 0.22, R = H * 0.36;
            u.text(ctx, 'Flow (collective)', cx1, 26, { size: 14, weight: '700', align: 'center' });
            u.glow(ctx, cx1, cyy, 30, u.heat(0.8, 0.9));
            s.flow.forEach(q => {
                const d = 18 + e1 * q.v * R;
                u.line(ctx, [[cx1, cyy], [cx1 + d * Math.cos(q.a), cyy + d * Math.sin(q.a)]], C.blue, 1.2);
            });
            u.text(ctx, 'many particles, whole detector', cx1, H - 14, { size: 12, color: C.muted, align: 'center' });
            ctx.save(); ctx.strokeStyle = C.grid; ctx.beginPath(); ctx.moveTo(W * 0.44, 14); ctx.lineTo(W * 0.44, H - 14); ctx.stroke(); ctx.restore();
            // right: jet
            const cx2 = W * 0.6;
            const e2 = u.ease(u.seg(t, 3.2, 5.4));
            u.text(ctx, 'Non-flow (a jet)', cx2, 26, { size: 14, weight: '700', align: 'center', alpha: u.seg(t, 2.8, 3.4) });
            if (t > 2.8) {
                const a0 = u.seg(t, 2.8, 3.4);
                u.glow(ctx, cx2, cyy, 18, u.heat(0.3, 0.6 * a0));
                s.soft.forEach(q => {
                    const d = 8 + e2 * q.v * R;
                    ctx.save(); ctx.globalAlpha = a0;
                    u.line(ctx, [[cx2, cyy], [cx2 + d * Math.cos(q.a), cyy + d * Math.sin(q.a)]], C.gray, 1.1);
                    ctx.restore();
                });
                s.jet.forEach(q => {
                    const d = 8 + e2 * q.v * R * 1.1;
                    if (e2 > 0) u.arrow(ctx, cx2, cyy, cx2 + d * Math.cos(q.a), cyy + d * Math.sin(q.a), C.orange, 2.4, 8);
                });
                u.text(ctx, 'a few fast particles, one small region', cx2, H - 14, { size: 12, color: C.muted, align: 'center', alpha: a0 });
            }
            // meters
            const k = u.ease(u.seg(t, 6.4, 8.2));
            const mx = W * 0.82, mw = W * 0.12, mh = 14;
            const meter = (y, label, base, col) => {
                u.text(ctx, label, mx, y - 6, { size: 12, weight: '600' });
                ctx.save(); ctx.fillStyle = C.grid; ctx.fillRect(mx, y, mw, mh);
                ctx.fillStyle = col; ctx.fillRect(mx, y, mw * (base + 0.5 * k), mh); ctx.restore();
                if (k > 0.05) u.text(ctx, '↑', mx + mw + 6, y + 12, { size: 15, weight: '700', color: col, alpha: k });
            };
            if (t > 6.0) {
                meter(cyy - 34, 'event v₂²', 0.3, C.orange);
                meter(cyy + 18, 'event [pT]', 0.35, C.orange);
                u.text(ctx, 'both go up together', mx, cyy + 64, { size: 12, weight: '700', color: C.red, alpha: k });
            }
            u.text(ctx, 'schematic', W - 10, 18, { size: 10, color: C.muted, align: 'right' });
        }
    });

    // ------------------------------------------------------------------
    // 3. Standard, two-subevent and three-subevent methods
    // ------------------------------------------------------------------
    register('nonflow-flow-momentum-subevents', {
        duration: 14,
        aspect: 16 / 8,
        phases: [
            { t: 0, label: 'Step 1 · One event: flow particles fill all of η; a jet is a tight cluster' },
            { t: 3.2, label: 'Step 2 · Standard method: all three particles can come from the same jet' },
            { t: 6.6, label: 'Step 3 · Two subevents a and c: a back-to-back jet pair can still bridge the gap' },
            { t: 10.2, label: 'Step 4 · Three subevents: flow from a and c, [pT] from b; one jet cannot reach all three' }
        ],
        setup() {
            const rand = u.rng(57), flow = [];
            for (let i = 0; i < 90; i++) {
                const eta = -2.45 + 4.9 * rand();
                const side = rand() < 0.5 ? 0 : Math.PI;
                flow.push({ eta, phi: 1.0 + side + 0.55 * u.gauss(rand) });
            }
            const jet = [], away = [];
            for (let i = 0; i < 6; i++) jet.push({ eta: 1.55 + 0.13 * u.gauss(rand), phi: 2.3 + 0.12 * u.gauss(rand) });
            for (let i = 0; i < 4; i++) away.push({ eta: -1.5 + 0.15 * u.gauss(rand), phi: 2.3 - Math.PI + 2 * Math.PI + 0.14 * u.gauss(rand) });
            return { flow, jet, away };
        },
        draw(ctx, t, s, W, H) {
            const box = { x: 70, y: 40, w: W - 110, h: H - 92 };
            const X = (eta) => box.x + (eta + 2.5) / 5 * box.w;
            const wrap = (p) => ((p % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
            const Y = (phi) => box.y + box.h - wrap(phi) / (2 * Math.PI) * box.h;
            ctx.save(); ctx.fillStyle = '#fff'; ctx.fillRect(box.x, box.y, box.w, box.h);
            ctx.strokeStyle = C.grid; ctx.strokeRect(box.x + 0.5, box.y + 0.5, box.w, box.h); ctx.restore();
            [-2.5, -0.75, -0.5, 0, 0.5, 0.75, 2.5].forEach(v => u.text(ctx, String(v), X(v), box.y + box.h + 14, { size: 10, color: C.muted, align: 'center' }));
            u.text(ctx, 'pseudorapidity η (position along the beam)', box.x + box.w / 2, box.y + box.h + 32, { size: 12, color: C.muted, align: 'center' });
            ctx.save(); ctx.translate(box.x - 14, box.y + box.h / 2); ctx.rotate(-Math.PI / 2);
            u.text(ctx, 'azimuthal angle φ', 0, 0, { size: 12, color: C.muted, align: 'center' }); ctx.restore();

            const step = t < 3.2 ? 1 : t < 6.6 ? 2 : t < 10.2 ? 3 : 4;
            const fadeIn = (t0) => u.seg(t, t0, t0 + 0.7);
            // subevent shading
            const band = (e0, e1, col, label, a) => {
                ctx.save(); ctx.globalAlpha = 0.13 * a; ctx.fillStyle = col;
                ctx.fillRect(X(e0), box.y, X(e1) - X(e0), box.h); ctx.restore();
                u.text(ctx, label, (X(e0) + X(e1)) / 2, box.y - 10, { size: 13, weight: '700', color: col, align: 'center', alpha: a });
            };
            if (step === 1 || step === 2) {
                const a = step === 2 ? fadeIn(3.2) : 0;
                band(-2.5, 2.5, C.gray, 'standard: whole detector |η| < 2.5', a);
            }
            if (step === 3) { const a = fadeIn(6.6); band(-2.5, -0.75, C.blue, 'a', a); band(0.75, 2.5, C.teal, 'c', a); u.text(ctx, 'gap', X(0), box.y - 10, { size: 12, color: C.muted, align: 'center', alpha: a }); }
            if (step === 4) { const a = fadeIn(10.2); band(-2.5, -0.75, C.blue, 'a', a); band(-0.5, 0.5, C.purple, 'b', a); band(0.75, 2.5, C.teal, 'c', a); }

            // particles
            const dot = (p, col, r, al) => { ctx.save(); ctx.globalAlpha = al; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(X(p.eta), Y(p.phi), r, 0, 2 * Math.PI); ctx.fill(); ctx.restore(); };
            const app = u.seg(t, 0.2, 1.6);
            s.flow.forEach((p, i) => { if (i / s.flow.length <= app) dot(p, C.navy, 2.6, 0.5); });
            s.jet.forEach(p => dot(p, C.orange, 3.6, app));
            s.away.forEach(p => dot(p, C.orange, 3.2, app * (step >= 3 ? 1 : 0.55)));
            if (app > 0.9) {
                u.text(ctx, 'jet', X(1.55) + 18, Y(2.3) - 10, { size: 12, weight: '700', color: C.orange });
            }

            const tri = (pts, col, a) => {
                ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = col; ctx.lineWidth = 2.2;
                ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(X(p.eta), Y(p.phi)) : ctx.moveTo(X(p.eta), Y(p.phi)));
                ctx.closePath(); ctx.stroke(); ctx.restore();
                pts.forEach(p => { ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(X(p.eta), Y(p.phi), 7, 0, 2 * Math.PI); ctx.stroke(); ctx.restore(); });
            };
            const verdict = (txt, col, a) => u.pill(ctx, box.x + 8, box.y + box.h - 10, txt, col);
            if (step === 2) {
                const a = fadeIn(3.8);
                tri([s.jet[0], s.jet[2], s.jet[4]], C.red, a);
                if (a > 0.5) verdict('jet counted as correlation: large non-flow', C.red);
            }
            if (step === 3) {
                const a = fadeIn(7.4);
                ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = C.orange; ctx.lineWidth = 2; ctx.setLineDash([5, 4]);
                ctx.beginPath(); ctx.moveTo(X(s.away[0].eta), Y(s.away[0].phi)); ctx.lineTo(X(s.jet[1].eta), Y(s.jet[1].phi)); ctx.stroke(); ctx.restore();
                tri([s.away[0], s.jet[1], s.jet[3]], C.orange, a);
                if (a > 0.5) verdict('partly suppressed: jet pairs still leak in', C.orange);
            }
            if (step === 4) {
                const a = fadeIn(11);
                const pa = s.flow.find(p => p.eta < -1.4 && Math.abs(wrap(p.phi) - 1.0) < 0.3) || s.flow[0];
                const pc = s.flow.find(p => p.eta > 1.4 && Math.abs(wrap(p.phi) - 1.0) < 0.3) || s.flow[1];
                const pb = s.flow.find(p => Math.abs(p.eta) < 0.4 && Math.abs(wrap(p.phi) - 1.2) < 0.6) || s.flow[2];
                tri([pa, pb, pc], C.teal, a);
                if (a > 0.5) verdict('flow kept, non-flow mostly removed', C.teal);
            }
            u.text(ctx, 'schematic', box.x + box.w - 6, box.y + box.h - 6, { size: 10, color: C.muted, align: 'right' });
        }
    });

    // ------------------------------------------------------------------
    // 4. The low-multiplicity question
    // ------------------------------------------------------------------
    register('nonflow-flow-momentum-question', {
        duration: 14,
        aspect: 16 / 8,
        phases: [
            { t: 0, label: 'Step 1 · Final-state (hydrodynamic) response: a negative v₂–[pT] correlation' },
            { t: 3.4, label: 'Step 2 · Gluon saturation adds a positive piece at very low multiplicity: a predicted sign change' },
            { t: 6.8, label: 'Step 3 · Residual non-flow (three subevents) is small where the measured signal is large' },
            { t: 10.2, label: 'Step 4 · At very low multiplicity its sign depends on the model: positive in Pythia, negative in Hijing' }
        ],
        setup() { return {}; },
        draw(ctx, t, s, W, H) {
            const box = { x: 70, y: 22, w: W - 230, h: H - 78 };
            const m = u.axes(ctx, box, [0, 50], [-1, 1], { zero: true, yticks: false, xticks: [0, 10, 20, 30, 40, 50],
                xlabel: 'particle multiplicity dNch/dη', ylabel: 'cov(v₂², [pT])' });
            const N = 120, xs = Array.from({ length: N + 1 }, (_, i) => 0.5 + 49.5 * i / N);
            const fsm = (x) => -0.75 * (1 - Math.exp(-x / 14));
            const ism = (x) => 0.95 * Math.exp(-x / 4.5);
            const nfA = (x) => 0.7 * Math.exp(-Math.pow((x - 3) / 2.6, 2)) - 0.05 * (1 - Math.exp(-x / 6)) * Math.exp(-x / 40);
            const nfB = (x) => -0.65 * Math.exp(-x / 5) - 0.04 * Math.exp(-x / 25);
            const curve = (f, k, col, w, dash) => {
                const n = Math.max(2, Math.round(N * k));
                u.line(ctx, xs.slice(0, n).map(x => [m.X(x), m.Y(u.clamp(f(x), -1, 1))]), col, w, dash);
            };
            ctx.save(); ctx.beginPath(); ctx.rect(box.x, box.y, box.w, box.h); ctx.clip();
            const k1 = u.seg(t, 0.3, 2.6);
            const k2 = u.ease(u.seg(t, 3.4, 5.4));
            // final-state curve morphs into FSM+ISM
            curve(x => fsm(x) + k2 * ism(x), k1, C.blue, 2.6);
            if (k2 > 0) curve(fsm, 1, C.blue, 1.4, [4, 4]);
            const k3 = u.seg(t, 6.8, 8.6);
            const k4 = u.ease(u.seg(t, 10.2, 12));
            if (k3 > 0) {
                // residual non-flow: the two models agree above ~20, differ below
                const hi = xs.filter(x => x >= 18);
                ctx.save(); ctx.globalAlpha = k3;
                u.line(ctx, hi.map(x => [m.X(x), m.Y(-0.03 * Math.exp(-(x - 18) / 15))]), C.orange, 3);
                ctx.restore();
            }
            if (k4 > 0) {
                const lo = xs.filter(x => x <= 18.5);
                const blend = (f, x) => u.lerp(-0.03, f(x), Math.pow(u.clamp((18.5 - x) / 14, 0, 1), 0.7));
                const n = Math.max(2, Math.round(lo.length * k4));
                const seg = lo.slice(lo.length - n);
                u.line(ctx, seg.map(x => [m.X(x), m.Y(blend(nfA, x))]), C.orange, 2.4, [6, 4]);
                u.line(ctx, seg.map(x => [m.X(x), m.Y(blend(nfB, x))]), C.red, 2.4, [2, 3]);
                ctx.save(); ctx.globalAlpha = 0.1 * k4; ctx.fillStyle = C.purple; ctx.fillRect(m.X(0), box.y, m.X(10) - m.X(0), box.h); ctx.restore();
                u.text(ctx, '?', m.X(6), m.Y(0.62), { size: 34, weight: '800', color: C.purple, align: 'center', alpha: k4 });
            }
            ctx.restore();
            u.text(ctx, '+', box.x - 10, box.y + 16, { size: 14, weight: '700', color: C.muted, align: 'right' });
            u.text(ctx, '−', box.x - 10, box.y + box.h - 6, { size: 14, weight: '700', color: C.muted, align: 'right' });
            // legend
            const lx = box.x + box.w + 14;
            let ly = box.y + 20;
            const leg = (col, dash, txt, a) => {
                ctx.save(); ctx.globalAlpha = a; u.line(ctx, [[lx, ly - 4], [lx + 22, ly - 4]], col, 2.6, dash); ctx.restore();
                u.text(ctx, txt, lx + 28, ly, { size: 11.5, weight: '600', alpha: a });
                ly += 24;
            };
            leg(C.blue, k2 > 0 ? [4, 4] : null, 'final-state response', k1 > 0 ? 1 : 0);
            leg(C.blue, null, '+ saturation', k2);
            leg(C.orange, null, 'residual non-flow', k3);
            leg(C.orange, [6, 4], 'non-flow, Pythia', k4);
            leg(C.red, [2, 3], 'non-flow, Hijing', k4);
            if (k2 > 0.6) u.text(ctx, 'sign change', m.X(6.5) + 8, m.Y(0.1), { size: 12, weight: '700', color: C.blue, alpha: u.seg(t, 4.6, 5.4) * (1 - k4) });
            u.text(ctx, 'schematic', box.x + box.w - 6, box.y + box.h - 6, { size: 10, color: C.muted, align: 'right' });
        }
    });
})();
