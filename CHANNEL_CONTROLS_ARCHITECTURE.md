# Channel Key & Splitter Controls Architecture (`td.channels svg.keyLine`)

This document provides a comprehensive technical breakdown of the channel control widget located in the bottom comparison table (`tbody.curves > tr > td.channels`). It maps all system interactions, internal mechanics, shared state dependencies, and fragility points to serve as an architectural reference prior to making any modifications.

---

## 1. System Overview & Visual Structure

The channel control widget is rendered inside each row of the managed curves table as an inline SVG element with `class="keyLine"`. 

```
+-----------------------------------------------------------------------------------+
|  [Color]  |  Model Name  |  [AVG] ----< L ONLY  |  Offset  | Seating  | Target Comp |
|           |              |            < R ONLY  |          | Dropdown |             |
+-----------------------------------------------------------------------------------+
                            \___________________/
                                td.channels
```

It serves three distinct acoustic and visual purposes:
1. **Seating Mode Indicator & Cycler** (Left text: `AVG`, `S1`, `all 3`).
2. **Channel Averaging vs. Splitting Switch** (Center fork: Single curve splitting into two branches).
3. **Channel Solo & Inspection Controls** (Right branches: `L ONLY` and `R ONLY`).

---

## 2. Code Locations & Primary Files

| Responsibility | File | Line References | Primary Functions / Selectors |
| :--- | :--- | :--- | :--- |
| **Table Row Setup** | `assets/js/tool_components/phoneTable.js` | 132 | `td().attr("class","channels").append("svg").call(addKey)` |
| **SVG Construction** | `assets/js/tool_components/phoneTable.js` | 320–400 | `addKey(s)` |
| **Widget State Refresh** | `assets/js/tool_components/phoneTable.js` | 402–417 | `updateKey(s)` |
| **State & Curve Logic** | `assets/js/graphtool.js` | 1600–1720 | `setCurves()`, `updateCurves()`, `updatePaths()` |
| **Global Channel Setup**| `assets/js/graphtool.js` | 994–997 | `LR = ["L", "R"]`, `getO(i)` |
| **Row CSS Styling** | `assets/css/style-alt.css` | 1705–1725 | `tbody.curves > tr > td.channels`, `svg.keyLine` |
| **Legacy CSS Styling** | `assets/css/style.css` | 99–106, 162–165 | `.keyLine`, `.keySel`, `.keyOnly` |

---

## 3. Data Structure & State Lifecycle (`p`)

Every headphone entry is represented by a JavaScript object (`p`). The channel control directly reads from and mutates the following properties on `p`:

| Property | Type | Description |
| :--- | :--- | :--- |
| `p.channels` | `Array<Array<[f, dB]>>` | Array containing the channel curve data (typically `[LeftChannel, RightChannel]`). |
| `p.activeCurves` | `Array<CurveObject>` | The list of curve descriptors currently bound to D3 graph paths in `#fr-graph`. |
| `p.avg` | `boolean` | `true` if showing the combined/average curve; `false` if showing split channels. |
| `p.lr` | `number \| undefined` | `undefined` (both channels shown), `0` (Left only), `1` (Right only). |
| `p.seating` | `string \| number` | Current seating mode: `"avg"`, `1`, `2`, `3`, or `"all"`. |
| `p.hexColor` | `string` | Custom hex color assigned via the color picker (or null for default palette). |
| `p.hide` | `boolean` | If true, curves are hidden from `#fr-graph`. |

---

## 4. How the Internal Mechanics Work

### A. The Splitting Fork Geometry (`path`)
The splitting graphic is a single SVG `<path>` generated dynamically in `updateKey`:
```javascript
s.select("path").attr("d", p =>
    notMultichannel(p) ? "M" + (15 + keyExt) + " 0H" + l :
    ["M15 -6H9C0 -6,0 0,-9 0H" + l, "M" + l + " 0H-9C0 0,0 6,9 6H15"]
        .filter((_, i) => p.channels[i])
        .reduce((a, b) => a + b.slice(6))
);
```
* The path begins at `y = 0` on the left (the single line stem representing the average).
* It branches through cubic bezier curves `C` into two parallel endpoints at `y = -6` (Left) and `y = +6` (Right).
* `notMultichannel(p)` detects mono or target curves and collapses the fork into a straight line.

