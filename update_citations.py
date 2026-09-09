#!/usr/bin/env python3
"""
Fetch citation counts for S. Bhatta's papers from INSPIRE-HEP.

Why the old version returned zeros
----------------------------------
INSPIRE has two different ways to look up a record:

  1. By INSPIRE record id (recid), a bare integer, on the PATH:
         GET https://inspirehep.net/api/literature/<recid>
     -> the record is at   response["metadata"]

  2. By any *other* identifier (arXiv id, DOI), as a SEARCH QUERY:
         GET https://inspirehep.net/api/literature?q=arxiv:2503.24125
     -> the record is at   response["hits"]["hits"][0]["metadata"]

The previous script always used form (1) and always read
response["metadata"], but fed it strings like "arXiv:2503.24125".
That builds the URL

    https://inspirehep.net/api/literature/arXiv:2503.24125

which is not a recid, so INSPIRE answers 404 -> the code caught it and
recorded 0. Every arXiv-keyed paper therefore silently showed 0 cites,
while a genuine "0 citations" and a "lookup failed" were indistinguishable.

This version uses the search form (2) uniformly for every identifier
(arxiv / doi / recid all work as `q=` tokens), asks INSPIRE to return
*only* the citation fields, prints the resolved title next to each count
so a wrong identifier is obvious at a glance, and separates
"not found" (None) from "found, 0 citations" (0).
"""

from __future__ import annotations

import json
import re
import sys
import time
from dataclasses import dataclass, asdict, field
from datetime import datetime, timezone

import requests

# --------------------------------------------------------------------------
# Configuration
# --------------------------------------------------------------------------

INSPIRE_API = "https://inspirehep.net/api/literature"
OUTPUT_FILE = "citations.json"

# INSPIRE asks bots to identify themselves and to stay well under
# ~15 requests / 5 s. One request per second is comfortable and polite.
HEADERS = {"User-Agent": "bhatta-citation-fetcher/2.0 (mailto:s.bhatta@uu.nl)"}
SLEEP_BETWEEN_REQUESTS = 1.0          # seconds
FIELDS = ",".join([
    "citation_count",
    "citation_count_without_self_citations",
    "titles",
    "arxiv_eprints",
    "dois",
    "control_number",
])


@dataclass
class Paper:
    """One entry in the publication list."""
    ref: str          # CV reference (section + number)
    label: str        # short human label, what *you* expect to fetch
    identifier: str   # any of: doi / arXiv / INSPIRE recid, messy is fine


# Identifiers below are taken verbatim from the author's own publication
# list (the data-query attributes on somabhatta.github.io) wherever one
# exists there, so they are known-good. For the three contributing-author
# papers not listed on the site, the identifier is reconstructed from the
# CV's journal reference (APS/Elsevier DOIs are fully deterministic) or, for
# EPJA where the DOI is not, from the arXiv id in the original script.
PAPERS: list[Paper] = [
    # --- A.i) First / primary-author experimental papers ------------------
    Paper("A.i-1", "Radial flow v0(pT) collectivity, PRL 136 (2026)",
          "arxiv:2503.24125"),
    Paper("A.i-2", "Imaging nuclear shapes, Nature 635 (2024)",
          "doi:10.1038/s41586-024-08097-2"),
    Paper("A.i-3", "Disentangling momentum fluctuations, PRL 133 (2024)",
          "doi:10.1103/PhysRevLett.133.252301"),
    Paper("A.i-4", "Flow-pT correlations Xe/Pb, PRC 107 (2023)",
          "doi:10.1103/PhysRevC.107.054910"),   # CV text says "PRC 105" - see notes

    # --- A.ii) First / primary-author phenomenological papers -------------
    Paper("A.ii-5", "Global multiplicity vs spectral-shape fluct. (2025)",
          "arxiv:2504.20008"),
    Paper("A.ii-6", "Preferential emission & spectators, PRC 113 (2026)",
          "doi:10.1103/kzyy-2wtv"),
    Paper("A.ii-7", "Energy dependence of isobar initial cond., PLB 858 (2024)",
          "doi:10.1016/j.physletb.2024.139034"),
    Paper("A.ii-8", "Higher-order pT fluctuations, PRC 105 (2022)",
          "doi:10.1103/PhysRevC.105.024904"),
    Paper("A.ii-9", "Improved method for initial states, EPJC 82 (2022)",
          "doi:10.1140/epjc/s10052-022-10824-w"),

    # --- B) Contributing-author papers ------------------------------------
    Paper("B-10", "Imaging nuclei by smashing them, Nucl.Phys.News 35 (2025)",
          "doi:10.1080/10619127.2025.2454214"),
    Paper("B-11", "Longitudinal flow decorrelations (subm. PRL, 2024)",
          "arxiv:2408.15006"),
    Paper("B-12", "Thermalization at the femtoscale, PRC 109 (2024)",
          "doi:10.1103/PhysRevC.109.L051902"),
    Paper("B-13", "Nuclear shape fluctuations, EPJA 59 (2023)",
          "arxiv:2301.03556"),                   # only id not cross-checked on your site
    Paper("B-14", "Ratios of flow observables in isobars, PRC 106 (2022)",
          "doi:10.1103/PhysRevC.106.L031901"),
    Paper("B-15", "Non-flow in flow-pT correlations, PLB 822 (2021)",
          "doi:10.1016/j.physletb.2021.136702"),
]


