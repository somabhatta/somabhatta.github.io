# Updated website and animations

Extract this archive and open `index.html`. Keep the folder structure intact. No build step is required. The live website has not been changed.

## This revision

- Redesigned seven animation types used in eleven panels: shape versus size, momentum spectra, separated subevents, curve scaling, bulk viscosity, nuclear orientation, and collision evolution.
- Added clear visual stages, longer reading pauses, direct comparisons, particle trajectories, and concise explanations.
- Simplified every animation panel to **Play/Pause**, **Restart**, and **Step buttons** where the scene has multiple stages.
- Removed speed selectors, timelines, export buttons, parameter sliders, and page-wide animation controls.
- Strengthened text, button, and scientific color contrast while keeping white backgrounds and restrained styling.
- Clicking a Step button pauses on a useful frame of that stage. Restart resets the illustration and preserves its current play/pause state.
- Kept automatic suspension outside the viewport and in hidden tabs, reduced-motion support, and readable canvas widths on small screens.
- Made 29 publication/news titles clickable using their existing destination URLs. The title and paper name on each of the ten research pages also link to the corresponding paper. Five internal-note entries without supplied URLs remain unlinked.
- Changed the model-description wording to “Experience with…” and stated that published papers have used these models.
- Updated the visible affiliation wording to **ALICE Experiment at the LHC**.

The search, reading navigation, enlarged paper-figure viewer, citation-loading fixes, and published paper figures from the previous update are retained.

## Files

`research/assets/story-animations.js` contains the seven redesigned scene types. The common animation controller remains in `research/assets/anim.js`. Page-specific animations retain their existing files and use the simplified common controls.

## Checks

All eleven HTML pages passed local file/anchor checks, with no duplicate IDs. All JavaScript passed syntax checks. Controller checks passed for cycle timing, event updates, the minimal control set, step navigation, pause/restart, visibility handling, and reduced-motion startup. All 55 animation panels were exercised at canvas widths of 640 and 848 pixels, with 770 drawing checks and no drawing errors; redesigned scenes were visually inspected.

Full browser layout testing was unavailable. External publication URLs are the destinations supplied with the original site; their live availability has not been rechecked.