### B. The Sliding Highlight Mask (`#blgrad` / `keyMask`)
To visually indicate whether you are viewing the **Average** or **Split Channels**, the code uses an animated SVG `<mask id="chmask...">`:
* The mask contains a linear gradient with sharp white transition stops (`#blgrad`).
* In `graphtool.js` lines 1694–1705, transitioning between Average and Split modes mutates the mask's `x` attribute:
  * **Average Mode (`p.avg = true`)**: `channelbox_x(true) = -86` (slides the transparent window over the left stem).
  * **Split Mode (`p.avg = false`)**: `channelbox_x(false) = -36` (slides the window over the right fork).
* An exponential easing formula `Math.pow(2, 20 * (Math.abs(t) - 1 / 2))` slides the mask vertically and horizontally.

### C. Invisible Hitbox Layers (`<rect opacity="0">`)
The click handlers are not attached to visible SVG text or path strokes. Instead, transparent `<rect>` elements are positioned directly on top:
* `keySel`: Rectangles covering the fork toggle area (`width: 40, height: 24`).
* `keyOnly`: Rectangles over the top and bottom branches (`width: 30, height: 12`).
* `keySelBoth`: A reset rectangle that unhides both channels when one channel was soloed.
* `keySamp`: A rectangle over the `AVG` text on the left (`width: 38, height: 24`).

---

## 5. External System Dependencies & Interactions

Any change to this component interacts with several other subsystems:

### 1. Main Graph Curves (`#fr-graph` and `gpath`)
* When `p.avg` is toggled or a channel is soloed (`p.lr`), `setCurves(p, ...)` rebuilds `p.activeCurves`.
* `updatePaths()` runs a D3 data-join on `gpath.selectAll("path")`:
  * Switching from Average to Split transitions from **1 path to 2 paths**.
  * Switching from Split to Average transitions from **2 paths to 1 path**.
  * Line dash-arrays are synced: Solid line (`─ R`) for Right, Dashed line (`- - L`) for Left.

### 2. Legend Labels in `#fr-graph` (`drawLabels()`)
* Bottom-left / bottom-right graph legend text reads directly from `p.activeCurves`.
* In Average mode: displays `Model Name`.
* In Split mode: displays `Model Name (— R)` and `Model Name (- - L)`.
* Soloing a channel automatically removes the other channel's label from the graph canvas.

### 3. The Adjacent Seating Dropdown (`select.seating-select`)
* The seating dropdown in the next `<td>` cell has options: `<option value="avg">AVG (3)</option>`, `<option value="1">S1</option>`, `<option value="all">all 3</option>`.
* When the dropdown changes, it calls `updateCurves()`, which updates `keySampLabel` in the SVG.
* Conversely, clicking the SVG's left `AVG` label calls `cycleSeating(p)`, which updates `select.property("value", p.seating)`.

### 4. The Top Toolbar "Average All" Button (`#avg-all`)
* Clicking "Average All" in the top bar iterates through every headphone in `activePhones` and executes `updateCurves(p, true)`.
* This triggers the sliding mask animation across all open table rows simultaneously.

### 5. Inspect Tool (`#inspector`) & Cursor Hover
* The cursor vertical line inspects values across `p.activeCurves`.
* If a row is in Split mode, the inspector displays two distinct dB measurements (L and R). If in Average mode, it displays a single combined measurement.

### 6. Calculate Tool (`#calcBtn`)
* Log-weighted band calculations evaluate active curves. Soloing a channel restricts the calculation to that specific ear measurement.

---

## 6. Key Fragility & Pain Points

### Fragility 1: The Text Collision Bug (Monospace Overlap)
* In `phoneTable.js`:
  * Channel label (`- - L` / `─ R`) is placed at `x = 14`.
  * `ONLY` text is placed at `x = 25` (an offset of only 11px).
* In `assets/css/style-alt.css` (line 1718):
  * `tbody.curves > tr > td.channels text` enforces `font-family: var(--font-secondary) !important;` (monospace).
  * Monospace characters are significantly wider than proportional sans-serif characters.
  * Result: `"- - L"` is ~24px wide, crashing directly into the word `"ONLY"` and creating visual overlap.