# --------------------------------------------------------------------------
# Identifier handling
# --------------------------------------------------------------------------

_ARXIV_NEW = re.compile(r"\d{4}\.\d{4,5}(v\d+)?$")          # 2503.24125, 2504.20008v2
_ARXIV_OLD = re.compile(r"[a-z-]+(\.[A-Z]{2})?/\d{7}$")     # nucl-th/0512345, hep-ph/9901234


def normalize_query(raw: str) -> str:
    """
    Turn any reasonable identifier into a clean INSPIRE `q=` token.

    Worked example, to make the branches concrete:
        "arXiv:2503.24125"                 -> "arxiv:2503.24125"
        "2504.20008"                       -> "arxiv:2504.20008"
        "https://doi.org/10.1103/kzyy-2wtv" -> "doi:10.1103/kzyy-2wtv"
        "10.1038/s41586-024-08097-2"       -> "doi:10.1038/s41586-024-08097-2"
        "2716301"                          -> "recid:2716301"
        "recid:2716301"                    -> "recid:2716301"

    Anything unrecognized is passed through untouched and treated by
    INSPIRE as a free-text query (which will usually still find the paper,
    just less precisely).
    """
    s = raw.strip()
    low = s.lower()

    # Already-tagged forms: normalise the tag, keep the value.
    for tag in ("recid:", "arxiv:", "doi:"):
        if low.startswith(tag):
            value = s.split(":", 1)[1].strip()
            if tag == "recid:":
                value = re.sub(r"\D", "", value)   # keep digits only
            return tag + value

    # A DOI given as a URL.
    if "doi.org/" in low:
        return "doi:" + s.split("doi.org/", 1)[1].strip()

    # A bare DOI (all DOIs start with "10.").
    if s.startswith("10."):
        return "doi:" + s

    # A bare INSPIRE recid.
    if s.isdigit():
        return "recid:" + s

    # A bare arXiv id, new or old scheme.
    if _ARXIV_NEW.match(s) or _ARXIV_OLD.match(s):
        return "arxiv:" + s

    return s  # give up gracefully; let INSPIRE free-text search it


# --------------------------------------------------------------------------
# Networking
# --------------------------------------------------------------------------

def api_get(session: requests.Session, params: dict, max_retries: int = 4) -> dict:
    """GET the INSPIRE API with backoff on rate limits / server / network errors."""
    delay = 2.0
    for attempt in range(1, max_retries + 1):
        try:
            resp = session.get(INSPIRE_API, params=params, headers=HEADERS, timeout=15)
        except requests.RequestException as exc:
            if attempt == max_retries:
                raise
            print(f"      (network error: {exc}; retrying in {delay:.0f}s)")
            time.sleep(delay)
            delay *= 2
            continue

        if resp.status_code == 429:                       # rate limited
            wait = float(resp.headers.get("Retry-After", delay))
            print(f"      (rate limited; waiting {wait:.0f}s)")
            time.sleep(wait)
            delay *= 2
            continue

        if 500 <= resp.status_code < 600:                 # transient server error
            if attempt == max_retries:
                resp.raise_for_status()
            time.sleep(delay)
            delay *= 2
            continue

        resp.raise_for_status()                           # 404 etc. -> raise
        return resp.json()

    raise RuntimeError("exceeded max retries")


