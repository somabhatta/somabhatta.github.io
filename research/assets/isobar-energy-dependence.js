/* Custom animations for research/isobar-energy-dependence.html (schematic cartoons). */
(function () {
    'use strict';
    const { register, C, u } = window.Anim;
    const fs = (W, base) => base * u.clamp(W / 640, 0.68, 1.15);
    const RU = C.orange, ZR = C.blue;

    // ---------------- twins: 96Ru vs 96Zr ----------------
    register('isobar-energy-dependence-twins', {
        duration: 10,
        aspect: 16 / 8,
        phases: [
            { t: 0, label: 'Step 1 · Two isobars: both nuclei have 96 nucleons' },
            { t: 3.3, label: 'Step 2 · ⁹⁶Ru is more elongated (quadrupole deformation β₂)' },
            { t: 6.6, label: 'Step 3 · ⁹⁶Zr is pear-shaped (octupole β₃) with a thicker, fuzzier edge (a₀)' }
        ],
        setup() { return {}; },
        draw(ctx, t, s, W, H) {
            const Y20 = (c) => 0.3154 * (3 * c * c - 1), Y30 = (c) => 0.3731 * (5 * c * c * c - 3 * c);
            const R = Math.min(W * 0.12, H * 0.2);
            const ex = 2; // deformation exaggerated for visibility
            const nuc = (cx, cy, R0, a0, b2, b3, col, rot, hi) => {
                const shapeR = (ph) => { const c = Math.cos(ph - rot); return (R0 / 5.05) * R * (1 + ex * b2 * Y20(c) + ex * b3 * Y30(c)); };
                // diffuse edge: layered fills with Fermi-like falloff (edge width exaggerated)
                const aPx = (a0 / 5.05) * R * 1.6;   // edge width exaggerated
                const base = (R0 / 5.05) * R;
                for (let k = 6; k >= -5; k--) {
                    const dr = k * aPx * 0.5;
                    const alpha = 1 / (1 + Math.exp(dr / aPx));
                    const f = 1 + dr / base;
                    ctx.save(); ctx.globalAlpha = 0.22 * alpha;
                    ctx.fillStyle = col; ctx.beginPath();
                    for (let i = 0; i <= 90; i++) {
                        const ph = i / 90 * 2 * Math.PI, r = shapeR(ph) * f;
                        const x = cx + r * Math.cos(ph), y = cy + r * Math.sin(ph);
                        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
                    }
                    ctx.closePath(); ctx.fill(); ctx.restore();
                }
                if (hi > 0) {
                    ctx.save(); ctx.globalAlpha = hi; ctx.strokeStyle = C.ink; ctx.setLineDash([5, 4]); ctx.lineWidth = 1.4;
                    const L = R * 1.35;
                    ctx.beginPath(); ctx.moveTo(cx - L * Math.cos(rot), cy - L * Math.sin(rot)); ctx.lineTo(cx + L * Math.cos(rot), cy + L * Math.sin(rot)); ctx.stroke();
                    ctx.restore();
                }
            };
            const cy = H * 0.5;
            const s2 = u.seg(t, 3.3, 4.0), s3 = u.seg(t, 6.6, 7.3);
            const rot = 0.35 * t;
            nuc(W * 0.27, cy, 5.09, 0.46, 0.162, 0, RU, rot, s2 * (1 - s3));
            nuc(W * 0.73, cy, 5.02, 0.52, 0.06, 0.20, ZR, -rot + 1.2, s3);
            const f = fs(W, 15), g = fs(W, 12);
            u.text(ctx, '⁹⁶Ru', W * 0.27, f + 8, { size: f * 1.1, weight: '700', align: 'center', color: RU });
            u.text(ctx, '⁹⁶Zr', W * 0.73, f + 8, { size: f * 1.1, weight: '700', align: 'center', color: ZR });
            u.text(ctx, '44 protons · 52 neutrons', W * 0.27, 2 * f + 12, { size: g, align: 'center', color: C.muted });
            u.text(ctx, '40 protons · 56 neutrons', W * 0.73, 2 * f + 12, { size: g, align: 'center', color: C.muted });
            const line = (x, str, on, col, y) => u.text(ctx, str, x, y, { size: g, align: 'center', color: on ? col : C.muted, weight: on ? '700' : '500' });
            const y1 = H - 10 - (g + 5), y2 = H - 10;
            line(W * 0.27, 'β₂ = 0.16 · β₃ = 0', s2 > 0 && s3 < 1, RU, y1);
            line(W * 0.27, 'a₀ = 0.46 fm · R₀ = 5.09 fm', false, RU, y2);
            line(W * 0.73, 'β₂ = 0.06 · β₃ = 0.20', s3 > 0, ZR, y1);
            line(W * 0.73, 'a₀ = 0.52 fm · R₀ = 5.02 fm', s3 > 0, ZR, y2);
            if (W > 520) u.text(ctx, 'schematic · shapes exaggerated', W - 8, 18, { size: fs(W, 10), color: C.muted, align: 'right' });
            ctx.save(); ctx.strokeStyle = C.grid; ctx.beginPath(); ctx.moveTo(W / 2, 12); ctx.lineTo(W / 2, H - 12); ctx.stroke(); ctx.restore();
        }
    });

    // ---------------- ratio: the unknown response cancels ----------------
    register('isobar-energy-dependence-ratio', {
        duration: 11,
        aspect: 16 / 8,
        phases: [
            { t: 0, label: 'Step 1 · Different nuclear shapes give slightly different initial overlap shapes ε₂' },
            { t: 2.8, label: 'Step 2 · The plasma turns shape into flow, v₂ = k·ε₂, with a poorly known response k' },
            { t: 5.5, label: 'Step 3 · Ratio Ru+Ru / Zr+Zr: k cancels, only the structure difference is left' },
            { t: 8.0, label: 'Step 4 · RHIC → LHC: k grows, yet a single-source ratio does not change' }
        ],
        setup() { return {}; },
        draw(ctx, t, s, W, H) {
            const lhc = u.ease(u.seg(t, 8.0, 9.0));
            const k = 1 + 0.4 * lhc;
            const base = H * 0.80, hmax = H * 0.62;
            const eRu = 0.62, eZr = 0.54;
            const f = fs(W, 13), g = fs(W, 11);
            const bars = (x0, w, vRu, vZr, alpha, title) => {
                const bw = w * 0.36;
                ctx.save(); ctx.globalAlpha = alpha;
                ctx.fillStyle = RU; ctx.fillRect(x0 + w * 0.08, base - vRu * hmax, bw, vRu * hmax);
                ctx.fillStyle = ZR; ctx.fillRect(x0 + w * 0.56, base - vZr * hmax, bw, vZr * hmax);
                ctx.restore();
                u.text(ctx, 'Ru', x0 + w * 0.08 + bw / 2, base + g + 4, { size: g, align: 'center', color: RU, weight: '700', alpha });
                u.text(ctx, 'Zr', x0 + w * 0.56 + bw / 2, base + g + 4, { size: g, align: 'center', color: ZR, weight: '700', alpha });
                u.text(ctx, title, x0 + w / 2, H * 0.12, { size: f, align: 'center', weight: '700', alpha });
            };
            const a1 = u.seg(t, 0.2, 1.0), a2 = u.seg(t, 2.8, 3.6), a3 = u.seg(t, 5.5, 6.3);
            ctx.save(); ctx.strokeStyle = C.grid; ctx.beginPath(); ctx.moveTo(W * 0.03, base); ctx.lineTo(W * 0.97, base); ctx.stroke(); ctx.restore();
            bars(W * 0.03, W * 0.22, eRu, eZr, a1, 'initial shape ε₂');
            // response box
            const bx = W * 0.30, bwid = W * 0.14, bsz = (0.16 + 0.07 * lhc) * H;
            ctx.save(); ctx.globalAlpha = a2;
            ctx.fillStyle = 'rgba(232,113,10,0.10)'; ctx.strokeStyle = C.red; ctx.lineWidth = 2;
            u.roundRect(ctx, bx + bwid / 2 - bsz / 2, H * 0.48 - bsz / 2, bsz, bsz, 10); ctx.fill(); ctx.stroke();
            ctx.restore();
            u.text(ctx, '× k', bx + bwid / 2, H * 0.48 + f * 0.4, { size: fs(W, 18), align: 'center', weight: '700', color: C.red, alpha: a2 });
            u.text(ctx, 'plasma response', bx + bwid / 2, H * 0.12, { size: f, align: 'center', weight: '700', alpha: a2 });
            u.text(ctx, lhc > 0.5 ? '(larger at LHC)' : '(unknown)', bx + bwid / 2, H * 0.12 + f + 4, { size: g, align: 'center', color: C.muted, alpha: a2 });
            bars(W * 0.48, W * 0.22, eRu * k, eZr * k, a2, 'final flow v₂');
            // ratio
            const rx = W * 0.85;
            u.text(ctx, 'Ru / Zr', rx, H * 0.12, { size: f, align: 'center', weight: '700', alpha: a3 });
            u.text(ctx, (eRu / eZr).toFixed(2), rx, H * 0.47, { size: fs(W, 30), align: 'center', weight: '700', color: C.teal, alpha: a3 });
            u.text(ctx, 'same as for ε₂', rx, H * 0.47 + fs(W, 18), { size: g, align: 'center', color: C.muted, alpha: a3 });
            // energy pill
            const lab = lhc > 0.5 ? 'LHC  5.02 TeV' : 'RHIC  0.2 TeV';
            u.pill(ctx, W * 0.03, H - 8, lab, lhc > 0.5 ? C.purple : C.navy);
            u.text(ctx, 'schematic', W - 8, H - 8, { size: fs(W, 10), color: C.muted, align: 'right' });
        }
    });

    // ---------------- components: geometry-driven vs uncorrelated flow ----------------
    register('isobar-energy-dependence-components', {
        duration: 11,
        aspect: 16 / 8,
        phases: [
            { t: 0, label: 'Step 1 · Part of each event\'s flow follows the overlap shape: v_pp (red)' },
            { t: 3.6, label: 'Step 2 · Another part points in a random direction, unrelated to that shape: δ (blue)' },
            { t: 7.2, label: 'Step 3 · Two-particle flow sees both: v{2}² = v_pp² + δ²' }
        ],
        setup() { return {}; },
        draw(ctx, t, s, W, H) {
            const DT = 0.45, ev = Math.floor(t / DT);
            const evRand = (i) => { const r = u.rng(1000 + i * 7919); r(); return r; };
            const f = fs(W, 13), g = fs(W, 11);
            // left: overlap with hot spots
            const lx = W * 0.24, ly = H * 0.52, R = Math.min(W * 0.16, H * 0.30);
            const rr = evRand(ev);
            ctx.save(); ctx.translate(lx, ly); ctx.scale(0.62, 1);
            const gr = ctx.createRadialGradient(0, 0, 0, 0, 0, R);
            gr.addColorStop(0, u.heat(0.75, 0.95)); gr.addColorStop(0.75, u.heat(0.4, 0.8)); gr.addColorStop(1, u.heat(0.2, 0));
            ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(0, 0, R, 0, 2 * Math.PI); ctx.fill(); ctx.restore();
            const showSpots = t >= 3.6;
            for (let i = 0; i < 6; i++) {
                const a = 2 * Math.PI * rr(), d = Math.sqrt(rr()) * R * 0.7;
                if (showSpots) { u.glow(ctx, lx + 0.62 * d * Math.cos(a), ly + d * Math.sin(a), R * 0.22, 'rgba(255,255,210,0.95)'); u.glow(ctx, lx + 0.62 * d * Math.cos(a), ly + d * Math.sin(a), R * 0.12, 'rgba(255,255,255,1)'); }
            }
            u.text(ctx, 'overlap region', lx, H * 0.1, { size: f, weight: '700', align: 'center' });
            u.text(ctx, showSpots ? 'shape + local hot spots' : 'almond shape: short axis →', lx, H - 10, { size: g, color: C.muted, align: 'center' });
            // right: flow-vector plane
            const ox = W * 0.56, oy = H * 0.52, sc = Math.min(W * 0.17, H * 0.32);
            ctx.save(); ctx.strokeStyle = C.grid; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(ox - sc * 0.3, oy); ctx.lineTo(ox + sc * 2.0, oy); ctx.moveTo(ox, oy - sc * 1.25); ctx.lineTo(ox, oy + sc * 1.25); ctx.stroke(); ctx.restore();
            u.text(ctx, 'flow of each event (direction and size)', ox + sc * 0.85, H * 0.1, { size: f, weight: '700', align: 'center' });
            u.text(ctx, 'shape axis →', ox + sc * 2.0, oy - 6, { size: g, color: C.muted, align: 'right' });
            const vpp = sc * 1.0, dmag = sc * 0.55;
            const kick = (i) => { const r = evRand(i); for (let j = 0; j < 12; j++) r(); const a = 2 * Math.PI * r(), m = dmag * Math.sqrt(-Math.log(Math.max(r(), 1e-6))) * 0.8; return [m * Math.cos(a), m * Math.sin(a)]; };
            // accumulated tips (events since step start)
            ctx.save(); ctx.fillStyle = C.navy; ctx.globalAlpha = 0.45;
            for (let i = 0; i <= ev; i++) {
                const tt = i * DT;
                const kk = tt >= 3.6 ? kick(i) : [0, 0];
                ctx.beginPath(); ctx.arc(ox + vpp + kk[0], oy + kk[1], 2.6, 0, 2 * Math.PI); ctx.fill();
            }
            ctx.restore();
            const kk = t >= 3.6 ? kick(ev) : [0, 0];
            u.arrow(ctx, ox, oy, ox + vpp, oy, C.red, 3, 9);
            u.text(ctx, 'v_pp', ox + vpp * 0.2, oy - 12, { size: f, weight: '700', color: C.red, align: 'center' });
            if (t >= 3.6) {
                u.arrow(ctx, ox + vpp, oy, ox + vpp + kk[0], oy + kk[1], C.blue, 2.5, 8);
                u.text(ctx, 'δ', ox + vpp + kk[0] * 1.1 + 6, oy + kk[1] * 1.1, { size: f, weight: '700', color: C.blue });
            }
            if (t >= 7.2) {
                u.arrow(ctx, ox, oy, ox + vpp + kk[0], oy + kk[1], C.ink, 2, 8);
                // circle showing spread
                ctx.save(); ctx.strokeStyle = C.blue; ctx.setLineDash([4, 4]); ctx.globalAlpha = 0.7;
                ctx.beginPath(); ctx.arc(ox + vpp, oy, dmag, 0, 2 * Math.PI); ctx.stroke(); ctx.restore();
                u.text(ctx, 'v{2}² = v_pp² + δ²', W - 10, H - 10, { size: f, weight: '700', align: 'right', color: C.ink });
            }
            u.text(ctx, 'schematic', W - 10, H * 0.1 + f + 6, { size: fs(W, 10), color: C.muted, align: 'right' });
        }
    });

    // ---------------- sources: each source has its own response ----------------
    register('isobar-energy-dependence-sources', {
        duration: 11,
        aspect: 16 / 8,
        phases: [
            { t: 0, label: 'Step 1 · In central collisions, v₂² gets contributions from independent sources' },
            { t: 3.6, label: 'Step 2 · Each source has its own response k (k₀, k₂, k₃); δ has none' },
            { t: 7.0, label: 'Step 3 · RHIC → LHC: deformation responses grow faster, so nuclear shape matters more' }
        ],
        setup() { return {}; },
        draw(ctx, t, s, W, H) {
            const f = fs(W, 13), g = fs(W, 11);
            const segs = [
                { name: 'uncorrelated δ²', k: '', col: C.gray, rhic: 3.0, lhc: 3.0 * 1.6 },
                { name: 'random fluctuations', k: 'k₀', col: C.teal, rhic: 4.0, lhc: 4.0 * 1.6 },
                { name: 'nuclear β₂', k: 'k₂', col: RU, rhic: 1.4, lhc: 1.4 * 2.3 },
                { name: 'nuclear β₃', k: 'k₃', col: C.purple, rhic: 0.9, lhc: 0.9 * 2.3 }
            ];
            const nar = W < 600;
            const x0 = W * 0.14, bw = W * 0.82, bh = H * (nar ? 0.16 : 0.2);
            const draw = (y, key, label, alpha) => {
                const tot = segs.reduce((a, q) => a + q[key], 0);
                let x = x0;
                u.text(ctx, label, x0 - 8, y + bh / 2 + f * 0.35, { size: f, weight: '700', align: 'right', alpha });
                segs.forEach((q, i) => {
                    const w = bw * q[key] / tot;
                    ctx.save(); ctx.globalAlpha = alpha * 0.85; ctx.fillStyle = q.col; ctx.fillRect(x, y, w - 2, bh); ctx.restore();
                    if (i >= 2) u.text(ctx, Math.round(100 * q[key] / tot) + '%', x + w / 2, y + bh / 2 + g * 0.35, { size: g, weight: '700', color: '#fff', align: 'center', alpha });
                    if (t >= 3.6 && q.k) u.text(ctx, q.k, x + w / 2, y - 6, { size: f * 1.15, weight: '700', color: q.col, align: 'center', alpha: alpha * u.seg(t, 3.6, 4.3) });
                    x += w;
                });
            };
            u.text(ctx, 'share of v₂² in central collisions', x0, H * 0.1, { size: f, weight: '700' });
            draw(H * (nar ? 0.2 : 0.25), 'rhic', 'RHIC', 1);
            draw(H * (nar ? 0.47 : 0.58), 'lhc', 'LHC', u.seg(t, 7.0, 7.8));
            // legend
            const narrow = W < 600;
            let lx = narrow ? 8 : x0;
            segs.forEach((q, i) => {
                if (narrow && i === 2) lx = 8;
                const ly = narrow && i < 2 ? H - 32 : H - 10;
                lx += u.pill(ctx, lx, ly, q.name, q.col) + 6;
            });
            u.text(ctx, 'schematic numbers', W - 8, nar ? H - 10 : H * 0.1, { size: fs(W, 10), color: C.muted, align: 'right' });
        }
    });

    // ---------------- rapidity: mid vs forward ----------------
    register('isobar-energy-dependence-rapidity', {
        duration: 10,
        aspect: 16 / 8,
        phases: [
            { t: 0, label: 'Step 1 · Particles fly out at all angles; forward ones (large |η|) hug the beam' },
            { t: 3.3, label: 'Step 2 · Mid-rapidity: built from small-x gluons of both nuclei' },
            { t: 6.6, label: 'Step 3 · Forward: large-x partons of one nucleus meet small-x gluons of the other' }
        ],
        setup() {
            const r = u.rng(31), tr = [];
            for (let i = 0; i < 110; i++) tr.push({ eta: (r() * 2 - 1) * 5, up: r() < 0.5 ? -1 : 1, v: 0.7 + 0.3 * r() });
            return { tr };
        },
        draw(ctx, t, s, W, H) {
            const f = fs(W, 13), g = fs(W, 11);
            const cx = W / 2, cy = H * 0.58, Rr = Math.min(W * 0.36, H * 0.37);
            const ang = (eta) => (90 - 82 * Math.min(Math.abs(eta), 5) / 5) * Math.PI / 180; // compressed, not to scale
            const bands = [[0, 1, C.teal, '|η|<1'], [1, 2, C.gold, '1–2'], [2, 3.5, C.blue, '2–3.5'], [3.5, 5, C.purple, '3.5–5']];
            const hiMid = u.seg(t, 3.3, 3.9) * (1 - u.seg(t, 6.6, 7.0)), hiFwd = u.seg(t, 6.6, 7.2);
            // beam axis
            ctx.save(); ctx.strokeStyle = C.grid; ctx.beginPath(); ctx.moveTo(8, cy); ctx.lineTo(W - 8, cy); ctx.stroke(); ctx.restore();
            // eta bands (upper half, both sides)
            bands.forEach((b, i) => {
                [1, -1].forEach(side => {
                    const a0 = ang(b[0]), a1 = ang(b[1]);
                    const hl = (i === 0 && hiMid > 0) ? hiMid : (i === 3 && side === 1 && hiFwd > 0 ? hiFwd : 0);
                    ctx.save(); ctx.strokeStyle = b[2]; ctx.globalAlpha = 0.35 + 0.65 * hl; ctx.lineWidth = 7 + 5 * hl;
                    ctx.beginPath();
                    // angle measured from beam (+x) for side=1; mirror for side=-1
                    const s0 = side === 1 ? -a0 : -(Math.PI - a0), s1 = side === 1 ? -a1 : -(Math.PI - a1);
                    ctx.arc(cx, cy, Rr, Math.min(s0, s1), Math.max(s0, s1)); ctx.stroke(); ctx.restore();
                });
                const am = ang((b[0] + b[1]) / 2);
                u.text(ctx, b[3], cx + (Rr + 20) * Math.cos(am), cy - (Rr + 20) * Math.sin(am) - (i === 0 ? 4 : 0), { size: g, weight: '700', color: b[2], align: i === 0 ? 'center' : 'left' });
            });
            // nuclei: approach, then recede as thin discs
            const app = u.ease(u.seg(t, 0, 1.2)), rec = u.seg(t, 1.2, 3.0);
            const dx = (1 - app) * W * 0.42 + rec * W * 0.33;
            const discH = H * 0.2;
            [[-1, C.purple, 'target'], [1, C.blue, 'projectile']].forEach(([side, col, nm]) => {
                // before collision: projectile comes from left (moves to +x)
                const x = t < 1.2 ? cx - side * dx : cx + side * dx;
                ctx.save(); ctx.fillStyle = col; ctx.globalAlpha = 0.75;
                ctx.beginPath(); ctx.ellipse(x, cy, 5, discH, 0, 0, 2 * Math.PI); ctx.fill(); ctx.restore();
                if (t > 3.3) {
                    let lab = '';
                    if (hiMid > 0.5) lab = 'small x';
                    else if (hiFwd > 0.5) lab = side === 1 ? 'large x' : 'small x';
                    if (lab) u.pill(ctx, side === 1 ? x - 70 : x + 8, cy + discH + 18, lab, col);
                }
            });
            // particles
            const e = u.seg(t, 1.1, 3.0);
            if (e > 0) s.tr.forEach(q => {
                const a = ang(q.eta), dir = q.eta >= 0 ? 1 : -1;
                const L = e * q.v * Rr * 0.92;
                const x = cx + dir * L * Math.cos(a), y = cy - q.up * L * Math.sin(a);
                const inMid = Math.abs(q.eta) < 1, inFwd = q.eta > 3.5;
                const dim = (hiMid > 0.5 && !inMid) || (hiFwd > 0.5 && !inFwd);
                ctx.save(); ctx.strokeStyle = C.navy; ctx.globalAlpha = dim ? 0.12 : 0.55; ctx.lineWidth = 1.1;
                ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(x, y); ctx.stroke(); ctx.restore();
            });
            u.glow(ctx, cx, cy, 14, u.heat(0.9, 0.9), e > 0 ? 1 : 0);
            u.text(ctx, 'beam →', W - 10, cy - 6, { size: g, color: C.muted, align: 'right' });
            u.text(ctx, 'side view · angles not to scale', 10, H - 8, { size: fs(W, 10), color: C.muted });
            u.text(ctx, 'pseudorapidity windows', 10, f + 6, { size: f, weight: '700' });
        }
    });
})();
