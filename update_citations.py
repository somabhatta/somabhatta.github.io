import requests
import json

# CONFIGURATION: Map your specific papers to their Inspire HEP IDs
# TODO: Replace the "REPLACE_WITH_ID" strings with the actual 7-digit Inspire IDs.

PAPERS = {
    # --- A.i) Primary Author Experimental Papers ---
    "exp_nature_2024": "2816174",     # Imaging Shapes (Nature)
    "exp_prl_radial": "REPLACE_WITH_ID", # Radial flow / arXiv:2503.24125
    "exp_prl_fluct": "2716301",       # Disentangling sources (PRL 133)
    "exp_prc_corr": "2600236",        # Correlations flow/pT (PRC 105)

    # --- A.ii) Primary Author Phenomenological Papers ---
    "pheno_radial_2025": "REPLACE_WITH_ID", # Disentangling global multiplicity / arXiv:2504.20008
    "pheno_emission_2024": "REPLACE_WITH_ID", # Experimental method spectator / arXiv:2407.06977
    "pheno_plb_2024": "REPLACE_WITH_ID",      # Energy dependence isobar (PLB 858)
    "pheno_prc_2022": "REPLACE_WITH_ID",      # Higher-order fluctuations (PRC 105)
    "pheno_epjc_2022": "REPLACE_WITH_ID",     # Improved method initial states (EPJC 82)

    # --- B. Co-authored / Contributing Papers ---
    "co_nuclnews_2025": "REPLACE_WITH_ID",    # Imaging Nuclei (Nucl. Phys. News)
    "co_prl_decorr": "REPLACE_WITH_ID",       # Longitudinal flow decorrelations / arXiv:2408.15006
    "co_prc_thermal": "REPLACE_WITH_ID",      # Thermalization femtoscale (PRC 109)
    "co_epja_shape": "REPLACE_WITH_ID",       # Nuclear shape fluctuations (EPJA 59)
    "co_prc_isobar": "REPLACE_WITH_ID",       # Ratios of collective flow (PRC 106)
    "co_plb_nonflow": "REPLACE_WITH_ID"       # Non-flow effects (PLB 822)
}

def get_citation_count(paper_id):
    """Fetches citation count from Inspire HEP API."""
    # Skip placeholders
    if paper_id == "REPLACE_WITH_ID":
        return 0
        
    url = f"https://inspirehep.net/api/literature/{paper_id}"
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        data = response.json()
        return data['metadata']['citation_count']
    except Exception as e:
        print(f"Error fetching ID {paper_id}: {e}")
        return None

def main():
    citation_data = {}
    total_citations = 0
    
    print("Fetching citation counts...")
    for key, paper_id in PAPERS.items():
        count = get_citation_count(paper_id)
        
        if count is not None:
            citation_data[key] = count
            total_citations += count
            print(f"  {key}: {count}")
        else:
            citation_data[key] = "N/A"

    # Add total count to the data
    citation_data["total_citations"] = total_citations
    print(f"  TOTAL: {total_citations}")

    # Save to JSON file
    with open('citations.json', 'w') as f:
        json.dump(citation_data, f, indent=4)
    print("citations.json updated successfully.")

if __name__ == "__main__":
    main()
