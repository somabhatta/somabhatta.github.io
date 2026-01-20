import requests
import json

# CONFIGURATION: Correct arXiv and Inspire IDs
PAPERS = {
    # --- A.i) Primary Author Experimental Papers ---
    "exp_nature_2024": "arXiv:2401.06625",      # Imaging Shapes (Nature)
    "exp_prl_radial": "arXiv:2503.24125",       # Evidence for collective radial flow
    "exp_prl_fluct": "2716301",                 # Disentangling sources (PRL 133)
    "exp_prc_corr": "2600236",                  # Correlations flow/pT (PRC 105)

    # --- A.ii) Primary Author Phenomenological Papers ---
    "pheno_radial_2025": "arXiv:2504.20008",    # Disentangling global multiplicity
    "pheno_emission_2024": "arXiv:2407.06977",  # Experimental method spectator
    "pheno_plb_2024": "arXiv:2301.01294",       # Energy dependence isobar (PLB 858)
    "pheno_prc_2022": "arXiv:2109.00768",       # Higher-order fluctuations (PRC 105)
    "pheno_epjc_2022": "arXiv:2203.15570",      # Improved method initial states (EPJC 82)

    # --- B. Co-authored / Contributing Papers ---
    "co_nuclnews_2025": "arXiv:2501.16071",     # Imaging Nuclei (Nucl. Phys. News)
    "co_prl_decorr": "arXiv:2408.15006",        # Longitudinal flow decorrelations
    "co_prc_thermal": "arXiv:2311.13783",       # Thermalization femtoscale (PRC 109)
    "co_epja_shape": "arXiv:2301.03556",        # Nuclear shape fluctuations (EPJA 59)
    "co_prc_isobar": "arXiv:2204.02558",        # Ratios of collective flow (PRC 106)
    "co_plb_nonflow": "arXiv:2102.05200"        # Non-flow effects (PLB 822)
}

def get_citation_count(paper_id):
    """Fetches citation count from Inspire HEP API."""
    url = f"https://inspirehep.net/api/literature/{paper_id}"
    try:
        response = requests.get(url, timeout=10)
        if response.status_code == 404:
            print(f"  [Warning] ID not found: {paper_id}")
            return 0
        response.raise_for_status()
        data = response.json()
        return data['metadata']['citation_count']
    except Exception as e:
        print(f"  [Error] {paper_id}: {e}")
        return 0

def main():
    citation_data = {}
    print(f"Fetching citations for {len(PAPERS)} papers...")
    print("-" * 40)
    
    for key, paper_id in PAPERS.items():
        count = get_citation_count(paper_id)
        citation_data[key] = count
        print(f"  {count:3} | {key}")

    # Save to JSON file
    with open('citations.json', 'w') as f:
        json.dump(citation_data, f, indent=4)
    print("-" * 40)
    print("Success! 'citations.json' has been created.")

if __name__ == "__main__":
    main()
