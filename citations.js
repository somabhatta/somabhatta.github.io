'use strict';

(async function refreshCitations() {
    const api = 'https://inspirehep.net/api/literature';
    const cacheKey = 'inspireCitations.v2';
    const ttl = 12 * 60 * 60 * 1000;
    const targets = new Map();
    const saved = new Map();
    let cache = {};

    function normalize(raw) {
        let key = raw.trim().toLowerCase().replace(/^https?:\/\/(?:dx\.)?doi\.org\//, 'doi:');
        if (/^10\./.test(key)) key = 'doi:' + key;
        if (/^\d+$/.test(key)) key = 'recid:' + key;
        if (/^(\d{4}\.\d{4,5}|[a-z.-]+\/\d{7})/.test(key)) key = 'arxiv:' + key;
        return key.startsWith('arxiv:') ? key.replace(/v\d+$/, '') : key;
    }

    for (const badge of document.querySelectorAll('.citation-badge[data-query]')) {
        const key = normalize(badge.dataset.query);
        if (!targets.has(key)) targets.set(key, []);
        targets.get(key).push(badge);
    }
    if (!targets.size) return;

    const validCount = count => Number.isSafeInteger(count) && count >= 0;
    const fresh = ts => Number.isFinite(ts) && ts <= Date.now() && Date.now() - ts < ttl;

    function display(key, entry) {
        if (!validCount(entry.count)) return;
        const previous = saved.get(key);
        if (previous && previous.ts > entry.ts) return;
        saved.set(key, entry);
        const date = entry.ts ? new Date(entry.ts).toISOString().slice(0, 10) : '';
        const countText = entry.count + (entry.count === 1 ? ' citation' : ' citations');
        for (const badge of targets.get(key)) {
            const label = countText + (fresh(entry.ts) ? '' : (date ? ' · as of ' + date : ' · saved'));
            badge.replaceChildren();
            if (/^\d+$/.test(entry.id)) {
                const link = document.createElement('a');
                link.href = 'https://inspirehep.net/literature/' + entry.id;
                link.textContent = label;
                link.style.color = 'inherit';
                badge.append(link);
            } else {
                badge.textContent = label;
            }
            badge.title = 'INSPIRE total citations' + (date ? ', checked ' + date + ' UTC' : '');
            badge.style.display = 'inline-block';
            badge.style.backgroundColor = entry.count >= 50 ? '#d1e7dd' : '#eef2f7';
            badge.style.color = entry.count >= 50 ? '#0f5132' : '#003366';
            badge.style.border = '1px solid ' + (entry.count >= 50 ? '#badbcc' : '#dbeafe');
        }
    }

    async function getJson(url) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 12000);
        try {
            const response = await fetch(url, { cache: 'no-store', signal: controller.signal });
            if (!response.ok) throw new Error('HTTP ' + response.status);
            return await response.json();
        } finally {
            clearTimeout(timer);
        }
    }

    async function showSnapshot() {
        if (location.protocol === 'file:') return;
        try {
            const data = await getJson('citations.json');
            const stamp = Date.parse(data.generated_utc);
            const ts = Number.isFinite(stamp) && stamp <= Date.now() ? stamp : 0;
            const ids = new Map((data.papers || []).map(p => [normalize(p.query), p.recid]));
            for (const [query, count] of Object.entries(data.by_query || {})) {
                const key = normalize(query);
                if (targets.has(key)) display(key, {count, ts, id: ids.get(key)});
            }
        } catch { /* The live lookup works without a saved file. */ }
    }

    async function updateGroup(keys) {
        const params = new URLSearchParams({
            q: keys.join(' or '), size: String(keys.length * 3),
            fields: 'citation_count,control_number,dois,arxiv_eprints'
        });
        const data = await getJson(api + '?' + params);
        const matches = new Map();
        for (const hit of data.hits.hits) {
            const meta = hit.metadata;
            const identifiers = new Set([
                'recid:' + hit.id,
                ...(meta.dois || []).map(d => normalize('doi:' + d.value)),
                ...(meta.arxiv_eprints || []).map(a => normalize('arxiv:' + a.value))
            ]);
            for (const key of keys) {
                if (!identifiers.has(key)) continue;
                matches.set(key, matches.has(key) ? null : hit);
            }
        }
        for (const [key, hit] of matches) {
            if (!hit || !validCount(hit.metadata.citation_count)) continue;
            const entry = { id: String(hit.id), count: hit.metadata.citation_count, ts: Date.now() };
            display(key, entry);
            cache[key] = entry;
        }
        try { localStorage.setItem(cacheKey, JSON.stringify(cache)); } catch { /* Optional cache. */ }
    }

    try { cache = JSON.parse(localStorage.getItem(cacheKey)) || {}; } catch { /* Optional cache. */ }
    const pending = [];
    for (const key of targets.keys()) {
        const entry = cache[key];
        if (entry && validCount(entry.count) && Number.isFinite(entry.ts) && entry.ts <= Date.now()) {
            display(key, entry);
            if (fresh(entry.ts)) continue;
        }
        pending.push(key);
    }

    async function updateLive() {
        for (let i = 0; i < pending.length; i += 7) {
            try { await updateGroup(pending.slice(i, i + 7)); } catch { /* Keep the dated fallback. */ }
        }
    }
    await Promise.all([showSnapshot(), updateLive()]);
})();
