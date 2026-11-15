'use strict';
const INSPIRE_API = 'https://inspirehep.net/api/literature';
    const CITATIONS_JSON_URL = 'citations.json';
    const CITATION_CACHE_KEY = 'inspireCitations.v1';
    const CITATION_TTL_MS = 12 * 60 * 60 * 1000;   // live-fetch cache lifetime
    const REQUEST_GAP_MS = 200;                    // spacing between API calls
    const MAX_RETRIES = 1;

    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    // Turn a data-query value into a clean INSPIRE query token (used only for
    // the live fallback). Accepts arxiv:/doi:/recid: and repairs loose values
    // such as a full "https://doi.org/..." URL.
    function normalizeQuery(raw) {
        const s = (raw || '').trim();
        if (!s) return '';
        const low = s.toLowerCase();
        if (low.startsWith('recid:') || low.startsWith('arxiv:') || low.startsWith('doi:')) {
            return s;
        }
        if (low.includes('doi.org/')) return 'doi:' + s.split(/doi\.org\//i)[1];
        if (s.startsWith('10.')) return 'doi:' + s;                       // bare DOI
        if (/^\d+$/.test(s)) return 'recid:' + s;                         // bare recid
        if (/^\d{4}\.\d{4,5}(v\d+)?$/.test(s)) return 'arxiv:' + s;       // new arXiv id
        if (/^[a-z-]+(\.[A-Z]{2})?\/\d{7}$/.test(s)) return 'arxiv:' + s; // old arXiv id
        return s;                                                          // free-text fallback
    }

    // Load the precomputed counts (keyed by the raw data-query value).
    async function loadPrecomputed() {
        if (location.protocol === 'file:') return null;
        try {
            const resp = await fetchWithTimeout(CITATIONS_JSON_URL, { cache: 'no-cache' });
            if (!resp.ok) return null;
            const data = await resp.json();
            if (data.by_query) return data.by_query;
            if (Array.isArray(data.papers)) {
                return Object.fromEntries(data.papers.map(paper => [paper.query, paper.citations]));
            }
            return data.counts || null;
        } catch (e) {
            return null;   // file not present (e.g. not generated yet)
        }
    }

    // A stalled citation service should never leave a request pending indefinitely.
    async function fetchWithTimeout(url, options = {}) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 5000);
        try { return await fetch(url, { ...options, signal: controller.signal }); }
        finally { clearTimeout(timer); }
    }

    function readCache() {
        try { return JSON.parse(localStorage.getItem(CITATION_CACHE_KEY)) || {}; }
        catch (e) { return {}; }
    }
    function writeCache(cache) {
        try { localStorage.setItem(CITATION_CACHE_KEY, JSON.stringify(cache)); }
        catch (e) { /* private mode or quota exceeded: skip caching */ }
    }

    // Best-effort live fetch of one query (only used when citations.json can't
    // answer). Retries on rate limits / transient errors. Returns a number, or
    // null if not found. May THROW on CORS/network failure -- callers swallow it.
    async function fetchCitationCount(query) {
        const url = INSPIRE_API + '?q=' + encodeURIComponent(query) +
                    '&fields=citation_count&size=1';
        let delay = 1500;
        for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
            let resp;
            try {
                resp = await fetchWithTimeout(url);
            } catch (networkError) {
                throw networkError;
            }
            if (resp.status === 429 || resp.status >= 500) {
                if (attempt === MAX_RETRIES) throw new Error('HTTP ' + resp.status);
                const retryAfter = parseFloat(resp.headers.get('Retry-After'));
                await sleep(Number.isFinite(retryAfter) ? Math.min(retryAfter * 1000, 5000) : delay);
                delay *= 2; continue;
            }
            if (!resp.ok) throw new Error('HTTP ' + resp.status);
            const data = await resp.json();
            const hits = (data.hits && data.hits.hits) || [];
            if (!hits.length) return null;
            const count = hits[0].metadata && hits[0].metadata.citation_count;
            return (typeof count === 'number') ? count : null;
        }
        return null;
    }

    async function fetchCitations() {
        const badges = Array.from(document.querySelectorAll('.citation-badge'));
        const precomputed = await loadPrecomputed();   // null if unavailable
        const cache = readCache();
        const now = Date.now();
        const pending = [];

        // Pass 1: prefer the precomputed file, then a fresh localStorage cache.
        for (const badge of badges) {
            const raw = badge.getAttribute('data-query');
            if (!raw) { badge.style.display = 'none'; continue; }

            if (precomputed && typeof precomputed[raw] === 'number') {
                updateBadge(badge, precomputed[raw]);
                continue;
            }
            const query = normalizeQuery(raw);
            const cached = cache[query];
            if (cached && (now - cached.ts) < CITATION_TTL_MS &&
                typeof cached.count === 'number') {
                updateBadge(badge, cached.count);
                continue;
            }
            pending.push({ badge, query });
        }

        // Resolve each paper once, even when it appears in several sections.
        const grouped = new Map();
        for (const entry of pending) {
            if (!grouped.has(entry.query)) grouped.set(entry.query, []);
            grouped.get(entry.query).push(entry.badge);
        }
        if (navigator.onLine === false) return;
        const queue = Array.from(grouped.entries());
        let cursor = 0;
        async function worker() {
            while (cursor < queue.length) {
                const [query, targets] = queue[cursor++];
                try {
                    const count = await fetchCitationCount(query);
                    if (count !== null) {
                        cache[query] = { count, ts: Date.now() }; writeCache(cache);
                        targets.forEach(badge => updateBadge(badge, count));
                    }
                } catch (error) { /* optional metadata; leave unavailable badges hidden */ }
                await sleep(REQUEST_GAP_MS);
            }
        }
        await Promise.all([worker(), worker()]);
    }

    function updateBadge(badge, count) {
        if (count === undefined || count === null) return;

        if (count === 0) {
            badge.style.display = 'none'; // Hide if 0 citations
        } else {
            badge.style.display = 'inline-block';
            badge.textContent = count + (count === 1 ? ' Citation' : ' Citations');

            // Highlight High Impact (>50 citations)
            if (count >= 50) {
                badge.style.backgroundColor = '#d1e7dd';
                badge.style.color = '#0f5132';
                badge.style.border = '1px solid #badbcc';
            } else {
                badge.style.backgroundColor = '#eef2f7';
                badge.style.color = '#003366';
                badge.style.border = '1px solid #dbeafe';
            }
        }
    }

    
fetchCitations();
