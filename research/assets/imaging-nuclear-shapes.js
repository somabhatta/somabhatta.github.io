/* Page-specific animations for imaging-nuclear-shapes.html (STAR, Nature 2024). */
(function () {
    'use strict';
    const { register, glauber, C, u } = window.Anim;
    const fs = (W, base) => (W < 520 ? Math.max(9, base - 2.5) : base);

    // draw a 3D nucleon cloud (body frame pts) centred at cx,cy
    function drawCloud(ctx, pts, cx, cy, scale, ang, alpha) {
        const M1 = glauber.rotation(0, 0.45, 0), M2 = glauber.rotation(ang, 0, 0);
        const P = glauber.rotate(glauber.rotate(glauber.rotate(pts, glauber.rotation(0, Math.PI / 2, 0)), M2), M1);
        P.sort((a, b) => a[2] - b[2]);
        const r = 0.62 * scale;
        P.forEach(q => {
            const depth = (q[2] / 10 + 1) / 2;
            u.ball(ctx, cx + q[0] * scale, cy + q[1] * scale, r, q[3] ? C.proton : C.neutron, (0.55 + 0.45 * depth) * alpha);
        });
    }

    // ------------------------------------------------------------------
    // 1. Uranium vs gold: two rotating nuclei side by side
    // ------------------------------------------------------------------
    register('imaging-nuclear-shapes-pair', {
        duration: 12,
        aspect: 16 / 8,
        phases: [
            { t: 0, label: 'Uranium-238: elongated like a cigar (prolate)' },
            { t: 4, label: 'Gold-197: nearly round, slightly flattened (mildly oblate)' },
            { t: 8, label: 'Both spin freely: in a collider each arrives at a random orientation' }
        ],
        setup() {
            return {
                U: glauber.nucleus({ nucleus: 'U238', beta2: 0.28, gamma: 0 }, u.rng(7)),
                Au: glauber.nucleus({ nucleus: 'Au197', beta2: 0.14, gamma: 45 }, u.rng(8))
            };
        },
        draw(ctx, t, s, W, H) {
            const scale = Math.min(W / 2, H * 0.78) / (2.9 * 6.81);
            const ang = t * 2 * Math.PI / 12;
            const hiU = t < 4 || t >= 8 ? 1 : 0.35, hiAu = t >= 4 ? 1 : 0.35;
            u.glow(ctx, W * 0.27, H * 0.52, H * 0.45, 'rgba(31,95,191,0.08)');
            u.glow(ctx, W * 0.73, H * 0.52, H * 0.45, 'rgba(31,95,191,0.08)');
            drawCloud(ctx, s.U, W * 0.27, H * 0.52, scale, ang, hiU);
            {   // dashed line along uranium's long (symmetry) axis
                const M1 = glauber.rotation(0, 0.45, 0), M2 = glauber.rotation(ang, 0, 0);
                const e = glauber.rotate(glauber.rotate(glauber.rotate([[0, 0, 9.5, 0]], glauber.rotation(0, Math.PI / 2, 0)), M2), M1)[0];
                ctx.save(); ctx.globalAlpha = hiU; ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; ctx.setLineDash([5, 4]);
                ctx.beginPath(); ctx.moveTo(W * 0.27 - e[0] * scale, H * 0.52 - e[1] * scale); ctx.lineTo(W * 0.27 + e[0] * scale, H * 0.52 + e[1] * scale); ctx.stroke(); ctx.restore();
            }
            drawCloud(ctx, s.Au, W * 0.73, H * 0.52, scale, ang * 0.8 + 1, hiAu);
            u.text(ctx, '²³⁸U  uranium', W * 0.27, 24, { size: fs(W, 15), weight: '700', align: 'center', alpha: 0.4 + 0.6 * hiU });
            u.text(ctx, '¹⁹⁷Au  gold', W * 0.73, 24, { size: fs(W, 15), weight: '700', align: 'center', alpha: 0.4 + 0.6 * hiAu });
            u.text(ctx, 'strongly deformed, β₂ ≈ 0.29', W * 0.27, H - 12, { size: fs(W, 12), color: C.orange, weight: '600', align: 'center', alpha: 0.4 + 0.6 * hiU });
            u.text(ctx, 'mildly deformed, β₂ ≈ 0.13', W * 0.73, H - 12, { size: fs(W, 12), color: C.blue, weight: '600', align: 'center', alpha: 0.4 + 0.6 * hiAu });
            ctx.save(); ctx.strokeStyle = C.grid; ctx.beginPath(); ctx.moveTo(W / 2, 12); ctx.lineTo(W / 2, H - 12); ctx.stroke(); ctx.restore();
        }
    });

    // ------------------------------------------------------------------
    // 2. Exposure time: long exposure blurs, collision takes a snapshot
    // ------------------------------------------------------------------
    register('imaging-nuclear-shapes-exposure', {
        duration: 10,
        aspect: 16 / 8,
        phases: [
            { t: 0, label: 'Step 1 · A deformed nucleus constantly tumbles (quantum fluctuations in orientation)' },
            { t: 2.5, label: 'Step 2 · Slow low-energy probes see all orientations at once: a round blur' },
            { t: 5, label: 'Step 3 · A collision lasts < 0.1 fm/c: each event freezes one sharp orientation' }
        ],
        setup() { return {}; },
        draw(ctx, t, s, W, H) {
            const A = Math.min(W * 0.11, H * (W < 520 ? 0.2 : 0.27)), B = A * 0.62;
            const orient = (tt) => ({ th: tt * 1.9, len: B + (A - B) * Math.abs(Math.cos(tt * 1.13)) });
            const nuc = (cx, cy, o, col, alpha, scl = 1) => {
                ctx.save(); ctx.translate(cx, cy); ctx.rotate(o.th); ctx.scale(o.len * scl, B * scl);
                ctx.globalAlpha *= alpha;
                const g = ctx.createRadialGradient(-0.3, -0.3, 0.05, 0, 0, 1);
                g.addColorStop(0, '#ffffff'); g.addColorStop(0.4, col); g.addColorStop(1, u.shade(col, -0.35));
                ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 1, 0, 2 * Math.PI); ctx.fill();
                ctx.restore();
            };
            const cy = H * 0.5;
            // ---- left: long exposure
            const lx = W * 0.25;
            u.text(ctx, 'Low energy: long exposure', lx, 24, { size: fs(W, 14), weight: '700', align: 'center' });
            u.text(ctx, '10³–10⁴ fm/c per turn', lx, 42, { size: fs(W, 11.5), color: C.muted, align: 'center' });
            if (t > 2.5) {
                const n = Math.floor((t - 2.5) / 0.05);
                for (let k = 0; k < n; k++) nuc(lx, cy + 6, orient(2.5 + k * 0.05), C.gray, 0.06);
            }
            nuc(lx, cy + 6, orient(t), C.blue, t > 2.5 ? 0.35 : 0.95);
            if (t > 4) u.text(ctx, 'time-averaged image: looks round', lx, H - 14, { size: fs(W, 12), color: C.muted, weight: '600', align: 'center', alpha: u.seg(t, 4, 4.6) });

            // ---- right: snapshots
            const rx = W * 0.75;
            u.text(ctx, 'High-energy collision: flash', rx, 24, { size: fs(W, 14), weight: '700', align: 'center' });
            u.text(ctx, 'exposure < 0.1 fm/c', rx, 42, { size: fs(W, 11.5), color: C.muted, align: 'center' });
            const shots = [5, 6.4, 7.8];
            const bigY = cy - 4;
            let last = -1;
            shots.forEach((ts, i) => { if (t >= ts) last = i; });
            nuc(rx, bigY, orient(t), C.blue, last >= 0 ? 0.18 : 0.95);
            if (last >= 0) nuc(rx, bigY, orient(shots[last]), C.orange, 1);
            shots.forEach((ts, i) => {
                if (t < ts) return;
                const f = 1 - u.seg(t, ts, ts + 0.35);
                if (f > 0) u.glow(ctx, rx, bigY, A * 2.2, 'rgba(255,240,160,0.95)', f);
                // thumbnails
                const tx = rx + (i - 1) * Math.min(W * 0.11, 70), ty = H - 30;
                ctx.save(); ctx.strokeStyle = C.grid; ctx.fillStyle = '#fff';
                const bw = Math.min(W * 0.1, 62), bh = Math.min(H * 0.17, 40);
                ctx.fillRect(tx - bw / 2, ty - bh / 2, bw, bh); ctx.strokeRect(tx - bw / 2, ty - bh / 2, bw, bh); ctx.restore();
                nuc(tx, ty, orient(ts), C.orange, 1, 0.28);
            });
            if (t >= 5 && W >= 520) u.text(ctx, 'event-by-event snapshots', rx, H - 56, { size: fs(W, 11.5), color: C.orange, weight: '600', align: 'center' });
            ctx.save(); ctx.strokeStyle = C.grid; ctx.beginPath(); ctx.moveTo(W / 2, 12); ctx.lineTo(W / 2, H - 12); ctx.stroke(); ctx.restore();
            u.text(ctx, 'cartoon', W - 8, H - 6, { size: 9, color: C.muted, align: 'right' });
        }
    });

    // ------------------------------------------------------------------
    // 3. Body-body vs tip-tip head-on U+U collisions
    // ------------------------------------------------------------------
    register('imaging-nuclear-shapes-tiptip', {
        duration: 10,
        aspect: 16 / 9,
        phases: [
            { t: 0, label: 'Step 1 · Side view: two uranium nuclei meet head-on, body-to-body (left) or tip-to-tip (right)' },
            { t: 2.4, label: 'Step 2 · Beam\'s-eye view: the overlap (orange) is elongated and large vs. round and compact' },
            { t: 5, label: 'Step 3 · Pressure drives the expansion: uneven flow (larger v₂) vs. a faster, round push (larger [pT])' }
        ],
        setup() {
            const mk = (o, seed) => {
                const rand = u.rng(seed);
                const ev = glauber.event({ nucleus: 'U238', beta2: 0.42, gamma: 0, b: 0, sigma: 4.2, orientA: o, orientB: o }, rand);
                const parts = [];
                const v2 = Math.min(0.4, 1.6 * ev.obs.eps2);
                for (let i = 0; i < 150; i++) {
                    let ph;
                    do { ph = 2 * Math.PI * rand(); } while (rand() * (1 + 2 * v2) > 1 + 2 * v2 * Math.cos(2 * (ph - ev.obs.psi2 - Math.PI / 2)));
                    parts.push({ ph, v: 0.6 + 0.5 * rand(), d: rand() });
                }
                return { ev, parts };
            };
            return { bb: mk('bodyx', 31), tt: mk('tip', 37) };
        },
        draw(ctx, t, s, W, H) {
            const R = 6.81;
            const half = W / 2;
            const side = (cx, tip) => {
                // side-view icon: beam horizontal
                const y = 62, a = Math.min(half * 0.09, 26), bshort = a * 0.72;
                const app = u.ease(u.seg(t, 0.2, 2.2));
                const sep = (1 - app) * half * 0.28 + bshort * 0.5;
                const rx = tip ? a : bshort * 0.55, ry = tip ? bshort : a;   // flattened along beam a bit
                [-1, 1].forEach(d => {
                    ctx.save(); ctx.translate(cx + d * sep, y); ctx.scale(rx, ry);
                    const g = ctx.createRadialGradient(-0.3, -0.3, 0.05, 0, 0, 1);
                    g.addColorStop(0, '#fff'); g.addColorStop(0.4, d < 0 ? C.blue : C.purple); g.addColorStop(1, u.shade(d < 0 ? C.blue : C.purple, -0.35));
                    ctx.fillStyle = g; ctx.globalAlpha = 1 - 0.6 * u.seg(t, 2.4, 3);
                    ctx.beginPath(); ctx.arc(0, 0, 1, 0, 2 * Math.PI); ctx.fill(); ctx.restore();
                });
                ctx.save(); ctx.strokeStyle = C.grid; ctx.setLineDash([4, 4]);
                ctx.beginPath(); ctx.moveTo(cx - half * 0.42, y); ctx.lineTo(cx + half * 0.42, y); ctx.stroke(); ctx.restore();
                if (W >= 520) u.text(ctx, 'side view (beam →)', cx + half * 0.42, y - a - 4, { size: fs(W, 10), color: C.muted, align: 'right' });
            };
            const panel = (cx, d, title, line1, line2, speed) => {
                const ev = d.ev, o = ev.obs;
                u.text(ctx, title, cx, 22, { size: fs(W, 14), weight: '700', align: 'center' });
                side(cx, title.startsWith('Tip'));
                const cy = H * 0.6;
                const sc = Math.min(half, H * 0.62) / (4.3 * R);
                const show = u.seg(t, 2.4, 3.0);
                const exp = u.ease(u.seg(t, 5, 8.5));
                if (show > 0) {
                    // QGP glow
                    if (t > 5) {
                        ctx.save(); ctx.translate(cx + o.cx * sc, cy + o.cy * sc); ctx.rotate(o.psi2);
                        const smaj = 1 + exp * 0.5 * (1 - 1.4 * o.eps2), smin = 1 + exp * 0.5;
                        ctx.scale(o.R * sc * 1.25 * smaj * (1 + o.eps2), o.R * sc * 1.25 * smin * (1 - o.eps2));
                        u.glow(ctx, 0, 0, 1.4, u.heat(0.9 - 0.4 * exp, 0.6), 1 - 0.6 * exp);
                        ctx.restore();
                    }
                    const nAlpha = show * (1 - 0.85 * u.seg(t, 5, 6.5));
                    const drawSet = (pts, part) => pts.forEach((q, i) => {
                        if (!part[i] && t > 3) return;
                        u.ball(ctx, cx + q[0] * sc, cy + q[1] * sc, 0.5 * sc, part[i] ? C.orange : C.gray, nAlpha * 0.9);
                    });
                    drawSet(ev.B, ev.pb); drawSet(ev.A, ev.pa);
                    if (t > 3 && t < 5.2) {
                        u.text(ctx, `ε₂ = ${o.eps2.toFixed(2)} · size ${o.R.toFixed(1)} fm`, cx, H - 12, { size: fs(W, 11.5), color: C.muted, align: 'center', weight: '600' });
                    }
                }
                if (t > 5) {
                    d.parts.forEach(p => {
                        const e = u.clamp((exp - p.d * 0.2) / 0.8, 0, 1);
                        if (e <= 0) return;
                        const r = o.R * sc * 1.2 + e * p.v * speed * Math.min(half, H) * 0.42;
                        ctx.save(); ctx.globalAlpha = 0.6 * (1 - 0.7 * e); ctx.fillStyle = C.navy;
                        ctx.beginPath(); ctx.arc(cx + r * Math.cos(p.ph), cy + r * Math.sin(p.ph), 2, 0, 2 * Math.PI); ctx.fill(); ctx.restore();
                    });
                    // pressure / velocity arrows: longer along the short axis, overall longer for the compact droplet
                    const grow = u.ease(u.seg(t, 5, 7));
                    for (let k = 0; k < 12; k++) {
                        const ang = o.psi2 + k * Math.PI / 6;
                        const str = speed * (1 + 2.4 * o.eps2 * Math.cos(2 * (ang - o.psi2 - Math.PI / 2)));
                        const r0 = o.R * sc * 1.25, L = grow * str * Math.min(half, H) * 0.12;
                        const x0 = cx + o.cx * sc, y0 = cy + o.cy * sc;
                        if (L > 3) u.arrow(ctx, x0 + r0 * Math.cos(ang), y0 + r0 * Math.sin(ang), x0 + (r0 + L) * Math.cos(ang), y0 + (r0 + L) * Math.sin(ang), C.red, 2.2, 7);
                    }
                    const a = u.seg(t, 5.6, 6.2);
                    if (W >= 520) u.text(ctx, line1, cx, H - 28, { size: fs(W, 11.5), color: C.ink, weight: '600', align: 'center', alpha: a });
                    u.text(ctx, line2, cx, H - 11, { size: fs(W, 11.5), color: C.orange, weight: '700', align: 'center', alpha: a });
                }
            };
            ctx.save(); ctx.beginPath(); ctx.rect(0, 0, half, H); ctx.clip();
            panel(W * 0.25, s.bb, 'Body–body', 'elongated, larger overlap', 'large v₂ · smaller [pT]', 0.8);
            ctx.restore();
            ctx.save(); ctx.beginPath(); ctx.rect(half, 0, half, H); ctx.clip();
            panel(W * 0.75, s.tt, 'Tip–tip', 'round, compact overlap', 'small v₂ · larger [pT]', 1.15);
            ctx.restore();
            ctx.save(); ctx.strokeStyle = C.grid; ctx.beginPath(); ctx.moveTo(half, 12); ctx.lineTo(half, H - 12); ctx.stroke(); ctx.restore();
        }
    });

    // ------------------------------------------------------------------
    // 4. The ratio trick: U+U / Au+Au cancels the fluid, model gives beta2
    // ------------------------------------------------------------------
    register('imaging-nuclear-shapes-ratio', {
        duration: 11,
        aspect: 16 / 8.5,
        phases: [
            { t: 0, label: 'Step 1 · Same fluid, different nuclei: U+U and Au+Au pass through near-identical QGP' },
            { t: 3, label: 'Step 2 · Divide U+U by Au+Au: the poorly known fluid properties largely cancel' },
            { t: 5.5, label: 'Step 3 · Hydrodynamic models predict how the ratio grows with uranium\'s β₂' },
            { t: 7.8, label: 'Step 4 · Where model meets data, we read off β₂ (schematic)' }
        ],
        setup() { return {}; },
        draw(ctx, t, s, W, H) {
            const narrow = W < 560;
            const LW = narrow ? W : W * 0.5;
            const flowH = H;
            ctx.save();
            if (narrow) ctx.globalAlpha = 1 - u.seg(t, 5.0, 5.3);
            if (!narrow || t < 5.3) {
            // ---------- left: lanes ----------
            const rows = [{ y: flowH * 0.3, lab: 'U+U', col: C.orange, rx: 1, ry: 0.62, bar: 0.82 },
                          { y: flowH * 0.68, lab: 'Au+Au', col: C.blue, rx: 0.86, ry: 0.78, bar: 0.5 }];
            const sz = Math.min(LW * 0.06, flowH * 0.11);
            const xIcon = LW * 0.12, xBox = LW * 0.42, xBar = LW * 0.66;
            const cancel = u.seg(t, 3, 4.2);
            rows.forEach(r => {
                ctx.save(); ctx.translate(xIcon, r.y); ctx.scale(sz * r.rx * 1.3, sz * r.ry * 1.3);
                const g = ctx.createRadialGradient(-0.3, -0.3, 0.05, 0, 0, 1);
                g.addColorStop(0, '#fff'); g.addColorStop(0.4, r.col); g.addColorStop(1, u.shade(r.col, -0.35));
                ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 1, 0, 2 * Math.PI); ctx.fill(); ctx.restore();
                u.text(ctx, r.lab, xIcon, r.y + sz * 1.3 + 14, { size: fs(W, 12), weight: '700', align: 'center', color: r.col });
                const a1 = u.seg(t, 0.3, 1.2);
                if (a1 > 0) u.arrow(ctx, xIcon + sz * 1.6, r.y, xIcon + sz * 1.6 + (xBox - LW * 0.1 - xIcon - sz * 1.6) * a1, r.y, C.gray, 1.6, 6);
                const a2 = u.seg(t, 1.2, 2.4);
                if (a2 > 0) {
                    u.arrow(ctx, xBox + LW * 0.1, r.y, xBox + LW * 0.1 + (xBar - xBox - LW * 0.12) * a2, r.y, C.gray, 1.6, 6);
                    const bl = (LW * 0.3) * r.bar * a2;
                    ctx.fillStyle = r.col; ctx.globalAlpha = 0.8;
                    ctx.fillRect(xBar, r.y - 8, bl, 16); ctx.globalAlpha = 1;
                    u.text(ctx, '⟨v₂²⟩', xBar + bl + 4, r.y + 4, { size: fs(W, 11), color: C.muted, alpha: u.seg(t, 2, 2.4) });
                }
            });
            // fluid box spanning both lanes
            const bx = xBox - LW * 0.1, by = rows[0].y - sz * 1.6, bw = LW * 0.2, bh = rows[1].y - rows[0].y + sz * 3.2;
            ctx.save(); ctx.globalAlpha = 1 - 0.65 * cancel;
            ctx.fillStyle = 'rgba(232,113,10,0.10)'; ctx.strokeStyle = C.orange; ctx.lineWidth = 1.2;
            u.roundRect(ctx, bx, by, bw, bh, 8); ctx.fill(); ctx.stroke(); ctx.restore();
            u.text(ctx, 'same', bx + bw / 2, by + bh / 2 - 8, { size: fs(W, 11.5), weight: '700', align: 'center', color: C.orange, alpha: 1 - 0.6 * cancel });
            u.text(ctx, 'QGP fluid', bx + bw / 2, by + bh / 2 + 8, { size: fs(W, 11.5), weight: '700', align: 'center', color: C.orange, alpha: 1 - 0.6 * cancel });
            if (cancel > 0) {
                u.text(ctx, 'cancels in ratio', bx + bw / 2, by + bh + 16, { size: fs(W, 11), color: C.red, weight: '700', align: 'center', alpha: cancel });
                u.text(ctx, 'R = U+U ÷ Au+Au', xBar, (rows[0].y + rows[1].y) / 2 + 4, { size: fs(W, 12.5), weight: '700', color: C.ink, alpha: cancel });
            }
            }
            ctx.restore();
            // ---------- right: R vs beta2^2 ----------
            const box = narrow ? { x: 56, y: 12, w: W - 72, h: H - 54 }
                               : { x: W * 0.5 + 60, y: 16, w: W * 0.5 - 80, h: H - 64 };
            const show = u.seg(t, 5.3, 5.9);
            if (show > 0) {
                ctx.save(); ctx.globalAlpha = show;
                const m = u.axes(ctx, box, [0, 0.12], [0.8, 1.9], { xticks: [0, 0.05, 0.1], yticks: [1, 1.5], xlabel: 'uranium deformation β₂²', ylabel: 'ratio R' });
                const k = u.seg(t, 5.5, 7.3);
                const f = (x) => 0.85 + 8.1 * x;
                const pts = [];
                for (let i = 0; i <= 50 * k; i++) { const x = 0.12 * i / 50; pts.push([m.X(x), m.Y(f(x))]); }
                if (pts.length > 1) u.line(ctx, pts, C.purple, 2.6);
                u.text(ctx, 'model', m.X(0.072), m.Y(f(0.05)), { size: fs(W, 11), color: C.purple, weight: '700' });
                const d = u.seg(t, 7.8, 8.4);
                if (d > 0) {
                    ctx.globalAlpha = show * d;
                    ctx.fillStyle = 'rgba(29,43,58,0.15)';
                    ctx.fillRect(box.x, m.Y(1.62), box.w, m.Y(1.47) - m.Y(1.62));
                    u.text(ctx, 'data (0–5% most central)', box.x + 6, m.Y(1.62) - 5, { size: fs(W, 11), color: C.ink, weight: '700' });
                    const e = u.seg(t, 8.4, 9.2);
                    if (e > 0) {
                        const xi = (1.545 - 0.85) / 8.1;
                        ctx.globalAlpha = show * e;
                        ctx.strokeStyle = C.red; ctx.setLineDash([4, 3]); ctx.lineWidth = 1.6;
                        ctx.beginPath(); ctx.moveTo(m.X(xi), m.Y(1.545)); ctx.lineTo(m.X(xi), box.y + box.h); ctx.stroke(); ctx.setLineDash([]);
                        u.ball(ctx, m.X(xi), m.Y(1.545), 5, C.red);
                        u.text(ctx, 'β₂ ≈ 0.29', m.X(xi) + 8, box.y + box.h - 10, { size: fs(W, 12.5), color: C.red, weight: '700' });
                    }
                }
                ctx.restore();
                u.text(ctx, 'schematic', box.x + box.w - 6, box.y + box.h - 6, { size: 10, color: C.muted, align: 'right', alpha: show });
            }
        }
    });

    // ------------------------------------------------------------------
    // 5. Triaxiality gamma: prolate -> triaxial -> oblate, and the measured value
    // ------------------------------------------------------------------
    register('imaging-nuclear-shapes-gamma', {
        duration: 11,
        aspect: 16 / 8,
        phases: [
            { t: 0, label: 'γ = 0°: prolate, a cigar with two equal short axes' },
            { t: 2.5, label: 'Increasing γ: all three axes differ (triaxial)' },
            { t: 5.5, label: 'γ = 60°: oblate, a flattened disc' },
            { t: 7.6, label: 'Measured for uranium: γ ≈ 9° ± 4.5°, a cigar with only slight triaxiality' }
        ],
        setup() { return {}; },
        draw(ctx, t, s, W, H) {
            let gdeg;
            if (t < 2.5) gdeg = 0;
            else if (t < 5.5) gdeg = 60 * u.ease(u.seg(t, 2.5, 5.5));
            else if (t < 6.8) gdeg = 60;
            else gdeg = u.lerp(60, 8.7, u.ease(u.seg(t, 6.8, 7.6)));
            const g = gdeg * Math.PI / 180, beta = 0.29, amp = 2.2;   // amp exaggerates the shape for visibility
            const k5 = Math.sqrt(5 / (4 * Math.PI));
            const ax = [1, 2, 3].map(k => 1 + amp * k5 * beta * Math.cos(g - 2 * Math.PI * k / 3));
            // ax[2] = long axis at gamma=0 (z), ax[0], ax[1] = x, y
            const cx = W * 0.3, cy = H * 0.52, R0 = Math.min(W * 0.15, H * 0.3);
            // project ellipsoid with rotation
            const ang = t * 0.5;
            const Rm = glauber.rotation(ang, 1.1, 0.4);
            const D = [ax[0] * ax[0], ax[1] * ax[1], ax[2] * ax[2]];
            let sxx = 0, sxy = 0, syy = 0;
            for (let i = 0; i < 3; i++) { sxx += Rm[0][i] * Rm[0][i] * D[i]; sxy += Rm[0][i] * Rm[1][i] * D[i]; syy += Rm[1][i] * Rm[1][i] * D[i]; }
            const tr = sxx + syy, det = sxx * syy - sxy * sxy, disc = Math.sqrt(Math.max(tr * tr / 4 - det, 0));
            const l1 = tr / 2 + disc, l2 = tr / 2 - disc, th = 0.5 * Math.atan2(2 * sxy, sxx - syy);
            u.glow(ctx, cx, cy, R0 * 2, 'rgba(31,95,191,0.08)');
            ctx.save(); ctx.translate(cx, cy); ctx.rotate(th); ctx.scale(Math.sqrt(l1) * R0, Math.sqrt(l2) * R0);
            const gr = ctx.createRadialGradient(-0.35, -0.35, 0.05, 0, 0, 1);
            gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.45, '#e9a25a'); gr.addColorStop(1, '#a8561a');
            ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(0, 0, 1, 0, 2 * Math.PI); ctx.fill(); ctx.restore();
            // principal axes (front halves)
            const cols = [C.blue, C.teal, C.red];
            for (let i = 0; i < 3; i++) {
                const px = Rm[0][i] * ax[i] * R0, py = Rm[1][i] * ax[i] * R0;
                u.line(ctx, [[cx - px, cy - py], [cx + px, cy + py]], cols[i], 2, [4, 3]);
            }
            u.text(ctx, 'shape exaggerated ×2', cx, H - 10, { size: fs(W, 10.5), color: C.muted, align: 'center' });
            // ---- dial ----
            const nar = W < 520;
            const dx = W * (nar ? 0.68 : 0.72), dy = H * (nar ? 0.56 : 0.74), dr = nar ? Math.min(W * 0.24, H * 0.36) : Math.min(W * 0.2, H * 0.55);
            const lo = nar ? 13 : 16;
            const toA = (deg) => Math.PI + (deg / 60) * Math.PI;   // 0° at left, 60° at right
            ctx.save(); ctx.strokeStyle = C.grid; ctx.lineWidth = 10;
            ctx.beginPath(); ctx.arc(dx, dy, dr, Math.PI, 2 * Math.PI); ctx.stroke(); ctx.restore();
            if (t > 7.8) {
                const a = u.seg(t, 7.8, 8.5);
                ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = 'rgba(232,113,10,0.75)'; ctx.lineWidth = 12;
                ctx.beginPath(); ctx.arc(dx, dy, dr, toA(8.7 - 4.5), toA(8.7 + 4.5)); ctx.stroke();
                ctx.strokeStyle = 'rgba(31,95,191,0.8)'; ctx.lineWidth = 4;
                ctx.beginPath(); ctx.arc(dx, dy, dr + 11, toA(6), toA(8)); ctx.stroke(); ctx.restore();
                u.text(ctx, 'this measurement: 8.7° ± 4.5°', dx, dy + 2.15 * lo, { size: fs(W, 11.5), color: C.orange, weight: '700', align: 'center', alpha: a });
                u.text(ctx, 'low-energy estimate: 6–8°', dx, dy + 3.15 * lo, { size: fs(W, 11.5), color: C.blue, weight: '700', align: 'center', alpha: a });
            }
            [[0, 'prolate'], [30, 'triaxial'], [60, 'oblate']].forEach(([d, l]) => {
                const a = toA(d);
                const off = nar ? (d === 30 ? 12 : 0) : 26;
                u.text(ctx, l, dx + (dr + off) * Math.cos(a), dy + (dr + off) * Math.sin(a) + (d === 30 ? -2 : lo), { size: fs(W, 11.5), color: C.muted, weight: '600', align: 'center' });
            });
            [0, 20, 40, 60].forEach(d => {
                const a = toA(d);
                u.text(ctx, d + '°', dx + (dr - 22) * Math.cos(a), dy + (dr - 22) * Math.sin(a) + 4, { size: fs(W, 10), color: C.muted, align: 'center' });
            });
            const na = toA(gdeg);
            u.arrow(ctx, dx, dy, dx + (dr - 8) * Math.cos(na), dy + (dr - 8) * Math.sin(na), C.ink, 2.4, 9);
            u.text(ctx, `γ = ${Math.round(gdeg)}°`, dx, dy + lo, { size: fs(W, 14), weight: '700', align: 'center' });
        }
    });
})();