@dataclass
class Result:
    ref: str
    label: str
    query: str
    found: bool = False
    citations: int | None = None
    citations_no_self: int | None = None
    resolved_title: str | None = None
    arxiv: str | None = None
    doi: str | None = None
    recid: int | None = None
    error: str | None = None


def fetch_one(session: requests.Session, paper: Paper) -> Result:
    query = normalize_query(paper.identifier)
    res = Result(ref=paper.ref, label=paper.label, query=query)

    try:
        data = api_get(session, {"q": query, "fields": FIELDS, "size": 1})
    except Exception as exc:                              # noqa: BLE001 - report, don't crash
        res.error = str(exc)
        return res

    hits = data.get("hits", {}).get("hits", [])
    if not hits:
        res.error = "no INSPIRE record matched this identifier"
        return res
    if len(hits) > 1:
        # A specific id should be unique; if not, take the first but flag it.
        res.error = f"identifier matched {len(hits)} records; using the first"

    meta = hits[0].get("metadata", {})
    res.found = True
    res.citations = meta.get("citation_count")
    res.citations_no_self = meta.get("citation_count_without_self_citations")
    titles = meta.get("titles") or [{}]
    res.resolved_title = titles[0].get("title")
    if meta.get("arxiv_eprints"):
        res.arxiv = meta["arxiv_eprints"][0].get("value")
    if meta.get("dois"):
        res.doi = meta["dois"][0].get("value")
    res.recid = meta.get("control_number")
    return res


# --------------------------------------------------------------------------
# Driver
# --------------------------------------------------------------------------

def _fmt_count(res: Result) -> str:
    if not res.found:
        return "  n/a"
    c = res.citations if res.citations is not None else 0
    if res.citations_no_self is not None:
        return f"{c:>4}  ({res.citations_no_self} excl. self)"
    return f"{c:>4}"


def main() -> int:
    print(f"Fetching citations for {len(PAPERS)} papers from INSPIRE-HEP")
    print("=" * 72)

    results: list[Result] = []
    with requests.Session() as session:
        for i, paper in enumerate(PAPERS, 1):
            res = fetch_one(session, paper)
            results.append(res)

            print(f"[{res.ref}] {paper.label}")
            print(f"        {_fmt_count(res)}  |  {res.query}")
            if res.found and res.resolved_title:
                print(f"        INSPIRE: {res.resolved_title}")
            if res.error:
                print(f"        !! {res.error}")
            print()

            if i < len(PAPERS):
                time.sleep(SLEEP_BETWEEN_REQUESTS)

    # ---- summary ---------------------------------------------------------
    found = [r for r in results if r.found]
    missing = [r for r in results if not r.found]
    total = sum((r.citations or 0) for r in found)
    total_no_self = sum((r.citations_no_self or 0) for r in found)

    print("=" * 72)
    print(f"Found {len(found)}/{len(results)} papers.")
    print(f"Total citations:              {total}")
    print(f"Total excluding self-cites:   {total_no_self}")
    if missing:
        print("Not resolved (check the identifier):")
        for r in missing:
            print(f"  - [{r.ref}] {r.label}  ({r.query})"
                  + (f"  -> {r.error}" if r.error else ""))

    # ---- save ------------------------------------------------------------
    payload = {
        "generated_utc": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "source": "https://inspirehep.net/api/literature",
        "summary": {
            "n_found": len(found),
            "n_total": len(results),
            "total_citations": total,
            "total_citations_excl_self": total_no_self,
        },
        # convenient flat map, like the original script produced
        "counts": {r.ref: r.citations for r in results},
        # full detail for each paper
        "papers": [asdict(r) for r in results],
    }
    with open(OUTPUT_FILE, "w", encoding="utf-8") as fh:
        json.dump(payload, fh, indent=2, ensure_ascii=False)

    print("-" * 72)
    print(f"Wrote {OUTPUT_FILE}")
    return 0 if not missing else 1   # non-zero exit if anything failed to resolve


if __name__ == "__main__":
    sys.exit(main())
