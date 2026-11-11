# Fc-Construct's MIRE Squiglink

An open-canal **MIRE (Microphone-in-Real-Ear)** frequency response database and interactive visualization tool for over-ear headphones, maintained by **Fc-Construct**.

---

## 1. Project Overview & Vision

This application is customized specifically for **open-canal MIRE headphone acoustic measurements**, modifying coupler-focused systems and introducing dedicated seating, channel, and variant controls.

* **Microphone-in-Real-Ear (MIRE)**: Captured using miniature probe microphones placed at the entrance of Fc-Construct's unoccluded ear canal while wearing over-ear headphones, incorporating real Head-Related Transfer Functions (HRTF).
* **Seating Variance**: Accounts for pad seal and placement variations by measuring multiple distinct seatings per ear (`L1..L3`, `R1..R3`) as well as seal variations (e.g., eyeglasses vs. clean seal).

---

## 2. Key Upgrades & Changes Over Original Squiglink 

### 1. Color-Blind Safe Color Palette and Consistency 
* **Color-Blind Safe HCL Palette**: Built with 12 perceptually uniform HCL hues calibrated to avoid red-green confusion and ensure high legibility.
* **Anchor Color Stability**: The primary active headphone is always assigned Index 0 (Cobalt Blue). Remaining models receive a fixed, high-contrast sequence and dynamically retain their assigned color slots when models are deselected.
* **Distinct Channel Lines**: Right channel is styled as a solid line (`─ R`) and Left channel as a dashed line (`- - L`), matched with explicit legend prefixes. Reference targets use fine dotted lines (`2, 4` at 55% opacity) to prevent clashing with left-channel dashes.

### 2. Caching and Pre-loading
* **In-Memory Caching**: Parsed curve data and raw text files are cached in memory (`rawFileCache` and `parsedResultCache`) for zero-latency re-fetches.
* **Idle Pre-loading**: An idle-time background prefetcher (`requestIdleCallback`) loads remaining library items during browser idle time for instant model switching.

### 3. Parser (Hybrid Approach & `update_phonebook.py`)
* **Hybrid Source of Truth (`phone_book.json`)**: Utilizes `phone_book.json` as the primary curated source of truth. This preserves manual curation, custom ordering, and unique model/variant naming hierarchies without algorithmic misclassifications.
* **Automated Python Sync (`update_phonebook.py`)**:
  * **Directory Scanning**: Scans the `/data/` directory for raw headphone measurement `.txt` files (supporting both compact `L1`/`R1` and spaced `L 1`/`R 1` channel/seating naming conventions).
  * **Non-Destructive Merging**: Compares parsed measurement file prefixes against existing phonebook entries. It leaves all existing manual entries completely intact while cleanly discovering and appending new models, brands, or variants (such as eyeglasses or pad variants).
  * **Static Mirroring**: Automatically writes merged updates to `data/phone_book.json` and mirrors them to `public/data/phone_book.json` for static runtime access.
* **Runtime Loading & Caching (`config.js` & `graphtool.js`)**:
  * Configured via `PHONE_BOOK = "./data/phone_book.json"` in `assets/js/config.js`.
  * At runtime, `graphtool.js` asynchronously fetches `phone_book.json` to populate the sidebar brand and model lists.
  * **In-Memory Caching & Pre-loading**: Parsed curve data and raw files are cached in memory (`rawFileCache`, `parsedResultCache`), paired with background idle pre-loading (`requestIdleCallback`) to ensure zero-latency model switching.
* **Channel & Seating Stemming**: Automatically parses channels (`L` / `R`) and seating numbers (`1..9`) at the end of filenames.

### 4. Nested Tree Sidebar Navigation & Theme Compatibility
* **Collapsible Variant Trees**: Introduced an interactive nested tree system in the sidebar featuring animated chevron indicators (`svg.tree-chevron`). Users can expand/collapse headphone entries to reveal individual variants (e.g., Stock vs. Glasses variants).
* **Robust Theme Integration**: Fully dynamized sidebar and variant tree styles across Light, Dark (`theme-dark`), and Contrast modes. Selected cards, unselected containers, active variant pills (`--tree-active-pill-bg`), and text contrast adapt cleanly without blackouts or pastel artifacts.

### 5. Smoothing Detection
* **Header Metadata Inspection**: Reads header comments in exported REW text files upon load.
* **Warning Indicators**: Non-standard or missing smoothing (e.g., `1/12 octave` or `None`) displays a subtle `⚠️` warning badge with a descriptive tooltip, while standard `1/6 octave` acoustic measurements remain badge-free.

### 6. Dynamic Custom Reference Views
* **Live Preference Tuning**: Adjusting Tilt (dB/Oct), Bass Shelf, Treble, or Ear Gain dynamically generates a custom reference target.
* **Custom Reference View Pills**: Save custom target configurations as numbered presets (`CUSTOM 1`, `CUSTOM 2`), double-click to rename in-place, or delete custom target pills.
* **Presets**: Defaults to `10 dB downwards tilt` (-1 dB/Oct slope) on load, with quick toggles to flat `Fc-Construct DF-HRTF` or preference bounds.

### 7. Calculate Functionality
* **Band Selection Brush**: Click the **`∫ calculate`** tool button and drag across any frequency range ($f_0 \rightarrow f_1$) on the graph canvas.
* **Log-Weighted Difference**: Computes the log-frequency-weighted average decibel difference (or mean level) between selected channels/models across the chosen band (e.g. `Avg Diff: 1.45 dB` over `200 Hz – 1.0 kHz`).
* **Precise Graph Bounding**: Calculate selection brush is structurally constrained between the top graph grid line (`pad.t + 10`) and bottom frame (`pad.t + H`), preventing overflow into the header.

