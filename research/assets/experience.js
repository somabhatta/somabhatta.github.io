/* Progressive enhancements. All paper text and links work without this file. */
(function () {
    'use strict';
    function init() {
        const main = document.querySelector('main');
        if (main) {
            if (!main.id) main.id = 'main-content';
            const skip = document.createElement('a');
            skip.className = 'skip-link'; skip.href = '#' + main.id; skip.textContent = 'Skip to content';
            skip.addEventListener('click', e => {
                e.preventDefault(); main.tabIndex = -1; main.focus(); main.scrollIntoView();
            });
            document.body.prepend(skip);
        }
        const cards = Array.from(document.querySelectorAll('.research-card'));
        if (cards.length) {
            const search = document.createElement('div'); search.className = 'research-search';
            search.innerHTML = '<label for="research-query">Find a research explainer<input type="search" id="research-query" placeholder="Try radial flow, nuclear shape, ATLAS…" autocomplete="off"></label><output aria-live="polite"></output>';
            const grid = document.querySelector('.research-grid'); grid.before(search);
            const empty = document.createElement('p'); empty.className = 'research-empty'; empty.hidden = true;
            empty.textContent = 'No matching explainers. Try another topic, experiment, or year.'; grid.after(empty);
            const input = search.querySelector('input'), output = search.querySelector('output');
            const normalize = str => str.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
            const entries = cards.map(card => ({ card, text: normalize(card.textContent) }));
            function filter() {
                const terms = normalize(input.value).trim().split(/\s+/).filter(Boolean);
                let count = 0;
                entries.forEach(({card, text}) => { card.hidden = !terms.every(term => text.includes(term)); if (!card.hidden) count++; });
                output.textContent = count + ' of ' + cards.length + ' explainers'; empty.hidden = count !== 0;
            }
            input.addEventListener('input', filter); filter();
        }
        if (!document.querySelector('.r-page')) return;
        const sections = Array.from(document.querySelectorAll('.r-section'));
        const panelCount = document.querySelectorAll('.anim-panel').length;
        const wordCount = main.textContent.trim().split(/\s+/).length;
        const meta = document.createElement('p'); meta.className = 'r-reading-meta';
        meta.textContent = Math.max(1, Math.ceil(wordCount / 220)) + ' min read · ' + panelCount + ' interactive illustrations';
        document.querySelector('.r-paper-ref').before(meta);
        const outline = document.createElement('nav'); outline.className = 'r-outline'; outline.setAttribute('aria-label', 'On this page');
        const list = document.createElement('ol');
        const shortNames = {gap:'The question',measure:'The method',observe:'The evidence',conclude:'The insight',future:'What’s next'};
        sections.forEach((section, i) => {
            if (!section.id) section.id = 'section-' + (i + 1);
            const item = document.createElement('li'), link = document.createElement('a');
            const heading = section.querySelector('h2');
            link.href = '#' + section.id;
            link.textContent = (i + 1) + ' · ' + (shortNames[section.id] || heading.textContent.replace(/^\s*\d+\s*/, '').split(':')[0]);
            link.title = heading.textContent.trim(); item.appendChild(link); list.appendChild(item);
        });
        outline.appendChild(list);
        const track = document.createElement('div'); track.className = 'r-reading-track'; track.setAttribute('aria-hidden','true'); track.innerHTML = '<span></span>'; outline.appendChild(track);
        (document.querySelector('.r-tldr') || document.querySelector('.r-buttons')).after(outline);
        const links = Array.from(list.querySelectorAll('a')); let scheduled = false;
        function updateProgress() {
            scheduled = false;
            let active = 0;
            sections.forEach((section, i) => { if (section.getBoundingClientRect().top <= outline.offsetHeight + 40) active = i; });
            links.forEach((link, i) => { if (i === active) link.setAttribute('aria-current','location'); else link.removeAttribute('aria-current'); });
            const start = main.offsetTop, span = Math.max(1, main.offsetHeight - innerHeight);
            track.firstElementChild.style.transform = 'scaleX(' + Math.max(0,Math.min(1,(scrollY-start)/span)) + ')';
        }
        addEventListener('scroll', () => { if (!scheduled) { scheduled = true; requestAnimationFrame(updateProgress); } }, {passive:true});
        addEventListener('resize', updateProgress); updateProgress();
        // Native dialog provides Escape dismissal, modal focus containment and focus restoration.
        const dialog = document.createElement('dialog'); dialog.className = 'figure-dialog'; dialog.setAttribute('aria-labelledby','figure-viewer-title');
        dialog.innerHTML = '<div class="figure-dialog-head"><h2 id="figure-viewer-title">Figure from the paper</h2><button type="button" autofocus>Close ✕</button></div><div class="figure-dialog-body"><img alt=""><p></p><a target="_blank" rel="noopener">Open original image ↗</a></div>';
        document.body.appendChild(dialog);
        const close = dialog.querySelector('button'); let previousOverflow = '';
        close.addEventListener('click', () => dialog.close());
        dialog.addEventListener('click', e => { if (e.target === dialog) { const r=dialog.getBoundingClientRect(); if(e.clientX<r.left || e.clientX>r.right || e.clientY<r.top || e.clientY>r.bottom) dialog.close(); } });
        dialog.addEventListener('close', () => { document.body.style.overflow = previousOverflow; });
        document.querySelectorAll('.paper-fig').forEach(figure => {
            const img = figure.querySelector('img'), caption = figure.querySelector('figcaption');
            if (!img) return;
            img.decoding = 'async';
            const button = document.createElement('button'); button.type = 'button'; button.className = 'figure-open'; button.textContent = 'View larger ↗';
            button.setAttribute('aria-label','View larger: ' + img.alt); img.after(button);
            function open() {
                if (typeof dialog.showModal !== 'function') { window.open(img.src,'_blank','noopener'); return; }
                const target = dialog.querySelector('img'); target.src = img.src; target.alt = img.alt;
                dialog.querySelector('p').textContent = caption ? caption.textContent.trim() : img.alt;
                dialog.querySelector('a').href = img.src;
                previousOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden'; dialog.showModal(); dialog.scrollTop = 0;
            }
            button.addEventListener('click',open); img.addEventListener('click',open);
        });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',init); else init();
})();
