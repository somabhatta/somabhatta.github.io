/* Custom animations for research/preferential-emission-spectators.html
   (Bhatta & Bairathi, Phys. Rev. C 113, 024917 (2026), arXiv:2407.06977).
   All panels are schematic illustrations, not results of the paper. */
(function () {
    'use strict';
    const { register, glauber, C, u } = window.Anim;

    const FS = (W) => (W < 520 ? 10 : 12);          // base font size
    const YB = 5.4;                                    // beam rapidity at 200 GeV
    // particle emission profile of one participant (schematic, peaks along its motion)
    const gEta = (eta) => Math.exp(-eta * eta / (2 * 2.6 * 2.6));
    const fF = (eta) => Math.max(0, gEta(eta) * (1 + eta / YB) / 2);   // right-moving (forward) nucleon
    const fB = (eta) => Math.max(0, gEta(eta) * (1 - eta / YB) / 2);   // left-moving (backward) nucleon

    // ---------------- 1. preferential emission tilts dN/deta ----------------
    register('preferential-emission-spectators-emission', {
        duration: 11,
        aspect: 16 / 9,
        phases: [
            { t: 0, label: 'Step 1 · Equal participants from both nuclei: particle production is symmetric' },
            { t: 3.4, label: 'Step 2 · More participants from the right-moving nucleus: more particles at positive η' },
            { t: 7.2, label: 'Step 3 · More from the left-moving nucleus: the tilt flips' }
        ],
        setup() { return {}; },
        draw(ctx, t, s, W, H) {
            const fs = FS(W);
            // N_F, N_B with smooth transitions
            const k1 = u.ease(u.seg(t, 3.4, 4.6)), k2 = u.ease(u.seg(t, 7.2, 8.4)), k3 = u.ease(u.seg(t, 10.3, 11));
            const d = 15 * k1 - 30 * k2 + 15 * k3;
            const NF = 60 + d, NB = 60 - d;
            const L = W < 520 ? 44 : 60;
            const top = { x: L, y: 10, w: W - L - 14, h: H * 0.56 - 10 };
            const bot = { x: L, y: H * 0.56 + 14, w: W - L - 14, h: H * 0.44 - 52 };
            const m1 = u.axes(ctx, top, [-5, 5], [0, 85], { xticks: false, yticks: false, ylabel: 'particles' });
            const fill = (fn, N, col) => {
                ctx.save(); ctx.fillStyle = col; ctx.globalAlpha = 0.18; ctx.beginPath(); ctx.moveTo(m1.X(-5), m1.Y(0));
                for (let i = 0; i <= 100; i++) { const e = -5 + 10 * i / 100; ctx.lineTo(m1.X(e), m1.Y(N * fn(e))); }
                ctx.lineTo(m1.X(5), m1.Y(0)); ctx.closePath(); ctx.fill(); ctx.restore();
                const pts = []; for (let i = 0; i <= 100; i++) { const e = -5 + 10 * i / 100; pts.push([m1.X(e), m1.Y(N * fn(e))]); }
                u.line(ctx, pts, col, 1.6);
            };
            fill(fF, NF, C.blue);
            fill(fB, NB, C.purple);
            const sym = [], tot = [];
            for (let i = 0; i <= 100; i++) {
                const e = -5 + 10 * i / 100;
                sym.push([m1.X(e), m1.Y(60 * (fF(e) + fB(e)))]);
                tot.push([m1.X(e), m1.Y(NF * fF(e) + NB * fB(e))]);
            }
            u.line(ctx, sym, C.gray, 2, [6, 4]);
            u.line(ctx, tot, C.ink, 2.6);
            u.text(ctx, `→ right-moving nucleus: ${Math.round(NF)} participants`, top.x + 8, top.y + 18, { size: fs, weight: '700', color: C.blue });
            u.text(ctx, `← left-moving nucleus: ${Math.round(NB)} participants`, top.x + 8, top.y + 18 + fs + 5, { size: fs, weight: '700', color: C.purple });
            u.text(ctx, 'total', m1.X(2.4) + 6, m1.Y(NF * fF(2.4) + NB * fB(2.4)) - 6, { size: fs, weight: '700', color: C.ink });
            u.text(ctx, '- - symmetric event', top.x + top.w - 8, top.y + 18, { size: fs - 1, color: C.muted, align: 'right' });
            u.text(ctx, 'schematic', top.x + top.w - 8, top.y + top.h - 8, { size: fs - 2, color: C.muted, align: 'right' });

            const m2 = u.axes(ctx, bot, [-5, 5], [0.7, 1.3], { zero: false, xticks: [-4, -2, 0, 2, 4], yticks: false, xlabel: 'pseudorapidity η  (← backward · forward →)', ylabel: 'ratio' });
            ctx.save(); ctx.strokeStyle = C.gray; ctx.setLineDash([4, 4]);
            ctx.beginPath(); ctx.moveTo(bot.x, m2.Y(1)); ctx.lineTo(bot.x + bot.w, m2.Y(1)); ctx.stroke(); ctx.restore();
            const rat = [];
            for (let i = 0; i <= 100; i++) {
                const e = -4.6 + 9.2 * i / 100;
                rat.push([m2.X(e), m2.Y(u.clamp((NF * fF(e) + NB * fB(e)) / (60 * (fF(e) + fB(e))), 0.7, 1.3))]);
            }
            u.line(ctx, rat, d >= 0 ? C.blue : C.purple, 2.6);
            u.text(ctx, 'this event ÷ symmetric event', bot.x + 8, bot.y + fs + 4, { size: fs - 1, color: C.muted });
        }
    });

    // ---------------- 2. side view: asymmetric event, ZDCs, tilted emission ----------------
    register('preferential-emission-spectators-sideview', {
        duration: 11,
        aspect: 16 / 9,
        phases: [
            { t: 0, label: 'Step 1 · Two gold nuclei approach: one moves right (forward), one moves left (backward)' },
            { t: 2.2, label: (s) => `Step 2 · By chance, the ${s.ev().fwd ? 'right' : 'left'}-moving nucleus loses more nucleons to the collision (${s.ev().big} vs ${s.ev().small})` },
            { t: 4.0, label: (s) => `Step 3 · So it has fewer spectators left: the ${s.ev().fwd ? 'forward' : 'backward'} ZDC counts less` },
            { t: 6.2, label: (s) => `Step 4 · More particles come out on the ${s.ev().fwd ? 'forward (right)' : 'backward (left)'} side` }
        ],
        setup(p, W, H, old) {
            const st = { which: old ? old.which : 0 };
            // pick the most asymmetric of a handful of Monte Carlo Glauber Au+Au events
            const evs = [];
            for (let k = 0; k < 14; k++) {
                const rand = u.rng(301 + 977 * k);
                const ev = glauber.event({ nucleus: 'Au197', b: 6.5, sigma: 4.2 }, rand);
                const nF = ev.pa.filter(Boolean).length, nB = ev.pb.filter(Boolean).length;
                evs.push({ ev, nF, nB, a: nF - nB });
            }
            evs.sort((x, y) => x.a - y.a);
            const mk = (e, seed) => {
                const rand = u.rng(seed), parts = [];
                const fwd = e.a > 0;
                // particles: eta sampled from N_F f_F + N_B f_B, asymmetry exaggerated x4 for visibility
                const NF = 60 + 4 * (e.nF - e.nB) / 2, NB = 60 - 4 * (e.nF - e.nB) / 2;
                while (parts.length < 150) {
                    const eta = (rand() * 2 - 1) * 4.2;
                    if (rand() * 70 < NF * fF(eta) + NB * fB(eta)) parts.push({ eta, ph: rand() * 2 * Math.PI, v: 0.75 + 0.35 * rand(), d: rand() });
                }
                return {
                    e, fwd, parts,
                    big: Math.max(e.nF, e.nB), small: Math.min(e.nF, e.nB),
                    sF: 197 - e.nF, sB: 197 - e.nB,
                    nPos: parts.filter(q => q.eta > 0).length, nNeg: parts.filter(q => q.eta < 0).length
                };
            };
            st.events = [mk(evs[evs.length - 1], 5), mk(evs[0], 6)];
            st.ev = () => st.events[st.which % 2];
            return st;
        },
        onLoop(st) { st.which++; },
        draw(ctx, t, s, W, H) {
            const fs = FS(W), E = s.ev(), ev = E.e.ev;
            const cx = W / 2, cy = H * 0.43;
            const sy = (H * 0.235) / 6.4;
            const zw = Math.max(22, W * 0.04), zh = H * 0.26;
            const zL = 8, zR = W - 8 - zw;
            // beam line and ZDCs
            ctx.save(); ctx.strokeStyle = C.grid; ctx.beginPath(); ctx.moveTo(zL + zw, cy); ctx.lineTo(zR, cy); ctx.stroke(); ctx.restore();
            [[zL, 'backward ZDC'], [zR, 'forward ZDC']].forEach(([x, l], i) => {
                ctx.save(); ctx.fillStyle = 'rgba(19,138,138,0.12)'; ctx.strokeStyle = C.teal;
                ctx.fillRect(x, cy - zh / 2, zw, zh); ctx.strokeRect(x + 0.5, cy - zh / 2 + 0.5, zw, zh); ctx.restore();
                u.text(ctx, l, i ? W - 8 : 8, cy - zh / 2 - 6, { size: fs - 1, color: C.teal, weight: '700', align: i ? 'right' : 'left' });
            });
            const app = u.ease(u.seg(t, 0, 2.2));
            const fly = u.ease(u.seg(t, 2.6, 5.0));
            const L0 = W * 0.36;
            const reachL = zL + zw * 0.5, reachR = zR + zw * 0.5;
            // fireball
            const fb = u.seg(t, 2.3, 3.2), fade = u.seg(t, 7.5, 11);
            if (fb > 0) u.glow(ctx, cx, cy, (0.5 + 0.9 * fb) * 4.5 * sy, u.heat(0.8, 0.8), fb * (1 - 0.6 * fade));
            // particles
            const em = u.seg(t, 5.8, 9.5);
            if (em > 0) {
                E.parts.forEach(q => {
                    const e = u.clamp((em - q.d * 0.3) / 0.7, 0, 1); if (e <= 0) return;
                    const th = 2 * Math.atan(Math.exp(-q.eta));
                    const Lr = e * q.v * Math.min(W * 0.36, H * 0.95);
                    const x = cx + Lr * Math.cos(th), y = cy - Lr * Math.sin(th) * Math.cos(q.ph) * 0.75;
                    ctx.save(); ctx.globalAlpha = 0.85 - 0.45 * e; ctx.fillStyle = q.eta > 0 ? C.blue : C.purple;
                    ctx.beginPath(); ctx.arc(x, y, W < 520 ? 1.5 : 2.2, 0, 2 * Math.PI); ctx.fill(); ctx.restore();
                });
            }
            // nucleons
            const r = Math.max(1.4, 0.42 * sy);
            const disc = (pts, part, dir) => {          // dir +1: moves right (forward)
                const col = dir > 0 ? C.blue : C.purple;
                pts.forEach((q, i) => {
                    const yy = cy + q[0] * sy * 1.0;
                    const dz = q[2] * 0.06 * sy;
                    let x, a = 1, c = col, yAdj = yy;
                    if (t < 2.2) x = cx - dir * L0 * (1 - app) + dz;
                    else if (part[i]) {
                        x = cx + dz; a = 1 - u.seg(t, 3.0, 4.2);
                        c = u.shade(col, 0.25);
                    } else {
                        x = cx + dz + dir * fly * ((dir > 0 ? reachR : cx - reachL) - (dir > 0 ? cx : 0));
                        c = t > 2.4 ? C.gray : col;
                        yAdj = u.lerp(yy, cy + (yy - cy) * 0.22, fly);
                        if (fly >= 1) a = 1 - u.seg(t, 5.0, 5.8);
                    }
                    if (a <= 0.02) return;
                    u.ball(ctx, x, yAdj, part[i] && t >= 2.2 ? r * 1.15 : r, c, a);
                });
            };
            disc(ev.A, ev.pa, 1);
            disc(ev.B, ev.pb, -1);
            if (t < 1.6) {
                u.text(ctx, 'moving →', cx - L0 * (1 - app) - 20, cy - 4, { size: fs, weight: '700', color: C.blue, align: 'right' });
                u.text(ctx, '← moving', cx + L0 * (1 - app) + 20, cy - 4, { size: fs, weight: '700', color: C.purple, align: 'left' });
            }
            // counters
            const yT = H - (W < 520 ? 30 : 40), yT2 = H - (W < 520 ? 14 : 18);
            if (t > 2.4) {
                u.text(ctx, 'participants', cx, yT, { size: fs, color: C.muted, align: 'center' });
                u.text(ctx, `${E.e.nB} ←`, cx - 8, yT2, { size: fs + 1, weight: '700', color: C.purple, align: 'right' });
                u.text(ctx, `→ ${E.e.nF}`, cx + 8, yT2, { size: fs + 1, weight: '700', color: C.blue, align: 'left' });
            }
            if (t > 4.6) {
                u.text(ctx, `${E.sB} spectators`, 8, cy + zh / 2 + fs + 6, { size: fs, weight: '700', color: C.teal });
                u.text(ctx, `${E.sF} spectators`, W - 8, cy + zh / 2 + fs + 6, { size: fs, weight: '700', color: C.teal, align: 'right' });
            }
            if (t > 8.0) {
                const a = u.seg(t, 8.0, 8.6);
                u.text(ctx, `${E.nNeg} particles at η < 0`, cx - W * 0.2, yT2, { size: fs, weight: '700', color: C.purple, align: 'right', alpha: a });
                u.text(ctx, `${E.nPos} particles at η > 0`, cx + W * 0.2, yT2, { size: fs, weight: '700', color: C.blue, align: 'left', alpha: a });
            }
            u.text(ctx, 'schematic · particle tilt exaggerated', W - 8, 14, { size: fs - 2, color: C.muted, align: 'right' });
            u.text(ctx, 'Au+Au', 8, 14, { size: fs, weight: '700' });
        }
    });

    // ---------------- 3. the correlator: ZDC asymmetry vs. particle asymmetry in ±eta windows ----------------
    register('preferential-emission-spectators-correlator', {
        duration: 12,
        aspect: 16 / 10,
        phases: [
            { t: 0, label: 'Step 1 · Windows near η = 0: the particle asymmetry barely follows the ZDC asymmetry' },
            { t: 4, label: 'Step 2 · Move the windows outward: a clear trend appears' },
            { t: 8, label: 'Step 3 · Far forward the trend is strongest: particles there "remember" their parent nucleons' }
        ],
        setup() {
            const rand = u.rng(77), ev = [];
            for (let i = 0; i < 320; i++) ev.push({ a: u.gauss(rand), n1: u.gauss(rand), n2: u.gauss(rand) });
            return { ev };
        },
        draw(ctx, t, s, W, H) {
            const fs = FS(W);
            const k1 = u.ease(u.seg(t, 4, 5.4)), k2 = u.ease(u.seg(t, 8, 9.4)), k3 = u.ease(u.seg(t, 11.3, 12));
            const eta = 0.3 + 1.6 * k1 + 1.8 * k2 - 3.4 * k3;
            const sc = 0.165 * eta;                     // toy: strength of the eta-odd response grows with eta
            // ---- detector strip
            const sx0 = W < 520 ? 40 : 70, sx1 = W - (W < 520 ? 40 : 70), sy = H * 0.13;
            const X = (e) => sx0 + (e + 5) / 10 * (sx1 - sx0);
            ctx.save(); ctx.strokeStyle = C.gray; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(sx0, sy); ctx.lineTo(sx1, sy); ctx.stroke(); ctx.restore();
            [-4, -2, 0, 2, 4].forEach(v => { ctx.fillStyle = C.gray; ctx.fillRect(X(v), sy - 3, 1, 6); u.text(ctx, String(v), X(v), sy + 16, { size: fs - 2, color: C.muted, align: 'center' }); });
            u.text(ctx, 'η', sx1 + 6, sy + 4, { size: fs, color: C.muted });
            ctx.save(); ctx.fillStyle = 'rgba(19,138,138,0.15)'; ctx.strokeStyle = C.teal;
            ctx.fillRect(4, sy - 12, sx0 - 12, 24); ctx.strokeRect(4.5, sy - 11.5, sx0 - 12, 24);
            ctx.fillRect(sx1 + 8 + (W < 520 ? 0 : 6), sy - 12, W - sx1 - 12 - (W < 520 ? 0 : 6), 24);
            ctx.strokeRect(sx1 + 8.5 + (W < 520 ? 0 : 6), sy - 11.5, W - sx1 - 12 - (W < 520 ? 0 : 6), 24); ctx.restore();
            u.text(ctx, 'ZDC', 4 + (sx0 - 12) / 2, sy + 4, { size: fs - 2, weight: '700', color: C.teal, align: 'center' });
            u.text(ctx, 'ZDC', (sx1 + 8 + (W < 520 ? 0 : 6) + W - 4) / 2, sy + 4, { size: fs - 2, weight: '700', color: C.teal, align: 'center' });
            u.glow(ctx, X(0), sy, 12, u.heat(0.9, 0.9));
            const ww = (X(0.2) - X(0)) * 2;
            [[-eta, C.purple, '−η'], [eta, C.blue, '+η']].forEach(([e, col, lb]) => {
                ctx.save(); ctx.fillStyle = col; ctx.globalAlpha = 0.25; ctx.fillRect(X(e) - ww / 2, sy - 16, ww, 32); ctx.restore();
                ctx.save(); ctx.strokeStyle = col; ctx.strokeRect(X(e) - ww / 2 + 0.5, sy - 15.5, ww, 32); ctx.restore();
                u.text(ctx, lb, X(e), sy - 20, { size: fs, weight: '700', color: col, align: 'center' });
            });
            u.text(ctx, `window at η = ±${eta.toFixed(1)}`, W / 2, sy + 34, { size: fs, weight: '600', color: C.ink, align: 'center' });

            // ---- scatter
            const L = W < 520 ? 40 : 70;
            const box = { x: L, y: H * 0.13 + 48, w: Math.min(W - L - 20, W < 520 ? W - L - 20 : W * 0.55), h: H - (H * 0.13 + 48) - 40 };
            const m = u.axes(ctx, box, [-3.2, 3.2], [-3.2, 3.2], { xticks: false, yticks: false,
                xlabel: 'spectator asymmetry (ZDCs)', ylabel: W < 520 ? 'particle asym.' : 'particle asymmetry' });
            ctx.save(); ctx.strokeStyle = C.grid; ctx.beginPath();
            ctx.moveTo(m.X(0), box.y); ctx.lineTo(m.X(0), box.y + box.h); ctx.moveTo(box.x, m.Y(0)); ctx.lineTo(box.x + box.w, m.Y(0)); ctx.stroke(); ctx.restore();
            let sxy = 0, sxx = 0, syy = 0, sx = 0, sySum = 0;
            const pts = s.ev.map(q => {
                const xs = -0.8 * q.a + 0.6 * q.n1;                       // spectator asymmetry ~ minus participant asymmetry
                const ys = sc * q.a + Math.sqrt(1 - sc * sc) * q.n2;      // particle asymmetry at this eta
                sxy += xs * ys; sxx += xs * xs; syy += ys * ys; sx += xs; sySum += ys;
                return [xs, ys];
            });
            // Signed, centered Pearson r for the axes actually drawn below.
            // A paper may choose the opposite asymmetry sign convention.
            const meanX = sx / pts.length, meanY = sySum / pts.length;
            sxy -= pts.length * meanX * meanY;
            sxx -= pts.length * meanX * meanX;
            syy -= pts.length * meanY * meanY;
            const rho = sxy / Math.sqrt(Math.max(sxx * syy, 1e-12));
            ctx.save(); ctx.fillStyle = C.navy; ctx.globalAlpha = 0.5;
            pts.forEach(p => { if (Math.abs(p[0]) < 3.2 && Math.abs(p[1]) < 3.2) { ctx.beginPath(); ctx.arc(m.X(p[0]), m.Y(p[1]), W < 520 ? 1.6 : 2.4, 0, 2 * Math.PI); ctx.fill(); } });
            ctx.restore();
            // trend line
            const slope = sxy / Math.max(sxx, 1e-12), intercept = meanY - slope * meanX;
            u.line(ctx, [[m.X(-3), m.Y(intercept - 3 * slope)], [m.X(3), m.Y(intercept + 3 * slope)]], C.orange, 2.4);
            u.text(ctx, 'toy events (schematic)', box.x + box.w - 6, box.y + box.h - 6, { size: fs - 2, color: C.muted, align: 'right' });
            // readout
            if (W >= 520) {
                const rx = box.x + box.w + 30;
                u.text(ctx, 'Pearson r (shown axes)', rx, box.y + 30, { size: 13, color: C.muted });
                u.text(ctx, `r = ${rho.toFixed(2)}`, rx, box.y + 62, { size: 26, weight: '700', color: C.orange });
                u.text(ctx, 'each dot = one collision', rx, box.y + 96, { size: 12, color: C.muted });
                u.text(ctx, 'more forward spectators', rx, box.y + 126, { size: 12, color: C.ink });
                u.text(ctx, '→ fewer forward participants', rx, box.y + 144, { size: 12, color: C.ink });
                u.text(ctx, '→ fewer particles at +η', rx, box.y + 162, { size: 12, color: C.ink });
            } else {
                u.text(ctx, `r = ${rho.toFixed(2)}`, box.x + 8, box.y + 18, { size: 14, weight: '700', color: C.orange });
            }
        }
    });

    // ---------------- 4. spectator breakup: what the ZDC actually counts ----------------
    const FRAG = [[-1.5, -1.6], [1.8, 0.4], [-0.6, 2.0]];
    register('preferential-emission-spectators-breakup', {
        duration: 11,
        aspect: 16 / 9,
        phases: [
            { t: 0, label: 'Step 1 · Spectator remnants fly toward the zero-degree calorimeter (ZDC)' },
            { t: 2.2, label: 'Step 2 · Real remnants are "hot": they evaporate and break into fragments' },
            { t: 4.6, label: 'Step 3 · A magnet sweeps away protons and charged fragments; the ZDC counts free neutrons' },
            { t: 7.6, label: 'Step 4 · The free-neutron count jumps around from event to event, which weakens the correlation' }
        ],
        setup(p, W, H, old) {
            const st = { seed: old ? old.seed : 11, hist: old ? old.hist : [] };
            st.make = () => {
                const r = u.rng(st.seed);
                st.nuc = [];
                for (let i = 0; i < 16; i++) st.nuc.push({ p: i < 7, dx: u.gauss(r) * 0.9, dy: u.gauss(r) * 0.9 });
                st.nuc.forEach(q => { q.free = !q.p && r() < 0.5; q.frag = Math.floor(r() * 3); q.ang = (r() - 0.5) * 0.6; });
                st.nModel = st.nuc.filter(q => !q.p).length;
                st.nFree = st.nuc.filter(q => q.free).length;
            };
            st.make();
            return st;
        },
        onLoop(st) { st.hist.push(st.nFree); if (st.hist.length > 12) st.hist.shift(); st.seed += 7349; st.make(); },
        draw(ctx, t, s, W, H) {
            const fs = FS(W);
            const lanes = [{ y: H * 0.29, title: 'Model without breakup', brk: false }, { y: H * 0.71, title: 'Real spectators: breakup', brk: true }];
            const x0 = W * 0.05, xm = W * 0.52, xz = W * 0.86;
            const zw = Math.max(18, W * 0.05);
            const sc = Math.max(2.6, Math.min(W, H) * 0.022);
            const mv = u.seg(t, 0, 7.2);
            const xc = u.lerp(x0 + 20, xz + zw / 2, mv);
            lanes.forEach(L => {
                u.text(ctx, L.title, 8, L.y - H * 0.17, { size: fs + 1, weight: '700', color: L.brk ? C.orange : C.ink });
                ctx.save(); ctx.strokeStyle = C.grid; ctx.beginPath(); ctx.moveTo(x0, L.y); ctx.lineTo(xz, L.y); ctx.stroke(); ctx.restore();
                ctx.save(); ctx.fillStyle = 'rgba(106,79,179,0.10)'; ctx.strokeStyle = C.purple;
                ctx.fillRect(xm - 16, L.y - H * 0.1, 32, H * 0.2); ctx.strokeRect(xm - 15.5, L.y - H * 0.1 + 0.5, 32, H * 0.2); ctx.restore();
                u.text(ctx, 'magnet', xm, L.y + H * 0.1 + fs + 2, { size: fs - 1, color: C.purple, align: 'center' });
                ctx.save(); ctx.fillStyle = 'rgba(19,138,138,0.14)'; ctx.strokeStyle = C.teal;
                ctx.fillRect(xz, L.y - H * 0.09, zw, H * 0.18); ctx.strokeRect(xz + 0.5, L.y - H * 0.09 + 0.5, zw, H * 0.18); ctx.restore();
                u.text(ctx, 'ZDC', xz + zw / 2, L.y - H * 0.09 - 5, { size: fs - 1, weight: '700', color: C.teal, align: 'center' });

                const spread = L.brk ? u.ease(u.seg(t, 2.2, 3.6)) : 0;
                if (L.brk && t > 2.2 && t < 4.0) u.glow(ctx, xc, L.y, sc * 7, 'rgba(232,113,10,0.40)', 1 - u.seg(t, 3.2, 4.0));
                s.nuc.forEach(q => {
                    let ox = q.dx * sc * 1.1, oy = q.dy * sc * 1.1;
                    let straight = !q.p;                         // neutrons are not bent by the magnet
                    if (L.brk) {
                        if (!q.free) {                           // proton, or neutron bound in a charged fragment
                            straight = false;
                            const fc = FRAG[q.frag];
                            ox = u.lerp(ox, (fc[0] + q.dx * 0.35) * sc * 1.6, spread); oy = u.lerp(oy, (fc[1] + q.dy * 0.35) * sc * 1.6, spread);
                        } else {
                            ox = u.lerp(ox, (q.dx * 3.2 + 3 * q.ang) * sc, spread); oy = u.lerp(oy, q.dy * 2.4 * sc, spread);
                        }
                    }
                    let x = xc + ox, y = L.y + oy, a = 1;
                    if (straight) {
                        if (x >= xz + 2) { x = xz + 4 + (q.dx + 2) * zw * 0.18; y = L.y + oy * 0.5; }
                    } else if (x > xm) {
                        const past = (x - xm) / (xz - xm);
                        y -= past * past * H * 0.3; a = 1 - u.clamp(past * 1.5, 0, 1);
                    }
                    if (a <= 0.02) return;
                    u.ball(ctx, x, y, sc, q.p ? C.proton : C.neutron, a);
                });
                if (L.brk && spread > 0.6 && xc < xm - 10) {
                    FRAG.forEach(fc => {
                        ctx.save(); ctx.strokeStyle = C.orange; ctx.globalAlpha = 0.6; ctx.setLineDash([3, 3]);
                        ctx.beginPath(); ctx.arc(xc + fc[0] * sc * 1.6, L.y + fc[1] * sc * 1.6, sc * 2.3, 0, 2 * Math.PI); ctx.stroke(); ctx.restore();
                    });
                }
                if (t > 6.8) {
                    const n = L.brk ? s.nFree : s.nModel;
                    u.text(ctx, `${n} neutrons`, xz + zw / 2, L.y + H * 0.09 + fs + 4, { size: fs, weight: '700', color: C.teal, align: 'center' });
                }
            });
            if (t > 7.6) {
                const a = u.seg(t, 7.6, 8.2);
                const hist = s.hist.concat([s.nFree]).slice(W < 520 ? -5 : -8);
                const n = s.nModel;
                u.text(ctx, `${W < 520 ? 'per event' : 'count per event'}: ${n}, ${n}, ${n} … steady`, W - 8, lanes[0].y - H * 0.17, { size: fs, color: C.ink, align: 'right', alpha: a });
                u.text(ctx, `${W < 520 ? 'per event' : 'count per event'}: ${hist.join(', ')} … fluctuates`, W - 8, lanes[1].y - H * 0.17, { size: fs, color: C.orange, align: 'right', weight: '600', alpha: a });
            }
            const pw = u.pill(ctx, 8, H - 8, 'neutron', C.neutron);
            u.pill(ctx, 14 + pw, H - 8, 'proton', C.proton);
            u.text(ctx, 'schematic', W - 8, H - 8, { size: fs - 2, color: C.muted, align: 'right' });
        }
    });

    // ---------------- 5. longitudinal stopping scenarios (transparency / mixing / reflection) ----------------
    register('preferential-emission-spectators-stopping', {
        duration: 10,
        aspect: 16 / 10,
        phases: [
            { t: 0, label: 'Step 1 · Matter from the right-moving (blue) and left-moving (purple) nucleus collides' },
            { t: 2.4, label: 'Step 2 · Where does each nucleus\'s matter end up? Three limiting pictures' },
            { t: 6.5, label: 'Step 3 · At the SPS (17.3 GeV) NA49 favoured mixing; the new correlator can test RHIC and LHC energies' }
        ],
        setup() {
            const rand = u.rng(19), pts = [];
            for (let i = 0; i < 14; i++) pts.push({ dx: u.gauss(rand), dy: u.gauss(rand) });
            return { pts };
        },
        draw(ctx, t, s, W, H) {
            const fs = FS(W);
            const rows = [
                { name: 'Transparency', sub: 'each keeps its direction', fB: 0.62, fP: -0.62 },
                { name: 'Mixing', sub: 'both stopped near the middle', fB: 0.06, fP: -0.06 },
                { name: 'Reflection', sub: 'each bounced back', fB: -0.5, fP: 0.5 }
            ];
            const lx = W < 520 ? 80 : 150;
            const x0 = lx + 10, x1 = W - 14, cxm = (x0 + x1) / 2, half = (x1 - x0) / 2;
            const app = u.ease(u.seg(t, 0, 2.2)), out = u.ease(u.seg(t, 2.6, 5.2));
            const rh = H / 3;
            rows.forEach((r, i) => {
                const y = rh * i + rh / 2 + 4;
                const hl = t > 6.5 && i === 1;
                if (hl) { ctx.save(); ctx.fillStyle = 'rgba(232,113,10,0.08)'; ctx.fillRect(4, rh * i + 6, W - 8, rh - 8); ctx.restore(); }
                u.text(ctx, r.name, 10, y - 2, { size: fs + 1, weight: '700', color: hl ? C.orange : C.ink });
                if (W >= 520) u.text(ctx, r.sub, 10, y + 15, { size: fs - 1, color: C.muted });
                if (hl) u.text(ctx, 'NA49, SPS', 10, y + (W >= 520 ? 31 : 13), { size: fs - 1, weight: '700', color: C.orange });
                ctx.save(); ctx.strokeStyle = C.grid; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke(); ctx.restore();
                ctx.save(); ctx.strokeStyle = C.gray; ctx.setLineDash([2, 3]); ctx.beginPath(); ctx.moveTo(cxm, y - rh * 0.38); ctx.lineTo(cxm, y + rh * 0.38); ctx.stroke(); ctx.restore();
                const blob = (fx, col) => {
                    const x = cxm + fx * half;
                    u.glow(ctx, x, y, rh * 0.42, col === C.blue ? 'rgba(31,95,191,0.25)' : 'rgba(106,79,179,0.25)');
                    s.pts.forEach(q => u.ball(ctx, x + q.dx * rh * 0.07, y + q.dy * rh * 0.09, Math.max(2, rh * 0.045), col, 0.9));
                };
                let xb, xp;
                if (t < 2.4) { xb = -0.85 * (1 - app); xp = 0.85 * (1 - app); }
                else { xb = r.fB * out; xp = r.fP * out; }
                blob(xp, C.purple);
                blob(xb, C.blue);
            });
            u.text(ctx, '← backward', x0, 14, { size: fs - 1, color: C.muted });
            u.text(ctx, 'forward →', x1, 14, { size: fs - 1, color: C.muted, align: 'right' });
            u.text(ctx, 'schematic', x1, H - 6, { size: fs - 2, color: C.muted, align: 'right' });
        }
    });
})();
