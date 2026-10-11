/* ==========================================================================
   analytics.js: visitor statistics for somabhatta.github.io

   Uses Umami (cloud.umami.is), which shows visitors by country / region /
   city and records the click events below. It sets no cookies and stores no
   personal data, so no cookie banner or consent click is needed.

   SETUP: paste your Umami Website ID below (empty = tracking switched off).
   ========================================================================== */
(function () {
    'use strict';

    const UMAMI_WEBSITE_ID = '5de528ef-4713-412b-95d0-c494e72e3a6e';                  // from cloud.umami.is → Settings → Websites → your site
    const UMAMI_SCRIPT = 'https://cloud.umami.is/script.js';

    if (!UMAMI_WEBSITE_ID) return;

    const s = document.createElement('script');
    s.defer = true;
    s.src = UMAMI_SCRIPT;
    s.setAttribute('data-website-id', UMAMI_WEBSITE_ID);
    s.setAttribute('data-do-not-track', 'true');
    document.head.appendChild(s);

    function track(name, data) {
        try { if (window.umami && typeof window.umami.track === 'function') window.umami.track(name, data || {}); }
        catch (e) { /* ignore */ }
    }
    window.siteTrack = track;

    const page = (location.pathname.split('/').pop() || 'index.html').replace('.html', '') || 'index';

    // ---------------- clicks ----------------
    document.addEventListener('click', function (ev) {
        const a = ev.target.closest && ev.target.closest('a, button');
        if (!a) return;

        // animation controls on explainer pages
        if (a.classList.contains('anim-play') || a.classList.contains('anim-restart')) {
            const fig = a.closest('figure.anim-panel');
            track(a.classList.contains('anim-restart') ? 'animation_restart' : 'animation_play_pause',
                  { page, animation: fig ? fig.dataset.anim : '' });
            return;
        }
        if (a.classList.contains('anim-phase')) {
            const fig = a.closest('figure.anim-panel');
            track('animation_step', { page, animation: fig ? fig.dataset.anim : '', step: (a.textContent || '').trim() });
            return;
        }
        if (a.tagName !== 'A') return;
        const href = a.getAttribute('href') || '';
        const label = (a.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 80);

        if (a.classList.contains('hl-card')) {
            track('highlight_card_click', { page, target: href });
        } else if (a.classList.contains('research-card')) {
            track('research_card_click', { page, target: href });
        } else if (href.startsWith('mailto:')) {
            track('email_click', { page });
        } else if (/^https?:\/\//i.test(href) && !href.includes(location.hostname)) {
            let domain = '';
            try { domain = new URL(href).hostname.replace(/^www\./, ''); } catch (e) { /* ignore */ }
            const kind = /scholar\.google|inspirehep\.net\/authors|orcid\.org/.test(href) ? 'profile'
                       : /indico\.cern\.ch/.test(href) ? 'slides'
                       : /arxiv\.org|doi\.org|journals\.aps\.org|nature\.com|sciencedirect|springer|worldscientific|tandfonline|pos\.sissa|cds\.cern/.test(href) ? 'paper'
                       : 'external';
            track('outbound_click', { page, kind, domain, label });
        } else if (href.startsWith('#') && a.classList.contains('top-nav-card')) {
            // tab switches are reported by the hashchange handler below
        } else if (/\.html/.test(href)) {
            track('internal_link_click', { page, target: href, label });
        }
    }, true);

    // homepage tabs (#publications, #talks, #hobbies, …) count as views of that section
    function reportSection() {
        const sec = location.hash.replace('#', '');
        if (sec) track('section_view', { page, section: sec });
    }
    window.addEventListener('hashchange', reportSection);
    window.addEventListener('load', function () { setTimeout(reportSection, 1500); });
})();
