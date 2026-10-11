/* Page-specific animations for research/longitudinal-decorrelations.html
   (Jia, Huang, Zhang, Bhatta, arXiv:2408.15006).
   All panels are schematic cartoons, not data or model output. */
(function () {
    'use strict';
    const { register, C, u } = window.Anim;
    const GREEN = '#2f7d4f', AMBER = '#c77a12', PINK = '#d9686a', GREY = '#8a96a3';
    const BLUE_FILL = 'rgba(31,95,191,0.22)', PINK_FILL = 'rgba(217,104,106,0.30)', GREY_FILL = 'rgba(120,130,140,0.30)';

    // ellipse with long axis at angle ang (radians), eccentricity-like e in [0,0.5]
    function shape(ctx, x, y, r, e, ang, fill, stroke, alpha = 1) {
        ctx.save();
        ctx.globalAlpha *= alpha;
        ctx.translate(x, y); ctx.rotate(-ang);
        ctx.beginPath(); ctx.ellipse(0, 0, r * (0.62 + e), r * (0.62 - e), 0, 0, 2 * Math.PI);
        ctx.fillStyle = fill; ctx.fill();
        if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1.5; ctx.stroke(); }
        // long-axis tick
        ctx.strokeStyle = C.navy; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(-r * (0.62 + e) * 0.85, 0); ctx.lineTo(r * (0.62 + e) * 0.85, 0); ctx.stroke();
        ctx.restore();
    }

    // ------------------------------------------------------------------
    // 1. Global twist + local wiggles along rapidity
    // ------------------------------------------------------------------
    register('longitudinal-decorrelations-twist', {
        duration: 13,
        aspect: 16 / 6.5,
        phases: [
            { t: 0, label: 'Step 1 · Forward-going nucleons (green) shape one end; backward-going (orange) shape the other' },
            { t: 4, label: 'Step 2 · In between, the elliptic shape turns smoothly: the global twist' },
            { t: 8.5, label: 'Step 3 · On top, local random wiggles change the shape from slice to slice' }
        ],
        setup() {
            const rand = u.rng(2408);
            const N = 9;
            const noise = () => {
                const raw = Array.from({ length: N + 2 }, () => [u.gauss(rand), u.gauss(rand)]);
                return Array.from({ length: N }, (_, k) => [0, 1].map(j => (raw[k][j] + raw[k + 1][j] + raw[k + 2][j]) / 3));
            };
            const dotsB = Array.from({ length: 9 }, () => ({ a: rand() * 6.283, r: Math.sqrt(rand()) }));
            const dotsF = Array.from({ length: 9 }, () => ({ a: rand() * 6.283, r: Math.sqrt(rand()) }));
            return { N, n1: noise(), n2: noise(), n3: noise(), dotsB, dotsF };
        },
        draw(ctx, t, s, W, H) {
            const N = s.N, x0 = W * 0.08, x1 = W * 0.92, cy = H * 0.5;
            const r = Math.min((x1 - x0) / (N - 1) * 0.46, H * 0.13);
            const PB = -0.6, PF = 0.6, e0 = 0.3;      // end-point shapes (angle of long axis, size)
            const mid = u.ease(u.seg(t, 4, 6.5));
            const loc = u.ease(u.seg(t, 8.5, 9.5));
            // tube outline
            ctx.save(); ctx.strokeStyle = C.grid; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.moveTo(x0, cy - r * 1.25); ctx.lineTo(x1, cy - r * 1.25);
            ctx.moveTo(x0, cy + r * 1.25); ctx.lineTo(x1, cy + r * 1.25); ctx.stroke(); ctx.restore();
            // slow drift of the local noise
            const ph = (t - 8.5) / 2.2, k0 = u.clamp(Math.floor(ph), 0, 1), f = u.ease(u.clamp(ph - k0, 0, 1));
            const sets = [s.n1, s.n2, s.n3];
            for (let k = 0; k < N; k++) {
                const w = k / (N - 1);
                const x = u.lerp(x0, x1, w);
                // complex interpolation of the eccentricity vector (angle doubled)
                let re = (1 - w) * e0 * Math.cos(2 * PB) + w * e0 * Math.cos(2 * PF);
                let im = (1 - w) * e0 * Math.sin(2 * PB) + w * e0 * Math.sin(2 * PF);
                if (loc > 0) {
                    const A = sets[k0][k], B = sets[k0 + 1][k];
                    const g = ph < 0 ? 0 : f;
                    re += loc * 0.2 * u.lerp(A[0], B[0], g);
                    im += loc * 0.2 * u.lerp(A[1], B[1], g);
                }
                const e = Math.min(0.42, Math.hypot(re, im)), ang = Math.atan2(im, re) / 2;
                const end = k === 0 || k === N - 1;
                const alpha = end ? 1 : mid;
                ctx.save(); ctx.globalAlpha = end ? 1 : 0.25 + 0.75 * mid;
                ctx.strokeStyle = C.gray; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
                ctx.beginPath(); ctx.arc(x, cy, r, 0, 2 * Math.PI); ctx.stroke(); ctx.restore();
                if (alpha > 0.01) shape(ctx, x, cy, r, e, ang, u.heat(0.75, 0.55), u.heat(0.95, 0.9), alpha);
            }
            // nucleons at the two ends
            const showN = 1 - 0.6 * mid;
            s.dotsB.forEach(d => u.ball(ctx, x0 + Math.cos(d.a) * d.r * r * 0.8, cy + Math.sin(d.a) * d.r * r * 0.8, 3, AMBER, showN));
            s.dotsF.forEach(d => u.ball(ctx, x1 + Math.cos(d.a) * d.r * r * 0.8, cy + Math.sin(d.a) * d.r * r * 0.8, 3, GREEN, showN));
            u.text(ctx, 'backward end', x0, cy - r * 1.25 - 26, { size: 12, weight: '700', color: AMBER, align: 'center' });
            u.text(ctx, 'shape set by backward-going nucleons', x0 - r, cy - r * 1.25 - 10, { size: 11, color: C.muted });
            u.text(ctx, 'forward end', x1, cy - r * 1.25 - 26, { size: 12, weight: '700', color: GREEN, align: 'center' });
            u.text(ctx, 'shape set by forward-going nucleons', x1 + r, cy - r * 1.25 - 10, { size: 11, color: C.muted, align: 'right' });
            // eta axis
            const ya = cy + r * 1.25 + 26;
            u.arrow(ctx, x0 - r, ya, x1 + r, ya, C.ink, 1.5, 7);
            u.text(ctx, 'rapidity η (position along the beam)', W / 2, ya + 18, { size: 12, color: C.muted, align: 'center' });
            u.text(ctx, 'each circle: cross-section of the fireball at one η; dark line = long axis of its elliptic shape (schematic)', W / 2, H - 8, { size: 11, color: C.muted, align: 'center' });
            if (loc > 0) u.pill(ctx, W / 2 - 70, 22, 'global twist + local wiggles', C.red);
            else if (mid > 0) u.pill(ctx, W / 2 - 40, 22, 'global twist', C.navy);
        }
    });

    // ------------------------------------------------------------------
    // 2. Local fluctuations: sources spread over short stretches of rapidity
    // ------------------------------------------------------------------
    register('longitudinal-decorrelations-local', {
        duration: 13,
        aspect: 16 / 8,
        phases: [
            { t: 0, label: 'Step 1 · Each nucleon deposits energy over a short stretch of rapidity (red segments)' },
            { t: 3, label: 'Step 2 · Two nearby slices see almost the same segments, so their shapes match' },
            { t: 6.5, label: 'Step 3 · Move the slices apart: fewer shared segments, the shapes drift apart' },
            { t: 10.5, label: 'Step 4 · This local, random part fades over a few units of rapidity' }
        ],
        setup() {
            const rand = u.rng(91);
            const segs = [];
            for (let i = 0; i < 24; i++) {
                const c = -3 + 6 * rand(), len = 1.5 + 1.6 * rand();
                const ang = rand() * 6.283, rr = Math.sqrt(rand());
                segs.push({ a: c - len / 2, b: c + len / 2, x: 0.75 * rr * Math.cos(ang), y: 0.55 * rr * Math.sin(ang) });
            }
            return { segs };
        },
        draw(ctx, t, s, W, H) {
            const px = 40, pw = W * 0.58, top = 44, bot = H - 58;
            const X = e => px + (e + 3) / 6 * pw;
            const n = s.segs.length, dy = (bot - top) / n;
            const etaA = -1.6;
            const etaB = t < 6.5 ? -1.2 : u.lerp(-1.2, 1.8, u.ease(u.seg(t, 6.5, 10.5)));
            const showSl = u.seg(t, 3, 3.6);
            const grow = u.ease(u.seg(t, 0.2, 2.6));
            // segments
            s.segs.forEach((g, i) => {
                const y = top + (i + 0.5) * dy;
                const inA = g.a <= etaA && g.b >= etaA, inB = g.a <= etaB && g.b >= etaB;
                const both = inA && inB && showSl > 0;
                const a = Math.max(-3, g.a), b = Math.min(3, u.lerp(g.a, g.b, grow));
                if (b > a) u.line(ctx, [[X(a), y], [X(b), y]], both ? C.red : 'rgba(200,55,45,0.45)', both ? 3 : 2);
            });
            ctx.save(); ctx.strokeStyle = C.grid; ctx.strokeRect(px, top - 6, pw, bot - top + 12); ctx.restore();
            // eta axis
            u.text(ctx, 'rapidity η →', px + pw, top - 14, { size: 12, color: C.muted, align: 'right' });
            u.text(ctx, 'each row: energy from one nucleon, spread along η', px, top - 14, { size: 12, color: C.muted });
            // slices
            const cnt = { A: 0, B: 0, AB: 0 };
            s.segs.forEach(g => {
                const inA = g.a <= etaA && g.b >= etaA, inB = g.a <= etaB && g.b >= etaB;
                if (inA) cnt.A++; if (inB) cnt.B++; if (inA && inB) cnt.AB++;
            });
            if (showSl > 0) {
                [[etaA, 'a', C.blue], [etaB, 'b', C.purple]].forEach(([e, lab, col]) => {
                    ctx.save(); ctx.globalAlpha = showSl;
                    ctx.fillStyle = col; ctx.globalAlpha *= 0.12; ctx.fillRect(X(e) - 4, top - 6, 8, bot - top + 12);
                    ctx.restore();
                    u.line(ctx, [[X(e), top - 6], [X(e), bot + 6]], col, 1.5);
                    u.text(ctx, lab, X(e), bot + 22, { size: 13, weight: '700', color: col, align: 'center', alpha: showSl });
                });
                const de = etaB - etaA;
                u.text(ctx, 'Δη = ' + de.toFixed(1), (X(etaA) + X(etaB)) / 2, bot + 40, { size: 12, weight: '600', align: 'center', alpha: showSl });
            }
            // right: transverse view of slices a and b
            const cyR = H * 0.45, rr = Math.min(W * 0.065, H * 0.16);
            const cxA = W * 0.74, cxB = W * 0.9;
            [[cxA, etaA, 'slice a', C.blue], [cxB, etaB, 'slice b', C.purple]].forEach(([cx, e, lab, col]) => {
                ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.globalAlpha = showSl;
                ctx.beginPath(); ctx.arc(cx, cyR, rr, 0, 2 * Math.PI); ctx.stroke(); ctx.restore();
                u.text(ctx, lab, cx, cyR - rr - 10, { size: 12, weight: '700', color: col, align: 'center', alpha: showSl });
                if (showSl <= 0) return;
                s.segs.forEach(g => {
                    if (!(g.a <= e && g.b >= e)) return;
                    const other = e === etaA ? etaB : etaA;
                    const shared = g.a <= other && g.b >= other;
                    const x = cx + g.x * rr, y = cyR + g.y * rr;
                    if (shared) u.ball(ctx, x, y, 4.5, C.red, showSl);
                    else { ctx.save(); ctx.globalAlpha = showSl; ctx.strokeStyle = C.red; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, 4, 0, 2 * Math.PI); ctx.stroke(); ctx.restore(); }
                });
            });
            if (showSl > 0) {
                const frac = cnt.AB / Math.max(1, Math.max(cnt.A, cnt.B));
                u.text(ctx, 'shared segments: ' + cnt.AB + ' of ' + Math.max(cnt.A, cnt.B), (cxA + cxB) / 2, cyR + rr + 24, { size: 12, weight: '600', align: 'center', alpha: showSl });
                const bw = cxB - cxA + rr, bx = (cxA + cxB) / 2 - bw / 2, by = cyR + rr + 34;
                ctx.save(); ctx.globalAlpha = showSl;
                ctx.fillStyle = C.grid; ctx.fillRect(bx, by, bw, 10);
                ctx.fillStyle = C.red; ctx.fillRect(bx, by, bw * frac, 10); ctx.restore();
                u.text(ctx, 'filled = shared, open = not shared', (cxA + cxB) / 2, by + 28, { size: 11, color: C.muted, align: 'center', alpha: showSl });
            }
            u.text(ctx, 'schematic', W - 10, H - 8, { size: 11, color: C.muted, align: 'right' });
        }
    });

    // ------------------------------------------------------------------
    // 3. Non-flow: short-range clusters on top of the flow pattern
    // ------------------------------------------------------------------
    register('longitudinal-decorrelations-nonflow', {
        duration: 12,
        aspect: 16 / 8,
        phases: [
            { t: 0, label: 'Step 1 · Flow: particles at all rapidities prefer the same two directions' },
            { t: 3.5, label: 'Step 2 · Non-flow: small groups from decays and jets, close in rapidity and angle' },
            { t: 7, label: 'Step 3 · Both non-flow and local fluctuations add pairs at small |Δη|: hard to tell apart' }
        ],
        setup() {
            const rand = u.rng(515);
            const flow = [];
            while (flow.length < 130) {
                const eta = -2 + 4 * rand(), phi = rand() * 2 * Math.PI;
                if (rand() < Math.pow((1 + Math.cos(2 * (phi - 1.2))) / 2, 2.5)) flow.push({ eta, phi });
            }
            const clusters = [[-1.3, 4.6], [0.4, 2.3], [1.4, 5.6], [-0.5, 0.6]].map(([e, p]) => ({
                e, p, pts: Array.from({ length: 6 }, () => ({ eta: e + 0.22 * u.gauss(rand), phi: p + 0.22 * u.gauss(rand) }))
            }));
            return { flow, clusters };
        },
        draw(ctx, t, s, W, H) {
            // left: eta-phi map
            const bx = 52, by = 36, bw = W * 0.44, bh = H - 92;
            const X = e => bx + (e + 2) / 4 * bw, Y = p => by + bh - p / (2 * Math.PI) * bh;
            ctx.save(); ctx.fillStyle = '#fff'; ctx.fillRect(bx, by, bw, bh); ctx.strokeStyle = C.grid; ctx.strokeRect(bx, by, bw, bh); ctx.restore();
            // flow bands
            [1.2, 1.2 + Math.PI].forEach(p => { ctx.save(); ctx.fillStyle = 'rgba(31,95,191,0.07)'; ctx.fillRect(bx, Y(p) - bh * 0.07, bw, bh * 0.14); ctx.restore(); });
            const fin = u.seg(t, 0, 1.5);
            s.flow.forEach(d => { ctx.save(); ctx.globalAlpha = fin; ctx.fillStyle = C.blue; ctx.beginPath(); ctx.arc(X(d.eta), Y(d.phi), 2.2, 0, 2 * Math.PI); ctx.fill(); ctx.restore(); });
            const cin = u.seg(t, 3.5, 4.8);
            s.clusters.forEach(c => {
                if (cin <= 0) return;
                ctx.save(); ctx.globalAlpha = cin; ctx.strokeStyle = GREY; ctx.lineWidth = 1.2; ctx.setLineDash([3, 3]);
                ctx.beginPath(); ctx.ellipse(X(c.e), Y(c.p), bw * 0.07, bh * 0.08, 0, 0, 2 * Math.PI); ctx.stroke(); ctx.restore();
                c.pts.forEach(d => { if (d.phi > 0 && d.phi < 2 * Math.PI && d.eta > -2 && d.eta < 2) u.ball(ctx, X(d.eta), Y(d.phi), 3.2, '#4a4f57', cin); });
            });
            u.text(ctx, 'η →', bx + bw, by + bh + 18, { size: 12, color: C.muted, align: 'right' });
            u.text(ctx, 'detector unrolled: rapidity η across, angle φ up', bx, by - 12, { size: 11, color: C.muted });
            ctx.save(); ctx.translate(bx - 12, by + bh / 2); ctx.rotate(-Math.PI / 2); u.text(ctx, 'angle φ', 0, 0, { size: 12, color: C.muted, align: 'center' }); ctx.restore();
            u.text(ctx, 'blue: flow   dark groups: non-flow', bx, by + bh + 36, { size: 11, color: C.muted });
            // pair highlight in step 3
            const pin = u.seg(t, 7, 7.8);
            if (pin > 0) {
                const c = s.clusters[1].pts;
                u.line(ctx, [[X(c[0].eta), Y(c[0].phi)], [X(c[1].eta), Y(c[1].phi)]], '#4a4f57', 2);
                const f1 = s.flow[3], f2 = s.flow.find(d => Math.abs(d.eta - f1.eta) > 2.5) || s.flow[10];
                u.line(ctx, [[X(f1.eta), Y(f1.phi)], [X(f2.eta), Y(f2.phi)]], C.blue, 1.5, [5, 4]);
            }
            // right: schematic pair correlation vs |Δη|
            const ax = { x: W * 0.6, y: 44, w: W * 0.36, h: H - 110 };
            const m = u.axes(ctx, ax, [0, 4], [0, 1.25], { xticks: [0, 1, 2, 3, 4], yticks: false, xlabel: 'pair separation |Δη|', ylabel: 'pair correlation' });
            const L = x => 0.55 - 0.01 * x * x, S = x => 0.17 / (1 + Math.exp((x - 2.6) / 0.5)), NF = x => 0.3 * Math.exp(-(x / 1.0) * (x / 1.0));
            const band = (lo, hi, fill, alpha) => {
                ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = fill; ctx.beginPath();
                for (let i = 0; i <= 40; i++) { const x = 4 * i / 40; i ? ctx.lineTo(m.X(x), m.Y(hi(x))) : ctx.moveTo(m.X(x), m.Y(hi(x))); }
                for (let i = 40; i >= 0; i--) { const x = 4 * i / 40; ctx.lineTo(m.X(x), m.Y(lo(x))); }
                ctx.closePath(); ctx.fill(); ctx.restore();
            };
            band(() => 0, L, BLUE_FILL, fin);
            u.text(ctx, 'flow (long range)', m.X(2), m.Y(0.25), { size: 11, weight: '600', color: C.blue, align: 'center', alpha: fin });
            band(L, x => L(x) + NF(x), GREY_FILL, cin);
            u.text(ctx, 'non-flow', m.X(0.15), m.Y(0.95), { size: 11, weight: '600', color: '#4a4f57', alpha: cin });
            if (pin > 0) {
                band(x => L(x) + NF(x), x => L(x) + NF(x) + S(x), PINK_FILL, pin);
                u.text(ctx, 'local fluctuations?', m.X(1.5), m.Y(0.95), { size: 11, weight: '600', color: C.red, alpha: pin });
                u.text(ctx, 'both sit at small |Δη|', ax.x + ax.w / 2, ax.y - 10, { size: 12, weight: '700', align: 'center', alpha: pin });
            }
            u.text(ctx, 'schematic', W - 10, H - 8, { size: 11, color: C.muted, align: 'right' });
        }
    });

    // ------------------------------------------------------------------
    // 4. Method: peel the 2PC into long-range, short-range and non-flow
    // ------------------------------------------------------------------
    const Lr = x => 0.56 - 0.006 * x * x;
    const Sr = x => 0.15 / (1 + Math.exp((x - 3.0) / 0.8));
    const Nf = x => 0.22 * Math.exp(-Math.pow(x / 1.1, 2));
    function bandPath(ctx, m, lo, hi, fill, alpha, xmax = 4) {
        if (alpha <= 0) return;
        ctx.save(); ctx.globalAlpha *= alpha; ctx.fillStyle = fill; ctx.beginPath();
        for (let i = 0; i <= 60; i++) { const x = xmax * i / 60; i ? ctx.lineTo(m.X(x), m.Y(hi(x))) : ctx.moveTo(m.X(x), m.Y(hi(x))); }
        for (let i = 60; i >= 0; i--) { const x = xmax * i / 60; ctx.lineTo(m.X(x), m.Y(lo(x))); }
        ctx.closePath(); ctx.fill(); ctx.restore();
    }
    function curve(ctx, m, f, col, w, upto, dash) {
        const pts = [];
        for (let i = 0; i <= 60; i++) { const x = upto * i / 60; pts.push([m.X(x), m.Y(f(x))]); }
        u.line(ctx, pts, col, w, dash);
    }

    register('longitudinal-decorrelations-method', {
        duration: 13,
        aspect: 16 / 8,
        phases: [
            { t: 0, label: 'Step 1 · The usual two-particle measurement sees everything mixed together (black)' },
            { t: 3, label: 'Step 2 · Line flow up with the nucleons\' shape: only the long-range part survives (blue)' },
            { t: 6.3, label: 'Step 3 · Line it up with the early quark shape: the local, short-range part is added (red)' },
            { t: 9.6, label: 'Step 4 · The gap left at small |Δη| is non-flow (grey)' }
        ],
        setup() { return {}; },
        draw(ctx, t, s, W, H) {
            const ax = { x: 70, y: 30, w: W * 0.56, h: H - 90 };
            const m = u.axes(ctx, ax, [0, 4], [0, 1.15], { xticks: [0, 1, 2, 3, 4], yticks: false, xlabel: 'pair separation |Δη|', ylabel: 'elliptic-flow correlation' });
            const tot = x => Lr(x) + Sr(x) + Nf(x);
            const p1 = u.ease(u.seg(t, 0.2, 2.6));
            const p2 = u.ease(u.seg(t, 3, 5)), p3 = u.ease(u.seg(t, 6.3, 8.3)), p4 = u.ease(u.seg(t, 9.6, 10.8));
            bandPath(ctx, m, () => 0, Lr, BLUE_FILL, p2);
            bandPath(ctx, m, Lr, x => Lr(x) + Sr(x), PINK_FILL, p3);
            bandPath(ctx, m, x => Lr(x) + Sr(x), tot, GREY_FILL, p4);
            curve(ctx, m, tot, C.ink, 2.5, 4 * p1);
            if (p2 > 0) curve(ctx, m, Lr, C.blue, 2.5, 4 * p2);
            if (p3 > 0) curve(ctx, m, x => Lr(x) + Sr(x), C.red, 2.5, 4 * p3);
            // labels inside plot
            if (p2 > 0) u.text(ctx, 'long range (global twist)', m.X(2), m.Y(0.25), { size: 12, weight: '600', color: C.blue, align: 'center', alpha: p2 });
            if (p3 > 0) u.text(ctx, 'short range (local)', m.X(2.0), m.Y(0.585), { size: 12, weight: '600', color: C.red, alpha: p3 });
            if (p4 > 0) u.text(ctx, 'non-flow', m.X(0.12), m.Y(1.02), { size: 12, weight: '600', color: '#4a4f57', alpha: p4 });
            // legend / key on the right
            const lx = W * 0.7, ly = 54;
            const row = (i, col, a, txt1, txt2) => {
                if (a <= 0) return;
                const y = ly + i * 62;
                u.line(ctx, [[lx, y - 4], [lx + 22, y - 4]], col, 3);
                u.text(ctx, txt1, lx + 30, y, { size: 12, weight: '700', color: col, alpha: a });
                u.text(ctx, txt2, lx + 30, y + 17, { size: 11, color: C.muted, alpha: a });
            };
            row(0, C.ink, p1, 'standard 2-particle', 'flow + all correlations');
            row(1, C.blue, p2, 'flow × nucleon shape', 'long range only, no non-flow');
            row(2, C.red, p3, 'flow × early quark shape', 'adds local fluctuations, no non-flow');
            row(3, GREY, p4, 'difference', '≈ non-flow (an upper limit)');
            u.text(ctx, 'schematic', W - 10, H - 8, { size: 11, color: C.muted, align: 'right' });
        }
    });

    // ------------------------------------------------------------------
    // 5. Deformed vs spherical nuclei: how the ratio exposes short-range parts
    // ------------------------------------------------------------------
    register('longitudinal-decorrelations-ratio', {
        duration: 14,
        aspect: 16 / 8,
        phases: [
            { t: 0, label: 'Step 1 · Spherical uranium: long-range + short-range + non-flow' },
            { t: 3, label: 'Step 2 · Deformed uranium adds extra flow from its shape, only in the long-range part' },
            { t: 6, label: 'Step 3 · Sweep |Δη|: short-range parts dilute the ratio at small |Δη| and fade further out' },
            { t: 11, label: 'Step 4 · Black: real ratio. Blue dashed: long-range parts only' }
        ],
        setup() { return {}; },
        draw(ctx, t, s, W, H) {
            const extra = x => 2 * Lr(x);   // b·β² term, same shape as long-range part
            const sph = x => Lr(x) + Sr(x) + Nf(x);
            const R = x => (sph(x) + extra(x)) / sph(x);
            const p2 = u.ease(u.seg(t, 3, 4.6));
            const x = t < 6 ? 0.2 : u.lerp(0.2, 4, u.ease(u.seg(t, 6, 10.5)));
            // left: stacked bars
            const base = H - 54, sc = (H - 120) / 2.1;
            const bar = (cx, comps, title) => {
                let y = base;
                comps.forEach(([v, fill, a]) => {
                    if (a <= 0 || v <= 0) return;
                    const h = v * sc * a;
                    ctx.save(); ctx.fillStyle = fill; ctx.fillRect(cx - 30, y - h, 60, h); ctx.restore();
                    y -= h;
                });
                u.text(ctx, title, cx, base + 18, { size: 12, weight: '700', align: 'center' });
            };
            const bxA = W * 0.1, bxB = W * 0.27;
            bar(bxA, [[Lr(x), BLUE_FILL, 1], [Sr(x), PINK_FILL, 1], [Nf(x), GREY_FILL, 1]], 'spherical U');
            u.text(ctx, '(β = 0)', bxA, base + 34, { size: 11, color: C.muted, align: 'center' });
            bar(bxB, [[Lr(x), BLUE_FILL, 1], [extra(x), 'rgba(31,95,191,0.45)', p2], [Sr(x), PINK_FILL, 1], [Nf(x), GREY_FILL, 1]], 'deformed U');
            u.text(ctx, '(β = 0.28)', bxB, base + 34, { size: 11, color: C.muted, align: 'center' });
            u.line(ctx, [[W * 0.03, base], [W * 0.35, base]], C.gray, 1);
            if (p2 > 0) u.text(ctx, '+ shape-driven flow', bxB + 36, base - (Lr(x) + extra(x) * 0.5) * sc, { size: 11, weight: '600', color: C.blue, alpha: p2 });
            u.text(ctx, 'flow correlation at |Δη| = ' + x.toFixed(1), W * 0.19, 22, { size: 12, weight: '600', align: 'center' });
            // key
            const ky = 40;
            [['long range', BLUE_FILL], ['short range', PINK_FILL], ['non-flow', GREY_FILL]].forEach(([lab, f], i) => {
                const kx = W * 0.03 + i * W * 0.11;
                ctx.save(); ctx.fillStyle = f; ctx.fillRect(kx, ky - 9, 10, 10); ctx.restore();
                u.text(ctx, lab, kx + 14, ky, { size: 11, color: C.muted });
            });
            // right: ratio vs |Δη|
            const ax = { x: W * 0.52, y: 34, w: W * 0.44, h: H - 100 };
            const m = u.axes(ctx, ax, [0, 4], [1.8, 3.2], { xticks: [0, 1, 2, 3, 4], yticks: false, xlabel: 'pair separation |Δη|', ylabel: 'ratio deformed / spherical' });
            if (t >= 6) {
                const ptsx = [];
                for (let i = 0; i <= 40; i++) { const xx = 0.2 + (x - 0.2) * i / 40; ptsx.push([m.X(xx), m.Y(R(xx))]); }
                u.line(ctx, ptsx, C.ink, 2.5);
                u.ball(ctx, m.X(x), m.Y(R(x)), 5, C.ink);
                u.line(ctx, [[m.X(x), ax.y], [m.X(x), ax.y + ax.h]], C.gray, 1, [3, 3]);
            }
            if (t >= 11) {
                const a = u.seg(t, 11, 11.8);
                ctx.save(); ctx.globalAlpha = a;
                u.line(ctx, [[m.X(0), m.Y(3)], [m.X(4), m.Y(3)]], C.blue, 2, [6, 4]);
                ctx.restore();
                u.text(ctx, 'long-range parts only (flat)', m.X(0.15), m.Y(3) - 8, { size: 11, weight: '600', color: C.blue, alpha: a });
                u.text(ctx, 'gap = dilution by short-range parts', m.X(0.15), m.Y(2.86), { size: 11, weight: '600', color: C.ink, alpha: a });
            }
            u.text(ctx, 'schematic', W - 10, H - 8, { size: 11, color: C.muted, align: 'right' });
        }
    });
})();