### Fragility 2: String-Slicing SVG Syntax
* In `phoneTable.js` line 415:
  `["M15 -6H9...", "M... 0H-9..."].reduce((a, b) => a + b.slice(6))`
* If coordinate dimensions or curve paths are adjusted, hardcoding `.slice(6)` breaks the SVG path definition, causing the blue fork to disappear completely.

### Fragility 3: Invisible Magic-Number Hitboxes
* All click boundaries rely on invisible `<rect opacity="0">` elements with static pixel offsets (`x = -19 - keyLeft`, `x = 40 + channelbox_x(0)`, `x = 25`, `y = -6`).
* If text moves, font size changes, or table columns flex, the invisible hitboxes fall out of alignment with the visible graphics.

### Fragility 4: Exclamation Mark (`!`) Imbalance Collision
* `phoneTable.js` line 381 appends an imbalance alert:
  `s.append("text").attr("class","imbalance").attrs({x:8, y:0, dy:"0.35em"}).text("!")`
* When channel imbalance exceeds the threshold, the `!` icon is drawn at `x = 8, y = 0`—directly inside the throat of the splitting blue curve.

### Fragility 5: Mask State Glitches Under Rapid Clicking
* The sliding mask uses an asynchronous D3 transition tween (`duration(400)`). If a user rapidly toggles channels, the tween interrupts, occasionally leaving the mask offset out of sync with `p.avg`.

---

## 7. Option B Implementation Architecture: Dual-Action Channel Pills

The fragile inline SVG control (`svg.keyLine`) and redundant separate `td.seating` select dropdown have been superseded by the **Option B Dual-Action Channel Pills** architecture:

```
+---------------------------+  +----------------------------+  +--------------------------+
| [ 👁 | Left: AVG  | ▾ ]   |  | [ 👁 | Right: AVG  | ▾ ]   |  | [ ⌣ | L+R: AVG   | ▾ ]   |
+---------------------------+  +----------------------------+  +--------------------------+
```

### Component Structure per Pill
Inside each `.channel-pill`, three decoupled interactive zones exist within one cohesive container:
1. **Eye Button (`.pill-eye`)**: Toggles visibility (`state[channel].visible`). Shows an open eye (`👁`) when active and a closed eye (`⌣`) when hidden. Dims the pill opacity to `0.4` when off.
2. **Cycle Label Button (`.pill-label`)**: 1-click toggling between `AVG` $\leftrightarrow$ `ALL` (or resetting from an individual seat back to `AVG`).
3. **Chevron Seating Selector (`.pill-chevron-wrap`)**: An overlay with an invisible native `<select class="pill-native-select">` over the `▾` icon. Tapping the chevron opens the browser's native picker with options (`AVG`, `ALL`, `L1..Ln` or `R1..Rn` or `Seat 1..n`).

### Data Model & Non-Mutually Exclusive Channels
* `p.channelState` stores independent visibility and seating per channel:
  - `p.channelState.L`: `{ visible: boolean, seating: "avg" | "all" | string }`
  - `p.channelState.R`: `{ visible: boolean, seating: "avg" | "all" | string }`
  - `p.channelState.LR`: `{ visible: boolean, seating: "avg" | "all" | string }`
* Channels are **not mutually exclusive**: `Left`, `Right`, and `L+R` can be active simultaneously to evaluate channel asymmetry against the combined average curve.
* Line styles on `#fr-graph`:
  - When `AVG` (`L+R`) is active: The combined `AVG` curve renders as a prominent, bold solid curve (`stroke-width: 2.8px`, 100% opacity). The `Left` (dashed) and `Right` (solid) curves are subtly dimmed to `45%` opacity (`stroke-width: 1.8px`), visually serving as an acoustic fit/seal variance envelope around the average. Hovering over a channel pill immediately highlights that specific curve back to 100% opacity.
  - When `AVG` is inactive: `Left` (dashed) and `Right` (solid) render at full 100% opacity and standard `2.1px` stroke width.

---

*This document reflects the production architecture of the channel controls in Fc-Construct's Squiglink.*
