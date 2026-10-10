/* Page-specific animations for research/momentum-fluctuations.html
   (ATLAS, PRL 133, 252301 (2024): geometrical vs intrinsic [pT] fluctuations). */
(function () {
    'use strict';
    const { register, C, u } = window.Anim;
    const fsz = (W, base) => Math.round(u.clamp(base * W / 860, base * 0.72, base));

    // small horizontal gauge: label left, bar, marker at x in [0,1]
    function gauge(ctx, x, y, w, val, color, W, alpha) {
        ctx.save(); ctx.globalAlpha *= alpha;
        ctx.fillStyle = '#e6ebf1'; u.roundRect(ctx, x, y - 4, w, 8, 4); ctx.fill();
        const g = ctx.createLinearGradient(x, 0, x + w, 0);
        g.addColorStop(0, '#9ec1ea'); g.addColorStop(1, '#f2a46b');
        ctx.fillStyle = g; u.roundRect(ctx, x, y - 4, w, 8, 4); ctx.fill();
        const mx = x + u.clamp(val, 0, 1) * w;
        ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(mx, y - 6); ctx.lineTo(mx - 6, y - 15); ctx.lineTo(mx + 6, y - 15); ctx.closePath(); ctx.fill();
        u.text(ctx, 'low', x, y + 17, { size: fsz(W, 11), color: C.muted });
        u.text(ctx, 'high', x + w, y + 17, { size: fsz(W, 11), color: C.muted, align: 'right' });
        u.text(ctx, W < 600 ? '[pT]' : '[pT] of the event', x + w / 2, y + 17, { size: fsz(W, 11), color: C.ink, align: 'center', weight: '600' });
        ctx.restore();
    }

    function droplet(ctx, cx, cy, r, heat, push, nDots, dots, color, alpha) {
        ctx.save(); ctx.globalAlpha *= alpha;
        u.glow(ctx, cx, cy, r * 1.35, u.heat(heat, 0.9));
        ctx.strokeStyle = 'rgba(200,55,45,0.35)'; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, 2 * Math.PI); ctx.stroke();
        ctx.fillStyle = C.navy;
        for (let i = 0; i < nDots && i < dots.length; i++) {
            const d = dots[i];
            ctx.beginPath(); ctx.arc(cx + d.x * r, cy + d.y * r, 1.8, 0, 2 * Math.PI); ctx.fill();
        }
        for (let k = 0; k < 8; k++) {
            const a = k * Math.PI / 4 + Math.PI / 8, L = 6 + push;
            u.arrow(ctx, cx + (r + 3) * Math.cos(a), cy + (r + 3) * Math.sin(a), cx + (r + 3 + L) * Math.cos(a), cy + (r + 3 + L) * Math.sin(a), color, 1.8, 6);
        }
        ctx.restore();
    }

    function makeDots(n, seed) {
        const rand = u.rng(seed), out = [];
        while (out.length < n) {
            const x = 2 * rand() - 1, y = 2 * rand() - 1;
            if (x * x + y * y < 0.8) out.push({ x, y });
        }
        return out;
    }


    // ------------------------------------------------------------------
    // 0. Accumulating [pT] distribution with mean, variance, skewness
    //    (responsive version of the built-in 'histogram', without kurtosis)
    // ------------------------------------------------------------------
    register('momentum-fluctuations-hist', {
        duration: 0.25,
        aspect: 16 / 8,
        phases: [{ t: 0, label: (s) => `Events collected: ${s.vals.length}` }],
        setup() { return { rand: u.rng(3), vals: [] }; },
        onLoop(st) {
            for (let i = 0; i < 25; i++) {
                let g = 0; for (let j = 0; j < 8; j++) g -= Math.log(st.rand());
                st.vals.push((g - 8) / Math.sqrt(8));
            }
            if (st.vals.length > 6000) st.vals.splice(0, st.vals.length - 6000);
        },
        draw(ctx, t, s, W, H) {
            if (!s.vals.length) this.onLoop(s);
            const v = s.vals, n = v.length;
            let mu = 0; v.forEach(x => mu += x); mu /= n;
            let m2 = 0, m3 = 0; v.forEach(x => { const d = x - mu; m2 += d * d; m3 += d * d * d; }); m2 /= n; m3 /= n;
            const sd = Math.sqrt(m2) || 1, lo = -3.2, hi = 4.8, nb = 40, bw = (hi - lo) / nb;
            const bins = new Array(nb).fill(0);
            v.forEach(x => { const k = Math.floor((x - lo) / bw); if (k >= 0 && k < nb) bins[k]++; });
            const maxB = Math.max(...bins, 1), narrow = W < 600;
            const box = narrow ? { x: 34, y: 10, w: W - 46, h: H - 82 } : { x: 56, y: 14, w: W * 0.62, h: H - 60 };
            const m = u.axes(ctx, box, [lo, hi], [0, maxB * 1.4], { xticks: false, yticks: false, xlabel: '[pT] of each event →', ylabel: 'events' });
            ctx.fillStyle = 'rgba(31,95,191,0.75)';
            bins.forEach((b, i) => { const x0 = m.X(lo + i * bw), x1 = m.X(lo + (i + 1) * bw); ctx.fillRect(x0 + 0.5, m.Y(b), x1 - x0 - 1, m.Y(0) - m.Y(b)); });
            const g = [];
            for (let i = 0; i <= 120; i++) { const x = lo + (hi - lo) * i / 120; g.push([m.X(x), m.Y(n * bw * Math.exp(-0.5 * ((x - mu) / sd) ** 2) / (sd * Math.sqrt(2 * Math.PI)))]); }
            u.line(ctx, g, C.orange, 2, [6, 4]);
            // mean marker
            ctx.save(); ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(m.X(mu), box.y + 6); ctx.lineTo(m.X(mu), box.y + box.h); ctx.stroke(); ctx.restore();
            // width marker (±1 sd)
            const yw = box.y + box.h * 0.1;
            u.arrow(ctx, m.X(mu), yw, m.X(mu + sd), yw, C.blue, 1.5, 6); u.arrow(ctx, m.X(mu), yw, m.X(mu - sd), yw, C.blue, 1.5, 6);
            const rows = [['mean', mu.toFixed(2), C.ink], ['variance (width²)', m2.toFixed(2), C.blue], ['skewness (lopsided)', (m3 / Math.pow(m2, 1.5)).toFixed(2), C.orange]];
            const fs = fsz(W, 13);
            if (narrow) {
                rows.forEach((r, i) => {
                    const x = 8 + i * (W - 16) / 3;
                    u.text(ctx, r[0].split(' ')[0], x, H - 26, { size: fs, color: C.muted });
                    u.text(ctx, r[1], x, H - 8, { size: fs + 2, weight: '700', color: r[2] });
                });
            } else {
                const sx = box.x + box.w + 30;
                u.text(ctx, 'Moments of the distribution', sx, 34, { size: fs, weight: '700' });
                rows.forEach((r, i) => {
                    u.text(ctx, r[0], sx, 72 + i * 40, { size: fs, color: C.muted });
                    u.text(ctx, r[1], W - 18, 72 + i * 40, { size: fs + 3, weight: '700', align: 'right', color: r[2] });
                });
                u.text(ctx, '- - symmetric curve, same width', sx, H - 22, { size: fsz(W, 11), color: C.orange });
            }
        }
    });

    // ------------------------------------------------------------------
    // 1. Two sources of [pT] fluctuations: geometrical vs intrinsic
    // ------------------------------------------------------------------
    register('momentum-fluctuations-sources', {
        duration: 12,
        aspect: 16 / 8.5,
        phases: [
            { t: 0, label: 'Source 1 · geometrical: the size of the droplet changes from event to event' },
            { t: 4, label: 'Source 2 · intrinsic: same size, but how much matter is packed in changes' },
            { t: 8, label: 'In real events both act at once and shape one [pT] distribution' }
        ],
        setup() { return { dots: makeDots(160, 11) }; },
        draw(ctx, t, s, W, H) {
            const aL = t < 4 || t >= 8 ? 1 : 0.28, aR = t >= 4 ? 1 : 0.28;
            const r0 = Math.min(W * 0.11, H * 0.2), cy = H * 0.45;
            // left: size fluctuates, total energy fixed
            const sl = Math.sin(2 * Math.PI * t / 2.4);
            const rL = r0 * (1 + 0.28 * sl);
            const cxL = W * 0.25, cxR = W * 0.75;
            u.text(ctx, 'Geometrical', cxL, fsz(W, 22), { size: fsz(W, 15), weight: '700', align: 'center', alpha: aL });
            u.text(ctx, 'the overlap size R changes', cxL, fsz(W, 22) + fsz(W, 16), { size: fsz(W, 12), color: C.muted, align: 'center', alpha: aL });
            droplet(ctx, cxL, cy, rL, 0.6 - 0.3 * sl, 12 - 8 * sl, 90, s.dots, sl > 0 ? C.blue : C.red, aL);
            gauge(ctx, cxL - W * 0.15, H * 0.80, W * 0.30, 0.5 - 0.38 * sl, sl > 0 ? C.blue : C.red, W, aL);
            // right: same size, density fluctuates
            const sr = Math.sin(2 * Math.PI * t / 2.0 + 1.3);
            u.text(ctx, 'Intrinsic', cxR, fsz(W, 22), { size: fsz(W, 15), weight: '700', align: 'center', alpha: aR });
            u.text(ctx, 'same size, denser or more dilute', cxR, fsz(W, 22) + fsz(W, 16), { size: fsz(W, 12), color: C.muted, align: 'center', alpha: aR });
            droplet(ctx, cxR, cy, r0, 0.6 + 0.3 * sr, 12 + 8 * sr, Math.round(90 + 60 * sr), s.dots, sr > 0 ? C.red : C.blue, aR);
            gauge(ctx, cxR - W * 0.15, H * 0.80, W * 0.30, 0.5 + 0.38 * sr, sr > 0 ? C.red : C.blue, W, aR);
            ctx.save(); ctx.strokeStyle = C.grid; ctx.beginPath(); ctx.moveTo(W / 2, 12); ctx.lineTo(W / 2, H - 12); ctx.stroke(); ctx.restore();
            u.text(ctx, 'schematic', W - 8, H - 6, { size: 10, color: C.gray, align: 'right' });
        }
    });

    // ------------------------------------------------------------------
    // 2. Ultra-central collisions: the size stops fluctuating
    // ------------------------------------------------------------------
    // Size of the overlap of two equal discs (radius 1) at separation d, as sqrt(area/pi): 1 at d=0.
    const sizeOf = (d) => { d = u.clamp(d, 0, 2); const A = 2 * Math.acos(d / 2) - (d / 2) * Math.sqrt(4 - d * d); return Math.sqrt(A / Math.PI); };
    const bOf = (R) => { let lo = 0, hi = 2; for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (sizeOf(m) > R) lo = m; else hi = m; } return (lo + hi) / 2; };
    // the three event classes (mean and width of the untruncated size distribution)
    const CLS = [
        { mu: 0.66, sd: 0.11, name: 'Mid-central events', tag: 'b varies a lot' },
        { mu: 0.95, sd: 0.08, name: 'Top 5% (ultra-central)', tag: 'b pushed toward 0' },
        { mu: 1.02, sd: 0.012, name: 'Highest multiplicity', tag: 'b ≈ 0' }
    ];
    function sizeDist(k) {
        // truncated gaussian on a grid of R in [0.2, 1]
        const c = CLS[k], xs = [], ps = [];
        for (let i = 0; i <= 240; i++) { const x = 0.2 + 0.8 * i / 240; xs.push(x); ps.push(Math.exp(-0.5 * ((x - c.mu) / c.sd) ** 2)); }
        return { xs, ps };
    }
    function moments(d) {
        let n = 0, m = 0; d.ps.forEach((p, i) => { n += p; m += p * d.xs[i]; }); m /= n;
        let v = 0, s3 = 0; d.ps.forEach((p, i) => { const q = -(d.xs[i] - m); v += p * q * q; s3 += p * q * q * q; });
        v /= n; s3 /= n; return { mean: m, v, m3: s3 };
    }
    register('momentum-fluctuations-ucc', {
        duration: 13.5,
        aspect: 16 / 8.5,
        phases: [
            { t: 0, label: 'Mid-central: the impact parameter b, and so the size, still varies a lot' },
            { t: 4.5, label: 'Ultra-central: the overlap cannot grow past full overlap, so only smaller sizes remain: the spread turns lopsided' },
            { t: 9, label: 'Most central: b ≈ 0, the size is frozen at its maximum. The geometrical part switches off' }
        ],
        setup() {
            const dists = [0, 1, 2].map(sizeDist), mom = dists.map(moments);
            const rand = u.rng(5), samples = [0, 1, 2].map(k => {
                const out = []; const c = CLS[k];
                while (out.length < 40) { const R = c.mu + c.sd * u.gauss(rand); if (R > 0.25 && R <= 1) out.push(R); }
                return out;
            });
            return { dists, mom, samples };
        },
        draw(ctx, t, s, W, H) {
            const k = Math.min(2, Math.floor(t / 4.5)), tin = t - 4.5 * k;
            const kp = Math.max(0, k - 1), mix = k === 0 ? 1 : u.ease(u.seg(tin, 0, 0.9));
            const ev = Math.floor(tin / 0.45), R = s.samples[k][ev % 40], b = bOf(R);
            // ---- left: overlap cartoon (transverse view)
            const cx = W * 0.2, cy = W < 600 ? H * 0.36 : H * 0.5, rn = W < 600 ? Math.min(W * 0.12, H * 0.17) : Math.min(W * 0.11, H * 0.27);
            const xa = cx - b * rn / 2, xb = cx + b * rn / 2;
            ctx.save();
            ctx.fillStyle = 'rgba(31,95,191,0.10)'; ctx.strokeStyle = 'rgba(31,95,191,0.55)'; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.arc(xa, cy, rn, 0, 2 * Math.PI); ctx.fill(); ctx.stroke();
            ctx.fillStyle = 'rgba(200,55,45,0.08)'; ctx.strokeStyle = 'rgba(200,55,45,0.55)';
            ctx.beginPath(); ctx.arc(xb, cy, rn, 0, 2 * Math.PI); ctx.fill(); ctx.stroke();
            ctx.beginPath(); ctx.arc(xa, cy, rn, 0, 2 * Math.PI); ctx.clip();
            ctx.fillStyle = u.heat(0.65, 0.85); ctx.beginPath(); ctx.arc(xb, cy, rn, 0, 2 * Math.PI); ctx.fill();
            ctx.restore();
            u.ball(ctx, xa, cy, 3, C.blue); u.ball(ctx, xb, cy, 3, C.red);
            if (b > 0.08) {
                u.line(ctx, [[xa, cy + rn + (W < 600 ? 5 : 12)], [xb, cy + rn + (W < 600 ? 5 : 12)]], C.ink, 1.5);
                u.text(ctx, 'b', (xa + xb) / 2 + (W < 600 ? 0 : 0), cy + rn + (W < 600 ? 17 : 26), { size: fsz(W, 12), align: 'center', weight: '700' });
            } else u.text(ctx, 'b ≈ 0', cx, cy + rn + (W < 600 ? 17 : 26), { size: fsz(W, 12), align: 'center', weight: '700' });
            u.text(ctx, CLS[k].name, W < 600 ? 8 : cx, fsz(W, 20), { size: fsz(W, 14), weight: '700', align: W < 600 ? 'left' : 'center' });

            // ---- right: distribution of overlap size R
            const narrow = W < 600;
            const box = narrow ? { x: W * 0.47, y: H * 0.08, w: W * 0.49, h: H * 0.52 } : { x: W * 0.43, y: H * 0.10, w: W * 0.33, h: H * 0.66 };
            const m = u.axes(ctx, box, [0.2, 1.08], [0, 1.15], { xticks: false, yticks: false, xlabel: narrow ? 'size R →' : 'overlap size R  →', ylabel: 'how often' });
            const xMax = m.X(1);
            ctx.save(); ctx.strokeStyle = C.ink; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.moveTo(xMax, box.y + 4); ctx.lineTo(xMax, box.y + box.h); ctx.stroke(); ctx.restore();
            u.text(ctx, 'max size', xMax - 4, box.y + 14, { size: fsz(W, 10.5), align: 'right', color: C.ink });
            const dA = s.dists[kp], dB = s.dists[k];
            const mxA = Math.max(...dA.ps.filter((p, i) => dA.xs[i] <= 1)), mxB = Math.max(...dB.ps.filter((p, i) => dB.xs[i] <= 1));
            const pts = [[m.X(0.2), m.Y(0)]];
            dB.xs.forEach((x, i) => { if (x > 1) return; const p = u.lerp(dA.ps[i] / mxA, dB.ps[i] / mxB, mix); pts.push([m.X(x), m.Y(p)]); });
            pts.push([m.X(1), m.Y(0)]);
            ctx.save(); ctx.fillStyle = 'rgba(31,95,191,0.22)'; ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); ctx.fill(); ctx.restore();
            u.line(ctx, pts.slice(1, -1), C.blue, 2);
            u.ball(ctx, m.X(R), box.y + box.h - 6, 5, C.orange);
            // ---- readout: geometrical width^2 and third moment, relative
            const M = s.mom, vRel = u.lerp(M[kp].v, M[k].v, mix) / M[0].v, sk = u.lerp(M[kp].m3, M[k].m3, mix) / M[1].m3;
            const fs = fsz(W, 12);
            const bar = (x, y, w, lab, val, col) => {
                u.text(ctx, lab, x, y, { size: fs, color: C.muted });
                ctx.fillStyle = '#e6ebf1'; ctx.fillRect(x, y + 6, w, 9);
                ctx.fillStyle = col; ctx.fillRect(x, y + 6, w * u.clamp(val, 0, 1), 9);
            };
            if (narrow) {
                const y0 = H * 0.80;
                u.text(ctx, 'Geometrical part of the [pT] fluctuations:', 10, y0 - fs - 6, { size: fs, weight: '700' });
                bar(10, y0, W * 0.40, 'width²', vRel, C.blue);
                bar(W * 0.53, y0, W * 0.40, 'lopsidedness', sk, C.orange);
            } else {
                const rx = W * 0.80, bw = W * 0.17;
                u.text(ctx, 'Geometrical part of', rx, box.y + 10, { size: fs, weight: '700' });
                u.text(ctx, 'the [pT] fluctuations', rx, box.y + 10 + fs + 3, { size: fs, weight: '700' });
                bar(rx, box.y + box.h * 0.42, bw, 'width²', vRel, C.blue);
                bar(rx, box.y + box.h * 0.72, bw, 'lopsidedness (skew)', sk, C.orange);
                u.text(ctx, 'one event every half second', cx, H - 8, { size: fsz(W, 10.5), align: 'center', color: C.muted });
            }
            u.text(ctx, 'schematic', W - 8, H - 8, { size: 10, color: C.gray, align: 'right' });
        }
    });

    // ------------------------------------------------------------------
    // 3. At fixed size, more particles -> hotter fluid -> higher [pT]
    // ------------------------------------------------------------------
    register('momentum-fluctuations-entropy', {
        duration: 10,
        aspect: 16 / 8.5,
        phases: [
            { t: 0, label: 'Size fixed (b ≈ 0): every droplet has the same maximal size' },
            { t: 3, label: 'More particles in the same volume = denser, hotter fluid (higher entropy density)' },
            { t: 6.5, label: 'Hotter fluid pushes harder: [pT] rises with Nch. The slope is tied to the speed of sound' }
        ],
        setup() { return { dots: makeDots(220, 23) }; },
        draw(ctx, t, s, W, H) {
            const sv = -Math.cos(2 * Math.PI * t / 10);          // -1 … +1 … -1
            const cx = W * 0.22, cy = H * 0.47, r = Math.min(W * 0.13, H * 0.26);
            ctx.save(); ctx.strokeStyle = C.ink; ctx.setLineDash([5, 4]); ctx.lineWidth = 1.2;
            ctx.beginPath(); ctx.arc(cx, cy, r, 0, 2 * Math.PI); ctx.stroke(); ctx.restore();
            droplet(ctx, cx, cy, r, 0.55 + 0.35 * sv, 13 + 9 * sv, Math.round(130 + 80 * sv), s.dots, sv > 0 ? C.red : C.blue, 1);
            u.text(ctx, 'Same size, different Nch', cx, fsz(W, 20), { size: fsz(W, 14), weight: '700', align: 'center' });
            u.text(ctx, 'Nch ' + (sv > 0.15 ? 'above' : sv < -0.15 ? 'below' : 'near') + ' average', cx, H - 10, { size: fsz(W, 12), align: 'center', color: sv > 0 ? C.red : C.blue, weight: '600' });

            const box = { x: W * 0.52, y: H * 0.08, w: W * 0.44, h: H * 0.70 };
            const m = u.axes(ctx, box, [-0.15, 0.2], [-0.02, 0.025], { zero: true, xticks: false, yticks: false, xlabel: 'more particles (Nch) →', ylabel: 'higher [pT] →' });
            ctx.save(); ctx.strokeStyle = C.gray; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(m.X(0), box.y); ctx.lineTo(m.X(0), box.y + box.h); ctx.stroke(); ctx.restore();
            const slope = 0.105, xv = 0.025 + 0.15 * sv;
            u.line(ctx, [[m.X(-0.15), m.Y(-0.15 * slope)], [m.X(0.2), m.Y(0.2 * slope)]], C.purple, 2.5);
            u.ball(ctx, m.X(xv), m.Y(xv * slope), 7, sv > 0 ? C.red : C.blue);
            const a = u.seg(t, 6.5, 7.5);
            if (a > 0) {
                u.text(ctx, 'slope ∝ cs²', box.x + 10, box.y + fsz(W, 20), { size: fsz(W, 13), weight: '700', color: C.purple, alpha: a });
                u.text(ctx, '(speed of sound squared)', box.x + 10, box.y + fsz(W, 20) + fsz(W, 15), { size: fsz(W, 11), color: C.purple, alpha: a });
            }
            u.text(ctx, 'schematic', W - 8, H - 8, { size: 10, color: C.gray, align: 'right' });
        }
    });
})();
