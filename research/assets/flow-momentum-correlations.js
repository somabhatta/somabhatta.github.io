/* Page-specific animations for flow-momentum-correlations.html
   (ATLAS, PRC 107, 054910 (2023): v_n–[pT] correlations in Xe+Xe and Pb+Pb). */
(function () {
    'use strict';
    const { register, C, u } = window.Anim;

    // ---------- 1. What a correlation coefficient is (schematic scatter) ----------
    register('flow-momentum-correlations-pearson', {
        duration: 10,
        aspect: 16 / 8,
        phases: [
            { t: 0, label: 'Each dot is one collision: its [pT] (size) and its v₂² (shape)' },
            { t: 2.2, label: 'Cloud tilts up: ρ > 0, events with more v₂ also have higher [pT]' },
            { t: 5.2, label: 'No tilt: ρ ≈ 0, shape and size vary independently' },
            { t: 7.6, label: 'Cloud tilts down: ρ < 0, more v₂ goes with lower [pT]' }
        ],
        setup() {
            const rand = u.rng(31), pts = [];
            for (let i = 0; i < 160; i++) pts.push([u.gauss(rand), u.gauss(rand), rand()]);
            return { pts };
        },
        rhoAt(t) {
            const a = 0.65, b = 0.0, c = -0.55;
            if (t < 2.2) return a * u.ease(u.seg(t, 0.8, 2.2));
            if (t < 4.6) return a;
            if (t < 5.6) return u.lerp(a, b, u.ease(u.seg(t, 4.6, 5.6)));
            if (t < 7.0) return b;
            if (t < 8.0) return u.lerp(b, c, u.ease(u.seg(t, 7.0, 8.0)));
            return c;
        },
        draw(ctx, t, s, W, H) {
            const rho = this.rhoAt(t);
            const nar = W < 600;
            const side = nar ? 84 : Math.max(150, W * 0.26);
            const box = { x: 58, y: 14, w: W - side - 72, h: H - 58 };
            const m = u.axes(ctx, box, [-3.2, 3.2], [-3.2, 3.2], {
                xticks: false, yticks: false,
                xlabel: 'mean momentum [pT] of the event  →', ylabel: 'v₂² of the event  →'
            });
            const shown = u.seg(t, 0, 1.2);
            const sq = Math.sqrt(1 - rho * rho);
            ctx.save();
            s.pts.forEach(p => {
                if (p[2] > shown) return;
                const x = p[0], y = rho * p[0] + sq * p[1];
                if (Math.abs(x) > 3.1 || Math.abs(y) > 3.1) return;
                ctx.globalAlpha = 0.6;
                ctx.fillStyle = C.blue;
                ctx.beginPath(); ctx.arc(m.X(x), m.Y(y), 3, 0, 2 * Math.PI); ctx.fill();
            });
            ctx.restore();
            if (t > 1.2) {
                const L = 2.6;
                u.line(ctx, [[m.X(-L), m.Y(-L * rho)], [m.X(L), m.Y(L * rho)]], C.orange, 2.4, [7, 5]);
            }
            u.text(ctx, 'schematic', box.x + box.w - 8, box.y + box.h - 8, { size: 10, color: C.muted, align: 'right' });
            const sx = W - side + 4;
            const vcol = rho > 0.05 ? C.teal : rho < -0.05 ? C.red : C.ink;
            const vtxt = (rho >= 0 ? '+' : '−') + Math.abs(rho).toFixed(2);
            if (nar) {
                u.text(ctx, 'ρ =', sx, 36, { size: 13, color: C.muted });
                u.text(ctx, vtxt, sx, 66, { size: 22, weight: '700', color: vcol });
                return;
            }
            u.text(ctx, 'correlation', sx, 40, { size: 13, color: C.muted });
            u.text(ctx, 'coefficient ρ', sx, 58, { size: 13, color: C.muted });
            u.text(ctx, vtxt, sx, 100, { size: 34, weight: '700', color: vcol });
            u.text(ctx, '+1: perfect rise', sx, 136, { size: 11.5, color: C.muted });
            u.text(ctx, ' 0: no relation', sx, 154, { size: 11.5, color: C.muted });
            u.text(ctx, '−1: perfect fall', sx, 172, { size: 11.5, color: C.muted });
        }
    });

    // ---------- 2. Why deformation lowers rho: tip-on-tip vs side-on-side ----------
    register('flow-momentum-correlations-orient', {
        duration: 10,
        aspect: 16 / 8,
        phases: [
            { t: 0, label: 'Two cigar-shaped (deformed) nuclei can hit in different orientations' },
            { t: 3.0, label: 'Tip-on-tip: the fireball is round and compact → small v₂, large [pT]' },
            { t: 5.6, label: 'Side-on-side: elongated and spread out → large v₂, small [pT]' },
            { t: 8.0, label: 'Large v₂ paired with small [pT]: deformation pulls ρ down' }
        ],
        setup() { return {}; },
        draw(ctx, t, s, W, H) {
            const half = W / 2;
            const Lg = Math.min(half, H) * 0.15, Sh = Lg * 0.62;
            const app = u.ease(u.seg(t, 0.2, 2.4));
            const fade = u.seg(t, 2.3, 3.0);
            const fb = u.ease(u.seg(t, 2.6, 3.6));
            const show1 = u.seg(t, 3.0, 3.6), show2 = u.seg(t, 5.6, 6.2);
            const panel = (cx, tip, title, showRead) => {
                ctx.save(); ctx.beginPath(); ctx.rect(cx - half / 2, 0, half, H); ctx.clip();
                u.text(ctx, title, cx, 24, { size: 14, weight: '700', align: 'center' });
                // side view: nuclei approach along the beam (horizontal)
                const yS = H * 0.30;
                const gap = (1 - app) * half * 0.14 + (tip ? Lg : Sh * 0.55);
                if (fade < 1) {
                    [-1, 1].forEach(d => {
                        ctx.save();
                        ctx.globalAlpha = 1 - fade;
                        ctx.translate(cx + d * gap, yS);
                        const rx = tip ? Lg : Sh * 0.55, ry = tip ? Sh * 0.55 : Lg;  // Lorentz-flattened a little
                        const g = ctx.createRadialGradient(-rx * 0.3, -ry * 0.3, 2, 0, 0, Math.max(rx, ry));
                        g.addColorStop(0, '#ffffff'); g.addColorStop(0.4, d < 0 ? C.blue : C.purple); g.addColorStop(1, u.shade(d < 0 ? C.blue : C.purple, -0.3));
                        ctx.fillStyle = g;
                        ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, 2 * Math.PI); ctx.fill();
                        ctx.restore();
                    });
                    u.text(ctx, 'side view (beam ↔)', cx, yS + Lg + 18, { size: 11, color: C.muted, align: 'center', alpha: 1 - fade });
                }
                // beam view of the fireball
                if (fb > 0) {
                    const yF = half < 300 ? H * 0.5 : H * 0.56;
                    const rx = (tip ? Sh : Lg) * (0.6 + 0.4 * fb), ry = Sh * (0.6 + 0.4 * fb);
                    ctx.save(); ctx.translate(cx, yF); ctx.scale(rx, ry);
                    u.glow(ctx, 0, 0, 1.25, u.heat(tip ? 0.95 : 0.55, 0.9), fb);
                    ctx.restore();
                    // pressure arrows: longer along short axis for the elongated one; strong all round for compact one
                    if (showRead > 0) {
                        for (let k = 0; k < 8; k++) {
                            const a = k * Math.PI / 4;
                            const str = tip ? 1.15 : 0.75 * (1 + 0.6 * Math.abs(Math.sin(a)));
                            const r0x = rx * 1.05, r0y = ry * 1.05;
                            const x0 = cx + r0x * Math.cos(a), y0 = yF + r0y * Math.sin(a);
                            const Lz = 20 * str * showRead * Math.min(1, half / 320);
                            u.arrow(ctx, x0, y0, x0 + Lz * Math.cos(a), y0 + Lz * Math.sin(a), C.red, half < 300 ? 1.4 : 2, half < 300 ? 4 : 7);
                        }
                    }
                    u.text(ctx, 'fireball, beam view', cx, yF - Lg - 16, { size: 11, color: C.muted, align: 'center', alpha: fb });
                }
                // readouts
                if (showRead > 0) {
                    const by = half < 300 ? H * 0.82 : H * 0.80 - 4, bw = Math.min(110, half * 0.32);
                    const narrow = half < 300;
                    const bx = narrow ? cx - bw / 2 : cx + 4;
                    const bar = (y, lab, val, col) => {
                        if (narrow) u.text(ctx, lab, cx, y - 3, { size: 10, align: 'center', color: C.ink, alpha: showRead });
                        else u.text(ctx, lab, cx - 8, y + 9, { size: 12, align: 'right', color: C.ink, alpha: showRead });
                        ctx.save(); ctx.globalAlpha = showRead;
                        ctx.fillStyle = C.grid; ctx.fillRect(bx, y, bw, narrow ? 7 : 11);
                        ctx.fillStyle = col; ctx.fillRect(bx, y, bw * val, narrow ? 7 : 11);
                        ctx.restore();
                    };
                    bar(by, 'elliptic flow v₂', tip ? 0.15 : 0.85, C.orange);
                    bar(by + 22, 'mean momentum [pT]', tip ? 0.85 : 0.35, C.teal);
                }
                ctx.restore();
            };
            panel(half / 2, true, 'Tip on tip', show1);
            panel(half * 1.5, false, 'Side on side', show2);
            ctx.save(); ctx.strokeStyle = C.grid; ctx.beginPath(); ctx.moveTo(half, 10); ctx.lineTo(half, H - 10); ctx.stroke(); ctx.restore();
            if (half >= 300) u.text(ctx, 'cartoon', W - 10, H - 8, { size: 10, color: C.muted, align: 'right' });
        }
    });

    // ---------- 3. Prolate → triaxial → oblate, and the cos(3γ) term in rho_2 ----------
    function gammaAt(t) {
        if (t < 3) return 0;
        if (t < 4.5) return 30 * u.ease(u.seg(t, 3, 4.5));
        if (t < 7.5) return 30;
        if (t < 9) return 30 + 30 * u.ease(u.seg(t, 7.5, 9));
        return 60;
    }
    register('flow-momentum-correlations-shapes', {
        duration: 12,
        aspect: 16 / 8,
        phases: [
            { t: 0, label: 'γ = 0°: prolate (cigar), two short axes and one long one' },
            { t: 3, label: 'Changing γ at fixed β: the three axes become all different' },
            { t: 4.5, label: 'γ = 30°: maximally triaxial, the shape favoured for ¹²⁹Xe' },
            { t: 7.5, label: 'Changing γ further…' },
            { t: 9, label: 'γ = 60°: oblate (pancake), two long axes and one short one' }
        ],
        setup() { return {}; },
        draw(ctx, t, s, W, H) {
            const gam = gammaAt(t), g = gam * Math.PI / 180, beta = 0.5;
            const k = Math.sqrt(5 / (4 * Math.PI));
            const r = [1, 2, 3].map(i => 1 + k * beta * Math.cos(g - 2 * Math.PI * i / 3));
            // orientation: body z (axis 3) → screen x, then rock about the vertical axis, then tilt
            const ang = 0.65 * Math.sin(2 * Math.PI * t / 6), tilt = 0.3;
            const mul = (A, B) => A.map((row, i) => B[0].map((_, j) => row.reduce((acc, _, q) => acc + A[i][q] * B[q][j], 0)));
            const T = (A) => A[0].map((_, j) => A.map(row => row[j]));
            const base = [[0, 0, 1], [0, 1, 0], [1, 0, 0]];   // body z → screen x, body y → screen y, body x → depth
            const Ry = [[Math.cos(ang), 0, Math.sin(ang)], [0, 1, 0], [-Math.sin(ang), 0, Math.cos(ang)]];
            const Rx = [[1, 0, 0], [0, Math.cos(tilt), -Math.sin(tilt)], [0, Math.sin(tilt), Math.cos(tilt)]];
            const Rot = mul(Rx, mul(Ry, base));
            const D = [[r[0] * r[0], 0, 0], [0, r[1] * r[1], 0], [0, 0, r[2] * r[2]]];
            const M = mul(Rot, mul(D, T(Rot)));
            const a = M[0][0], b = M[0][1], c = M[1][1];
            const tr = (a + c) / 2, df = Math.sqrt(((a - c) / 2) ** 2 + b * b);
            const l1 = tr + df, l2 = tr - df, th = 0.5 * Math.atan2(2 * b, a - c);
            const leftW = W * 0.5, cx = leftW / 2, cy = H / 2 + 6;
            const sc = Math.min(leftW, H) * 0.30;
            // back halves of axes, ellipsoid, front halves of axes
            const axisCols = [C.teal, C.purple, C.orange];
            const ends = [0, 1, 2].map(i => [Rot[0][i] * r[i], Rot[1][i] * r[i], Rot[2][i] * r[i]]);
            const drawAxis = (front) => ends.forEach((e, i) => {
                [1, -1].forEach(sg => {
                    const z = sg * e[2];
                    if ((z >= 0) !== front) return;
                    const x2 = cx + sg * e[0] * sc * 1.18, y2 = cy + sg * e[1] * sc * 1.18;
                    u.line(ctx, [[cx, cy], [x2, y2]], axisCols[i], 2, front ? null : [3, 3]);
                });
            });
            drawAxis(false);
            ctx.save();
            ctx.translate(cx, cy); ctx.rotate(th);
            const A1 = Math.sqrt(l1) * sc, A2 = Math.sqrt(Math.max(l2, 1e-6)) * sc;
            const grd = ctx.createRadialGradient(-A1 * 0.3, -A2 * 0.35, 2, 0, 0, Math.max(A1, A2) * 1.05);
            grd.addColorStop(0, '#ffffff'); grd.addColorStop(0.45, '#7fa6e0'); grd.addColorStop(1, '#244f93');
            ctx.globalAlpha = 0.82; ctx.fillStyle = grd;
            ctx.beginPath(); ctx.ellipse(0, 0, A1, A2, 0, 0, 2 * Math.PI); ctx.fill();
            ctx.restore();
            drawAxis(true);
            u.text(ctx, (W < 600 ? 'γ = ' : 'β fixed (exaggerated), γ = ') + Math.round(gam) + '°', 14, 24, { size: 13, weight: '700' });

            // right side: axis lengths and the cos(3γ) meter
            const rx0 = leftW + 20, rw = W - rx0 - 24;
            const nar = W < 600;
            u.text(ctx, nar ? 'Axis lengths' : 'Lengths of the three axes', rx0, nar ? H * 0.15 : 34, { size: nar ? 11 : 12.5, weight: '700' });
            const bw = rw - 30;
            [0, 1, 2].forEach(i => {
                const y = nar ? H * 0.24 + i * H * 0.085 : 48 + i * 22;
                ctx.fillStyle = C.grid; ctx.fillRect(rx0 + 24, y, bw, nar ? 7 : 10);
                ctx.fillStyle = axisCols[i]; ctx.fillRect(rx0 + 24, y, bw * (r[i] - 0.6) / 0.75, nar ? 7 : 10);
                u.text(ctx, ['r₁', 'r₂', 'r₃'][i], rx0, y + (nar ? 7 : 9), { size: 12, color: axisCols[i], weight: '700' });
            });
            const my = nar ? H * 0.62 : 48 + 3 * 22 + 34;
            u.text(ctx, nar ? 'ρ₂ shift ∝ −cos 3γ' : 'Shift of ρ₂ from the β³ term (∝ −cos 3γ)', rx0, my, { size: nar ? 11 : 12.5, weight: '700' });
            const mx = rx0 + 10, mw = rw - 20, yb = my + (nar ? H * 0.14 : 34);
            ctx.save();
            const lg = ctx.createLinearGradient(mx, 0, mx + mw, 0);
            lg.addColorStop(0, 'rgba(200,55,45,0.35)'); lg.addColorStop(0.5, 'rgba(154,165,177,0.25)'); lg.addColorStop(1, 'rgba(19,138,138,0.35)');
            ctx.fillStyle = lg; ctx.fillRect(mx, yb - 6, mw, 12);
            ctx.restore();
            const val = -Math.cos(3 * g);
            const px = mx + mw * (val + 1) / 2;
            ctx.fillStyle = C.ink; ctx.beginPath(); ctx.moveTo(px, yb - 9); ctx.lineTo(px - 7, yb - 20); ctx.lineTo(px + 7, yb - 20); ctx.closePath(); ctx.fill();
            u.text(ctx, nar ? 'lower' : 'lowers ρ₂', mx, yb + (nar ? 16 : 22), { size: nar ? 10 : 11, color: C.red });
            if (!nar) u.text(ctx, 'no shift', mx + mw / 2, yb + 22, { size: 11, color: C.muted, align: 'center' });
            u.text(ctx, nar ? 'raise' : 'raises ρ₂', mx + mw, yb + (nar ? 16 : 22), { size: nar ? 10 : 11, color: C.teal, align: 'right' });
            if (!nar) u.text(ctx, 'schematic', W - 10, H - 8, { size: 10, color: C.muted, align: 'right' });
        }
    });
})();
