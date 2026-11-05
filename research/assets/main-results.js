/* ==========================================================================
   main-results.js: one "main result" animation per paper (scene "main-<slug>").
   Each scene illustrates the headline result stated in the paper's abstract
   and summary. Curves are schematic: they follow the trends of the cited
   figures but are not data points.

   Text in labels may contain LaTeX-style math between $...$ (italic
   variables, true sub/superscripts); see mtext() and Anim.mathHTML().
   ========================================================================== */
(function () {
    'use strict';
    const {register, u} = window.Anim;
    const P = {ink: '#17324f', muted: '#536a80', line: '#dce6ee', navy: '#003366', red: '#c0392b', blue: '#2f6fb3',
        green: '#2e8b3a', gold: '#a86d0c', orange: '#d9480f', pink: '#c2466a', gray: '#8a97a8', panel: '#ffffff'};
    const MATHFONT = "'STIX Two Text','Times New Roman',Times,serif";
    const SANS = 'Inter, Arial, sans-serif';
    const SYM = {'\\beta': 'β', '\\gamma': 'γ', '\\eta': 'η', '\\rho': 'ρ', '\\varepsilon': 'ε', '\\delta': 'δ',
        '\\Delta': 'Δ', '\\langle': '⟨', '\\rangle': '⟩', '\\times': ' × ', '\\circ': '°', '\\approx': ' ≈ ',
        '\\propto': ' ∝ ', '\\sigma': 'σ', '\\alpha': 'α', '\\pm': ' ± ', '\\to': ' → ', '\\perp': '⊥',
        '\\lesssim': ' ≲ ', '\\ll': ' ≪ ', '\\,': ' ', '\\psi': 'ψ', '\\Psi': 'Ψ'};
    const ITALIC_GREEK = 'βγηρεδσαψ';

    // ---------- LaTeX-style math -> list of runs ----------
    function group(s, i) {
        if (s[i] === '{') {
            let depth = 1, j = i + 1;
            while (depth && j < s.length) { if (s[j] === '{') depth++; else if (s[j] === '}') depth--; j++; }
            return [s.slice(i + 1, j - 1), j];
        }
        if (s[i] === '\\') { const m = /^\\[A-Za-z]+|^\\./.exec(s.slice(i)); return [m[0], i + m[0].length]; }
        return [s[i], i + 1];
    }
    function mathRuns(s, shift, scale, upright, out) {
        let i = 0;
        while (i < s.length) {
            const c = s[i];
            if (c === '_' || c === '^') {
                const [g, j] = group(s, i + 1); i = j;
                mathRuns(g, shift + (c === '_' ? 1 : -1) * (scale < 1 ? 0.6 : 1), scale * 0.7, upright, out);
                continue;
            }
            if (s.startsWith('\\mathrm', i)) { const [g, j] = group(s, i + 7); i = j; mathRuns(g, shift, scale, true, out); continue; }
            if (s.startsWith('\\bar', i)) { const [g, j] = group(s, i + 4); i = j; const n0 = out.length; mathRuns(g, shift, scale, upright, out); if (out.length > n0) out[out.length - 1].txt += '\u0304'; continue; }
            if (c === '\\') {
                const [g, j] = group(s, i); i = j;
                const ch = SYM[g] !== undefined ? SYM[g] : g.slice(1);
                out.push({txt: ch, math: true, ital: !upright && ITALIC_GREEK.includes(ch), shift, scale});
                continue;
            }
            if (c === ' ') { i++; continue; }
            let j = i;
            while (j < s.length && !'_^\\ '.includes(s[j])) j++;
            let run = s.slice(i, j).replace(/([=+<>])/g, ' $1 ').replace(/-/g, '−');
            run.split(/([A-Za-z]+)/).forEach(part => {
                if (part) out.push({txt: part, math: true, ital: !upright && /^[A-Za-z]+$/.test(part), shift, scale});
            });
            i = j;
        }
    }
    function runs(str) {
        const out = [];
        str.split(/(\$[^$]*\$)/).forEach(p => {
            if (!p) return;
            if (p[0] === '$') mathRuns(p.slice(1, -1), 0, 1, false, out);
            else out.push({txt: p, math: false, ital: false, shift: 0, scale: 1});
        });
        return out;
    }
    function font(r, size, weight) {
        const sz = size * r.scale * (r.math ? 1.12 : 1);
        return r.math ? `${r.ital ? 'italic ' : ''}${weight >= 600 ? 'bold ' : ''}${sz}px ${MATHFONT}` : `${weight} ${sz}px ${SANS}`;
    }
    function mwidth(ctx, str, size, weight = 500) {
        ctx.save(); let w = 0;
        runs(str).forEach(r => { ctx.font = font(r, size, weight); w += ctx.measureText(r.txt).width; });
        ctx.restore(); return w;
    }
    // Draw rich text; align: left | center | right.
    function mt(ctx, str, x, y, size = 13, color = P.ink, align = 'left', weight = 500, alpha = 1) {
        const rs = runs(str);
        const w = mwidth(ctx, str, size, weight);
        let cx = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
        ctx.save(); ctx.fillStyle = color; ctx.globalAlpha *= alpha; ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
        rs.forEach(r => {
            ctx.font = font(r, size, weight);
            ctx.fillText(r.txt, cx, y + r.shift * size * 0.3);
            cx += ctx.measureText(r.txt).width;
        });
        ctx.restore(); return w;
    }
    // HTML version for DOM captions (used by anim.js for step labels).
    function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
    function mathHTMLInner(s) {
        let out = '', i = 0;
        while (i < s.length) {
            const c = s[i];
            if (c === '_' || c === '^') {
                const [g, j] = group(s, i + 1); i = j;
                out += (c === '_' ? '<sub>' : '<sup>') + mathHTMLInner(g) + (c === '_' ? '</sub>' : '</sup>');
                continue;
            }
            if (s.startsWith('\\mathrm', i)) { const [g, j] = group(s, i + 7); i = j; out += '<span class="m-up">' + esc(g) + '</span>'; continue; }
            if (s.startsWith('\\bar', i)) { const [g, j] = group(s, i + 4); i = j; out += mathHTMLInner(g) + '\u0304'; continue; }
            if (c === '\\') {
                const [g, j] = group(s, i); i = j;
                const ch = SYM[g] !== undefined ? SYM[g] : g.slice(1);
                out += ITALIC_GREEK.includes(ch) ? '<i>' + ch + '</i>' : esc(ch);
                continue;
            }
            let j = i;
            while (j < s.length && !'_^\\'.includes(s[j])) j++;
            out += esc(s.slice(i, j)).replace(/([A-Za-z]+)/g, '<i>$1</i>').replace(/-/g, '−');
            i = j;
        }
        return out;
    }
    window.Anim.mathHTML = str => str.split(/(\$[^$]*\$)/).map(p =>
        p[0] === '$' ? '<span class="m">' + mathHTMLInner(p.slice(1, -1)) + '</span>' : esc(p)).join('');

    // ---------- drawing helpers ----------
    const ease = x => u.ease(u.clamp(x, 0, 1));
    const seg = (t, a, b) => ease(u.seg(t, a, b));
    function rr(ctx, x, y, w, h, r, fill, stroke) {
        ctx.save(); u.roundRect(ctx, x, y, w, h, r);
        if (fill) { ctx.fillStyle = fill; ctx.fill(); }
        if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke(); }
        ctx.restore();
    }
    function poly(ctx, pts, col, width = 2.5, dash = null, alpha = 1) {
        if (pts.length < 2) return;
        ctx.save(); ctx.globalAlpha *= alpha; ctx.strokeStyle = col; ctx.lineWidth = width; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        if (dash) ctx.setLineDash(dash);
        ctx.beginPath(); pts.forEach((q, k) => k ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.stroke(); ctx.restore();
    }
    function dot(ctx, x, y, r, col, alpha = 1, stroke = null) {
        ctx.save(); ctx.globalAlpha *= alpha; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, r, 0, 2 * Math.PI); ctx.fill();
        if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke(); } ctx.restore();
    }
    function arrow(ctx, x1, y1, x2, y2, col, w = 2, head = 7, alpha = 1) {
        ctx.save(); ctx.globalAlpha *= alpha; u.arrow(ctx, x1, y1, x2, y2, col, w, head); ctx.restore();
    }
    function blob(ctx, cx, cy, rx, ry, alpha = 1, angle = 0, hot = 0) {
        ctx.save(); ctx.globalAlpha *= alpha; ctx.translate(cx, cy); ctx.rotate(angle); ctx.scale(1, ry / rx);
        const g = ctx.createRadialGradient(0, 0, 1, 0, 0, rx);
        g.addColorStop(0, '#fff3d6'); g.addColorStop(0.5 - 0.2 * hot, '#f39c3c'); g.addColorStop(1, 'rgba(217,72,15,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, rx, 0, 2 * Math.PI); ctx.fill(); ctx.restore();
    }
    function nucleusShape(ctx, cx, cy, rx, ry, base, alpha = 1, angle = 0, ring = null) {
        ctx.save(); ctx.globalAlpha *= alpha; ctx.translate(cx, cy); ctx.rotate(angle);
        const g = ctx.createRadialGradient(-rx * 0.3, -ry * 0.35, 1, 0, 0, Math.max(rx, ry) * 1.1);
        g.addColorStop(0, base === 'red' ? '#eea195' : '#a9c6ec'); g.addColorStop(1, base === 'red' ? '#a8281c' : '#2459a0');
        ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, 2 * Math.PI); ctx.fill();
        if (ring) { ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.ellipse(0, 0, ring, ry, 0, 0, 2 * Math.PI); ctx.stroke(); }
        ctx.restore();
    }
    function header(ctx, W, title, sub) { mt(ctx, title, 22, 30, 18, P.navy, 'left', 800); if (sub) mt(ctx, sub, 22, 50, 12, P.muted); }
    function footer(ctx, W, H, str, strong = false) {
        rr(ctx, 18, H - 44, W - 36, 30, 8, strong ? P.navy : '#edf4fa');
        mt(ctx, str, W / 2, H - 24, 13, strong ? '#fff' : P.ink, 'center', 700);
    }
    // Plot frame: returns X, Y maps. b = {x, y, w, h}
    function frame(ctx, b, xr, yr, o = {}) {
        rr(ctx, b.x, b.y, b.w, b.h, 6, '#fff', P.line);
        const X = v => b.x + (o.logx ? (Math.log(v) - Math.log(xr[0])) / (Math.log(xr[1]) - Math.log(xr[0])) : (v - xr[0]) / (xr[1] - xr[0])) * b.w;
        const Y = v => b.y + b.h - (v - yr[0]) / (yr[1] - yr[0]) * b.h;
        if (yr[0] < 0 && yr[1] > 0) poly(ctx, [[b.x, Y(0)], [b.x + b.w, Y(0)]], '#9aa8ba', 1.2, [4, 4]);
        (o.xticks || []).forEach(v => mt(ctx, String(v), X(v), b.y + b.h + 15, 11, P.muted, 'center'));
        if (o.xlabel) mt(ctx, o.xlabel, b.x + b.w / 2, b.y + b.h + (o.xticks ? 32 : 18), 12, P.muted, 'center');
        if (o.ylabel) {
            ctx.save(); ctx.translate(b.x - 10, b.y + b.h / 2); ctx.rotate(-Math.PI / 2);
            mt(ctx, o.ylabel, 0, 0, 12, P.muted, 'center'); ctx.restore();
        }
        if (o.tag) mt(ctx, o.tag, b.x + b.w, b.y - 5, 10, P.gray, 'right');
        return {X, Y};
    }
    function curve(ctx, f, a, b, X, Y, col, width = 2.6, dash = null, prog = 1, n = 80, alpha = 1, log = false) {
        const pts = [];
        const end = log ? Math.exp(Math.log(a) + (Math.log(b) - Math.log(a)) * prog) : a + (b - a) * prog;
        for (let k = 0; k <= n; k++) {
            const v = log ? Math.exp(Math.log(a) + (Math.log(end) - Math.log(a)) * k / n) : a + (end - a) * k / n;
            pts.push([X(v), Y(f(v))]);
        }
        poly(ctx, pts, col, width, dash, alpha);
    }
    function legend(ctx, x, y, items, size = 11) {
        items.forEach((it, k) => {
            const yy = y + k * (size + 7);
            if (it.dot) dot(ctx, x + 6, yy - 4, 4, it.col); else poly(ctx, [[x, yy - 4], [x + 14, yy - 4]], it.col, 3, it.dash || null);
            mt(ctx, it.label, x + 20, yy, size, it.col, 'left', 700);
        });
    }
    function check(ctx, x, y, alpha = 1) {
        ctx.save(); ctx.globalAlpha *= alpha; dot(ctx, x, y, 9, P.green);
        poly(ctx, [[x - 4, y], [x - 1, y + 3.5], [x + 4.5, y - 3.5]], '#fff', 2.2); ctx.restore();
    }
    function wrap(ctx, str, x, y, width, size, color, align = 'left', lh = 16, weight = 500) {
        const words = str.split(' '); const lines = []; let line = '';
        words.forEach(wd => { const next = line ? line + ' ' + wd : wd; if (mwidth(ctx, next, size, weight) > width && line) { lines.push(line); line = wd; } else line = next; });
        if (line) lines.push(line);
        lines.forEach((l, k) => mt(ctx, l, x, y + k * lh, size, color, align, weight));
        return lines.length * lh;
    }
    function overlap(ctx, cx, cy, R, b, scale, alpha = 1, hot = 0) {
        // almond-shaped overlap of two discs of radius R at distance b, beam axis into the screen
        ctx.save(); ctx.globalAlpha *= alpha;
        ctx.strokeStyle = '#9aa8ba'; ctx.setLineDash([3, 3]); ctx.lineWidth = 1;
        [-1, 1].forEach(s => { ctx.beginPath(); ctx.arc(cx + s * b / 2 * scale, cy, R * scale, 0, 2 * Math.PI); ctx.stroke(); });
        ctx.setLineDash([]); ctx.beginPath(); ctx.arc(cx - b / 2 * scale, cy, R * scale, 0, 2 * Math.PI); ctx.clip();
        ctx.beginPath(); ctx.arc(cx + b / 2 * scale, cy, R * scale, 0, 2 * Math.PI); ctx.clip();
        const g = ctx.createRadialGradient(cx, cy, 1, cx, cy, R * scale);
        g.addColorStop(0, '#fff3d6'); g.addColorStop(0.45, hot > 0.5 ? '#e8590c' : '#f39c3c'); g.addColorStop(1, '#f7b267');
        ctx.fillStyle = g; ctx.fillRect(cx - R * scale * 2, cy - R * scale * 2, R * scale * 4, R * scale * 4);
        ctx.restore();
    }

    // ======================================================================
    // 1. STAR Nature 2024: imaging the shape of uranium
    // ======================================================================
    register('main-imaging-nuclear-shapes', {
        duration: 17, aspect: 16 / 9,
        phases: [
            {t: 0, label: 'Uranium-238 is elongated. Each collision catches the two nuclei in a random orientation, a snapshot taken in less than 0.1 fm/$c$.'},
            {t: 4, label: 'Body–body collisions give an elongated, larger overlap: large $v_2$ and lower $[p_T]$. Tip–tip collisions give a compact, round overlap: small $v_2$ and higher $[p_T]$.'},
            {t: 8.5, label: 'Head-on collisions (0–0.5%): in U+U, $\\langle v_2^2 \\rangle$ falls with $\\delta p_T/\\langle [p_T] \\rangle$ (body–body at low, tip–tip at high); in Au+Au it rises.'},
            {t: 13, label: 'Comparing U+U/Au+Au ratios with hydrodynamic models gives $\\beta_2 = 0.286 \\pm 0.025$ and $\\gamma = 8.7^\\circ \\pm 4.5^\\circ$: large deformation, slightly triaxial, consistent with low-energy experiments.'}
        ],
        draw(ctx, t, s, W, H) {
            header(ctx, W, 'Collisions image the shape of nuclei', 'STAR: U+U at 193 GeV vs Au+Au at 200 GeV');
            const lx = 22, lw = W * 0.44, top = 66, bot = H - 54;
            rr(ctx, lx, top, lw, bot - top, 10, '#fff', P.line);
            const midY = (top + bot) / 2;
            const a = seg(t, 3.2, 4.6);
            // phase 1: tumbling nucleus
            if (a < 1) {
                const ang = t * 1.4;
                nucleusShape(ctx, lx + lw / 2, midY - 6, 62, 36, 'red', 1 - a, ang);
                mt(ctx, '$^{238}$U: random orientation', lx + lw / 2, bot - 16, 12, '#a8281c', 'center', 700, 1 - a);
            }
            if (a > 0) {
                const cols = [{x: lx + lw * 0.27, name: 'body–body', rx: 30, ry: 50, push: 0.8, txt1: 'large $v_2$', txt2: 'lower $[p_T]$'},
                    {x: lx + lw * 0.73, name: 'tip–tip', rx: 34, ry: 34, push: 1.25, txt1: 'small $v_2$', txt2: 'higher $[p_T]$'}];
                cols.forEach(c => {
                    mt(ctx, c.name, c.x, top + 24, 13, P.navy, 'center', 800, a);
                    blob(ctx, c.x, midY - 4, c.rx * 1.5, c.ry * 1.5, a);
                    const g = seg(t, 4.8, 7);
                    for (let k = 0; k < 8; k++) {
                        const ang = k * Math.PI / 4;
                        const ex = c.x + c.rx * Math.cos(ang), ey = midY - 4 + c.ry * Math.sin(ang);
                        // stronger push along the short axis (larger pressure gradient); compact overlap pushes harder
                        const L = g * 18 * c.push * (1 + 0.6 * (c.ry - c.rx) / c.ry * Math.cos(2 * ang));
                        arrow(ctx, ex, ey, ex + L * Math.cos(ang), ey + L * Math.sin(ang), P.orange, 2, 6, a * g);
                    }
                    mt(ctx, c.txt1, c.x, bot - 34, 12, P.ink, 'center', 700, a);
                    mt(ctx, c.txt2, c.x, bot - 16, 12, P.ink, 'center', 700, a);
                });
            }
            // right: plot
            const b = {x: W * 0.52 + 14, y: top + 6, w: W * 0.48 - 44, h: bot - top - 44};
            const {X, Y} = frame(ctx, b, [-1, 1], [0, 1.1], {xlabel: '$\\delta p_T / \\langle [p_T] \\rangle \\to$', ylabel: '$\\langle v_2^2 \\rangle$', tag: 'schematic'});
            const pr = seg(t, 8.5, 11.5);
            const fU = x => 0.82 - 0.24 * x, fAu = x => 0.47 + 0.08 * x;
            curve(ctx, fU, -0.9, 0.9, X, Y, P.red, 3, null, pr);
            curve(ctx, fAu, -0.9, 0.9, X, Y, P.blue, 3, null, pr);
            if (pr > 0.05) {
                mt(ctx, 'U+U', X(-0.85), Y(fU(-0.85)) - 10, 12, P.red, 'left', 800, pr);
                mt(ctx, 'Au+Au', X(-0.85), Y(fAu(-0.85)) + 20, 12, P.blue, 'left', 800, pr);
                mt(ctx, 'body–body', X(-0.9), b.y + b.h - 8, 10.5, P.gray, 'left', 600, pr);
                mt(ctx, 'tip–tip', X(0.9), b.y + b.h - 8, 10.5, P.gray, 'right', 600, pr);
            }
            const r = seg(t, 13, 14);
            if (r > 0) {
                rr(ctx, b.x + b.w - 150, b.y + 22, 140, 54, 8, P.navy);
                ctx.save(); ctx.globalAlpha = r;
                mt(ctx, '$\\beta_2 = 0.286$', b.x + b.w - 80, b.y + 44, 14, '#fff', 'center', 700);
                mt(ctx, '$\\gamma = 8.7^\\circ$', b.x + b.w - 80, b.y + 66, 14, '#fff', 'center', 700);
                ctx.restore();
            }
            footer(ctx, W, H, t < 13 ? 'A collision is a snapshot of the nuclear shape' : 'A new method to image the shapes of nuclei', t >= 13);
        }
    });

    // ======================================================================
    // 2. ATLAS PRL 2026: radial flow is collective
    // ======================================================================
    const v0c = p => 2.2 * Math.log(p) / (1 + Math.pow(p / 4.5, 2));      // central-like shape
    const v0p = p => 2.2 * Math.log(p) / (1 + Math.pow(p / 9, 2));        // peripheral-like shape
    register('main-radial-flow-collectivity', {
        duration: 17, aspect: 16 / 9,
        phases: [
            {t: 0, label: 'Test 1, long range: $v_0(p_T)$ is approximately the same for any pseudorapidity gap between the two subevents.'},
            {t: 4.5, label: 'Test 2, factorization: for $p_T \\lesssim 3$ GeV, $v_0(p_T)$ is the same for any choice of $[p_T]_{ref}$, the range used to compute $[p_T]$.'},
            {t: 9, label: 'Test 3: $v_0(p_T)$ is larger in peripheral collisions, but dividing by $v_0$ gives the same shape at all centralities for $p_T \\lesssim 2.5$ GeV.'},
            {t: 13.5, label: 'All three hallmarks of collectivity are passed: radial flow is collective. A hydrodynamic comparison shows $v_0(p_T)$ is sensitive to bulk viscosity.'}
        ],
        draw(ctx, t, s, W, H) {
            header(ctx, W, 'Radial flow is collective', 'First measurement of $v_0(p_T)$, ATLAS Pb+Pb at 5.02 TeV');
            const top = 70, pw = (W - 44 - 2 * 14) / 3, ph = H - top - 96;
            const panels = [
                {name: 'Long-range', sub: 'approx. same for any $\\eta$ gap', t0: 0, t1: 4},
                {name: 'Factorizes', sub: 'same for any $[p_T]_{ref}$', t0: 4.5, t1: 8.5},
                {name: 'Same shape', sub: 'at all centralities', t0: 9, t1: 13}
            ];
            const cols = [P.red, P.blue, P.green, P.gold];
            panels.forEach((pn, i) => {
                const b = {x: 22 + i * (pw + 14), y: top, w: pw, h: ph};
                const act = t >= pn.t0 ? 1 : 0.35;
                ctx.save(); ctx.globalAlpha = act;
                const {X, Y} = frame(ctx, b, [0.5, 10], i === 2 ? [-2.2, 3.6] : [-1.8, 2.4], {logx: true, xticks: [1, 10], tag: i === 0 ? 'schematic' : ''});
                mt(ctx, '$p_T$ [GeV]', b.x + b.w / 2, b.y + b.h + 30, 11, P.muted, 'center');
                const pr = seg(t, pn.t0, pn.t1);
                if (i === 0) {
                    ['0', '1', '2', '3'].forEach((g, k) => {
                        const show = u.clamp(pr * 4 - k, 0, 1);
                        if (show > 0) curve(ctx, p => v0c(p) * (1 + 0.025 * (k - 1.5)), 0.5, 10, X, Y, cols[k], 2.4, null, show, 60, 0.9, true);
                    });
                    legend(ctx, b.x + 10, b.y + 18, [0, 1, 2, 3].map(k => ({col: cols[k], label: '$\\eta$ gap ' + k})), 10);
                } else if (i === 1) {
                    [[0, 0.5, 2], [1, 0.5, 5], [2, 1, 5]].forEach(([k]) => {
                        const show = u.clamp(pr * 3 - k, 0, 1);
                        if (show > 0) curve(ctx, p => v0c(p) * (1 + (k - 1) * 0.12 * Math.max(0, p - 3) / 7), 0.5, 10, X, Y, cols[k], 2.4, null, show, 60, 0.9, true);
                    });
                    legend(ctx, b.x + 10, b.y + 18, [{col: cols[0], label: '0.5–2 GeV'}, {col: cols[1], label: '0.5–5 GeV'}, {col: cols[2], label: '1–5 GeV'}], 10);
                } else {
                    const m = seg(t, 10.5, 12.5);                  // morph raw -> normalized
                    const amps = [0.55, 1.0, 1.6], shapes = [v0c, p => 0.5 * (v0c(p) + v0p(p)), v0p];
                    amps.forEach((A, k) => {
                        const show = u.clamp(pr * 4 - k * 0.6, 0, 1);
                        if (show > 0) curve(ctx, p => shapes[k](p) * (A + (1 - A) * m), 0.5, 10, X, Y, cols[k], 2.4, null, show, 60, 0.9, true);
                    });
                    legend(ctx, b.x + 10, b.y + 18, [{col: cols[0], label: '0–5%'}, {col: cols[1], label: '30–40%'}, {col: cols[2], label: '60–70%'}], 10);
                    mt(ctx, m < 0.5 ? '$v_0(p_T)$' : '$v_0(p_T)/v_0$', b.x + b.w - 8, b.y + b.h - 10, 12, P.ink, 'right', 700);
                }
                ctx.restore();
                mt(ctx, pn.name, b.x + b.w / 2, b.y + b.h + 50, 13, P.navy, 'center', 800, act);
                mt(ctx, pn.sub, b.x + b.w / 2, b.y + b.h + 66, 11, P.muted, 'center', 500, act);
                if (t >= pn.t1) check(ctx, b.x + b.w - 14, b.y + 14);
            });
            footer(ctx, W, H, t < 13.5 ? 'Three hallmarks of collectivity, tested on radial flow' : '$v_0(p_T)$ is sensitive to the bulk viscosity of the QGP', t >= 13.5);
        }
    });

    // ======================================================================
    // 3. ATLAS PRL 2024: geometrical vs intrinsic [pT] fluctuations
    // ======================================================================
    register('main-momentum-fluctuations', {
        duration: 16, aspect: 16 / 9,
        setup() { const r = u.rng(7); return {ev: Array.from({length: 6}, () => ({g: u.gauss(r), h: r()}))}; },
        phases: [
            {t: 0, label: 'Event by event, $[p_T]$ fluctuates for two reasons: the overlap size varies (geometrical), and other sources vary at fixed size (intrinsic).'},
            {t: 6, label: 'In ultra-central collisions the overlap area reaches its maximum, so the geometrical component is suppressed and the variance of $[p_T]$ drops.'},
            {t: 11, label: 'The mean, variance and skewness of $P([p_T])$ all change distinctively there. This separates the two sources and constrains the QGP speed of sound.'}
        ],
        draw(ctx, t, s, W, H) {
            header(ctx, W, 'Two sources of $[p_T]$ fluctuations', 'ATLAS Pb+Pb at 5.02 TeV and Xe+Xe at 5.44 TeV');
            const top = 66, bot = H - 54;
            const x = 0.15 + 0.97 * seg(t, 0.5, 10.5);                // event activity, knee at x = 1
            const geo = x < 0.88 ? 1 : Math.max(0, 1 - (x - 0.88) / 0.17);
            // left: six events at the current multiplicity
            const lw = W * 0.42;
            rr(ctx, 22, top, lw, bot - top, 10, '#fff', P.line);
            mt(ctx, x < 0.9 ? 'events at this multiplicity' : 'ultra-central events', 22 + lw / 2, top + 22, 12, P.navy, 'center', 800);
            s.ev.forEach((e, k) => {
                const cx = 22 + lw * (0.2 + 0.3 * (k % 3)), cy = top + 78 + Math.floor(k / 3) * 96;
                const R = 30 * (1 + 0.22 * geo * e.g);
                blob(ctx, cx, cy, R, R, 0.5 + 0.5 * e.h);
            });
            mt(ctx, geo > 0.5 ? 'size varies + intrinsic' : 'size fixed: intrinsic only', 22 + lw / 2, bot - 14, 12, geo > 0.5 ? '#1d4f91' : P.gold, 'center', 700);
            // right: variance vs multiplicity, stacked
            const b = {x: W * 0.5 + 16, y: top + 6, w: W * 0.5 - 40, h: bot - top - 40};
            const {X, Y} = frame(ctx, b, [0.15, 1.12], [0, 1.25], {xlabel: 'multiplicity $N_{ch}$ $\\to$', ylabel: '$N_{ch} \\times$ variance of $[p_T]$', tag: 'schematic'});
            const I = v => 0.42 + 0.08 * Math.min(v, 1);
            const G = v => (v < 0.88 ? 0.55 * Math.min(1, v / 0.35) : Math.max(0, 0.55 * (1 - (v - 0.88) / 0.17)));
            const xs = []; for (let v = 0.15; v <= x; v += 0.01) xs.push(v);
            if (xs.length > 1) {
                const area = (lo, hi, col) => {
                    ctx.save(); ctx.fillStyle = col; ctx.beginPath();
                    xs.forEach((v, k) => k ? ctx.lineTo(X(v), Y(hi(v))) : ctx.moveTo(X(v), Y(hi(v))));
                    for (let k = xs.length - 1; k >= 0; k--) ctx.lineTo(X(xs[k]), Y(lo(xs[k])));
                    ctx.closePath(); ctx.fill(); ctx.restore();
                };
                area(() => 0, I, 'rgba(168,109,12,.35)');
                area(I, v => I(v) + G(v), 'rgba(47,111,179,.35)');
                poly(ctx, xs.map(v => [X(v), Y(I(v) + G(v))]), P.red, 2.8);
            }
            poly(ctx, [[X(1), b.y], [X(1), b.y + b.h]], P.gray, 1.2, [4, 4]);
            mt(ctx, 'max. overlap', X(1) - 4, b.y + 14, 10, P.gray, 'right');
            legend(ctx, b.x + 10, b.y + b.h - 28, [{col: P.blue, label: 'geometrical'}, {col: P.gold, label: 'intrinsic'}], 10.5);
            dot(ctx, X(x), Y(I(x) + G(x)), 5, P.red, 1, '#fff');
            footer(ctx, W, H, t < 6 ? 'Geometrical + intrinsic fluctuations' : 'Ultra-central collisions: geometrical part suppressed', t >= 6);
        }
    });

    // ======================================================================
    // 4. PRC 2024: thermalization at the femtoscale
    // ======================================================================
    register('main-thermalization-femtoscale', {
        duration: 16, aspect: 16 / 9,
        phases: [
            {t: 0, label: 'Events with the same multiplicity $N_{ch}$ can have different impact parameters $b$: larger $b$ means a smaller, denser overlap.'},
            {t: 5, label: 'If the plasma is thermalized, a denser system is hotter, so its momentum per particle $[p_T]$ is higher: $[p_T]$ rises with $b$ at fixed $N_{ch}$.'},
            {t: 9, label: 'This $b$-dependence adds to the variance of $[p_T]$ at fixed $N_{ch}$. Above the knee, $b$ no longer fluctuates, so the variance drops by about a factor 2, as ATLAS measured.'},
            {t: 13, label: 'First direct evidence of thermalization at the femtoscale. Thermalization implies this positive correlation; the paper notes the converse need not hold.'}
        ],
        draw(ctx, t, s, W, H) {
            header(ctx, W, 'Thermalization at the femtoscale', 'Explaining ATLAS Pb+Pb data at 5.02 TeV');
            const top = 66, bot = H - 54, lw = W * 0.42;
            rr(ctx, 22, top, lw, bot - top, 10, '#fff', P.line);
            mt(ctx, 'same $N_{ch}$, different $b$', 22 + lw / 2, top + 22, 12, P.navy, 'center', 800);
            const bb = 1 + 3 * (0.5 - 0.5 * Math.cos(Math.min(t, 9) / 9 * 2 * Math.PI * 1.5)); // b oscillates 1 -> 4 fm
            const cx = 22 + lw * 0.42, cy = (top + bot) / 2 - 4, R = 7.1, scale = 6.2;
            const dens = (bb - 1) / 3;
            overlap(ctx, cx, cy, R, bb, scale, 1, dens);
            mt(ctx, '$b$ = ' + bb.toFixed(1) + ' fm', cx, bot - 16, 12, P.ink, 'center', 700);
            // [pT] meter
            const mx = 22 + lw - 46, my0 = top + 44, mh = bot - top - 92;
            rr(ctx, mx, my0, 18, mh, 6, '#eef2f7');
            const fill = (0.35 + 0.5 * dens) * mh;
            rr(ctx, mx, my0 + mh - fill, 18, fill, 6, P.red);
            mt(ctx, '$[p_T]$', mx + 9, my0 - 8, 12, P.red, 'center', 700);
            // right: variance vs Nch with two terms
            const b = {x: W * 0.5 + 16, y: top + 6, w: W * 0.5 - 40, h: bot - top - 40};
            const {X, Y} = frame(ctx, b, [0.4, 1.15], [0, 1.15], {xlabel: '$N_{ch}$ $\\to$', ylabel: 'variance of $[p_T]$ at fixed $N_{ch}$', tag: 'schematic'});
            const pr = seg(t, 9, 12);
            const intr = v => 0.45 - 0.08 * (v - 0.4);
            const bf = v => v < 0.93 ? 0.42 : Math.max(0, 0.42 * (1 - (v - 0.93) / 0.12));
            curve(ctx, intr, 0.4, 1.15, X, Y, P.blue, 2.2, [6, 4], pr);
            curve(ctx, bf, 0.4, 1.15, X, Y, P.green, 2.2, [6, 4], pr);
            curve(ctx, v => intr(v) + bf(v), 0.4, 1.15, X, Y, P.ink, 3, null, pr);
            poly(ctx, [[X(1), b.y], [X(1), b.y + b.h]], P.gray, 1.2, [4, 4]);
            mt(ctx, 'knee', X(1) + 4, b.y + 14, 10, P.gray);
            if (pr > 0) legend(ctx, b.x + 10, b.y + 20, [{col: P.ink, label: 'total'}, {col: P.green, label: '$b$ fluctuations', dash: [6, 4]}, {col: P.blue, label: 'intrinsic', dash: [6, 4]}], 10.5);
            footer(ctx, W, H, t < 5 ? 'At fixed $N_{ch}$: larger $b$, smaller and denser overlap' : t < 13 ? 'Momentum per particle rises with density' : 'First direct evidence of thermalization at the femtoscale', t >= 13);
        }
    });

    // ======================================================================
    // 5. ATLAS PRC 2023: 129Xe is triaxial
    // ======================================================================
    function axesBohr(beta, gdeg) {
        const g = gdeg * Math.PI / 180, c = beta * Math.sqrt(5 / (4 * Math.PI));
        return [0, 1, 2].map(k => 1 + c * Math.cos(g - 2 * Math.PI * k / 3));
    }
    register('main-flow-momentum-correlations', {
        duration: 15, aspect: 16 / 9,
        phases: [
            {t: 0, label: 'A deformed nucleus has two shape parameters: $\\beta_2$ (how deformed) and $\\gamma$ (triaxiality). $\\gamma = 0^\\circ$ is prolate, $\\gamma = 60^\\circ$ oblate, in between triaxial.'},
            {t: 4, label: 'In models the correlation $\\rho_2$ between $v_2^2$ and $[p_T]$ depends on $\\beta_2^3 \\cos 3\\gamma$, so the Xe+Xe/Pb+Pb ratio of $\\rho_2$ changes with $\\gamma$.'},
            {t: 9, label: 'The measured ratio, about 0.7, favours $\\gamma \\approx 30^\\circ$: $^{129}$Xe is triaxial. First experimental evidence that collective observables are sensitive to, and can constrain, higher-order deformation.'}
        ],
        draw(ctx, t, s, W, H) {
            header(ctx, W, 'Collisions are sensitive to triaxiality', 'ATLAS Xe+Xe at 5.44 TeV vs Pb+Pb at 5.02 TeV');
            const top = 66, bot = H - 54, lw = W * 0.4;
            const g = t < 9 ? 30 - 30 * Math.cos(t / 9 * 2 * Math.PI) : 30 * (1 - Math.exp(-(t - 9) * 2)) + (30 - 30 * Math.cos(2 * Math.PI)) * Math.exp(-(t - 9) * 2);
            const gamma = u.clamp(g, 0, 60);
            rr(ctx, 22, top, lw, bot - top, 10, '#fff', P.line);
            const [a1, a2, a3] = axesBohr(0.45, gamma);  // exaggerated deformation for visibility
            const R = 46, cx = 22 + lw / 2, cy = (top + bot) / 2 - 10;
            // view along the shortest-of-three is not needed; show axis 1 horizontally, axis 2 vertically, ring = axis 3
            nucleusShape(ctx, cx, cy, R * a1, R * a2, 'blue', 1, 0, R * a3 * 0.45);
            const name = gamma < 8 ? 'prolate' : gamma > 52 ? 'oblate' : 'triaxial';
            mt(ctx, name + ', $\\gamma = ' + gamma.toFixed(0) + '^\\circ$', cx, bot - 34, 14, gamma > 20 && gamma < 40 ? P.green : P.navy, 'center', 800);
            mt(ctx, 'deformation exaggerated', cx, bot - 16, 10, P.gray, 'center');
            // right: model ratio vs gamma
            const b = {x: W * 0.47 + 16, y: top + 6, w: W * 0.53 - 40, h: bot - top - 40};
            const {X, Y} = frame(ctx, b, [0, 60], [0, 1.3], {xticks: [0, 30, 60], xlabel: '$\\gamma$ (degrees)', ylabel: '$\\rho_2$ ratio Xe+Xe / Pb+Pb', tag: 'model curve schematic'});
            const f = gg => 0.7 - 0.42 * Math.cos(3 * gg * Math.PI / 180);
            const pr = seg(t, 4, 6);
            ctx.save(); ctx.fillStyle = 'rgba(46,139,58,.15)'; ctx.fillRect(b.x, Y(0.75), b.w, Y(0.65) - Y(0.75)); ctx.restore();
            poly(ctx, [[b.x, Y(0.7)], [b.x + b.w, Y(0.7)]], P.green, 2);
            mt(ctx, 'ATLAS data', b.x + b.w - 8, Y(0.7) - 8, 11, P.green, 'right', 700);
            curve(ctx, f, 0, 60, X, Y, P.blue, 3, null, pr);
            if (pr > 0) mt(ctx, 'model', X(52), Y(f(52)) + 4, 11, P.blue, 'right', 700);
            if (t >= 4) dot(ctx, X(gamma), Y(f(gamma)), 6, P.blue, 1, '#fff');
            if (t >= 9) { dot(ctx, X(30), Y(0.7), 8, 'rgba(0,0,0,0)', 1, P.green); mt(ctx, '$\\gamma \\approx 30^\\circ$', X(30), Y(0.7) + 26, 12, P.green, 'center', 800); }
            footer(ctx, W, H, t < 9 ? 'The $v_2$–$[p_T]$ correlation depends on $\\gamma$' : 'First: collective flow constrains higher-order deformation', t >= 9);
        }
    });

    // ======================================================================
    // 6. NST 2026: only the shape of v0(pT) is physical
    // ======================================================================
    register('main-radial-flow-shape', {
        duration: 15, aspect: 16 / 9,
        phases: [
            {t: 0, label: 'The same HIJING events, classified with different event-activity estimators, give $v_0(p_T)$ curves that differ by a constant offset, so their zero crossings move.'},
            {t: 5, label: 'The offset $\\Delta v_0$ reflects residual multiplicity (volume) fluctuations correlated with $[p_T]$. Removing it collapses the curves onto one shape.'},
            {t: 10, label: 'Only the shape of $v_0(p_T)$, or equivalently $dv_0/dp_T$, carries physical information. Align measurements vertically before comparing experiments or models.'}
        ],
        draw(ctx, t, s, W, H) {
            header(ctx, W, 'Only the shape of $v_0(p_T)$ is physical', 'HIJING Pb+Pb at 5.02 TeV');
            const top = 66, bot = H - 54;
            const b = {x: 52, y: top + 6, w: W * 0.56 - 52, h: bot - top - 44};
            const {X, Y} = frame(ctx, b, [0.2, 5], [-0.12, 0.16], {xticks: [1, 2, 3, 4, 5], xlabel: '$p_T$ [GeV]', ylabel: '$v_0(p_T)$', tag: 'schematic'});
            const f = p => 0.05 * Math.log(p / 0.95);
            const offs = [-0.035, 0, 0.035], cols = [P.red, P.blue, P.green];
            const m = seg(t, 5.5, 8.5), pr = seg(t, 0, 2.5);
            offs.forEach((o, k) => {
                const oo = o * (1 - m);
                curve(ctx, p => f(p) + oo, 0.25, 5, X, Y, cols[k], 2.6, null, pr, 60, 0.95);
                const pz = 0.95 * Math.exp(-oo / 0.05);
                if (pr > 0.4) dot(ctx, X(pz), Y(0), 5, '#fff', 1, cols[k]);
            });
            if (t < 5.5 && pr > 0.6) { arrow(ctx, X(4.4), Y(f(4.4) - 0.035), X(4.4), Y(f(4.4) + 0.035), P.navy, 1.8, 6); arrow(ctx, X(4.4), Y(f(4.4) + 0.035), X(4.4), Y(f(4.4) - 0.035), P.navy, 1.8, 6); mt(ctx, 'constant offset $\\Delta v_0$', X(4.3), Y(f(4.4) + 0.05), 11, P.navy, 'right', 700); }
            legend(ctx, b.x + 10, b.y + 18, [{col: cols[0], label: 'estimator A'}, {col: cols[1], label: 'estimator B'}, {col: cols[2], label: 'estimator C'}], 10.5);
            // right: derivative
            const b2 = {x: W * 0.62 + 10, y: top + 6, w: W * 0.38 - 34, h: bot - top - 44};
            const d = seg(t, 10, 12.5);
            ctx.save(); ctx.globalAlpha = 0.3 + 0.7 * d;
            const q = frame(ctx, b2, [0.2, 5], [0, 0.26], {xticks: [1, 3, 5], xlabel: '$p_T$ [GeV]', ylabel: '$dv_0/dp_T$'});
            curve(ctx, p => 0.05 / p, 0.25, 5, q.X, q.Y, P.ink, 3, null, d);
            if (d > 0.5) mt(ctx, 'same for all estimators', b2.x + b2.w - 8, b2.y + 20, 11, P.ink, 'right', 700);
            ctx.restore();
            footer(ctx, W, H, t < 5 ? 'Zero crossing: not physical' : t < 10 ? 'Remove the constant offset: one common shape' : 'Compare shapes, $dv_0/dp_T$, or vertically aligned curves', t >= 10);
        }
    });

    // ======================================================================
    // 7. PRC 2022: higher-order [pT] fluctuations
    // ======================================================================
    function gammaPdf(x, k, mean) { const th = mean / k; return Math.exp((k - 1) * Math.log(x) - x / th - k * Math.log(th) - lgamma(k)); }
    function lgamma(z) { const c = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5]; let x = z, y = z, tmp = x + 5.5; tmp -= (x + 0.5) * Math.log(tmp); let ser = 1.000000000190015; for (let j = 0; j < 6; j++) ser += c[j] / ++y; return -tmp + Math.log(2.5066282746310005 * ser / x); }
    register('main-higher-order-pt-fluctuations', {
        duration: 15, aspect: 16 / 9,
        phases: [
            {t: 0, label: 'Each event has a mean transverse momentum $[p_T]$. Its event-by-event distribution has a variance, a skewness and a kurtosis.'},
            {t: 5, label: 'With more independent sources (larger $N_{ch}$) the distribution narrows and becomes symmetric: $k_2 \\propto 1/N_{ch}$, $k_3 \\propto 1/N_{ch}^2$, $k_4 \\propto 1/N_{ch}^3$, as found in HIJING.'},
            {t: 10.5, label: 'Subevent methods suppress short-range correlations, which dominate the variance. Together this gives a baseline for $[p_T]$ fluctuations without final-state effects.'}
        ],
        draw(ctx, t, s, W, H) {
            header(ctx, W, 'Higher-order $[p_T]$ fluctuations', 'Cumulant framework up to 4th order, validated with HIJING');
            const top = 66, bot = H - 54;
            const lx = seg(t, 1, 10);              // log Nch progress
            const N = Math.exp(Math.log(20) + lx * (Math.log(2000) - Math.log(20)));
            const b = {x: 52, y: top + 6, w: W * 0.44 - 52, h: bot - top - 44};
            const {X, Y} = frame(ctx, b, [0.4, 1.6], [0, 1.05], {xlabel: '$[p_T] / \\langle [p_T] \\rangle$', ylabel: 'events'});
            const k = N / 8;
            let peak = 0; for (let x = 0.4; x <= 1.6; x += 0.005) peak = Math.max(peak, gammaPdf(x, k, 1));
            curve(ctx, x => gammaPdf(x, k, 1) / peak, 0.4, 1.6, X, Y, P.red, 2.8, null, 1, 160);
            mt(ctx, '$N_{ch} \\approx ' + Math.round(N) + '$', b.x + b.w - 8, b.y + 20, 12, P.ink, 'right', 700);
            const b2 = {x: W * 0.52 + 20, y: top + 6, w: W * 0.48 - 44, h: bot - top - 44};
            const q = frame(ctx, b2, [20, 2000], [-9, 0.5], {logx: true, xticks: [100, 1000], xlabel: '$N_{ch}$ (log)', ylabel: 'cumulants (log)'});
            const lines = [{n: 1, col: P.red, lab: '$k_2 \\propto 1/N_{ch}$'}, {n: 2, col: P.blue, lab: '$k_3 \\propto 1/N_{ch}^2$'}, {n: 3, col: P.green, lab: '$k_4 \\propto 1/N_{ch}^3$'}];
            lines.forEach((L, i) => {
                const f = x => -0.2 - (L.n - 1) * 0.6 - L.n * Math.log10(x / 20) * 0.95 * 1.0;
                curve(ctx, f, 20, 2000, q.X, q.Y, L.col, 2.6, null, 1, 40, 0.35, true);
                curve(ctx, f, 20, N, q.X, q.Y, L.col, 3, null, 1, 40, 1, true);
                dot(ctx, q.X(N), q.Y(f(N)), 5, L.col, 1, '#fff');
            });
            legend(ctx, b2.x + 12, b2.y + b2.h - 52, lines.map(L => ({col: L.col, label: L.lab})), 11);
            footer(ctx, W, H, t < 10.5 ? 'Power laws in $N_{ch}$, as for independent sources' : 'Baseline without final-state effects', t >= 10.5);
        }
    });

    // ======================================================================
    // 8. PLB 2021: non-flow in the v2-[pT] correlation
    // ======================================================================
    register('main-nonflow-flow-momentum', {
        duration: 16, aspect: 16 / 9,
        setup() { const r = u.rng(11); return {pts: Array.from({length: 60}, () => ({eta: -2.5 + 5 * r(), phi: r()})), jet: Array.from({length: 9}, () => ({eta: 1.4 + 0.35 * u.gauss(r), phi: 0.3 + 0.03 * u.gauss(r)}))}; },
        phases: [
            {t: 0, label: 'The correlation cov($v_2^2$, $[p_T]$) uses three particles: two for $v_2$ and one for $[p_T]$. A jet can supply all three and fake a correlation (non-flow).'},
            {t: 5, label: 'Three-subevent method: the two $v_2$ particles come from $a$ and $c$, the $[p_T]$ particle from $b$. A jet confined to one window can no longer contribute.'},
            {t: 10, label: 'In PYTHIA and HIJING, the residual non-flow is smallest with three subevents and much smaller than the data at higher $N_{ch}$, supporting a final-state (hydrodynamic) origin.'},
            {t: 13.5, label: 'At very low $N_{ch}$ the sign and size of the residual depend on the model, so a sign change of the correlation cannot yet be taken as evidence for gluon saturation.'}
        ],
        draw(ctx, t, s, W, H) {
            header(ctx, W, 'Non-flow in the $v_2$–$[p_T]$ correlation', 'PYTHIA and HIJING: pp, p+Pb and peripheral Pb+Pb');
            const top = 70, sw = W - 44, sh = 120;
            const X = e => 22 + (e + 2.5) / 5 * sw;
            rr(ctx, 22, top, sw, sh, 8, '#fff', P.line);
            const sub = seg(t, 5, 6.5);
            const wins = [[-2.5, -0.75, 'a', '$v_2$', P.blue], [-0.5, 0.5, 'b', '$[p_T]$', P.red], [0.75, 2.5, 'c', '$v_2$', P.blue]];
            wins.forEach(w => {
                rr(ctx, X(w[0]) + 2, top + 4, X(w[1]) - X(w[0]) - 4, sh - 8, 6, w[4] === P.red ? 'rgba(192,57,43,.10)' : 'rgba(47,111,179,.10)');
                ctx.save(); ctx.globalAlpha = sub; mt(ctx, w[2] + ': ' + w[3], (X(w[0]) + X(w[1])) / 2, top + 20, 12, w[4], 'center', 800); ctx.restore();
            });
            s.pts.forEach(p => dot(ctx, X(p.eta), top + 30 + p.phi * (sh - 40), 2.6, P.gray, 0.8));
            const jetCol = t < 5 ? P.orange : '#b9c2cc';
            s.jet.forEach(p => dot(ctx, X(p.eta), top + 30 + p.phi * (sh - 40), 3.2, jetCol));
            mt(ctx, 'jet', X(1.4), top + sh - 8, 11, t < 5 ? P.orange : P.gray, 'center', 700);
            mt(ctx, '$\\eta$', 22 + sw + 4, top + sh + 16, 12, P.muted, 'right');
            // triplet lines
            const tri = t < 5 ? [s.jet[0], s.jet[3], s.jet[6]] : [s.pts[2], s.pts[30], s.pts[51]];
            if (t < 5) {
                const pts = tri.map(p => [X(p.eta), top + 30 + p.phi * (sh - 40)]);
                poly(ctx, [pts[0], pts[1], pts[2], pts[0]], P.orange, 1.6);
            }
            if (t >= 5 && t < 10) {
                const a = s.pts.find(p => p.eta < -0.9), bb = s.pts.find(p => Math.abs(p.eta) < 0.45), c = s.pts.find(p => p.eta > 0.9);
                const pts = [a, bb, c].map(p => [X(p.eta), top + 30 + p.phi * (sh - 40)]);
                poly(ctx, [pts[0], pts[1], pts[2]], P.navy, 1.6, null, sub);
                mt(ctx, 'the jet stays in one window, so it cannot supply all three particles', W / 2, top + sh + 18, 11, P.gray, 'center', 600, sub);
            }
            // bar chart of |cov| by method
            const bt = top + sh + 34, bh = H - bt - 58;
            const ba = seg(t, 10, 12);
            if (ba > 0) {
                const meth = [['standard', 1.0], ['two-subevent', 0.55], ['three-subevent', 0.18]];
                mt(ctx, 'non-flow $|$cov($v_2^2$, $[p_T]$)$|$ in the models (schematic)', 22, bt + 6, 12, P.ink, 'left', 700, ba);
                meth.forEach((m, k) => {
                    const y = bt + 18 + k * (bh - 18) / 3, w = (W * 0.5) * m[1] * ba;
                    rr(ctx, 150, y, w, (bh - 18) / 3 - 6, 4, k === 2 ? P.green : P.gray);
                    mt(ctx, m[0], 142, y + (bh - 18) / 6 + 1, 11.5, P.ink, 'right', 600, ba);
                });
            }
            footer(ctx, W, H, t < 5 ? 'Standard method: a jet fakes a correlation' : t < 13.5 ? 'Rapidity-separated subevents suppress non-flow' : 'At very low $N_{ch}$ the residual sign is model dependent', t >= 13.5);
        }
    });

    // ======================================================================
    // 9. PLB 2024: isobar ratios at RHIC and LHC energies
    // ======================================================================
    function pear(ctx, cx, cy, R, b2, b3, base) {
        // silhouette r(theta) = R (1 + b2 Y20 + b3 Y30), symmetry axis vertical
        ctx.save();
        const g = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.35, 1, cx, cy, R * 1.3);
        g.addColorStop(0, base === 'red' ? '#eea195' : '#a9c6ec'); g.addColorStop(1, base === 'red' ? '#a8281c' : '#2459a0');
        ctx.fillStyle = g; ctx.beginPath();
        for (let k = 0; k <= 120; k++) {
            const th = k / 120 * 2 * Math.PI, c = Math.cos(th);
            const Y20 = Math.sqrt(5 / (16 * Math.PI)) * (3 * c * c - 1), Y30 = Math.sqrt(7 / (16 * Math.PI)) * (5 * c * c * c - 3 * c);
            const r = R * (1 + b2 * Y20 + b3 * Y30);
            const x = cx + r * Math.sin(th), y = cy - r * c;
            k ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
        ctx.closePath(); ctx.fill(); ctx.restore();
    }
    register('main-isobar-energy-dependence', {
        duration: 16, aspect: 16 / 9,
        phases: [
            {t: 0, label: '$^{96}$Ru and $^{96}$Zr have the same mass number but different structure: Ru has the larger quadrupole deformation $\\beta_2$; Zr has an octupole deformation $\\beta_3$ and a thicker surface.'},
            {t: 4, label: 'Ratios of flow between Ru+Ru and Zr+Zr (AMPT) isolate the structure difference. The $v_3$ ratio falls below 1 toward central collisions, more strongly at 5.02 TeV than at 0.2 TeV.'},
            {t: 10, label: 'The structure effect is carried entirely by the flow along the participant plane, $v_{3,pp}$; the part uncorrelated with the eccentricity, $\\delta_3$, has a ratio of about 1.'}
        ],
        draw(ctx, t, s, W, H) {
            header(ctx, W, 'Isobars at RHIC and LHC energies', 'AMPT $^{96}$Ru+$^{96}$Ru vs $^{96}$Zr+$^{96}$Zr at 0.2 and 5.02 TeV');
            const top = 66, bot = H - 54, lw = W * 0.3;
            rr(ctx, 22, top, lw, bot - top, 10, '#fff', P.line);
            const R = 34, scale = 1.8;  // deformations drawn 1.8x for visibility
            pear(ctx, 22 + lw * 0.3, top + 80, R, 0.162 * scale, 0, 'red');
            pear(ctx, 22 + lw * 0.72, top + 80, R, 0.06 * scale, 0.2 * scale, 'blue');
            mt(ctx, '$^{96}$Ru', 22 + lw * 0.3, top + 142, 13, '#a8281c', 'center', 800);
            mt(ctx, '$^{96}$Zr', 22 + lw * 0.72, top + 142, 13, '#2459a0', 'center', 800);
            mt(ctx, '$\\beta_2 = 0.16$', 22 + lw * 0.3, top + 160, 11, P.muted, 'center');
            mt(ctx, '$\\beta_3 = 0.20$', 22 + lw * 0.72, top + 160, 11, P.muted, 'center');
            mt(ctx, 'deformation exaggerated', 22 + lw / 2, bot - 14, 10, P.gray, 'center');
            const b = {x: 22 + lw + 46, y: top + 6, w: W - lw - 90, h: bot - top - 44};
            if (t < 10) {
                const {X, Y} = frame(ctx, b, [0, 1], [0.7, 1.08], {xlabel: '$N_{ch}$ $\\to$ central', ylabel: '$v_3$ ratio Ru+Ru / Zr+Zr', tag: 'schematic'});
                poly(ctx, [[b.x, Y(1)], [b.x + b.w, Y(1)]], P.gray, 1.2, [4, 4]);
                const pr = seg(t, 4, 7.5);
                curve(ctx, x => 1 - 0.13 * Math.pow(x, 1.6), 0.03, 1, X, Y, P.blue, 3, null, pr);
                curve(ctx, x => 1 - 0.22 * Math.pow(x, 1.6), 0.03, 1, X, Y, P.red, 3, null, pr);
                legend(ctx, b.x + 12, b.y + 22, [{col: P.blue, label: 'RHIC 0.2 TeV'}, {col: P.red, label: 'LHC 5.02 TeV'}], 11);
            } else {
                const a = seg(t, 10, 11.5);
                const {X, Y} = frame(ctx, b, [0, 3], [0.7, 1.08], {ylabel: 'ratio in central collisions', tag: 'schematic'});
                poly(ctx, [[b.x, Y(1)], [b.x + b.w, Y(1)]], P.gray, 1.2, [4, 4]);
                [['$v_{3,pp}$', 0.8, P.navy], ['$v_3\\{2\\}$', 0.86, P.gray], ['$\\delta_3$', 1.0, P.gold]].forEach((q, k) => {
                    const x0 = X(k + 0.25), x1 = X(k + 0.75), y = Y(0.7 + (q[1] - 0.7) * a);
                    rr(ctx, x0, y, x1 - x0, Y(0.7) - y, 4, q[2]);
                    mt(ctx, q[0], (x0 + x1) / 2, b.y + b.h + 18, 13, q[2], 'center', 700);
                });
            }
            footer(ctx, W, H, t < 10 ? 'Stronger response to nuclear structure at the LHC' : 'Structure is carried by the participant-plane flow', t >= 10);
        }
    });

    // ======================================================================
    // 10. EPJA 2023: nuclear shape fluctuations
    // ======================================================================
    register('main-nuclear-shape-fluctuations', {
        duration: 15, aspect: 16 / 9,
        setup() { const r = u.rng(3); return {z: Array.from({length: 5}, () => u.gauss(r))}; },
        phases: [
            {t: 0, label: 'A nucleus may fluctuate around its average shape. Here the triaxiality $\\gamma$ fluctuates with width $\\sigma_\\gamma$ around a prolate ($\\gamma = 0^\\circ$) or an oblate ($\\gamma = 60^\\circ$) mean.'},
            {t: 4, label: 'The three-particle correlator $\\langle \\varepsilon_2^2\\, \\delta d_\\perp/d_\\perp \\rangle$ (Glauber, head-on U+U) shrinks roughly as $e^{-9\\sigma_\\gamma^2/2}\\cos 3\\bar{\\gamma}$: a 20° fluctuation reduces it by nearly 40%.'},
            {t: 10.5, label: 'For large $\\sigma_\\gamma$ prolate and oblate nuclei look the same, like rigid triaxial nuclei. Fluctuations of $\\beta$ instead raise the variances, as $\\langle \\beta^2 \\rangle = \\bar{\\beta}^2 + \\sigma_\\beta^2$.'}
        ],
        draw(ctx, t, s, W, H) {
            header(ctx, W, 'When nuclear shapes fluctuate', 'Monte Carlo Glauber, head-on U+U collisions');
            const top = 66, bot = H - 54, lw = W * 0.36;
            const sg = 60 * seg(t, 1, 10.5);         // sigma_gamma in degrees
            rr(ctx, 22, top, lw, bot - top, 10, '#fff', P.line);
            [[0, 'blue', 'mean prolate'], [60, 'red', 'mean oblate']].forEach(([gm, base, lab], i) => {
                const cx = 22 + lw * (0.28 + 0.44 * i), cy = (top + bot) / 2 - 12;
                s.z.forEach((z, k) => {
                    let g = gm + (i ? -1 : 1) * Math.abs(z) * sg;
                    g = u.clamp(g, 0, 60);
                    const [a1, a2, a3] = axesBohr(0.5, g);
                    nucleusShape(ctx, cx, cy, 30 * a1, 30 * a2, base, k === 0 ? 0.9 : 0.18, 0, null);
                });
                mt(ctx, lab, cx, bot - 34, 12, base === 'red' ? '#a8281c' : '#2459a0', 'center', 800);
            });
            mt(ctx, '$\\sigma_\\gamma = ' + sg.toFixed(0) + '^\\circ$', 22 + lw / 2, bot - 14, 13, P.ink, 'center', 700);
            const b = {x: 22 + lw + 50, y: top + 6, w: W - lw - 94, h: bot - top - 44};
            const {X, Y} = frame(ctx, b, [0, 60], [-1.15, 1.15], {xticks: [0, 20, 40, 60], xlabel: '$\\sigma_\\gamma$ (degrees)', ylabel: '$\\langle \\varepsilon_2^2\\, \\delta d_\\perp/d_\\perp \\rangle$', tag: 'schematic'});
            const f = (sgd, sign) => sign * Math.exp(-4.5 * Math.pow(sgd * Math.PI / 180, 2));
            const pr = seg(t, 4, 6);
            curve(ctx, x => f(x, 1), 0, 60, X, Y, P.red, 3, null, pr);
            curve(ctx, x => f(x, -1), 0, 60, X, Y, P.blue, 3, null, pr);
            poly(ctx, [[b.x, Y(0)], [b.x + b.w, Y(0)]], P.green, 2, [6, 4]);
            mt(ctx, 'rigid triaxial', b.x + b.w - 8, Y(0) - 8, 11, P.green, 'right', 700);
            if (pr > 0) { mt(ctx, 'oblate mean', X(2), Y(0.95) - 6, 11, P.red, 'left', 700); mt(ctx, 'prolate mean', X(2), Y(-0.95) + 16, 11, P.blue, 'left', 700); }
            if (t >= 4) { dot(ctx, X(sg), Y(f(sg, 1)), 5, P.red, 1, '#fff'); dot(ctx, X(sg), Y(f(sg, -1)), 5, P.blue, 1, '#fff'); }
            footer(ctx, W, H, '$\\gamma$ fluctuations wash out the prolate–oblate difference', t >= 10.5);
        }
    });

    // ======================================================================
    // 11. EPJC 2022: spectator neutrons select initial states
    // ======================================================================
    register('main-spectators-initial-state', {
        duration: 15, aspect: 16 / 9,
        phases: [
            {t: 0, label: 'Within one centrality class, the number of spectator neutrons seen in the zero-degree calorimeters still varies from event to event.'},
            {t: 4, label: 'Binning on spectator neutrons selects, at the same $N_{part}$, events with smaller or larger overlap area: the denser ones produce more particles and have smaller $\\varepsilon_2$.'},
            {t: 8.5, label: 'So within each centrality class, $v_2$ falls more steeply with $dN_{ch}/d\\eta$ than the centrality-averaged trend (AMPT, Au+Au at 200 GeV).'},
            {t: 12, label: 'The new quantity $R_c$ compares the two slopes: large for $v_2$, about 10% for $v_3$. This helps separate initial geometry from fluctuations.'}
        ],
        draw(ctx, t, s, W, H) {
            header(ctx, W, 'Spectator neutrons select initial states', 'AMPT Au+Au at 200 GeV');
            const top = 66, bot = H - 54, lw = W * 0.4;
            rr(ctx, 22, top, lw, bot - top, 10, '#fff', P.line);
            const cy = top + 82;
            const a = seg(t, 4, 5.5);
            // two events, same Npart, different overlap area
            [[0.3, 1.0, 'larger area'], [0.72, 0.78, 'smaller area, denser']].forEach(([fx, k, lab], i) => {
                const cx = 22 + lw * fx;
                blob(ctx, cx, cy, 34 * k, 46 * k, a > 0 ? 1 : 0.6, 0, i);
                if (a > 0) { mt(ctx, lab, cx, cy + 66, 11, P.ink, 'center', 700, a); mt(ctx, i ? 'more $N_{ch}$, smaller $\\varepsilon_2$' : 'fewer $N_{ch}$, larger $\\varepsilon_2$', cx, cy + 82, 11, P.muted, 'center', 500, a); }
            });
            mt(ctx, 'same centrality and same $N_{part}$', 22 + lw / 2, top + 22, 12, P.navy, 'center', 800, a);
            // ZDC counters
            const nspec = Math.round(8 + 4 * Math.sin(t * 2.1));
            rr(ctx, 34, bot - 46, lw - 24, 30, 6, '#eef4fb');
            mt(ctx, 'ZDC spectator neutrons: ' + nspec, 22 + lw / 2, bot - 26, 12, '#1d4f91', 'center', 700);
            const b = {x: 22 + lw + 46, y: top + 6, w: W - lw - 90, h: bot - top - 44};
            const {X, Y} = frame(ctx, b, [0, 1], [0, 1], {xlabel: '$dN_{ch}/d\\eta$', ylabel: '$v_2$', tag: 'schematic'});
            const cen = [[0.15, 0.85], [0.38, 0.66], [0.62, 0.47], [0.86, 0.3]];
            const pc = seg(t, 8.5, 10);
            poly(ctx, cen.map(q => [X(q[0]), Y(q[1])]), P.red, 2.2, [6, 4], pc);
            cen.forEach(q => { ctx.save(); ctx.globalAlpha = pc; ctx.strokeStyle = P.red; ctx.lineWidth = 2; const x = X(q[0]), y = Y(q[1]); ctx.beginPath(); ctx.moveTo(x - 5, y - 5); ctx.lineTo(x + 5, y + 5); ctx.moveTo(x + 5, y - 5); ctx.lineTo(x - 5, y + 5); ctx.stroke(); ctx.restore(); });
            const pb = seg(t, 9.5, 11.5);
            cen.forEach(q => { for (let k = -2; k <= 2; k++) dot(ctx, X(q[0] + k * 0.035), Y(q[1] - k * 0.07), 4, P.blue, pb * 0.85); });
            if (pc > 0) legend(ctx, b.x + b.w - 150, b.y + 22, [{col: P.red, label: 'centrality average', dash: [6, 4]}, {col: P.blue, label: 'spectator bins', dot: true}], 10.5);
            footer(ctx, W, H, t < 12 ? 'Fixed $N_{part}$, denser: more particles, smaller $v_2$' : '$R_c$: large for $v_2$, about 10% for $v_3$', t >= 12);
        }
    });

    // ======================================================================
    // 12. PRC 2026: preferential emission
    // ======================================================================
    register('main-preferential-emission-spectators', {
        duration: 16, aspect: 16 / 9,
        phases: [
            {t: 0, label: 'When more nucleons of the forward-going nucleus participate, fewer of its spectators reach the forward zero-degree calorimeter, and more particles are produced at forward $\\eta$ (preferential emission).'},
            {t: 5, label: 'The new observable $\\rho(\\alpha_{sp}, \\alpha_{ch,\\eta})$ correlates the spectator asymmetry with the charged-particle asymmetry at $\\pm\\eta$. It vanishes at $\\eta = 0$ and grows toward forward $\\eta$.'},
            {t: 10.5, label: 'Spectator breakup (evaporation, fragmentation) changes how many free neutrons reach the ZDCs and suppresses $\\rho$, so the correlator also constrains spectator dynamics.'}
        ],
        draw(ctx, t, s, W, H) {
            header(ctx, W, 'Measuring preferential emission', 'AMPT Au+Au at 200 GeV, forward–backward asymmetries');
            const top = 66, bot = H - 54, lw = W * 0.42;
            rr(ctx, 22, top, lw, bot - top, 10, '#fff', P.line);
            const asym = Math.sin(t * 1.3);           // forward-participant excess
            const cx = 22 + lw / 2, cy = top + 70;
            rr(ctx, 30, cy - 22, 18, 44, 4, '#1d4f91'); rr(ctx, 22 + lw - 26, cy - 22, 18, 44, 4, '#1d4f91');
            mt(ctx, 'ZDC', 39, cy + 38, 10, '#1d4f91', 'center', 700); mt(ctx, 'ZDC', 22 + lw - 17, cy + 38, 10, '#1d4f91', 'center', 700);
            const nB = Math.round(9 - 3 * asym), nF = Math.round(9 + 3 * asym);  // backward/forward spectators
            for (let k = 0; k < nB; k++) dot(ctx, 62 + (k % 3) * 8, cy - 12 + Math.floor(k / 3) * 8, 3, '#3f7fd9');
            for (let k = 0; k < nF; k++) dot(ctx, 22 + lw - 62 - (k % 3) * 8, cy - 12 + Math.floor(k / 3) * 8, 3, '#3f7fd9');
            mt(ctx, 'spectators', cx, cy - 30, 11, P.muted, 'center');
            blob(ctx, cx, cy, 34, 18);
            // dN/deta tilted toward the side with more participants (fewer spectators)
            const hb = {x: 46, y: cy + 52, w: lw - 48, h: bot - cy - 84};
            const tilt = -0.25 * asym;                // more forward spectators -> fewer forward participants
            ctx.save(); ctx.fillStyle = 'rgba(217,72,15,.25)'; ctx.strokeStyle = P.orange; ctx.lineWidth = 2; ctx.beginPath();
            for (let k = 0; k <= 60; k++) { const e = -4 + 8 * k / 60; const v = Math.exp(-e * e / 18) * (1 + tilt * e / 4); const x = hb.x + k / 60 * hb.w, y = hb.y + hb.h - v * hb.h; k ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
            ctx.lineTo(hb.x + hb.w, hb.y + hb.h); ctx.lineTo(hb.x, hb.y + hb.h); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
            mt(ctx, '$dN_{ch}/d\\eta$', hb.x, hb.y + 4, 11, P.orange, 'left', 700);
            mt(ctx, '$-\\eta$', hb.x, bot - 12, 11, P.muted, 'left'); mt(ctx, '$+\\eta$', hb.x + hb.w, bot - 12, 11, P.muted, 'right');
            // right: rho(eta)
            const b = {x: lw + 70, y: top + 6, w: W - lw - 94, h: bot - top - 44};
            const {X, Y} = frame(ctx, b, [-4, 4], [-0.75, 0.75], {xticks: [-4, -2, 0, 2, 4], xlabel: '$\\eta$', ylabel: '$\\rho(\\alpha_{sp}, \\alpha_{ch,\\eta})$', tag: 'schematic'});
            const f = e => 0.6 * Math.tanh(e / 1.8) / Math.tanh(4 / 1.8);
            const pr = seg(t, 5, 9);
            curve(ctx, f, -4, 4, X, Y, P.navy, 3, null, pr);
            const pb = seg(t, 10.5, 13);
            curve(ctx, e => f(e) * 0.35, 0, 4, X, Y, P.gold, 2.6, [6, 4], pb);
            if (pr > 0) legend(ctx, b.x + 12, b.y + 22, [{col: P.navy, label: 'no breakup'}].concat(pb > 0 ? [{col: P.gold, label: 'with spectator breakup', dash: [6, 4]}] : []), 10.5);
            footer(ctx, W, H, t < 10.5 ? 'A data-driven measure of preferential emission' : 'Also sensitive to spectator breakup', t >= 10.5);
        }
    });

    // ======================================================================
    // 13. 2024 preprint: long- and short-range flow decorrelations
    // ======================================================================
    register('main-longitudinal-decorrelations', {
        duration: 17, aspect: 16 / 9,
        phases: [
            {t: 0, label: 'The flow direction $\\Psi_2$ changes along rapidity in two ways: a global twist of the whole fireball (long range) and local fluctuations (short range).'},
            {t: 4.5, label: 'The two-particle correlation $V_{2\\Delta}$ versus $|\\Delta\\eta|$ (AMPT, 0–5%) contains the long-range part, a short-range part that falls beyond $|\\Delta\\eta| \\approx 2$, and non-flow at $|\\Delta\\eta| < 2$.'},
            {t: 9.5, label: 'Projecting onto the initial eccentricities separates these parts from non-flow: the first successful separation of long- and short-range decorrelations from non-flow.'},
            {t: 13, label: 'Assuming, as in the model, that deformation adds only to the long-range part, the short-range part dilutes the U+U/Au+Au ratio, out to $|\\Delta\\eta| = 4$.'}
        ],
        draw(ctx, t, s, W, H) {
            header(ctx, W, 'Long- vs short-range decorrelations', 'AMPT U+U vs Au+Au, 0–5% centrality');
            const top = 66, bot = H - 54, lw = W * 0.4;
            rr(ctx, 22, top, lw, bot - top, 10, '#fff', P.line);
            mt(ctx, 'flow direction $\\Psi_2$ along $\\eta$', 22 + lw / 2, top + 22, 12, P.navy, 'center', 800);
            const twist = 0.5, loc = 0.25 * seg(t, 2, 3.5);
            for (let k = 0; k < 9; k++) {
                const e = -2 + k * 0.5, x = 46 + k * (lw - 48) / 8, y = (top + bot) / 2;
                const ang = twist * e / 2 + loc * Math.sin(k * 2.3 + t * 0.8);
                ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
                ctx.fillStyle = 'rgba(243,156,60,.35)'; ctx.beginPath(); ctx.ellipse(0, 0, 9, 34, 0, 0, 2 * Math.PI); ctx.fill();
                ctx.restore();
                arrow(ctx, x - 22 * Math.cos(ang), y - 22 * Math.sin(ang), x + 22 * Math.cos(ang), y + 22 * Math.sin(ang), P.orange, 1.8, 5);
                if (k % 2 === 0) mt(ctx, String(e), x, bot - 30, 10, P.muted, 'center');
            }
            mt(ctx, '$\\eta$', 22 + lw / 2, bot - 12, 12, P.muted, 'center');
            const b = {x: 22 + lw + 46, y: top + 6, w: W - lw - 90, h: bot - top - 44};
            const ratioMode = t >= 13;
            const {X, Y} = frame(ctx, b, [0, 4], ratioMode ? [1, 2.3] : [0, 1.1], {xticks: [0, 1, 2, 3, 4], xlabel: '$|\\Delta\\eta|$', ylabel: ratioMode ? 'U+U / Au+Au' : '$V_{2\\Delta}$', tag: 'schematic'});
            if (!ratioMode) {
                const lr = d => 0.45 - 0.03 * d, sr = d => 0.28 * Math.exp(-Math.pow(Math.max(0, d - 2), 2) / 1.2), nf = d => d < 2 ? 0.22 * Math.pow(1 - d / 2, 1.5) : 0;
                const band = (lo, hi, col, a) => {
                    if (a <= 0) return;
                    ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = col; ctx.beginPath();
                    for (let k = 0; k <= 80; k++) { const d = 4 * k / 80; k ? ctx.lineTo(X(d), Y(hi(d))) : ctx.moveTo(X(d), Y(hi(d))); }
                    for (let k = 80; k >= 0; k--) { const d = 4 * k / 80; ctx.lineTo(X(d), Y(lo(d))); }
                    ctx.closePath(); ctx.fill(); ctx.restore();
                };
                band(() => 0, lr, 'rgba(47,111,179,.55)', seg(t, 4.5, 6));
                band(lr, d => lr(d) + sr(d), 'rgba(194,70,106,.45)', seg(t, 6, 7.5));
                band(d => lr(d) + sr(d), d => lr(d) + sr(d) + nf(d), 'rgba(138,151,168,.55)', seg(t, 7.5, 9));
                legend(ctx, b.x + b.w - 130, b.y + 22, [{col: P.gray, label: 'non-flow'}, {col: P.pink, label: 'short-range'}, {col: P.blue, label: 'long-range'}], 10.5);
            } else {
                const a = seg(t, 13, 15);
                poly(ctx, [[X(0), Y(2.0)], [X(4), Y(2.0)]], P.blue, 3, null, a);
                curve(ctx, d => 1.35 + 0.55 * (1 - Math.exp(-d / 1.6)), 0, 4, X, Y, P.ink, 3, null, a);
                legend(ctx, b.x + 12, b.y + 22, [{col: P.blue, label: 'long-range only'}, {col: P.ink, label: 'full correlation'}], 10.5);
            }
            footer(ctx, W, H, t < 9.5 ? 'Global twist + local fluctuations + non-flow' : t < 13 ? 'First separation of long- and short-range decorrelations from non-flow' : 'Short range dilutes the deformation effect up to $|\\Delta\\eta| = 4$', t >= 9.5);
        }
    });
})();
