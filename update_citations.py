import requests
import json

# CONFIGURATION: Map your specific papers to their IDs.
# The Inspire HEP API is smart: it accepts "arXiv:XXXX.XXXXX" or "doi:XXXX" 
# as valid identifiers in place of the numeric Inspire ID.

PAPERS = {
    # --- A.i) Primary Author Experimental Papers ---
    # Imaging Shapes (Nature 635) -> arXiv:2401.06625
    "exp_nature_2024": "arXiv:2401.06625",
    
    # Evidence for collective radial flow -> arXiv:2503.24125
    "exp_prl_radial": "arXiv:2503.24125",
    
    # Disentangling sources (PRL 133) -> INSPIRE ID 2716301 (or search via title if needed)
    "exp_prl_fluct": "2716301", 
    
    # Correlations flow/pT (PRC 105) -> INSPIRE ID 2600236
    "exp_prc_corr": "2600236",

    # --- A.ii) Primary Author Phenomenological Papers ---
    # Disentangling global multiplicity -> arXiv:2504.20008
    "pheno_radial_2025": "arXiv:2504.20008",
    
    # Experimental method spectator -> arXiv:2407.06977
    "pheno_emission_2024": "arXiv:2407.06977",
    
    # Energy dependence isobar (PLB 858) -> arXiv:2301.01294
    "pheno_plb_2024": "arXiv:2301.01294",
    
    # Higher-order fluctuations (PRC 105) -> arXiv:2109.00768
    "pheno_prc_2022": "arXiv:2109.00768",
    
    # Improved method initial states (EPJC 82) -> arXiv:2203.15570
    "pheno_epjc_2022": "arXiv:2203.15570",

    # --- B. Co-authored / Contributing Papers ---
    # Imaging Nuclei (Nucl. Phys. News) -> Likely arXiv:2501.16071 (or use DOI if available)
    "co_nuclnews_2025": "arXiv:2501.16071",
    
    # Longitudinal flow decorrelations -> arXiv:2408.15006
    "co_prl_decorr": "arXiv:2408.15006",
    
    # Thermalization femtoscale (PRC 109) -> arXiv:2311.13783
    "co_prc_thermal": "arXiv:2311.13783",
    
    # Nuclear shape fluctuations (EPJA 59) -> arXiv:2301.03556
    "co_epja_shape": "arXiv:2301.03556",
    
    # Ratios of collective flow (PRC 106) -> arXiv:2204.02558
    "co_prc_isobar": "arXiv:2204.02558",
    
    # Non-flow effects (PLB 822) -> arXiv:2102.05200
    "co_plb_nonflow": "arXiv:2102.05200"
}

def get_citation_count(paper_id):
    """Fetches citation count from Inspire HEP API."""
    if paper_id == "REPLACE_WITH_ID":
        return 0
        
    # The API endpoint works with arXiv IDs if prefixed correctly
    url = f"https://inspirehep.net/api/literature/{paper_id}"
    try:
        response = requests.get(url, timeout=10)
        if response.status_code == 404:
            print(f"  [Warning] ID not found in Inspire: {paper_id}")
            return None
        response.raise_for_status()
        
        data = response.json()
        return data['metadata']['citation_count']
    except Exception as e:
        print(f"Error fetching ID {paper_id}: {e}")
        return None

def main():
    citation_data = {}
    total_citations = 0
    
    print(f"Fetching citation counts for {len(PAPERS)} papers...")
    print("-" * 40)
    
    for key, paper_id in PAPERS.items():
        count = get_citation_count(paper_id)
        
        if count is not None:
            citation_data[key] = count
            total_citations += count
            print(f" {count:3} | {key} ({paper_id})")
        else:
            citation_data[key] = "N/A"
            print(f" N/A | {key}")

    print("-" * 40)
    # Add total count to the data
    citation_data["total_citations"] = total_citations
    print(f" TOTAL CITATIONS: {total_citations}")

    # Save to JSON file
    with open('citations.json', 'w') as f:
        json.dump(citation_data, f, indent=4)
    print("\n[Success] citations.json updated.")

if __name__ == "__main__":
    main()