### 8. Adaptive Multi-Column Label Layout & Logarithmic Tilt Math
* **Dynamic Multi-Column Label Stacking**: Automatically stacks active model curves into neat columns (up to 8 models in the bottom-left zone; 9+ models spilling into the top-left open whitespace zone). This allows for up to 16 models to be labeled nicely.
* **Precise Text & Width Measurement**: Computes rendered text bounding box widths (`getBBox().width + 14px`) dynamically to prevent overlaps or awkward gaps, with automatic font-size downscaling (`12.5px` $\rightarrow$ `11px` $\rightarrow$ `10px`) for large model counts.
* **SVG Layer Isolation**: Separates static curve labels (`g.labels-layer`) from interactive overlays (`g.tools-layer`), entirely eliminating label jumping when toggling Inspect or Calculate tools.
* **Logarithmic Tilt Representation Note**: The $-1\text{ dB/Octave}$ tilt uses logarithmic scaling (`tilt * Math.log2(frequency / referenceFrequency)`). While a symmetric $\pm 5\text{ dB}$ split between 20 Hz and 20 kHz requires the reference pivot to be at the geometric mean ($f_{\text{geometric}} = \sqrt{20 \times 20,000} \approx 632.46\text{ Hz}$), the target curves anchor at the industry-standard **1 kHz (1000 Hz)** reference point, yielding $+5.64\text{ dB}$ at 20 Hz and $-4.32\text{ dB}$ at 20 kHz.

### 9. Inspect Tool Graph Box Bounding
* **Graph Box Bounding Math**: Computes the exact rendered SVG bounding box (`getBBox()`) of active inspection labels and clamps the container's horizontal position (`dx`) between graph padding boundaries (`pad.l` and `pad.l + W`). As the cursor line moves all the way to 20 Hz or 20 kHz, the inspection text block locks cleanly against the left or right edge without overflowing the graph box.

### 10. Theme Modes, Screenshot Button & 4K 16:9 Transparent Export
* **Semantic Theming & Default Dark Mode**: 
  * Configured **Dark Mode (`theme-dark`)** as the default application theme on load.
  * Introduced semantic CSS custom properties (`--graph-axis-text`, `--graph-grid-line`, `--inspector-bg`, `--inspector-border`, `--inspector-text`) ensuring crystal-clear readability and high contrast across Light, Dark, and Contrast modes.
  * Updated the theme toggle button to display the **currently active theme name** (e.g. `Dark Mode`, `Light Mode`, `Contrast Mode`) instead of the next rotation target.
* **Clean Legend Labels (No Bounding Boxes & Color Sync)**:
  * Removed rectangular background bounding boxes (`g.lineLabel rect`) behind bottom legend labels, styling them as clean, borderless text matching the minimalist inspect tool aesthetic.
  * Synchronized custom color picker hex values so that selecting a custom color updates graph lines, AVG buttons, and model labels consistently.
* **Screenshot Button & 4K 16:9 Transparent Export**:
  * Added a dedicated **Screenshot** button directly alongside the **Save** button in the toolbar.
  * Configured both **Save** and **Screenshot** buttons to export high-resolution **4K 16:9 (`3840 × 2160`)** PNGs using an in-memory canvas compositor.
  * **Transparent Margins**: The margins surrounding the graph are rendered with **full transparency (`rgba(0,0,0,0)`)**, providing exact 4K 16:9 framing consistency for video editors and slide decks while preserving the native acoustic graph aspect ratio.
* **Theme-Aware Save / Export Passthrough**:
  * Enhanced `saveGraph()` and `saveSvgAsPng` to dynamically forward active theme classes (`theme-dark`, `theme-contrast`, `theme-default`), active background colors, and CSS custom property variables into exported PNGs and SVGs.
* **Dynamic Filename Alignment**:
  * Exported filenames automatically align to the active models and comparison state currently rendered on screen via `getDynamicFilename(ext)`. 

### 11. Development Sandbox & Asset Mirroring Architecture
* **The `/public/` Folder**: In the Gemini AI Studio preview environment, the `/public/` directory acts as the static serving root for web assets and scripts.
* **Automated Asset Mirroring (`autoSyncAssetsPlugin`)**: To prevent manual file duplication, a custom Vite plugin (`autoSyncAssetsPlugin` in `vite.config.ts`) automatically mirrors all files and subdirectories from `/assets/` directly into `/public/assets/` (along with `README.md`) upon dev server startup, build start, and page requests. Developers can edit or add assets exclusively in `/assets/` with instant synchronization.

---

## 3. User Guide & REW Export Reminder

### Exporting REW Measurements
1. Take measurements in REW (typically 3 seatings per ear: `L1..L3` and `R1..R3`).
2. Apply **1/6-octave acoustic smoothing**.
3. Apply Left and Right **DF-HRTF compensation**.
4. Export as text (`.txt`, tab/space separated): **File $\rightarrow$ Export $\rightarrow$ Export measurement as text**.

### Filename Standard
Format: `[Brand] [Model] [Glass or Variant] [Channel][Seating].txt`

* Clean Seal: `Sony MDR-MV1 L1.txt`
* Eyeglasses Seal: `Sony MDR-MV1 G L1.txt`
* Multi-Word Brand: `Audio Technica ATH R50x L1.txt`
* Pad/Variant Tag: `Sennheiser HD600 (Velour Pads) L1.txt`

Upload `.txt` files directly into the **`/data/`** directory on GitHub to automatically build the phonebook. 