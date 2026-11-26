// Original code by Marshall Lochbaum (https://github.com/mlochbaum)
// Heavily modified by HarutoHiroki (https://harutohiroki.com)
// Further heavily modified by Fc-Construct (https://github.com/Fc-Construct/mirelink) specifically for MIRE data

var doc = d3.select(".graphtool");
doc.html(`
  <svg style="display: none;">
    <defs>
      <g id="baseline-icon" text-anchor="middle" font-size="100px" fill="currentColor">
        <text dominant-baseline="central" y="-57">BASE</text>
        <text dominant-baseline="central" y="57">-LINE</text>
      </g>
      <g id="hide-icon">
        <path d="M2 6Q7 0 12 6Q7 12 2 6Z" stroke-width="1" stroke="currentColor" fill="none"/>
        <circle cx="7" cy="6" r="2" stroke="none" fill="currentColor"/>
        <line stroke-width="1" x1="4.4" y1="10.3" x2="10.4" y2="2.3" class="keyBackground"/>
        <line stroke-width="1" x1="3.6" y1= "9.7" x2= "9.6" y2="1.7" stroke="currentColor"/>
      </g>
      <g id="pin-icon" text-anchor="middle" font-size="100px" fill="currentColor">
        <text dominant-baseline="central">
          PIN
        </text>
      </g>
      <g id="save-icon">
        <path d='M16 11h5l-9 10-9-10h5v-11h8v11zm1 11h-10v2h10v-2z'/>
      </g>
      <g id="ninety-icon">
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
        <path d="M14 10v4a2 2 0 1 0 4 0v-4a2 2 0 1 0 -4 0" />
        <path d="M6 15a1 1 0 0 0 1 1h2a1 1 0 0 0 1 -1v-6a1 1 0 0 0 -1 -1h-2a1 1 0 0 0 -1 1v2a1 1 0 0 0 1 1h3" />
      </g>
    </defs>
  </svg>

  <main class="main">
    <section class="parts-primary">
    <div class="graphBox" data-sticky-graph="`+ alt_sticky_graph +`" data-animated="`+ alt_animated +`">
      <div class="graph-sizer">
        <div class="graph-svg-wrap">
          <canvas id="fft-canvas" aria-hidden="true"></canvas>
          <svg id="fr-graph" viewBox="0 0 800 434" data-labels-position="`+ labelsPosition +`"></svg>
          <div class="graph-header" id="graph-header">
            <div contenteditable="true" id="graph-title-input" class="graph-header-title" aria-label="Graph title" spellcheck="false"></div>
            <div contenteditable="true" id="graph-subtitle-input" class="graph-header-subtitle" aria-label="Graph subtitle" spellcheck="false"></div>
          </div>
        </div>
      </div>

      <div class="tools collapseTools">
        <div class="copy-url">
          <button id="copy-url">Copy URL</button>
          <button id="download-faux">Save</button>
          <button id="screenshot-btn">Screenshot</button>
          <button id="avg-all">Average All</button>
        </div>

        <div class="yscaler">
          <span>Y-axis Scale:</span>
          <div>
            <button id="yscalebtn" class="40db">40dB</button>
          </div>
        </div>

        <div class="zoom">
          <span>Zoom:</span>
          <button>Bass</button>
          <button>Mids</button>
          <button>Treble</button>
        </div>

        <div class="normalize">
          <span>Normalize:</span>
          <div>
            <input type="number" inputmode="decimal" id="norm-phon" required min="0" max="100" value="`+ default_norm_db +`" step="1" onclick="this.focus();this.select()"></input>
            <span>dB</span>
          </div>
          <div>
            <input type="number" inputmode="decimal" id="norm-fr" required min="20" max="20000" value="`+ default_norm_hz +`" step="1" onclick="this.focus();this.select()"></input>
            <span>Hz</span>
          </div>
          <span class="helptip">
            ?<span>Choose a dB value to normalize to a target listening level, or a Hz value to make all curves match at that frequency.</span>
          </span>
        </div>

        <!-- Smooth control commented out (kept for future use)
        <div class="smooth">
          <span>Smooth:</span>
          <input type="number" inputmode="decimal" id="smooth-level" required min="0" value="0" step="any" onclick="this.focus();this.select()"></input>
        </div>
        -->

        <div class="miscTools">
          <button id="inspector"><span>╞</span> inspect</button>
          <button id="calcBtn"><span>∫</span> calculate</button>
          <button id="label"><span>▭</span> label</button>
          <button id="download"><span><u>⇩</u></span> save</button>
        </div>

        <div class="expand-collapse">
            <button id="expand-collapse"></button>
        </div>

        <svg id="expandTools" viewBox="0 0 14 12">
          <path d="M2 2h10M2 6h10M2 10h10" stroke-width="2px" stroke="#878156"    stroke-linecap="round" transform="translate(0,0.3)"/>
          <path d="M2 2h10M2 6h10M2 10h10" stroke-width="2px" stroke="currentColor" stroke-linecap="round"/>
        </svg>
      </div>
    </div>

      <div class="manage">
        <div class="mobile-adj-bar" id="mobile-adj-bar">
          <button type="button" class="mobile-adj-btn" id="btn-toggle-views">Reference Views <span class="adj-arrow">▾</span></button>
          <button type="button" class="mobile-adj-btn" id="btn-toggle-prefs">Preference Adjustments <span class="adj-arrow">▾</span></button>
        </div>
        <div class="customDF">
          <span>Preference Adjustments:</span>
          <div>
            <input type="number" inputmode="decimal" id="cusdf-tilt" value="`+ default_tilt +`" step="0.1"></input>
            <span>Tilt (dB/Oct)</span>
          </div>
          <div>
            <input type="number" inputmode="decimal" id="cusdf-bass" value="`+ default_bass_shelf +`" step="0.1"></input>
            <span>Bass (dB)</span>
          </div>
          <div>
            <input type="number" inputmode="decimal" id="cusdf-treb" value="`+ default_treble +`" step="0.1"></input>
            <span>Treble (dB)</span>
          </div>
          <div>
            <input type="number" inputmode="decimal" id="cusdf-ear" value="`+ default_ear +`" step="0.1"></input>
            <span>Ear Gain (dB)</span>
          </div>
          <button id="cusdf-UnTiltTHIS" style="margin-right: 10px">Remove Adjustments</button>
          <!-- <button id="cusdf-harmanfilters" style="margin-right: 10px">Harman Filters</button> -->
          <!-- <button id="cusdf-bounds">Preference Bounds</button> -->
        </div>
        <table class="manageTable">
          <colgroup>
            <col class="remove">
            <col class="phoneId">
            <col class="key">
            <col class="calibrate">
            <col class="baselineButton">
            <col class="hideButton">
            <col class="lastColumn">
          </colgroup>
          <tbody class="curves"></tbody>
        </table>
      </div>

      <div class="footer-meta-row">
        <div class="footer-ecosystem"></div>

        <div class="accessories"></div>
      </div>

      <div class="external-links"></div>
    </section>

    <section class="parts-secondary">
      <div class="controls">
        <div class="drawer-handle" id="drawer-toggle" role="button" aria-label="Toggle model drawer">
          <span class="drawer-handle-bar"></span>
          <span class="drawer-handle-text">
            <span class="drawer-state-open">▼ Minimize</span>
            <span class="drawer-state-closed">▲ Browse Models</span>
          </span>
        </div>
        <div class="select" data-selected="models">
          <div class="selector-tabs">
            <button class="brands" data-list="brands">Brands</button>
            <button class="models" data-list="models">Models</button>
            <button class="extra">Equalizer</button>
          </div>

          <div class="selector-panel">
            <input class="search" type="text" inputmode="search" placeholder="Search" onclick="this.focus();this.select()"/>

            <svg class="chevron" viewBox="0 0 12 8" preserveAspectRatio="none">
              <path d="M0 0h4c0 1.5,5 3,7 4c-2 1,-7 2.5,-7 4h-4c0 -3,4 -3,4 -4s-4 -1,-4 -4"/>
            </svg>
            <svg class="stop" viewBox="0 0 4 1">
              <path d="M4 1H0C3 1 3.2 0.8 4 0Z"/>
            </svg>

            <div class="scroll-container">
              <div class="scrollOuter" data-list="brands"><div class="scroll" id="brands"></div></div>
              <div class="scrollOuter" data-list="models"><div class="scroll" id="phones"></div></div>
            </div>
          </div>

          <div class="extra-panel" style="display: none;">
            <div class="extra-music-player">
              <button type="button" id="open-music-player" class="music-player-btn" title="Pop out standalone Music Player">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
                <span>Music Player</span>
              </button>
            </div>
            <div class="extra-upload">
              <div class="eq-title-row">
                <h4 style="margin:0">Uploading</h4>
                <button type="button" class="eq-info-btn" id="upload-info-toggle" aria-expanded="false" aria-controls="upload-info-popover" aria-label="About uploaded data and local processing">ⓘ</button>
                <div class="eq-info-popover hidden" id="upload-info-popover" role="tooltip">
                  <p><strong>Local Processing Only:</strong> Uploaded FR files, targets, and songs are processed directly in your browser—nothing is sent over the network.</p>
                  <p><strong>Non-Persistent Session:</strong> Uploaded FR curves, targets, and single-track demo audio are kept in memory only and reset on refresh.</p>
                </div>
              </div>
              <div class="extra-upload-buttons">
                <button class="upload-fr">Upload FR</button>
                <button class="upload-target">Upload Target</button>
                <button class="upload-track">Upload Song</button>
                <form style="display:none"><input type="file" id="file-fr" accept=".csv,.txt" /></form>
                <form style="display:none"><input type="file" id="file-audio" accept="audio/*" /></form>
              </div>
            </div>
            <div class="extra-demo">
              <div class="eq-demo-header">
                <h4 style="margin: 0">EQ Demo</h4>
                <select class="eq-track">
                    <option value="pink" selected>Pink Noise</option>
                    <option value="scarlet">Scarlet Fire</option>
                    <option value="tone">Tone Generator</option>
                    <option value="custom-eq-track">Uploaded</option>
                </select>
              </div>
              <div class="eq-demo">
                <span id="songTime">00:00:00</span>
                <input name="demo-time" type="range" min="0" max="100" step="1" value="0"></input>
                <div class="volume-button">
                  <div class="volume-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M6 7l8-5v20l-8-5v-10zm-6 10h4v-10h-4v10zm20.264-13.264l-1.497 1.497c1.847 1.783 2.983 4.157 2.983 6.767 0 2.61-1.135 4.984-2.983 6.766l1.498 1.498c2.305-2.153 3.735-5.055 3.735-8.264s-1.43-6.11-3.736-8.264zm-.489 8.264c0-2.084-.915-3.967-2.384-5.391l-1.503 1.503c1.011 1.049 1.637 2.401 1.637 3.888 0 1.488-.623 2.841-1.634 3.891l1.503 1.503c1.468-1.424 2.381-3.309 2.381-5.394z"/></svg>
                  </div>
                  <div class="volume-slider">
                    <input type="range" min="0" max="100" step="0.5" value="70" id="volumeRange">
                  </div>
                </div>
                <div id="play-button" style="fill: var(--accent-color-contrast) !important;">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M3 22v-20l18 10-18 10z"/></svg>
                </div>
              </div>
              <div class="settings-row hidden" name="tone-gen-range" style="margin-top:0;">
                <span name="title">Tone Generator Range</span>
                <span><input name="tone-generator-from" type="number" min="20" max="20000" step="1" value="20"></input></span>
                <span><input name="tone-generator-to" type="number" min="20" max="20000" step="1" value="20000"></input></span>
              </div>
              <div class="eq-demo hidden" name="tone-gen-slider" style="margin:2px 0 6px 0;">
                <span name="current-freq">Freq: <span class="freq-text">20</span> Hz</span>
                <input name="tone-generator-freq" type="range" min="0" max="1" step="0.0001" value="0" />
              </div>
            </div>
            <div class="extra-eq">
              <div class="eq-title-row">
                <h4 style="margin:0">Parametric Equalizer</h4>
                <button type="button" class="eq-info-btn" id="eq-info-toggle" aria-expanded="false" aria-controls="eq-info-popover" aria-label="About loudness matching and clipping protection">ⓘ</button>
                <div class="eq-info-popover hidden" id="eq-info-popover" role="tooltip">
                  <p><strong>Loudness-Matched A/B (Auto-Gain):</strong> Uses ITU-R BS.1770-4 K-weighting so <em>Bypass</em> matches perceived loudness rather than letting boosts sound better just for being louder.</p>
                  <p><strong>Transparent Clipping Protection:</strong> Only when a boost exceeds your volume headroom, both raw and EQ'd paths attenuate smoothly together—keeping A/B locked with zero limiting or volume jumping.</p>
                  <p><strong>Click-Free Switching &amp; Export:</strong> Parallel dry/wet crossfading prevents pops on Bypass. <em>Pre-amp</em> preserves worst-case peak headroom for Equalizer APO / hardware export.</p>
                </div>
              </div>
              <div class="select-eq-phone">
                <select name="phone">
                    <option value="" selected>Sandbox</option>
                </select>
              </div>
              <div class="preamp-row">
                <h4 id="preamp-disp" style="margin:0">Pre-amp: 0.0 dB · Auto-Gain: 0.0 dB</h4>
              </div>
              <div class="eq-scope-row" role="group" aria-label="EQ Channel Scope">
                <span class="eq-scope-label">EQ Scope</span>
                <div class="eq-scope-pills">
                  <button type="button" class="eq-scope-btn selected" data-scope="LR" title="Shared 8-band EQ applied to both L and R channels">L+R<span class="scope-dot" aria-hidden="true"></span></button>
                  <button type="button" class="eq-scope-btn" data-scope="L" title="Additive Left-channel 8-band EQ trim">Left<span class="scope-dot" aria-hidden="true"></span></button>
                  <button type="button" class="eq-scope-btn" data-scope="R" title="Additive Right-channel 8-band EQ trim">Right<span class="scope-dot" aria-hidden="true"></span></button>
                </div>
              </div>
              <div class="filters-header">
                <span>Type</span>
                <span>Frequency</span>
                <span>Gain</span>
                <span>Q</span>
              </div>
              <div class="filters">
                <div class="filter">
                    <span>
                      <input name="enabled" type="checkbox" checked></input>
                      <select name="type">
                        <option value="PK" selected>PK</option>
                        <option value="LSQ">LSQ</option>
                        <option value="HSQ">HSQ</option>
                      </select>
                    </span>
                    <span><input name="freq" type="number" min="20" max="20000" step="1" value="60"></input></span>
                    <span><input name="gain" type="number" min="-40" max="40" step="0.1" value="0"></input></span>
                    <span><input name="q" type="number" min="0" max="10" step="0.01" value="0.71"></input></span>
                </div>
              </div>
              <div class="filters-button">
                <span class="eqopts"><button class="add-filter" style="margin-right:7px;">+</button><button class="remove-filter">-</button></span>
                <span class="eqopts"><button class="sort-filters">Sort</button></span>
                <span class="eqopts"><button class="disable-filters">Bypass</button></span>
                <span class="eqopts"><button class="reset-filters">Reset</button></span>
                <span class="eqopts"><button class="save-filters">Save EQ</button></span>
              </div>
              <div class="eq-saved-section hidden" aria-label="Saved Custom EQ Presets">
                <div class="eq-saved-header">
                  <span>Saved Custom EQ</span>
                </div>
                <div class="eq-saved-list"></div>
              </div>
              <!-- AutoEQ UI disabled for MIRE workflow (preserved for future use)
              <h4 style="margin: 6px 0 3px 0" >AutoEQ</h4>
              <div class="settings-row" style="margin:0 0 2px 0">
                <span name="title">Frequency Range</span>
                <span><input name="autoeq-from" type="number" min="20" max="20000" step="1" value="20"></input></span>
                <span><input name="autoeq-to" type="number" min="20" max="20000" step="1" value="20000"></input></span>
              </div>
              <div class="settings-row" style="margin:0 0 2px 0">
                <span name="title">Gain Range</span>
                <span><input name="autoeq-gain-from" type="number" min="-20" max="20" step="0.5" value="-20"></input></span>
                <span><input name="autoeq-gain-to" type="number" min="-20" max="20" step="0.5" value="20"></input></span>
              </div>
              <div class="settings-row" style="margin-top:0;">
                <span name="title">Q Range</span>
                <span><input name="autoeq-q-from" type="number" min="0.1" max="10" step="0.1" value="0.1"></input></span>
                <span><input name="autoeq-q-to" type="number" min="0.1" max="10" step="0.1" value="3"></input></span>
              </div>
              <div class="settings-row smooth-row">
                <span name="title">Smoothing</span>
                <span><input name="autoeq-smooth" type="checkbox" checked></input></span>
              </div>
              <div class="auto-eq-button" style="margin-bottom:6px">              
                <button class="autoeq">AutoEQ</button>
                <button class="readme">Readme</button>
              </div>
              -->
              <h4 style="margin: 8px 0 4px 0">Graph Overlays</h4>
              <div class="overlay-controls">
                <button type="button" class="toggle-eq-overlay" title="Plot pure EQ transfer curve centered on the graph reference">EQ Curve</button>
                <div class="fft-split-btn">
                  <button type="button" class="toggle-fft selected" title="Show real-time FFT spectrum behind the main graph during playback">FFT Spectrum</button>
                  <button type="button" class="toggle-fft-drawer" aria-expanded="false" title="Configure FFT style, signal tap, and speed"><span class="fft-chevron">▾</span></button>
                </div>
                <button type="button" class="toggle-fft-peak" title="Hold peak envelope for 1 second above the FFT spectrum">Peak Hold</button>
              </div>
              <div class="fft-drawer hidden" aria-hidden="true">
                <div class="fft-mode-row" role="group" aria-label="FFT Display Style">
                  <span class="fft-mode-label">Style</span>
                  <div class="fft-mode-pills">
                    <button type="button" class="fft-style selected" data-style="bars">Bars</button>
                    <button type="button" class="fft-style" data-style="wave">Wave</button>
                  </div>
                </div>
                <div class="fft-mode-row" role="group" aria-label="FFT Signal Tap">
                  <span class="fft-mode-label">Tap</span>
                  <div class="fft-mode-pills">
                    <button type="button" class="fft-mode selected" data-mode="post">Post-EQ</button>
                    <button type="button" class="fft-mode" data-mode="pre">Pre-EQ</button>
                  </div>
                </div>
                <div class="fft-mode-row" role="group" aria-label="FFT Response Speed">
                  <span class="fft-mode-label">Speed</span>
                  <div class="fft-mode-pills">
                    <button type="button" class="fft-speed selected" data-speed="slow">Slow</button>
                    <button type="button" class="fft-speed" data-speed="fast">Fast</button>
                  </div>
                </div>
              </div>
              <h4 style="margin:0 0 3px 0">Miscellaneous</h4>
              <div class="settings-row" name="tone-gen-range" style="margin-top:0; text-align:center">
                <span name="balance-l">Left</span>
                <span name="balance-title" style="width:50%">Channel Balance</span>
                <span name="balance-r">Right</span>
              </div>
              <div class="settings-row" style="margin:3px 0 6px 0;">
                <span><input id="vol-left" name="vol-left" type="number" min="-10" max="0" step="0.1" value="0"></input></span>
                <span name="title"></span>
                <span><input id="vol-right" name="vol-right" type="number" min="-10" max="0" step="0.1" value="0"></input></span>
              </div>
              <div class="settings-row" name="tone-gen-range" style="margin:3px 0 6px 0;">
                <input name="balance-vol" type="range" min="-10" max="10" step="0.1" value="0"></input>
              </div>
              <div class="exports">
                <button class="import-filters">Import EQ</button>
                <button class="export-filters">Export Parametric EQ</button>
                <button class="export-graphic-filters">Export Graphic EQ (Wavelet)</button>
              </div>
              <a style="display: none" id="file-filters-export"></a>
              <form style="display:none"><input type="file" id="file-filters-import" accept=".txt" /></form>
            </div>
          </div>
        </div>
        <div class="sidebar-sponsor" id="sidebar-sponsor"></div>
      </div>
    </section>
    <!-- <div style="display: none;" class="extra-eq-overlay">AutoEQ is running, it could take 5~20 seconds or more.</div> -->
  </main>
`);


let pad = { l: 36, r: 14, t: 8, b: 26 };
let W0 = 800, W = W0 - pad.l - pad.r, // 750 across 3 decades = exact 250.0 units/decade
    H = W * 40 / 75,                 // Exact IEC 60263 25 dB/decade on default 40 dB span = exact 400.0 (10.0 u/dB)
    H0 = Math.round(pad.t + H + 26); // 434 SVG viewBox height
pad.b = H0 - pad.t - H;

let gr = doc.select("#fr-graph").attr("viewBox", "0 0 " + W0 + " " + H0),
    defs = gr.append("defs");


gr.append("rect").attrs({x:0, y:pad.t-8, width:W0, height:H0-22, rx:4,
                         "class":"graphBackground"});
watermark(gr);

// Hidden features activation by Konami code
let konami = false;
let konami_code = [38,38,40,40,37,39,37,39,66,65]; // up up down down left right left right b a
let konami_pos = 0;
doc.on("keydown", function() {
    if (konami) return;
    if (d3.event.keyCode == konami_code[konami_pos]) {
        konami_pos++;
        if (konami_pos == konami_code.length) {
            konami = true;
            console.log("Konami code activated");
        }
    } else {
        konami_pos = 0;
    }
});

// custom DF stuff
let boost = default_bass_shelf;
let tilt = default_tilt;
let ear = default_ear;
let treble = default_treble;

function setClicks(fn) { return function (elt) {
    elt .on("mousedown", () => d3.event.preventDefault())
        .on("click", p => fn(p,!d3.event.ctrlKey))
        .on("auxclick", p => d3.event.button===1 ? fn(p,0) : 0);
}; }

function updateDispVals() {
    let bNode = doc.select('#cusdf-bass').node();
    let tNode = doc.select('#cusdf-tilt').node();
    let eNode = doc.select('#cusdf-ear').node();
    let trNode = doc.select('#cusdf-treb').node();
    if (bNode) bNode.value = boost;
    if (tNode) tNode.value = tilt;
    if (eNode) eNode.value = ear;
    if (trNode) trNode.value = treble;
}
// `prepPrefBounds` is now declared in prefBounds.js.
var df, dfBase, updateDF;
let customTiltName = default_DF_name;

// Scales
let x = d3.scaleLog()
    .domain([20,20000])
    .range([pad.l,pad.l+W]);

let yD = [40,80], // Decibels
    yR = [pad.t+H,pad.t];
let y = d3.scaleLinear().domain(yD).range(yR);


// y axis
defs.append("filter").attr("id","blur").attr("filterUnits","userSpaceOnUse")
    .attrs({x:-W-4,y:-2,width:W+8,height:4})
    .append("feGaussianBlur").attr("in","SourceGraphic")
    .attr("stdDeviation", 0.8);

let haloFilter = defs.append("filter")
    .attr("id", "inspect-halo")
    .attrs({ x: "-20%", y: "-20%", width: "140%", height: "140%" });
haloFilter.append("feDropShadow")
    .attrs({ dx: 0, dy: 1, stdDeviation: 2, "flood-color": "black", "flood-opacity": 0.15 });
let yAxis = d3.axisLeft(y).tickSize(W).tickSizeOuter(0).tickPadding(1);
function fmtY(ya) {
    let d = y.domain(),
        r = d[1] - d[0],
        t = r<40 ? 1 : 5,
        y0= Math.ceil (d[0]/t),
        y1= Math.floor(d[1]/t),
        isMinor = t===5 ? (()=>false) : ((_,i)=>(y0+i)%5!==0);
    yAxis.tickValues(d3.range(y1-y0+1).map(i=>t*(y0+i)))(ya);
    ya.select(".domain").remove();
    ya.selectAll(".tick line")
      .attr("stroke-linecap", "round")
      .attrs((_,i) => {
          let m = isMinor(_,i);
          return {
              filter: m ? null : "url(#blur)",
              "stroke-width": m ? 0.2*(1-r/45) : 0.15*(1+45/r)
          };
      });
    let hasZero = d[0] <= 0 && d[1] >= 0;
    let midTick = Math.round((d[0] + d[1]) / 2);
    ya.selectAll(".tick text")
      .attr("fill","var(--graph-axis-text)")
      .attr("opacity", "0.95")
      .attr("text-anchor","end")
      .attr("x",-W-5)
      .attr("dy","0.32em")
      .text(v => (hasZero ? v === 0 : v === midTick) ? (v + " dB") : v)
      .filter(isMinor).attr("display","none");

    ya.selectAll("text.db-unit-label").remove();
}
let yAxisObj = gr.append("g")
    .attr("transform", "translate("+(pad.l+W)+",0)")
    .call(fmtY);


// x axis
let xvals = [2,3,4,5,6,8,10,15];
let xAxis = d3.axisBottom(x)
    .tickSize(H+3).tickSizeOuter(0)
    .tickValues(d3.merge([1,2,3].map(e=>xvals.map(m=>m*Math.pow(10,e)))).concat([250,20000]))
    .tickFormat(f => f>=1000 ? (f/1000)+"k" : f);

let tickPattern = [3,0,0,0,3,0,0,0,0,0,0,3,0,0,0,0,3,0,3,0,3,0,0,0,3],
    getTickType = i => i =  tickPattern[i],
    tickThickness = [2,4,4,9,15].map(t=>t/10);

function fmtX(xa) {
    xAxis(xa);
    (xa.selection ? xa.selection() : xa).select(".domain").remove();
    xa.selectAll(".tick line")
      .attr("y1", 0)
      .attr("y2", H)
      .attr("stroke", "var(--graph-grid-line)")
      .attr("stroke-width", (_,i) => tickThickness[getTickType(i)])
      .attr("opacity", "0.7");
    xa.selectAll(".tick text")
      .attr("fill", "var(--graph-axis-text)")
      .attr("opacity", "0.95");
    xa.selectAll(".tick text").filter((_,i) => tickPattern[i] === 0)
      .attr("font-size","92%")
      .attr("font-weight","normal");
    xa.selectAll(".tick text").filter((_,i) => tickPattern[i] != 0)
      .attr("font-size","95%")
      .attr("font-weight","bold");
    xa.select(".tick:last-of-type text")
      .attr("dx",-5)
      .text("20kHz");
    xa.select(".tick:first-of-type text")
      .attr("dx",4)
      .text("20Hz");
}
defs.append("clipPath").attr("id","x-clip")
    .append("rect").attrs({x:0, y:0, width:W0, height:H0});
let xAxisObj = gr.append("g")
    .attr("clip-path", "url(#x-clip)")
    .attr("transform", "translate(0,"+pad.t+")")
    .call(fmtX);


// Plot line
defs.selectAll().data([0,1]).join("linearGradient")
    .attrs({x1:0,y1:0, x2:1,y2:0})
    .attr("id", i=>"grad"+i)
    .selectAll().data(i=>[i,1-i]).join("stop")
    .attr("offset",(_,i)=>i)
    .attr("stop-color",j=>["black","white"][j]);
let fW = 7,  // Fade width
    fWm= 30; // Width at an interior edge
let fade = defs.append("mask")
    .attr("id", "graphFade")
    .attr("maskUnits", "userSpaceOnUse")
    .append("g").attr("transform", "translate("+pad.l+","+pad.t+")");
fade.append("rect").attrs({ x:0, y:0, width:W, height:H, fill:"white" });
let fadeEdge = fade.selectAll().data([0,1]).join("rect")
    .attrs(i=>({ x:i?W-fW:0, width:fW, y:0,height:H, fill:"url(#grad"+i+")" }));
let line = d3.line()
    .x(d=>x(d[0]))
    .y(d=>y(d[1]))
    .curve(d3.curveNatural);


// Range buttons
let selectedRange = 3; // Full range
let ranges = [[20,400],[100,4000],[1000,20000], [20,20000]],
    edgeWs = [[fW,fWm],[fWm,fWm],[fWm,fW],[fW,fW]];
let rangeSel = doc.select(".zoom").selectAll("button");
rangeSel.on("click", function (_,i) {
    let r = selectedRange,
        s = selectedRange = r===i ? 3 : i;
    rangeSel.classed("selected", (_,j)=>j===s);
    x.domain(ranges[s]);
    // More time to go between bass and treble
    let dur = Math.min(r,s)===0 && Math.max(r,s)===2 ? 1100 : 700;
    clearLabels();
    gpath.selectAll("path").transition().duration(dur).attr("d", drawLine);
    if (typeof window.transitionEQOverlay === "function") { window.transitionEQOverlay(dur); }
    let e = edgeWs[s];
    fadeEdge.transition().duration(dur).attrs(i=>({x:i?W-e[i]:0, width:e[i]}));
    xAxisObj.transition().duration(dur).call(fmtX);
});


// y-axis scaler state (drag handle UI commented out; scaling button still uses dB state)
let dB = {
    y: y(60),
    h: 15,
    H: y(60)-y(70),
    min: pad.t,
    max: pad.t+H,
    tr: _ => "translate("+(pad.l-9)+","+dB.y+")"
};
/* Y-axis drag handle UI commented out (kept for future use)
dB.all   = gr.append("g").attr("class","dBScaler").attr("opacity", "0.5");
dB.trans = dB.all.append("g").attr("transform", dB.tr());
dB.scale = dB.trans.append("g").attr("transform", "scale(1,1)");
dB.scale.selectAll().data([-1,1])
    .join("path").attr("stroke","none")
    .attr("d", function (s) {
        function getPathPart(l) {
            let v=l[0].toLowerCase()==="v";
            for (let i=2-v; i<l.length; i+=2)
                l[i] *= s;
            return l[0]+l.slice(1).join(" ");
        }
        return [ ["M", 9.9,-1   ],
                 ["V",      dB.H],
                 ["h",-1        ],
                 ["l",-1  ,-1.5 ],
                 ["l",-2.1, 2   ],
                 ["h",-5.6      ],
                 ["v",     -1.5 ],
                 ["q",7,2,8,-7  ],
                 ["V",     29   ],
                 ["c",1,-16,-10,-15,-10,-14],
                 ["V",     -1   ] ].map(getPathPart).join("");
    });
dB.scale.selectAll().data([10,7,13])
    .join("rect").attrs((d,i)=>({x:i*2.8,y:-d,width:0.8,height:2*d,fill:"#bbb"}));
function getDrag(fn) {
    return d3.drag()
        .on("drag",fn)
        .on("start",function(){dB.all.classed("active",true );})
        .on("end"  ,function(){dB.all.classed("active",false);});
}
dB.mid = dB.all.append("rect")
    .attrs({x:(pad.l-11),y:dB.y-dB.h,width:12,height:2*dB.h,opacity:0})
    .call(getDrag(function () {
        dB.y = d3.event.y;
        dB.y = Math.min(dB.y, dB.max-dB.h*(dB.H/15));
        dB.y = Math.max(dB.y, dB.min+dB.h*(dB.H/15));
        d3.select(this).attr("y",dB.y-dB.h);
        dB.trans.attr("transform", dB.tr());
        dB.updatey();
    }));
dB.circ = dB.trans.selectAll().data([-1,1]).join("circle")
    .attrs({cx:5,cy:s=>dB.H*s,r:7,opacity:0})
    .call(getDrag(function () {
        let h  = Math.max(30, Math.abs(d3.event.y));
        h = Math.min(h, Math.min(dB.max-dB.y, dB.y-dB.min));
        let sc = h/dB.H;
        dB.circ.attr("cy",s=>h*s);
        dB.scale.attr("transform", "scale(1,"+sc+")");
        dB.h = 15*sc;
        dB.mid.attrs({y:dB.y-dB.h,height:2*dB.h});
        updateBoundsScaling(h);
        dB.updatey();
    }));
*/
let yCenter = 60;
dB.updatey = function (dom) {
    let d = l => l[1]-l[0];
    y.domain(yR.map(y=>yCenter+(y-dB.y)*(15/dB.h)*d(yD)/d(yR)));
    yAxisObj.call(fmtY);
    let getTr = o => o ? "translate(0,"+(y(o)-y(0))+")" : null;
    //clearLabels();
    gpath.selectAll("path").call(redrawLine);
    if (typeof window.redrawEQOverlay === "function") { window.redrawEQOverlay(); }
    if (typeof window.refreshCalcBadge === "function") { window.refreshCalcBadge(); }
}

// y-axis scaler button
const defY = dB.y;
const scales = {
  "20db": {name:"20dB", h: 2 * dB.H, y: defY},
  "30db": {name:"30dB", h: (4 / 3) * dB.H, y: defY},
  "40db": {name:"40dB", h: dB.H, y: defY},
  "50db": {name:"50dB", h: (4 / 5) * dB.H, y: defY},
  "crin": {name:"Crin", h: dB.H * (54.77 / 76), y: defY - dB.H * (15.06 / 76)},
}

function updateBoundsScaling(h) {
    let scale = h / dB.H;
    gr.select("[id=bounds]").attr("transform", "scale(1,"+scale+")");
    gr.select("[id=bounds]").attr("transform-origin", "0 25");
}
updateBoundsScaling(dB.H);

function changeScaling(to) {
    let btn = document.querySelector("#yscalebtn")
    let s = scales[to.toLowerCase()];
    if (!s) return;
    let sc = s.h/dB.H;
    dB.h = 15*sc;
    dB.y = s.y;
    if (dB.circ) dB.circ.attr("cy",sm=>s.h*sm);
    if (dB.scale) dB.scale.attr("transform", "scale(1,"+sc+")");
    if (dB.mid) dB.mid.attrs({y:dB.y-dB.h,height:2*dB.h});
    if (dB.trans) dB.trans.attr("transform", dB.tr());
    btn.className = s.name.toLowerCase();
    btn.innerHTML = s.name;
    dB.updatey();
    updateBoundsScaling(s.h);
}

doc.select("#yscalebtn").on("click", function() {
    let keys = Object.keys(scales);
    let i = keys.indexOf(this.className);
    changeScaling(keys[(i+1)%keys.length]);
});

// Label drawing and screenshot
let getFullName = p => p.dispBrand+" "+p.dispName,
    getChannelName = p => n => getFullName(p) + " ("+n+")";

function getCurveDisplayLabel(c) {
    if (!c) return "";
    let p = c.p;
    if (!p || !p.isEQSnapshot || p.isTarget) {
        return c.id;
    }
    let baseMatchVisible = false;
    if (typeof activePhones !== "undefined" && Array.isArray(activePhones)) {
        baseMatchVisible = activePhones.some(q =>
            q && !q.hide && !q.isTarget && !q.isPrefBounds && !q.isEQSnapshot && !q.eqParent &&
            (q === p.eqParent || (p.eqBaseKey && q.brand && (q.brand.name + " " + q.dispName) === p.eqBaseKey))
        );
    }
    let chMatch = c.id ? c.id.match(/\s(\([^)]+\))$/) : null;
    let chSuffix = chMatch ? (" " + chMatch[1]) : "";
    let shortBase;
    if (p.isSandboxEQ || baseMatchVisible) {
        shortBase = p.dispName;
    } else if (p.eqBaseModel) {
        shortBase = p.eqBaseModel + " · " + p.dispName;
    } else {
        shortBase = p.dispName;
    }
    return shortBase + chSuffix;
}

let labelButton = doc.select("#label"),
    labelsShown = false;
function getLabelsLayer() {
    let layer = gr.select("g.labels-layer");
    if (layer.empty()) {
        layer = gr.append("g").attr("class", "labels-layer");
    }
    return layer;
}

function getToolsLayer() {
    let layer = gr.select("g.tools-layer");
    if (layer.empty()) {
        layer = gr.append("g").attr("class", "tools-layer");
    }
    return layer;
}

function setLabelButton(l) {
    labelButton.classed("selected", labelsShown = l);
}
function clearLabels() {
    getLabelsLayer().selectAll(".lineLabel").remove();
    setLabelButton(false);
}

function drawLabels() {
    let curves = d3.merge(
        activePhones.filter(p=>!p.hide && !p.isPrefBounds).map(p =>
            p.is90Bounds ? [{p:p, o:-1, id:p.fullName, l: p.activeCurves[0].l}]
            : p.isTarget||!p.samp||p.avg ? p.activeCurves
            : LR.map((l,i) => ({
                p:p, o:getO(i), id:getChannelName(p)(l), channel:l, chIdx:i, multi:true,
                l:(n=>p.channels.slice(i*n,(i+1)*n))(sampnums.length)
                    .filter(c=>c!==null)
              }))
        )
    );
    if (!curves.length) return;

    let bcurves = curves.slice(),
        bp = baseline.p;
    if (bp && bp.hide) {
        bcurves.push({
            p:bp, o:0,
            id:"Baseline: "+(bp.isTarget?bp.fullName:getFullName(bp))
        });
    }

    getLabelsLayer().selectAll(".lineLabel").remove();

    let targetCurves = [], modelCurves = [];
    bcurves.forEach((c, idx) => {
        if (c.isTarget || (c.p && c.p.isTarget)) {
            targetCurves.push({ curve: c, origIdx: idx });
        } else {
            modelCurves.push({ curve: c, origIdx: idx });
        }
    });

    let nModels = modelCurves.length;
    let fontSize = nModels <= 4 ? 12.5 : (nModels <= 8 ? 11 : 10);

    let g = getLabelsLayer().selectAll(".lineLabel").data(bcurves)
        .join("g").attr("class","lineLabel").attr("opacity", 0);
    let t = g.append("text")
        .attrs({x:0, y:0})
        .style("fill", c => (c.isTarget || (c.p && c.p.isTarget)) ? "var(--graph-target-text, #666666)" : getTooltipColor(c).toString())
        .style("font-size", fontSize + "px")
        .text(c => getCurveDisplayLabel(c));

    g.datum(function(){return this.getBBox();});
    g.select("text").attrs(b=>({x:3-b.x, y:3-b.y}));
    g.insert("rect", "text")
        .attrs(b=>({x:2, y:2, width:b.width+2, height:b.height+2}));

    let tr = new Array(bcurves.length);

    if (labelsPosition === "bottom-left" || labelsPosition === "bottom-right") {
        let isRight = (labelsPosition === "bottom-right");
        let startX = isRight ? 500 : 40;
        let startY = pad.t + H - 28;

        // Measure actual rendered text widths for each model label
        let labelWidths = modelCurves.map(m => {
            let node = g.nodes()[m.origIdx];
            if (!node) return 100;
            let bbox = node.getBBox();
            return (bbox && bbox.width) ? bbox.width : 100;
        });

        // Helper function for laying out a group of model curves into dynamic columns
        function layoutModelGroup(models, modelsWidths, groupStartX, basePointY, stepY, maxRows, isTopGroup) {
            let n = models.length;
            if (n === 0) return { colHeights: [0], colXPositions: [groupStartX] };

            let numCols = Math.ceil(n / maxRows);
            let colXPositions = [groupStartX];

            for (let c = 0; c < numCols; c++) {
                let startIdx = c * maxRows;
                let endIdx = Math.min(startIdx + maxRows, n);
                let maxColWidth = 0;
                for (let i = startIdx; i < endIdx; i++) {
                    if (modelsWidths[i] > maxColWidth) maxColWidth = modelsWidths[i];
                }
                if (c < numCols - 1) {
                    // Dynamic X gap: max width of current column + 14px padding (no hardcoded floor)
                    colXPositions.push(colXPositions[c] + Math.ceil(maxColWidth) + 14);
                }
            }

            let colHeights = new Array(numCols).fill(0);
            models.forEach((m, idx) => {
                let col = Math.floor(idx / maxRows);
                let row = idx % maxRows;
                let xPos = colXPositions[col] || groupStartX;
                let yPos = isTopGroup ? (basePointY + row * stepY) : (basePointY - row * stepY);
                tr[m.origIdx] = [xPos, yPos];
                if (row + 1 > colHeights[col]) colHeights[col] = row + 1;
            });

            return { colHeights, colXPositions };
        }

        // Split models into Bottom-Left (up to 8 models in 2 cols) and Top-Left whitespace (models 9+)
        let bottomModels = modelCurves.slice(0, 8);
        let topModels = modelCurves.slice(8);

        let bottomWidths = labelWidths.slice(0, 8);
        let topWidths = labelWidths.slice(8);

        let nBottom = bottomModels.length;
        let stepYBottom = nBottom <= 4 ? 20 : 16;
        let resBottom = layoutModelGroup(bottomModels, bottomWidths, startX, startY, stepYBottom, 4, false);

        // Position reference target header directly above bottom Col 0
        let targetStartY = startY - (resBottom.colHeights[0] * stepYBottom) - 2;
        targetCurves.forEach((tItem, idx) => {
            let xPos = startX;
            let yPos = targetStartY - idx * stepYBottom;
            tr[tItem.origIdx] = [xPos, yPos];
        });

        // Layout Top-Left models (models 9+, using exact same layout logic and safe 22px top margin)
        if (topModels.length > 0) {
            let topStartY = 22;
            layoutModelGroup(topModels, topWidths, startX, topStartY, 16, 4, true);
        }
    } else {
        let boxes = g.data(),
            w = boxes.map(b=>b.width +6),
            h = boxes.map(b=>b.height+6);

        let r = x.domain().map(v => d3.bisectLeft(f_values, v));
        let rsl = a => a.slice(Math.max(r[0],0), r[1]+1);
        let rf_values = rsl(f_values);
        let v = curves.map(c => {
            let o = getOffset(c.p);
            return (c.multi?c.l:[c.l])
                .map(l => rsl(baseline.fn(l).map(d=>d[1]+o)));
        });

        if (curves.length === 1) {
            let x0 = 50, y0 = 10,
                sl = range_to_slice([0,w[0]], o=>x0+o),
                e = d3.extent(d3.merge(v[0].map(sl)).map(y));
            if (y0+h[0] >= e[0]) { y0 = Math.max(y0, e[1]); }
            tr = [[x0,y0]];
        } else {
            let n = v.length;
            let invd = (sc,d) => sc.invert(d)-sc.invert(0),
                xr = x.range(),
                yd = y.domain(),
                wind = w => Math.ceil((w/(xr[1]-xr[0]))*rf_values.length),
                mw = wind(d3.min(w));
            let winReduce = (l,w,d0,fn) => {
                l = l.slice();
                for (let d=d0; d<w; ) {
                    let diff = Math.min(2*d,w) - d;
                    for (let i=0; i<l.length-diff; i++) {
                        l[i] = fn(l[i], l[i+diff]);
                    }
                    d += diff;
                }
                l.length -= w-d0;
                return l;
            };
            let rangeGetters = [Math.min, Math.max].map(f => {
                let r = c => c.reduce((a,b)=>a.map((ai,i)=>f(ai,b[i])));
                let t = v.map(c => winReduce(r(c), mw, 1, f));
                return w => t.map(c => winReduce(c, w, mw, f));
            });
            let top = 0;
            tr = v.map((_,j) => {
                let we = wind(w[j]),
                    he = -invd(y,h[j]),
                    range = d3.transpose(rangeGetters.map(r => r(we))),
                    ds;
                ds = range[j].map(function (r,ri) {
                    let le = r.length,
                        s = [[-he,0],[0,he]][ri].map(o=>r.map(d=>d+o)),
                        d = r.map(_=>1e10);
                    for (let k=0; k<n; k++) if (k!==j) {
                        let t = range[k];
                        for (let i=0; i<le; i++) {
                            d[i] = Math.min(d[i], Math.max(s[0][i]-t[1][i],
                                                           t[0][i]-s[1][i]));
                        }
                    }
                    return d;
                });
                let sep = 0, pos = null;
                ds.forEach(function (drow,k) {
                    for (let ii=0; ii<drow.length; ) {
                        let i=ii, d=drow[i],
                            rjk=range[j][k], m=rjk[i];
                        while (ii++, ii<drow.length && rjk[ii]===m) {
                            let di = drow[ii];
                            if (di<d && di<1) break;
                            d = Math.max(d,drow[ii]);
                        }
                        let clip = x => x/Math.sqrt(1+x*x);
                        d = 4*clip(d/4) + clip((ii-i)/3);
                        i = Math.floor((i+ii)/2);
                        let dl = drow.length,
                            r = i/dl;
                        d *= Math.sqrt((0.8+r)*Math.sqrt(1-r));
                        d *= clip(0.2+Math.max(0,(i>=15?drow[i-15]:0)+(i<dl-15?drow[i+15]:0)));
                        if (d>sep) {
                            let dy = range[j][k][i]+(k?he:0),
                                yd = y.domain();
                            if (yd[0]+he<=dy && dy<=yd[1]) { sep=d; pos=[i,dy]; }
                        }
                    }
                });
                return pos ? [x(rf_values[pos[0]]), y(pos[1])]
                           : [60, 20+30*top++];
            });
        }
        for (let j=curves.length; j<bcurves.length; j++) {
            tr.push([pad.l+(W-w[j])/2, pad.t+H-h[j]+2]);
        }
    }

    g.attr("transform",(_,i)=>"translate("+tr[i].join(",")+")");
    g.attr("opacity",null);
    setLabelButton(true);
}

labelButton.on("click", () => (labelsShown?clearLabels:drawLabels)());


// 4K 16:9 export & clipboard screenshot logic lives in assets/js/tool_components/export4k.js
doc.select("#download")
    .on("click", () => window.saveGraph4K && window.saveGraph4K("png"))
    .on("contextmenu", function () {
        d3.event.returnValue=false;
        let b = d3.select(this);
        let choice = b.selectAll("div")
            .data(["png","svg"]).join("div")
            .styles({position:"absolute", left:0, top:(_,i)=>i*1.3+"em",
                     background:"inherit", padding:"0.1em 1em"})
            .text(d => "As ."+d)
            .on("click", function (d) {
                if (window.saveGraph4K) window.saveGraph4K(d);
                choice.remove();
                d3.event.stopPropagation();
            });
        b.on("blur", ()=>choice.remove());
    });

// Smoothing math lives in assets/js/smoothing.js.

/* Smooth input listener commented out (kept for future use)
doc.select("#smooth-level").on("change input", function () {
    if (!this.checkValidity()) return;
    smooth_level = +this.value;
    smooth_param = undefined;
    line.curve(smooth_level ? d3.curveNatural : d3.curveCardinal.tension(0.5));
    activePhones.forEach(smoothPhone);
    updatePaths();
});
*/


// ISO 226 loudness normalization math lives in assets/js/normalization.js.

// File loading and channel management
var LR = typeof default_channels !== "undefined" ? default_channels
                                                 : ["L","R"];
let getO = i => LR.length>1 ? -1+i*2/(LR.length-1) : 0;
const sampnums = typeof num_samples !== "undefined" ? d3.range(1,num_samples+1)
                                                    : [""];

const CUSTOM_VIEWS_STORAGE_KEY = "mirelink_custom_views_v1";
let savedCustomViews = [];
let customViewCounter = 1;
let activeCustomViewId = null;

function roundPresetVal(v) {
    let n = Number(v);
    if (!Number.isFinite(n)) return 0;
    return Math.round(n * 1000) / 1000;
}

function samePresetParams(a, b) {
    if (!a || !b) return false;
    return Math.abs((+a.tilt || 0) - (+b.tilt || 0)) < 1e-6 &&
           Math.abs((+a.boost || 0) - (+b.boost || 0)) < 1e-6 &&
           Math.abs((+a.ear || 0) - (+b.ear || 0)) < 1e-6 &&
           Math.abs((+a.treble || 0) - (+b.treble || 0)) < 1e-6;
}

function isPresetDFParams(p) {
    let cur = p || { boost, tilt, ear, treble };
    return Math.abs(+cur.tilt || 0) < 1e-6 &&
           Math.abs(+cur.boost || 0) < 1e-6 &&
           Math.abs(+cur.ear || 0) < 1e-6 &&
           Math.abs(+cur.treble || 0) < 1e-6;
}

function isPresetTilt10Params(p) {
    let cur = p || { boost, tilt, ear, treble };
    return Math.abs((+cur.tilt || 0) - (-1)) < 1e-6 &&
           Math.abs(+cur.boost || 0) < 1e-6 &&
           Math.abs(+cur.ear || 0) < 1e-6 &&
           Math.abs(+cur.treble || 0) < 1e-6;
}

function syncCustomCounterFloor() {
    let minNext = 1;
    savedCustomViews.forEach(cv => {
        let m = String(cv.name || "").match(/^CUSTOM\s+(\d+)$/i);
        if (m) {
            let n = parseInt(m[1], 10);
            if (Number.isFinite(n) && n >= minNext) minNext = n + 1;
        }
    });
    if (customViewCounter < minNext) {
        customViewCounter = minNext;
    }
}

function loadCustomViewsState() {
    try {
        let raw = window.localStorage ? window.localStorage.getItem(CUSTOM_VIEWS_STORAGE_KEY) : null;
        if (!raw) return;
        let parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.views)) {
            savedCustomViews = parsed.views
                .filter(cv => cv && typeof cv.name === "string")
                .map((cv, idx) => ({
                    id: cv.id || (Date.now() + idx),
                    name: String(cv.name).trim() || ("CUSTOM " + (idx + 1)),
                    tilt: roundPresetVal(cv.tilt),
                    boost: roundPresetVal(cv.boost),
                    ear: roundPresetVal(cv.ear),
                    treble: roundPresetVal(cv.treble)
                }));
        }
        if (parsed && Number.isFinite(Number(parsed.counter))) {
            customViewCounter = Math.max(1, Math.floor(Number(parsed.counter)));
        }
    } catch (_) {}
    syncCustomCounterFloor();
}

function saveCustomViewsState() {
    syncCustomCounterFloor();
    try {
        if (window.localStorage) {
            window.localStorage.setItem(CUSTOM_VIEWS_STORAGE_KEY, JSON.stringify({
                counter: customViewCounter,
                views: savedCustomViews
            }));
        }
    } catch (_) {}
}

function getNextCustomName() {
    syncCustomCounterFloor();
    return "CUSTOM " + customViewCounter;
}

function resolveCurrentCustomState() {
    let current = {
        tilt: roundPresetVal(tilt),
        boost: roundPresetVal(boost),
        ear: roundPresetVal(ear),
        treble: roundPresetVal(treble)
    };
    let isPresetDF = isPresetDFParams(current);
    let isPresetTilt10 = isPresetTilt10Params(current);

    let activeSaved = activeCustomViewId !== null
        ? (savedCustomViews.find(cv => cv.id === activeCustomViewId) || null)
        : null;

    // Clear stale activeCustomViewId immediately if adjustments drifted away
    if (activeSaved && !samePresetParams(activeSaved, current)) {
        activeCustomViewId = null;
        activeSaved = null;
    }

    let matchingSaved = activeSaved || (!isPresetDF && !isPresetTilt10
        ? (savedCustomViews.find(cv => samePresetParams(cv, current)) || null)
        : null);

    if (matchingSaved && !isPresetDF && !isPresetTilt10) {
        activeCustomViewId = matchingSaved.id;
    } else if (isPresetDF || isPresetTilt10) {
        activeCustomViewId = null;
        matchingSaved = null;
    }

    let isLiveCustom = !isPresetDF && !isPresetTilt10 && !matchingSaved;
    return {
        current: current,
        isPresetDF: isPresetDF,
        isPresetTilt10: isPresetTilt10,
        matchingSaved: matchingSaved,
        isLiveCustom: isLiveCustom
    };
}

loadCustomViewsState();

function renderTargetsUI() {
    let targetsContainer = doc.select(".targets");
    if (targetsContainer.empty()) return;
    if (!window.brandTarget) return;

    let state = resolveCurrentCustomState();
    let liveCustomDefaultName = getNextCustomName();

    // Helper for in-place renaming of a custom view
    function startRename(labelSpan, currentName, onSave, onCancel) {
        let input = document.createElement("input");
        input.type = "text";
        input.value = currentName;
        input.style.width = Math.max(65, currentName.length * 8.5) + "px";
        input.style.fontSize = "12px";
        input.style.fontWeight = "600";
        input.style.padding = "1px 4px";
        input.style.background = "var(--background-color)";
        input.style.color = "var(--font-color-primary)";
        input.style.border = "1px solid var(--accent-color)";
        input.style.borderRadius = "3px";
        input.style.outline = "none";
        input.style.margin = "0";

        labelSpan.innerHTML = "";
        labelSpan.appendChild(input);
        input.focus();
        input.select();

        let finished = false;
        function commit() {
            if (finished) return;
            finished = true;
            let val = input.value.trim();
            onSave(val || currentName);
        }

        input.addEventListener("keydown", function(e) {
            if (e.key === "Enter") {
                e.preventDefault();
                commit();
            } else if (e.key === "Escape") {
                e.preventDefault();
                finished = true;
                if (typeof onCancel === "function") onCancel();
                else renderTargetsUI();
            }
        });
        input.addEventListener("blur", function() {
            commit();
        });
        input.addEventListener("click", function(e) {
            e.stopPropagation();
        });
        input.addEventListener("dblclick", function(e) {
            e.stopPropagation();
        });
    }

    // One-time migration from initial static targets markup into structured ref-view-group
    if (targetsContainer.select("div.ref-view-group").empty()) {
        targetsContainer.html("");
    }

    let refContainer = targetsContainer.selectAll("div.targetClass.ref-view-group")
        .data([1])
        .join(enter => {
            let rc = enter.append("div").attr("class", "targetClass ref-view-group");
            rc.append("div").attr("class", "targetLabel").append("span").text("Reference View");
            return rc;
        });

    // 1. Built-in presets (keyed join preserves DOM nodes)
    let refFiles = ["Fc-Construct DF-HRTF", "10 dB downwards tilt"];
    let defaultPills = refContainer.selectAll("div.target.custom-default-pill")
        .data(refFiles, d => d)
        .join(enter => enter.append("div")
            .attr("class", "target custom-default-pill")
            .text(d => d)
            .on("click", function(name) {
                activeCustomViewId = null;
                if (name === "Fc-Construct DF-HRTF") {
                    tilt = 0; boost = 0; ear = 0; treble = 0;
                } else if (name === "10 dB downwards tilt") {
                    tilt = -1; boost = 0; ear = 0; treble = 0;
                }
                updateDispVals();
                updateDF(boost, tilt, ear, treble);
                if (typeof window.trackTargetSelected === "function") {
                    window.trackTargetSelected(name, "preset");
                }
            }))
        .order();

    defaultPills.classed("active", name => {
        if (name === "Fc-Construct DF-HRTF") return state.isPresetDF && !state.isLiveCustom && activeCustomViewId === null;
        if (name === "10 dB downwards tilt") return state.isPresetTilt10 && !state.isLiveCustom && activeCustomViewId === null;
        return false;
    });

    // 2. Saved CUSTOM presets (keyed by cv.id so click never destroys DOM nodes before dblclick)
    let savedPills = refContainer.selectAll("div.target.custom-saved-pill")
        .data(savedCustomViews, d => d.id)
        .join(enter => {
            let pill = enter.append("div")
                .attr("class", "target custom-saved-pill")
                .attr("title", "Click to select, double-click to rename");

            pill.append("span")
                .attr("class", "cv-label")
                .style("cursor", "pointer");

            pill.append("span")
                .attr("class", "cv-delete")
                .text("×")
                .style("cursor", "pointer")
                .style("opacity", "0.7")
                .style("font-size", "14px")
                .style("line-height", "1")
                .style("margin-left", "6px")
                .on("click", function() {
                    d3.event.stopPropagation();
                    let cv = d3.select(this.parentNode).datum();
                    if (!cv) return;
                    let curState = resolveCurrentCustomState();
                    let wasActive = (activeCustomViewId === cv.id) || (curState.matchingSaved && curState.matchingSaved.id === cv.id);

                    savedCustomViews = savedCustomViews.filter(v => v.id !== cv.id);
                    if (activeCustomViewId === cv.id) {
                        activeCustomViewId = null;
                    }
                    saveCustomViewsState();

                    // Only reset to default when deleting the currently active custom view
                    if (wasActive) {
                        activeCustomViewId = null;
                        tilt = -1;
                        boost = 0;
                        ear = 0;
                        treble = 0;
                        updateDispVals();
                        updateDF(boost, tilt, ear, treble);
                    } else {
                        renderTargetsUI();
                    }
                });

            pill.on("click", function() {
                let d3Pill = d3.select(this);
                if (d3Pill.classed("is-renaming")) return;
                let cv = d3Pill.datum();
                if (!cv) return;
                activeCustomViewId = cv.id;
                tilt = cv.tilt;
                boost = cv.boost;
                ear = cv.ear;
                treble = cv.treble;
                updateDispVals();
                updateDF(boost, tilt, ear, treble);
                if (typeof window.trackTargetSelected === "function") {
                    window.trackTargetSelected(cv.name || "CUSTOM", "saved_custom");
                }
            });

            pill.on("dblclick", function() {
                d3.event.stopPropagation();
                d3.event.preventDefault();
                let d3Pill = d3.select(this);
                if (d3Pill.classed("is-renaming")) return;
                let cv = d3Pill.datum();
                if (!cv) return;
                d3Pill.classed("is-renaming", true);
                let labelSpan = d3Pill.select("span.cv-label");
                startRename(labelSpan.node(), cv.name, function(newName) {
                    d3Pill.classed("is-renaming", false);
                    cv.name = newName;
                    saveCustomViewsState();
                    let curState = resolveCurrentCustomState();
                    if (activeCustomViewId === cv.id || (curState.matchingSaved && curState.matchingSaved.id === cv.id)) {
                        updateDF(boost, tilt, ear, treble);
                    } else {
                        renderTargetsUI();
                    }
                }, function() {
                    d3Pill.classed("is-renaming", false);
                    renderTargetsUI();
                });
            });

            return pill;
        })
        .order();

    savedPills.classed("active", cv =>
        (state.matchingSaved && state.matchingSaved.id === cv.id) || (activeCustomViewId === cv.id && !state.isLiveCustom)
    );
    savedPills.each(function(cv) {
        let d3Pill = d3.select(this);
        if (!d3Pill.classed("is-renaming")) {
            d3Pill.select("span.cv-label").text(cv.name);
        }
        d3Pill.select("span.cv-delete").attr("title", "Delete " + cv.name);
    });

    // 3. Live uncommitted CUSTOM view with + button
    function commitLiveCustomView(chosenName) {
        let cur = {
            tilt: roundPresetVal(tilt),
            boost: roundPresetVal(boost),
            ear: roundPresetVal(ear),
            treble: roundPresetVal(treble)
        };
        let newCv = {
            id: Date.now(),
            name: chosenName || getNextCustomName(),
            tilt: cur.tilt,
            boost: cur.boost,
            ear: cur.ear,
            treble: cur.treble
        };
        customViewCounter += 1;
        savedCustomViews.push(newCv);
        activeCustomViewId = newCv.id;
        saveCustomViewsState();
        updateDF(boost, tilt, ear, treble);
        if (typeof window.trackTargetSelected === "function") {
            window.trackTargetSelected(newCv.name || "CUSTOM", "saved_custom");
        }
    }

    let livePills = refContainer.selectAll("div.target.custom-live-pill")
        .data(state.isLiveCustom ? [liveCustomDefaultName] : [])
        .join(enter => {
            let liveWrapper = enter.append("div")
                .attr("class", "target active custom-live-pill")
                .attr("title", "Double-click to rename, click + to save");

            liveWrapper.append("span")
                .attr("class", "cv-live-label")
                .style("cursor", "pointer");

            liveWrapper.on("dblclick", function() {
                d3.event.stopPropagation();
                d3.event.preventDefault();
                let d3Wrap = d3.select(this);
                if (d3Wrap.classed("is-renaming")) return;
                d3Wrap.classed("is-renaming", true);
                let liveName = getNextCustomName();
                startRename(d3Wrap.select("span.cv-live-label").node(), liveName, function(newName) {
                    d3Wrap.classed("is-renaming", false);
                    commitLiveCustomView(newName);
                }, function() {
                    d3Wrap.classed("is-renaming", false);
                    renderTargetsUI();
                });
            });

            liveWrapper.append("button")
                .attr("class", "cv-save-plus")
                .text("+")
                .style("cursor", "pointer")
                .style("background", "var(--background-color)")
                .style("color", "var(--font-color-primary)")
                .style("border", "1px solid var(--background-color-contrast-more)")
                .style("border-radius", "3px")
                .style("margin-left", "6px")
                .style("padding", "0 5px")
                .style("height", "18px")
                .style("font-weight", "bold")
                .style("font-size", "11px")
                .style("line-height", "16px")
                .style("display", "inline-flex")
                .style("align-items", "center")
                .style("justify-content", "center")
                .on("click", function() {
                    d3.event.stopPropagation();
                    commitLiveCustomView(getNextCustomName());
                });

            return liveWrapper;
        })
        .order();

    livePills.each(function(name) {
        let d3Wrap = d3.select(this);
        if (!d3Wrap.classed("is-renaming")) {
            d3Wrap.select("span.cv-live-label").text(name);
        }
        d3Wrap.select("button.cv-save-plus").attr("title", "Save as " + name);
    });
}
// Global in-memory text & parsed data cache for 0ms re-fetches
const rawFileCache = new Map();
const parsedResultCache = new Map();
const inFlightLoads = new Map();
const fileInventoryMap = new Map();

function fetchTextCached(path) {
    if (rawFileCache.has(path)) {
        return Promise.resolve(rawFileCache.get(path));
    }
    return d3.text(path).then(txt => {
        rawFileCache.set(path, txt);
        return txt;
    }).catch(() => {
        rawFileCache.set(path, null);
        return null;
    });
}

// Helper to stem channel symbol and seating number from filename stem
function matchChannelSeating(relPath, channelSymbol) {
    let fname = relPath.split("/").pop();
    let stem = fname.endsWith(".txt") ? fname.slice(0, -4).strip ? fname.slice(0, -4).strip() : fname.slice(0, -4).trim() : fname;
    let re = new RegExp("\\s+" + channelSymbol + "\\s*(\\d*)$", "i");
    let match = stem.match(re);
    if (match) {
        let seatingNum = match[1] ? parseInt(match[1], 10) : 1;
        let label = channelSymbol + (match[1] ? match[1] : "");
        return { seatingNum: seatingNum, label: label };
    }
    return null;
}

// Quiet background prefetching of ALL models and variants during browser idle time
function startBackgroundPrefetching() {
    if (!window.allPhones || !window.allPhones.length) return;

    // Collect all unique variant prefixes across all phone entries
    let targetsToFetch = [];
    window.allPhones.forEach(p => {
        let fList = p.fileNames || [p.fileName];
        if (!Array.isArray(fList)) fList = [fList];
        fList.forEach(fn => {
            if (fn && !targetsToFetch.some(item => item.fileName === fn)) {
                targetsToFetch.push({
                    fileName: fn,
                    dispName: p.dispName,
                    isTarget: false
                });
            }
        });
    });

    let index = 0;

    function fetchNext() {
        if (index >= targetsToFetch.length) return;

        let p = targetsToFetch[index++];
        if (!p || parsedResultCache.has(p.fileName) || inFlightLoads.has(p.fileName)) {
            scheduleNext();
            return;
        }

        loadFiles(p).then(() => {
            scheduleNext();
        }).catch(() => {
            scheduleNext();
        });
    }

    function scheduleNext() {
        if (index >= targetsToFetch.length) return;
        if ('requestIdleCallback' in window) {
            requestIdleCallback(() => fetchNext(), { timeout: 3000 });
        } else {
            setTimeout(fetchNext, 80);
        }
    }

    // Delay initial prefetch start by 2 seconds after page load
    setTimeout(scheduleNext, 2000);
}

function loadFiles(p, callback) {
    if (!callback) callback = () => {};

    let parseValid = function (txt) {
        if (!txt || typeof txt !== "string" || txt.trim().startsWith("<")) return null;
        let data = tsvParse(txt);
        if (data && data.length > 5) {
            let lines = txt.split(String.fromCharCode(10));
            let smLine = lines.find(function (l) { return l.toLowerCase().indexOf("smoothing:") !== -1; });
            let smText = smLine ? smLine.split(":")[1].trim() : "Unknown";
            data.smoothingInfo = smText;
            data.isStandard16 = smText.indexOf("1/6") !== -1;
            return data;
        }
        return null;
    };

    let getParsedFile = f => fetchTextCached(f.endsWith(".txt") ? f : f + ".txt").then(parseValid);

    // Target loading
    if (p.isTarget) {
        if (parsedResultCache.has(p.fileName)) {
            let cachedTarget = parsedResultCache.get(p.fileName);
            callback(cachedTarget);
            return Promise.resolve(cachedTarget);
        }
        let targetPromise = getParsedFile(DIR + "targets/" + p.fileName).then(function (data) {
            if (!data) {
                return getParsedFile(DIR + p.fileName);
            }
            return data;
        }).then(function (data) {
            if (!data) {
                console.warn("Target file not found: " + p.dispName);
                callback(null);
                return null;
            } else {
                let ch = [Equalizer.interp(f_values, data)];
                parsedResultCache.set(p.fileName, ch);
                callback(ch);
                return ch;
            }
        });
        return targetPromise;
    }

    // Check if result is already in memory cache
    if (parsedResultCache.has(p.fileName)) {
        let cached = parsedResultCache.get(p.fileName);
        p.sampleLabels = cached.sampleLabels;
        p.sampleSeatings = cached.sampleSeatings;
        p.nonStandardSmoothing = cached.nonStandardSmoothing;
        callback(cached.channels);
        return Promise.resolve(cached.channels);
    }

    // Deduplicate in-flight requests for the same prefix
    if (inFlightLoads.has(p.fileName)) {
        let loadPromise = inFlightLoads.get(p.fileName);
        loadPromise.then(channels => {
            if (channels) {
                let cached = parsedResultCache.get(p.fileName);
                if (cached) {
                    p.sampleLabels = cached.sampleLabels;
                    p.sampleSeatings = cached.sampleSeatings;
                    p.nonStandardSmoothing = cached.nonStandardSmoothing;
                }
            }
            callback(channels);
        });
        return loadPromise;
    }

    let loadPromise = new Promise((resolve) => {
        let knownFiles = fileInventoryMap.get(p.fileName);

        if (knownFiles && knownFiles.length > 0) {
            // Direct Inventory Fetch: ZERO 404 Probing!
            let filePromises = knownFiles.map(relPath => {
                return fetchTextCached(DIR + relPath).then(parseValid).then(data => ({
                    relPath: relPath,
                    data: data
                }));
            });

            Promise.all(filePromises).then(results => {
                let validResults = results.filter(r => r.data !== null);
                if (validResults.length === 0) {
                    callback(null);
                    resolve(null);
                    return;
                }

                let perChannel = [];
                LR.forEach((s, chIdx) => {
                    let chSamples = [];
                    validResults.forEach(r => {
                        let match = matchChannelSeating(r.relPath, s);
                        if (match) {
                            chSamples.push({
                                label: match.label,
                                seatingNum: match.seatingNum,
                                data: r.data
                            });
                        }
                    });
                    chSamples.sort((a, b) => a.seatingNum - b.seatingNum);
                    perChannel.push(chSamples);
                });

                let maxCount = Math.max(...perChannel.map(c => c.length), 1);
                let channels = [];
                let labels = [];
                let seatings = [];

                perChannel.forEach((samples, chIdx) => {
                    let s = LR[chIdx];
                    for (let i = 0; i < maxCount; i++) {
                        if (i < samples.length) {
                            channels.push(Equalizer.interp(f_values, samples[i].data));
                            labels.push(samples[i].label);
                            seatings.push(samples[i].seatingNum);
                        } else if (samples.length > 0) {
                            channels.push(null);
                            labels.push(s + (i + 1));
                            seatings.push(null);
                        } else {
                            channels.push(null);
                            labels.push(s);
                            seatings.push(null);
                        }
                    }
                });

                p.sampleLabels = labels;
                p.sampleSeatings = seatings;

                let nonStandardSmooth = [];
                validResults.forEach(r => {
                    if (r.data && r.data.smoothingInfo && !r.data.isStandard16) {
                        nonStandardSmooth.push(r.data.smoothingInfo);
                    }
                });
                p.nonStandardSmoothing = nonStandardSmooth.length ? nonStandardSmooth[0] : null;

                parsedResultCache.set(p.fileName, {
                    channels: channels,
                    sampleLabels: labels,
                    sampleSeatings: seatings,
                    nonStandardSmoothing: p.nonStandardSmoothing
                });

                callback(channels);
                resolve(channels);
            });
        } else if (!p.isTarget && fileInventoryMap.size > 0) {
            console.warn("Headphone file not found in file_inventory.json: " + p.dispName);
            callback(null);
            resolve(null);
            return;
        } else {
            // Fallback probe only when file_inventory.json did not load
            const maxSeatings = 10;
            let probes = [];
            LR.forEach(s => {
                probes.push(getParsedFile(DIR + p.fileName + " " + s));
                for (let i = 1; i <= maxSeatings; i++) {
                    probes.push(
                        getParsedFile(DIR + p.fileName + " " + s + i).then(function (data) {
                            if (data !== null) return data;
                            return getParsedFile(DIR + p.fileName + " " + s + " " + i);
                        })
                    );
                }
            });

            Promise.all(probes).then(function (frs) {
                let stride = 1 + maxSeatings;
                let perChannel = [];
                let total = 0;
                LR.forEach((s, idx) => {
                    let offset = idx * stride;
                    let unnum = frs[offset];
                    let numbered = [];
                    for (let i = 1; i <= maxSeatings; i++) {
                        let data = frs[offset + i];
                        if (data !== null) {
                            numbered.push({ label: s + i, seatingNum: i, data: data });
                        }
                    }
                    if (numbered.length > 0) {
                        perChannel.push(numbered);
                        total += numbered.length;
                    } else if (unnum !== null) {
                        perChannel.push([{ label: s, seatingNum: 1, data: unnum }]);
                        total += 1;
                    } else {
                        perChannel.push([]);
                    }
                });

                if (!total) {
                    console.warn("Headphone file not found: " + p.dispName);
                    callback(null);
                    resolve(null);
                    return;
                }

                let maxCount = Math.max(...perChannel.map(c => c.length));
                let channels = [];
                let labels = [];
                let seatings = [];
                perChannel.forEach((samples, idx) => {
                    let s = LR[idx];
                    for (let i = 0; i < maxCount; i++) {
                        if (i < samples.length) {
                            channels.push(Equalizer.interp(f_values, samples[i].data));
                            labels.push(samples[i].label);
                            seatings.push(samples[i].seatingNum);
                        } else if (samples.length > 0) {
                            channels.push(null);
                            labels.push(s + (i + 1));
                            seatings.push(null);
                        } else {
                            channels.push(null);
                            labels.push(s);
                            seatings.push(null);
                        }
                    }
                });

                p.sampleLabels = labels;
                p.sampleSeatings = seatings;

                let nonStandardSmooth = [];
                perChannel.forEach(samples => {
                    samples.forEach(s => {
                        if (s.data && s.data.smoothingInfo && !s.data.isStandard16) {
                            nonStandardSmooth.push(s.data.smoothingInfo);
                        }
                    });
                });
                p.nonStandardSmoothing = nonStandardSmooth.length ? nonStandardSmooth[0] : null;

                parsedResultCache.set(p.fileName, {
                    channels: channels,
                    sampleLabels: labels,
                    sampleSeatings: seatings,
                    nonStandardSmoothing: p.nonStandardSmoothing
                });

                callback(channels);
                resolve(channels);
            });
        }
    }).finally(() => {
        inFlightLoads.delete(p.fileName);
    });

    inFlightLoads.set(p.fileName, loadPromise);
    return loadPromise;
}
let validChannels = p => p.channels.filter(c=>c!==null);
let numChannels = p => d3.sum(p.channels, c=>c!==null);
let notMultichannel = LR.length===1 ? p=>true : p=>p.isTarget;
let hasChannelSel = p => !notMultichannel(p) && numChannels(p)>1;
let keyExt = LR.length===1 ? 16 : 0;
let keyLeft= keyExt ? 0 : sampnums.length>1 ? 11 : 0;
if (keyLeft) d3.select(".key").style("width","17%")

function avgCurves(curves) {
    return curves
        .map(c=>c.map(d=>Math.pow(10,d[1]/20)))
        .reduce((as,bs) => as.map((a,i) => a+bs[i]))
        .map((x,i) => [curves[0][i][0], 20*Math.log10(x/curves.length)]);
}
function avgCurvesArithmetic(curves) {
    return curves[0].map((_, i) => {
        const sum = curves.reduce((acc, curve) => acc + curve[i][1], 0);
        return [curves[0][i][0], sum / curves.length];
    });
}
function getAvg(p) {
    if (p.avg) return p.activeCurves[0].l;
    let v = validChannels(p);
    return v.length===1 ? v[0] : avgCurves(v);
}
function getAvgArithmetic(p) {
    if (p.avg) return p.activeCurves[0].l;
    let v = validChannels(p);
    return v.length===1 ? v[0] : avgCurvesArithmetic(v);
}
// Channel imbalance detector disabled for MIRE: fixed to average all L vs. all R seatings
// (instead of upstream p.channels[0] vs p.channels[1], which compared L1 vs L2), then
// commented out because natural human-ear/fit L/R asymmetry triggers arbitrary false positives.
/*
function hasImbalance(p) {
    if (notMultichannel(p) || !p || !p.channels || p.channels.length < 2) return false;
    let n = Math.floor(p.channels.length / LR.length);
    if (n < 1) n = 1;
    let leftChannels = p.channels.slice(0, n).filter(c => c !== null);
    let rightChannels = p.channels.slice(n, 2 * n).filter(c => c !== null);
    if (!leftChannels.length || !rightChannels.length) return false;
    let as = leftChannels.length === 1 ? leftChannels[0] : avgCurves(leftChannels);
    let bs = rightChannels.length === 1 ? rightChannels[0] : avgCurves(rightChannels);
    let s0 = 0, s1 = 0;
    return as.some((a, i) => {
        if (!bs[i]) return false;
        let d = a[1] - bs[i][1];
        d *= 1 / (50 * Math.sqrt(1 + Math.pow(a[0] / 1e4, 6)));
        s0 = Math.max(s0 + d, 0);
        s1 = Math.max(s1 - d, 0);
        return Math.max(s0, s1) > max_channel_imbalance;
    });
}
*/

var activePhones = [];
let baseline0 = { p:null, l:null, fn:l=>l },
    baseline = baseline0;

let gpath = gr.insert("g",".dBScaler, g.labels-layer, g.tools-layer")
    .attr("fill","none")
    .attr("stroke-width",2.1)
    .attr("class", "curves-g")
    .attr("mask","url(#graphFade)");
let eqOverlayLayer = gr.insert("g", ".dBScaler, g.labels-layer, g.tools-layer")
    .attr("class", "eq-overlay-layer")
    .attr("mask", "url(#graphFade)")
    .style("pointer-events", "none");
function hl(p, h) {
    if (typeof h === "function") {
        gpath.selectAll("path").filter(c => c.p === p).classed("highlight", c => !!h(c));
    } else {
        gpath.selectAll("path").filter(c => c.p === p).classed("highlight", !!h);
    }
}
let table = doc.select(".curves");

// Color helpers live in assets/js/color.js (getCurveColor, getDivColor,
// getTooltipColor, phoneNumber/nextPN counters, etc.).
// Phone-table UI (setPhoneTr, channelbox_x/_tr, toggleHide, colorBar,
// updatePhoneTable, updateChannels, handleComp, addKey, updateKey, addModel,
// updateVariant, changeVariant, showVariant, addColorPicker, makeColorPicker,
// hclToHex, createPopupMenu, cpCircles, colorPhones) lives in
// assets/js/phoneTable.js.

function getChannelSamples(p, chKey) {
    if (!p || !p.channels || !p.channels.length) return [];
    let n = Math.floor(p.channels.length / LR.length);
    if (n < 1) n = 1;
    let start = chKey === "R" ? n : 0;
    let end = chKey === "R" ? Math.min(2 * n, p.channels.length) : Math.min(n, p.channels.length);
    let samples = [];
    for (let idx = start; idx < end; idx++) {
        let c = p.channels[idx];
        if (c !== null && c !== undefined) {
            let fallbackSeat = (idx - start) + 1;
            let seatNum = (p.sampleSeatings && p.sampleSeatings[idx] != null) ? p.sampleSeatings[idx] : fallbackSeat;
            let label = (p.sampleLabels && p.sampleLabels[idx]) ? p.sampleLabels[idx] : (chKey + seatNum);
            samples.push({ idx: idx, slot: idx - start, seatNum: seatNum, label: label, curve: c });
        }
    }
    return samples;
}

function getAvailableChannelInfo(p) {
    let left = getChannelSamples(p, "L");
    let right = getChannelSamples(p, "R");
    let hasL = left.length > 0;
    let hasR = right.length > 0;
    let hasLR = hasL && hasR;
    let soloChannel = (hasL && !hasR) ? "L" : (!hasL && hasR) ? "R" : null;
    let soloSamples = soloChannel === "L" ? left : (soloChannel === "R" ? right : []);
    let soloSeating = soloSamples.length === 1 ? soloSamples[0].seatNum : null;
    return {
        hasL: hasL,
        hasR: hasR,
        hasLR: hasLR,
        left: left,
        right: right,
        soloChannel: soloChannel,
        soloSeating: soloSeating
    };
}

function isChannelAvailable(p, chKey) {
    let info = getAvailableChannelInfo(p);
    if (chKey === "L") return info.hasL;
    if (chKey === "R") return info.hasR;
    if (chKey === "LR") return info.hasLR;
    return false;
}

function setCurves(p, avg, lr, samp, seating) {
    if (p.is90Bounds) avg = false;
    let n = Math.floor((p.channels ? p.channels.length : 0) / LR.length);
    if (n < 1) n = 1;

    let avail = p.isTarget ? { hasL: true, hasR: false, hasLR: false, left: [], right: [] } : getAvailableChannelInfo(p);

    // Initialize or migrate p.channelState if missing
    if (!p.channelState) {
        let isSoloRight = (lr === 1);
        let isSoloLeft = (lr === 0);
        let isBothAvg = (avg === true || p.avg === true);
        let initSeat = p.seating || "avg";
        p.channelState = {
            L: { visible: !isSoloRight && !isBothAvg, seating: initSeat },
            R: { visible: !isSoloLeft && !isBothAvg, seating: initSeat },
            LR: { visible: isBothAvg, seating: initSeat }
        };
    } else {
        // Handle explicit legacy parameter calls (e.g. from showPhone, removePhone, #avg-all)
        if (lr !== undefined) {
            if (lr === 0) {
                p.channelState.L.visible = true;
                p.channelState.R.visible = false;
                p.channelState.LR.visible = false;
            } else if (lr === 1) {
                p.channelState.L.visible = false;
                p.channelState.R.visible = true;
                p.channelState.LR.visible = false;
            } else if (lr === null) {
                p.channelState.L.visible = true;
                p.channelState.R.visible = true;
                p.channelState.LR.visible = false;
            }
        } else if (avg !== undefined) {
            if (avg) {
                p.channelState.L.visible = false;
                p.channelState.R.visible = false;
                p.channelState.LR.visible = true;
            } else if (!p.channelState.L.visible && !p.channelState.R.visible) {
                p.channelState.L.visible = true;
                p.channelState.R.visible = true;
                p.channelState.LR.visible = false;
            }
        }
        if (seating !== undefined) {
            p.channelState.L.seating = seating;
            p.channelState.R.seating = seating;
            p.channelState.LR.seating = seating;
        } else if (samp !== undefined) {
            let sMode = samp ? "all" : "avg";
            p.channelState.L.seating = sMode;
            p.channelState.R.seating = sMode;
            p.channelState.LR.seating = sMode;
        }
    }

    // Clamp unavailable channels and fall back gracefully so single-channel curves never render blank
    if (!p.isTarget && p.channels) {
        if (!avail.hasL) p.channelState.L.visible = false;
        if (!avail.hasR) p.channelState.R.visible = false;
        if (!avail.hasLR) p.channelState.LR.visible = false;

        // If the active visibility points only to missing channel(s), reveal whichever channel exists
        if (!p.channelState.L.visible && !p.channelState.R.visible && !p.channelState.LR.visible) {
            if (avail.hasR && !avail.hasL) {
                p.channelState.R.visible = true;
            } else if (avail.hasL && !avail.hasR) {
                p.channelState.L.visible = true;
            } else if (avail.hasL && avail.hasR) {
                p.channelState.L.visible = true;
                p.channelState.R.visible = true;
            }
        }

        // Default single-seating channels cleanly to their actual seating number
        if (avail.left.length === 1) {
            p.channelState.L.seating = String(avail.left[0].seatNum);
        } else if (p.channelState.L.seating !== "avg" && p.channelState.L.seating !== "all") {
            let sNumL = parseInt(p.channelState.L.seating, 10);
            if (!avail.left.some(s => s.seatNum === sNumL)) p.channelState.L.seating = "avg";
        }
        if (avail.right.length === 1) {
            p.channelState.R.seating = String(avail.right[0].seatNum);
        } else if (p.channelState.R.seating !== "avg" && p.channelState.R.seating !== "all") {
            let sNumR = parseInt(p.channelState.R.seating, 10);
            if (!avail.right.some(s => s.seatNum === sNumR)) p.channelState.R.seating = "avg";
        }
        if (avail.hasLR && avail.left.length === 1 && avail.right.length === 1 && avail.left[0].seatNum === avail.right[0].seatNum) {
            p.channelState.LR.seating = String(avail.left[0].seatNum);
        }
    }

    // Sync legacy properties on p so existing external helpers don't break
    p.avg = !!p.channelState.LR.visible;
    if (p.channelState.L.visible && !p.channelState.R.visible && !p.channelState.LR.visible) {
        p.lr = 0;
    } else if (!p.channelState.L.visible && p.channelState.R.visible && !p.channelState.LR.visible) {
        p.lr = 1;
    } else {
        p.lr = undefined;
    }
    p.seating = p.channelState.LR.visible ? p.channelState.LR.seating
             : (p.channelState.R.visible ? p.channelState.R.seating : p.channelState.L.seating);

    // Build p.activeCurves
    if (p.isTarget) {
        p.activeCurves = [{ id: p.fullName, l: p.channels[0], p: p, o: 0 }];
    } else {
        let id = getChannelName(p),
            pc = (idstr, l, oi, extra) => Object.assign({ id: id(idstr), l: l, p: p, o: oi === undefined ? 0 : getO(oi) }, extra || {});
        let curves = [];
        let state = p.channelState;

        // 1. Left Channel
        if (state.L && state.L.visible && avail.hasL) {
            let st = state.L.seating;
            let leftSamples = avail.left;
            if (st === "all" && leftSamples.length > 1) {
                leftSamples.forEach((s, i) => {
                    curves.push(pc(s.label, s.curve, 0, { channel: "L", chIdx: 0, sIdx: i, sCount: leftSamples.length, seatNum: s.seatNum }));
                });
            } else {
                let seatNum = parseInt(st, 10);
                let matched = !isNaN(seatNum) ? leftSamples.find(s => s.seatNum === seatNum) : null;
                if (matched) {
                    curves.push(pc(matched.label, matched.curve, 0, { channel: "L", chIdx: 0, sIdx: matched.slot, sCount: leftSamples.length, seatNum: matched.seatNum }));
                } else if (leftSamples.length === 1) {
                    let onlyL = leftSamples[0];
                    curves.push(pc(onlyL.label, onlyL.curve, 0, { channel: "L", chIdx: 0, sIdx: 0, sCount: 1, seatNum: onlyL.seatNum }));
                } else {
                    curves.push(pc("- - L", avgCurves(leftSamples.map(s => s.curve)), 0, { channel: "L", chIdx: 0, sIdx: 0, sCount: 1 }));
                }
            }
        }

        // 2. Right Channel
        if (state.R && state.R.visible && avail.hasR) {
            let st = state.R.seating;
            let rightSamples = avail.right;
            if (st === "all" && rightSamples.length > 1) {
                rightSamples.forEach((s, i) => {
                    curves.push(pc(s.label, s.curve, 1, { channel: "R", chIdx: 1, sIdx: i, sCount: rightSamples.length, seatNum: s.seatNum }));
                });
            } else {
                let seatNum = parseInt(st, 10);
                let matched = !isNaN(seatNum) ? rightSamples.find(s => s.seatNum === seatNum) : null;
                if (matched) {
                    curves.push(pc(matched.label, matched.curve, 1, { channel: "R", chIdx: 1, sIdx: matched.slot, sCount: rightSamples.length, seatNum: matched.seatNum }));
                } else if (rightSamples.length === 1) {
                    let onlyR = rightSamples[0];
                    curves.push(pc(onlyR.label, onlyR.curve, 1, { channel: "R", chIdx: 1, sIdx: 0, sCount: 1, seatNum: onlyR.seatNum }));
                } else {
                    curves.push(pc("─ R", avgCurves(rightSamples.map(s => s.curve)), 1, { channel: "R", chIdx: 1, sIdx: 0, sCount: 1 }));
                }
            }
        }

        // 3. L+R Combined
        if (state.LR && state.LR.visible && avail.hasLR) {
            let st = state.LR.seating;
            let allValid = p.channels.filter(c => c !== null);
            let allSeatNums = Array.from(new Set([
                ...avail.left.map(s => s.seatNum),
                ...avail.right.map(s => s.seatNum)
            ])).sort((a, b) => a - b);

            if (st === "all" && allSeatNums.length > 1) {
                allSeatNums.forEach((sn, idx) => {
                    let lSamp = avail.left.find(s => s.seatNum === sn);
                    let rSamp = avail.right.find(s => s.seatNum === sn);
                    let pair = [lSamp && lSamp.curve, rSamp && rSamp.curve].filter(Boolean);
                    if (pair.length) {
                        curves.push(pc("AVG " + sn, avgCurves(pair), undefined, { channel: "AVG", sIdx: idx, sCount: allSeatNums.length, seatNum: sn }));
                    }
                });
            } else {
                let seatNum = parseInt(st, 10);
                if (!isNaN(seatNum)) {
                    let lSamp = avail.left.find(s => s.seatNum === seatNum);
                    let rSamp = avail.right.find(s => s.seatNum === seatNum);
                    let pair = [lSamp && lSamp.curve, rSamp && rSamp.curve].filter(Boolean);
                    if (pair.length) {
                        curves.push(pc("AVG " + seatNum, avgCurves(pair), undefined, { channel: "AVG", sIdx: 0, sCount: allSeatNums.length, seatNum: seatNum }));
                    } else if (allValid.length > 0) {
                        curves.push(pc("AVG", avgCurves(allValid), undefined, { channel: "AVG", sIdx: 0, sCount: 1 }));
                    }
                } else if (allValid.length > 0) {
                    curves.push(pc("AVG", avgCurves(allValid), undefined, { channel: "AVG", sIdx: 0, sCount: 1 }));
                }
            }
        }

        p.activeCurves = curves;
    }

    // Refresh pills in the table row if phoneTable is active
    if (typeof updateChannelPills === "function") {
        updateChannelPills(p);
    }
}
function updateCurves() {
    setCurves.apply(null, arguments);
    updatePaths();
}

let drawLine = d => line(baseline.fn(d.l));
function redrawLine(p) {
    let getTr = o => o ? "translate(0,"+(y(o)-y(0))+")" : null;
    p.attr("transform", c => getTr(getOffset(c.p))).attr("d", drawLine);
}
function updateYCenter() {
    let c = yCenter;
    yCenter = baseline.p ? 0 : norm_sel ? 60 : norm_phon;
    y.domain(y.domain().map(d=>d+(yCenter-c)));
    yAxisObj.call(fmtY);
}
function setBaseline(b, no_transition) {
    baseline = b;
    updateYCenter();
    if (no_transition) {
        if (typeof window.redrawEQOverlay === "function") { window.redrawEQOverlay(); }
        return;
    }
    gpath.selectAll("path")
        .transition().duration(500).ease(d3.easeQuad)
        .attr("d", drawLine);
    if (typeof window.redrawEQOverlay === "function") { window.redrawEQOverlay(); }
    table.selectAll("tr").select(".button")
        .classed("selected", p => p===baseline.p || (p.basedOn && p.basedOn===baseline.p));
}
function getBaseline(p) {
    let b = getAvg(p).map(d => d[1]+getOffset(p));
    return { p:p, fn:l=>l.map((e,i)=>[e[0],e[1]-b[Math.min(i,b.length-1)]]) };
}

function setOffset(p, o) {
    p.offset = +o;
    if (baseline.p === p) { baseline = getBaseline(p); }
    updatePaths();
}
let getOffset = p => p.offset + p.norm;

function setHover(elt, h) {
    elt.on("mouseover", h(true)).on("mouseout", h(false));
}

// See if iframe gets CORS errors when interacting with window.top / window.top.document
let accessWindowTop, accessDocumentTop, targetWindow;
try {
    let emb = window.location.href.includes('embed');
    accessWindowTop = Boolean(window.top.location.href);
    targetWindow = emb ? window : window.top;
} catch {
    accessWindowTop = false;
    targetWindow = window;
}
try {
    accessDocumentTop = Boolean(window.top.document);
} catch {
    accessDocumentTop = false;
}

let ifURL = typeof share_url !== "undefined" && share_url;
let baseTitle = typeof page_title !== "undefined" ? page_title : "Haruto's Graph Tool (CrinGraph)";
let baseDescription = typeof page_description !== "undefined" ? page_description : "View and compare frequency response graphs";
let baseURL;  // Set by setInitPhones
function addPhonesToUrl() {
    let title = baseTitle,
        url = baseURL,
        visibleSharePhones = activePhones.filter(p => !p.isDynamic && !p.isPrefBounds),
        names = visibleSharePhones.map(p => (p.isTarget && p.phone === "Custom Tilt") ? (default_DF_name + " Target") : p.fileName),
        namesCombined = visibleSharePhones.map(p => p.fileName).join(", ");
    
    if (names.length) {
        url += "?share=" + encodeURI(names.join().replace(/ /g,"_"));
        title = namesCombined + " - " + title;
    }
    let hasTiltableActive = visibleSharePhones.some(p =>
        p.isTarget && (p.phone === "Custom Tilt" || tiltableTargets.includes(p.dispName))
    );
    if (hasTiltableActive) {
        url += "&bass="+boost+"&tilt="+tilt+"&treble="+treble+"&ear="+ear;
    }
    let canLink = targetWindow.document.querySelector("link[rel='canonical']");
    if (canLink) {
        canLink.setAttribute("href", names.length === 1 ? url : baseURL);
    }
    targetWindow.history.replaceState("", title, url);
    targetWindow.document.title = title;
    let metaDesc = targetWindow.document.querySelector("meta[name='description']");
    if (metaDesc) {
        metaDesc.setAttribute("content", baseDescription + ", including " + namesCombined + ".");
    }
}

function setModeEmbed() {
    document.querySelector("body").setAttribute("embed-mode", "true");
}

function updatePaths(trigger) {
    clearLabels();
    let c = d3.merge(activePhones.map(p => p.activeCurves)),
        p = gpath.selectAll("path").data(c, d => (d.p && d.p.eqSnapshotId ? d.p.eqSnapshotId + ":" : "") + d.id);
    let graphLines = p.join("path").attr("opacity", c=>c.p.hide?0:null)
        .classed("sample", c=>c.p.samp);
    graphLines.attr("stroke", getColor_AC).call(redrawLine);
    
    // Distinct Dash Patterns, Weights & Opacity:
    // - Targets / Tilt: Fine Dotted ("2, 4") + 55% Opacity (Muted)
    // - When AVG is active on a headphone:
    //     - AVG curve: Bold Solid ("none"), 100% Opacity, 2.8px stroke width
    //     - L & R curves: Dimmed (45% Opacity), 1.8px stroke width (L dashed "6, 4", R solid "none")
    // - When AVG is inactive:
    //     - L & R curves: Full 100% Opacity, 2.1px stroke width
    graphLines.each(function(d) {
        let pathElem = d3.select(this);
        if (d.p.isTarget || d.p.isPrefBounds) {
            pathElem.style("stroke-dasharray", "2, 4");
            pathElem.style("stroke-opacity", 0.55);
            return;
        }
        
        let ch = d.channel || (d.chIdx !== undefined ? (d.chIdx === 0 ? "L" : "R") : null);
        let isAvg = (ch === "AVG" || (d.id && d.id.indexOf("AVG") !== -1));
        let isAvgActive = !!(d.p.channelState && d.p.channelState.LR && d.p.channelState.LR.visible);

        if (isAvg) {
            pathElem.style("stroke-opacity", 1.0);
            pathElem.style("stroke-width", d.p.lineWeight ? (d.p.lineWeight * 1.3) : "2.8px");
            pathElem.style("stroke-dasharray", d.p.dashStyle || "none");
        } else {
            if (isAvgActive) {
                pathElem.style("stroke-opacity", 0.45);
                pathElem.style("stroke-width", d.p.lineWeight ? (d.p.lineWeight * 0.85) : "1.8px");
            } else {
                pathElem.style("stroke-opacity", 1.0);
                pathElem.style("stroke-width", d.p.lineWeight || "2.1px");
            }

            if (ch === "L" || (d.id && d.id.indexOf(" (L") !== -1) || (d.id && d.id.indexOf("- - L") !== -1)) {
                pathElem.style("stroke-dasharray", "6, 4");
            } else if (d.p.dashStyle) {
                pathElem.style("stroke-dasharray", d.p.dashStyle);
            } else {
                pathElem.style("stroke-dasharray", "none");
            }
        }
    });
    let t = graphLines.filter(c=>c.p.isTarget).attr("class", "target");
    if (targetColorCustom) t.attr("stroke", targetColorCustom);
    if (ifURL && !trigger) addPhonesToUrl();
    if (stickyLabels) drawLabels();
    if (typeof window.syncGraphHeader === "function") { window.syncGraphHeader(); }
    if (typeof window.refreshCalcBadge === "function") { window.refreshCalcBadge(); }
    if (typeof window.syncPhoneTableColors === "function") { window.syncPhoneTableColors(); }
    if (typeof window.syncSavedEQPillColors === "function") { window.syncSavedEQPillColors(); }
    if (typeof window.redrawEQOverlay === "function") { window.redrawEQOverlay(); }
}

// Preference bounds (loadPrefBounds, setPrefBounds, prepPrefBounds, prefBoundsObj)
// live in assets/js/prefBounds.js.

var f_values = (function() {
    // Standard frequencies, all phone need to interpolate to this.
    let f = [20];
    let step = Math.pow(2, 1/48); // 1/48 octave
    while (f[f.length-1] < 20000) { f.push(f[f.length-1] * step) }
    return f;
})();
let fr_to_ind = fr => d3.bisect(f_values, fr, 0, f_values.length-1);
function range_to_slice(xs, fn) {
    let r = xs.map(v => d3.bisectLeft(f_values, x.invert(fn(v))));
    return a => a.slice(Math.max(r[0],0), r[1]+1);
}

let norm_sel = ( default_normalization.toLowerCase() === "db" ) ? 0:1,
    norm_fr = default_norm_hz,
    norm_phon = default_norm_db;

function normalizePhone(p) {
    if (p.isSandboxEQ) {
        let targetCenter = norm_sel ? 60 : norm_phon;
        p.norm = targetCenter - 60;
        return;
    }
    if (p.eqParent && p.eqParent.norm !== undefined) {
        p.norm = p.eqParent.norm;
        return;
    }
    if (p.isEQSnapshot && p.eqBasePhone) {
        let baseRef = p.eqBasePhone;
        if (!baseRef.channels && baseRef.rawChannels) {
            smoothPhone(baseRef);
        }
        let refChans = baseRef.channels ? baseRef.channels.filter(c => c !== null) : (p.eqBaseRawChannels ? p.eqBaseRawChannels.filter(c => c !== null) : null);
        if (refChans && refChans.length) {
            if (norm_sel) {
                let i = fr_to_ind(norm_fr);
                let avg = l => 20*Math.log10(d3.mean(l, d=>Math.pow(10,d/20)));
                p.norm = 60 - avg(refChans.map(l=>l[i][1]));
            } else {
                let refAvg = refChans.length === 1 ? refChans[0] : avgCurves(refChans);
                p.norm = find_offset(refAvg, norm_phon);
            }
            return;
        }
    }
    if (norm_sel) { // fr
        let i = fr_to_ind(norm_fr);
        let avg = l => 20*Math.log10(d3.mean(l, d=>Math.pow(10,d/20)));
        p.norm = 60 - avg(validChannels(p).map(l=>l[i][1]));
    } else { // phon
        p.norm = find_offset(getAvg(p), norm_phon);
    }
    if (p.eq) {
        p.eq.norm = p.norm; // copy parent's norm to child
    } else if (p.eqParent) {
        p.norm = p.eqParent.norm; // set child's norm from parent
    }
}

let norms = doc.select(".normalize").selectAll("div");
norms.classed("selected",(_,i)=>i===norm_sel);
function setNorm(_, i, change) {
    if (change !== false) {
        if (!this.checkValidity()) return;
        let v = +this.value;
        if (i) { norm_fr=v; } else { norm_phon=v; }
    }
    norm_sel = i;
    norms.classed("selected",(_,i)=>i===norm_sel);
    activePhones.forEach(normalizePhone);
    if (baseline.p) { baseline = getBaseline(baseline.p); }
    updateYCenter();
    
    if (!userConfigApplicationActive) {
        setUserConfig();
        updatePaths();
    } else {
        updatePaths("config");
    }
}
norms.select("input")
    .on("change input",setNorm)
    .on("keypress", function(_, i) {
        if (d3.event.key==="Enter") { setNorm.bind(this)(_,i); }
    });
norms.select("span").on("click", (_,i)=>setNorm(_,i,false));

function showPhone(p, exclusive, suppressVariant, trigger) {
    if (!trigger && !p.copyOf && p.fileNames && p.fileNames.length && p.fileName !== p.fileNames[0]) {
        p.fileName = p.fileNames[0];
        p.dispName = (p.dispNames && p.dispNames[0]) ? p.dispNames[0] : p.fileNames[0];
        if (p.vars && p.vars[p.fileName]) {
            p.rawChannels = p.vars[p.fileName];
        } else {
            p.rawChannels = undefined;
        }
    }
    if (p.isTarget && activePhones.indexOf(p)!==-1) {
        removePhone(p);
        return;
    }
    if (p.isTarget && p.phone !== "Custom Tilt") {
        // Remove the same target with the custom tilt
        if (activePhones.filter(e => e.fileName === p.fileName && e.phone === "Custom Tilt").length > 0) {
            activePhones = activePhones.filter(e => e.fileName !== p.fileName || e.phone !== "Custom Tilt");
            removePhone(p);
            return;
        }
    }
    if (p.isTarget && p.phone === "Custom Tilt") {
        // Replace the same target with the custom tilt
        if (activePhones.filter(e => e.fileName === p.fileName).length > 0) {
            activePhones = activePhones.filter(e => e.fileName !== p.fileName && e.phone !== "Custom Tilt");
            updatePhoneTable();
        }
    }
    let wasActiveBeforeShow = !!p.active;
    let keep = !exclusive ? (q=>true)
             : (q => q===p || q.copyOf===p || q.pin || q.isTarget!==p.isTarget || q.isPrefBounds);
    if (!p.rawChannels) {
        if (p.isLoading) {
            if (inFlightLoads.has(p.fileName)) {
                inFlightLoads.get(p.fileName).then(ch => {
                    p.isLoading = false;
                    if (!ch) {
                        if (!trigger && !p.isTarget && typeof showGraphNotice === "function") {
                            showGraphNotice("Measurement files not found: " + p.dispName);
                        }
                        return;
                    }
                    p.rawChannels = ch;
                    if (p.vars) p.vars[p.fileName] = ch;
                    showPhone(p, exclusive, suppressVariant, trigger);
                    if (trigger) { scrollToActive(); }
                });
            }
            return;
        }
        p.isLoading = true;
        loadFiles(p, function (ch) {
            p.isLoading = false;
            if (!ch) {
                if (!trigger && !p.isTarget && typeof showGraphNotice === "function") {
                    showGraphNotice("Measurement files not found: " + p.dispName);
                }
                return;
            }
            p.rawChannels = ch;
            if (p.vars) p.vars[p.fileName] = ch;
            showPhone(p, exclusive, suppressVariant, trigger);
            if (trigger) { scrollToActive(); }
        });
        return;
    }
    smoothPhone(p);
    if (p.id === undefined) { p.id = getPhoneNumber(); }
    normalizePhone(p); p.offset=p.offset||0;
    let isComparePhone = q => !q.isTarget && !q.isPrefBounds && !q.eqParent && !q.isEQSnapshot;
    if (exclusive) {
        activePhones.filter(q => !keep(q)).forEach(q => {
            delete q._userChannelOverride;
            delete q._autoSynced;
        });
        activePhones = activePhones.filter(q => q.active = keep(q));
        if (baseline.p && !baseline.p.active) {
            if (baseline.p.phone != customTiltName && !dfBaseline) setBaseline(baseline0,1);
        }
        let apRem = activePhones.filter(isComparePhone);
        if (apRem.length === 1) {
            if (apRem[0].eq && apRem[0].eq.active) {
                let wantAvg = !apRem[0].eq.hasChannelSplits;
                setCurves(apRem[0], wantAvg, undefined, undefined, apRem[0]._userChannelOverride ? undefined : "avg");
                setCurves(apRem[0].eq, wantAvg, undefined, undefined, apRem[0]._userChannelOverride ? undefined : "avg");
            } else {
                setCurves(apRem[0], false, undefined, undefined, apRem[0]._userChannelOverride ? undefined : "avg");
            }
        }
    }
    if (activePhones.indexOf(p)===-1) {
        let avg = false;
        let eqDefaultAvg = undefined;
        let newTargetLr = undefined;
        let newTargetSeating = undefined;
        if (!p.isTarget) {
            let ap = activePhones.filter(isComparePhone);
            if (!p.eqParent && !p.isEQSnapshot) {
                if (ap.length >= 1) {
                    avg = true;
                    // Determine smart channel & seating defaults when comparing with single-channel modes
                    let pInfo = getAvailableChannelInfo(p);
                    let singlePhones = [p].concat(ap).filter(q => getAvailableChannelInfo(q).soloChannel !== null);
                    let primarySingle = pInfo.soloChannel ? p : (singlePhones.length ? singlePhones[0] : null);
                    let primaryInfo = primarySingle ? getAvailableChannelInfo(primarySingle) : null;
                    let targetCh = primaryInfo ? primaryInfo.soloChannel : "R";
                    let targetLr = targetCh === "L" ? 0 : 1;

                    // New phone gets matched channel + exact seating if comparing with a single-side sibling
                    if (!pInfo.soloChannel) {
                        newTargetLr = targetLr;
                        if (primarySingle && primaryInfo.soloSeating != null && (p.copyOf || p) === (primarySingle.copyOf || primarySingle)) {
                            let targetSamples = targetCh === "L" ? pInfo.left : pInfo.right;
                            if (targetSamples.some(s => s.seatNum === primaryInfo.soloSeating)) {
                                newTargetSeating = String(primaryInfo.soloSeating);
                            } else {
                                newTargetSeating = "avg";
                            }
                        } else {
                            newTargetSeating = "avg";
                        }
                    }

                    // Existing comparison phones auto-default to matching channel + seating (if sibling & available)
                    ap.forEach(q => {
                        if (q._userChannelOverride) return;
                        let qInfo = getAvailableChannelInfo(q);
                        if (qInfo.soloChannel !== null) return;
                        let qSeat = "avg";
                        if (primarySingle && primaryInfo.soloSeating != null && (q.copyOf || q) === (primarySingle.copyOf || primarySingle)) {
                            let qSamples = targetCh === "L" ? qInfo.left : qInfo.right;
                            if (qSamples.some(s => s.seatNum === primaryInfo.soloSeating)) {
                                qSeat = String(primaryInfo.soloSeating);
                            }
                        } else if (ap.length > 1 && q.channelState) {
                            // Keep already-synced seating when adding 3rd+ curve if same channel
                            let curVisibleCh = q.channelState.L.visible ? "L" : (q.channelState.R.visible ? "R" : null);
                            if (curVisibleCh === targetCh && q.seating && q.seating !== "avg") {
                                qSeat = q.seating;
                            }
                        }
                        if (ap.length === 1 || primarySingle === p) {
                            q._autoSynced = true;
                            setCurves(q, false, targetLr, undefined, qSeat);
                            if (q.eq && q.eq.active) {
                                setCurves(q.eq, false, targetLr, undefined, qSeat);
                            }
                        }
                    });
                }
                activePhones.push(p);
                if (!p.isPrefBounds && typeof window.resetGraphTools === "function") {
                    window.resetGraphTools();
                }
            } else {
                // Attached EQ / Saved EQ layer follows single-model AVG default (or L+R when split trims exist),
                // while yielding cleanly to R-solo when 2+ comparison headphones are plotted.
                activePhones.push(p);
                if (ap.length >= 2) {
                    avg = true;
                } else {
                    eqDefaultAvg = !p.hasChannelSplits;
                    if (p.eqParent && p.eqParent.active && p.eqParent.eq === p) {
                        setCurves(p.eqParent, eqDefaultAvg, undefined);
                    }
                }
            }
        } else {
            activePhones.unshift(p);
        }
        p.active = true;
        let finalLr = newTargetLr !== undefined ? newTargetLr : (avg ? 1 : undefined);
        if (newTargetSeating !== undefined) p._autoSynced = true;
        setCurves(p, eqDefaultAvg !== undefined ? eqDefaultAvg : false, finalLr, undefined, newTargetSeating);
    }
    if (p.isTarget && tiltableTargets.includes(p.dispName) && p.phone !== "Custom Tilt") { // Tilt the target
        if (p.dispName === "Fc-Construct DF-HRTF") {
            customTiltName = p.dispName;
            if (df !== p) {
                removePhone(df);
                df = p;
            }
            boost = 0; tilt = 0; ear = 0; treble = 0;
            updateDispVals();
        } else if (p.dispName === "10 dB downwards tilt") {
            customTiltName = p.dispName;
            if (df !== p) {
                removePhone(df);
                df = p;
            }
            boost = 0; tilt = -1; ear = 0; treble = 0;
            updateDispVals();
        } else if (p.dispName === "CUSTOM") {
            // Keep current df and adjustments
        }
        dfBase = getBaseline(df);
        prepPrefBounds();
        updateDF(boost, tilt, ear, treble);
    } else if (p.isTarget && !tiltableTargets.includes(p.dispName) && p.phone != "Custom Tilt") {
        removePhone(df);
        customTiltName = p.dispName;
        setBaseline(baseline0,1);
    }
    updatePaths(trigger);
    updatePhoneTable();
    d3.selectAll("#phones .phone-item,.target")
        .call(setPhoneTr);
    //Displays variant pop-up when phone displayed
    if (!suppressVariant && !trigger && p.fileNames && !p.isTarget) {
        setVariantTreeOpen(p.copyOf || p, true);
    }
    document.activeElement.blur();
    if (extraEnabled && extraEQEnabled) {
        updateEQPhoneSelect();
    }
    if (!p.isTarget && alt_augment ) { augmentList(p); }

    if (trigger !== "config") {
        if (!p.isTarget && !p.isEQSnapshot && !p.eqParent && (!wasActiveBeforeShow || trigger === "share" || trigger === "embed") && typeof window.trackPhoneViewed === "function") {
            let viewSource = trigger === "share" ? "share_url"
                : (trigger === "embed" ? "embed_url" : (p.copyOf ? "variant" : "sidebar"));
            window.trackPhoneViewed(p, viewSource);
        } else if (p.isTarget && p.phone !== "Custom Tilt" && (!wasActiveBeforeShow || trigger === "share" || trigger === "embed") && typeof window.trackTargetSelected === "function") {
            let tSource = trigger === "share" ? "share_url"
                : (trigger === "embed" ? "embed_url" : "preset");
            window.trackTargetSelected(p.dispName || p.phone, tSource);
        }
    }
    
    // Apply user config view settings
    if (typeof trigger !== "undefined") {
        userConfigApplyViewSettings(p.fileName);
    }
}

window.syncEQPairChannels = function(basePhone, hasChannelSplits) {
    if (!basePhone || !basePhone.eq || !basePhone.eq.active) return;
    let eqPhone = basePhone.eq;
    eqPhone.hasChannelSplits = !!hasChannelSplits;
    let comparePhones = activePhones.filter(q => !q.isTarget && !q.isPrefBounds && !q.eqParent && !q.isEQSnapshot);
    if (comparePhones.length >= 2) {
        // Respect MIRE multi-headphone R-solo comparison workflow
        return;
    }
    let wantAvg = !hasChannelSplits;
    if (basePhone.active) {
        setCurves(basePhone, wantAvg, undefined);
    }
    setCurves(eqPhone, wantAvg, undefined);
    updatePaths();
};

function removeCopies(p) {
    if (p.objs) {
        p.objs.forEach(q=>q.active=false);
        delete p.objs;
    }
    removePhone(p);
}

function removePhone(p) {
    if (p.eqParent && p.eqParent.eq === p) {
        p.eqParent.eq = null;
    }
    p.active = p.pin = false; nextPN = null;
    delete p._userChannelOverride;
    delete p._autoSynced;
    activePhones = activePhones.filter(q => q.active);
    if (!p.isEQSnapshot) {
        activePhones.forEach(q => {
            if (q && q.isEQSnapshot && q.eqParent === p) {
                q.eqParent = null;
            }
        });
    }
    if (!p.isTarget) {
        let ap = activePhones.filter(q => !q.isTarget && !q.isPrefBounds && !q.eqParent && !q.isEQSnapshot);
        if (ap.length === 1) {
            let restoreSeat = ap[0]._userChannelOverride ? undefined : "avg";
            delete ap[0]._autoSynced;
            if (ap[0].eq && ap[0].eq.active) {
                let wantAvg = !ap[0].eq.hasChannelSplits;
                setCurves(ap[0], wantAvg, undefined, undefined, restoreSeat);
                setCurves(ap[0].eq, wantAvg, undefined, undefined, restoreSeat);
            } else {
                setCurves(ap[0], false, undefined, undefined, restoreSeat);
            }
        }
        if (!p.isPrefBounds && !p.eqParent && !p.isEQSnapshot && typeof window.resetGraphTools === "function") {
            window.resetGraphTools();
        }
    }
    updatePaths();
    if (baseline.p && !baseline.p.active && baseline.p != df) { setBaseline(baseline0); }
    updatePhoneTable();
    if (!p.isTarget && p.fileNames) {
        let treeBase = p.copyOf || p;
        if (treeBase.objs) {
            treeBase.objs = treeBase.objs.filter(q => q.active);
            if (treeBase.objs.length === 0) {
                delete treeBase.objs;
            }
        }
        let stillShown = activePhones.indexOf(treeBase) !== -1
            || (treeBase.objs || []).some(q => q.active);
        if (!stillShown) { setVariantTreeOpen(treeBase, false); }
        else if (treeBase.treeOpen) { renderVariantTree(treeBase); }
    }
    d3.selectAll("#phones .phone-item,.target")
        .call(setPhoneTr);
    if (extraEnabled && extraEQEnabled) {
        updateEQPhoneSelect();
    }
    if (p.isEQSnapshot && p.eqSnapshotId && typeof window.onEQSnapshotRemoved === "function") {
        window.onEQSnapshotRemoved(p.eqSnapshotId);
    }
}

function variantsFor(p) {
    let base = p.copyOf || p;
    let shown = (activePhones.indexOf(base) !== -1 ? [base] : [])
        .concat(base.objs || [])
        .filter(q => q.active);
    return (p.fileNames || []).map((fileName, i) => {
        let dispName = (p.dispNames || [])[i] || fileName;
        return { fileName: fileName, dispName: dispName,
                 activeObj: shown.find(q => q.fileName === fileName) || null };
    });
}

function renderVariantTree(p) {
    if (!p.fileNames) return;
    let item = doc.select("#phones").selectAll("div.phone-item").filter(q => q === p),
        tree = item.select(".variant-tree");
    if (item.empty()) return;
    if (!p.treeOpen) { tree.selectAll("div.variant-item").remove(); return; }
    let rows = tree.selectAll("div.variant-item").data(variantsFor(p), d => d.fileName);
    rows.exit().remove();
    let enter = rows.enter().append("div")
        .attr("class", "variant-item")
        .attr("data-filename", d => d.fileName)
        .on("click", function (d) { variantClickName(p, d); });
    rows = enter.merge(rows);
    rows.classed("variant-active", d => !!d.activeObj);
    rows.selectAll("span.variant-name").data(d => [d]).join("span")
        .attr("class", "variant-name").text(d => d.dispName);
    rows.selectAll("span.variant-add").data(d => [d]).join("span")
        .attr("class", "variant-add").text(d => d.activeObj ? "\u00D7" : "+")
        .on("click", function (d) {
            d3.event.stopPropagation();
            d.activeObj ? removePhone(d.activeObj) : variantClickAdd(p, d);
        });
}

function setVariantTreeOpen(p, open) {
    if (!p || !p.fileNames) return;
    p.treeOpen = open;
    let item = doc.select("#phones").selectAll("div.phone-item").filter(q => q === p);
    if (item.empty()) return;
    item.select(".variant-tree").style("display", open ? "block" : null);
    item.select(".tree-chevron").classed("tree-open", open);
    renderVariantTree(p);
}

function variantClickName(base, d) {
    d3.event.stopPropagation();
    if (d.activeObj) return;
    let shown = (activePhones.indexOf(base) !== -1 ? [base] : [])
        .concat(base.objs || []).filter(q => q.active);
    if (shown.length) {
        let target = shown[0];
        if (!target.vars) target.vars = base.vars || {};
        target.vars[target.fileName] = target.rawChannels;
        Object.assign(target, { fileName: d.fileName, dispName: d.dispName });
        changeVariant(target, updateVariant, undefined);
        renderVariantTree(base);
    } else {
        showVariant(base, d, undefined);
        renderVariantTree(base);
    }
}

function variantClickAdd(base, d) {
    d3.event.stopPropagation();
    showVariant(base, d, undefined);
    renderVariantTree(base);
}

function asPhoneObj(b, p, isInit, inits) {
    if (!isInit) {
        isInit = _ => false;
    }
    let r = { brand:b, dispBrand:b.name };
    if (typeof p === "string") {
        r.phone = r.fileName = p;
        if (isInit(p)) inits.push(r);
    } else {
        r.phone = p.name;
        if (p.collab) {
            r.dispBrand += " x "+p.collab;
            r.collab = brandMap[p.collab];
        }
        let f = p.file || p.name;
        if (typeof f === "string") {
            r.fileName = f;
            if (isInit(f)) inits.push(r);
        } else {
            r.fileNames = f;
            r.vars = {};
            let dns = f;
            if (p.suffix) {
                dns = p.suffix.map(
                    s => p.name + (s ? " "+s : "")
                );
            } else if (p.prefix) {
                let reg = new RegExp("^"+p.prefix+"\s*", "i");
                dns = f.map(n => {
                    n = n.replace(reg, "");
                    return p.name + (n.length ? " "+n : n);
                });
            }
            r.dispNames = dns;
            r.fileName = f[0];
            r.dispName = dns[0];
            let c = r;
            f.map((fn,i) => {
                if (!isInit(fn)) return;
                c.fileName=fn; c.dispName=dns[i];
                inits.push(c);
                c = {copyOf:r};
            });
        }
    }
    r.dispName = r.dispName || r.phone;
    r.fullName = r.dispBrand + " " + r.phone;
    if (alt_augment) {
        r.reviewScore = p.reviewScore;
        r.reviewLink = p.reviewLink;
        r.shopLink = p.shopLink;
        r.price = p.price;
    }
    return r;
}

let graphNoticeTimer = null;
function showGraphNotice(message) {
    const container = document.querySelector("div.graph-svg-wrap") || document.querySelector("div.graphBox");
    if (!container) return;
    let el = container.querySelector(".graph-notice");
    if (!el) {
        el = document.createElement("div");
        el.className = "graph-notice";
        container.appendChild(el);
    }
    el.textContent = message;
    el.classList.add("visible");
    if (graphNoticeTimer) clearTimeout(graphNoticeTimer);
    graphNoticeTimer = setTimeout(() => {
        el.classList.remove("visible");
    }, 5000);
}

const cacheBustUrl = url => url + (url.includes("?") ? "&" : "?") + "_t=" + Date.now();
const phoneBookRequestUrl = cacheBustUrl(typeof PHONE_BOOK !== "undefined" ? PHONE_BOOK : DIR + "phone_book.json");
const fileInventoryRequestUrl = cacheBustUrl(typeof FILE_INVENTORY !== "undefined" ? FILE_INVENTORY : DIR + "file_inventory.json");

Promise.all([
    d3.json(phoneBookRequestUrl),
    d3.json(fileInventoryRequestUrl).catch(() => null)
]).then(function ([brands, invData]) {
    if (invData && typeof invData === "object") {
        Object.keys(invData).forEach(k => fileInventoryMap.set(k, invData[k]));
    }
    let brandMap = window.brandMap = {},
        inits = [],
        initReq = typeof init_phones !== "undefined" ? [init_phones].flat() : false;
    loadFromShare = 0;
    
    if (ifURL) {
        let url = targetWindow.location.href,
            par = "share=",
            emb = "embed",
            cDFb = "bass=",
            cDFt = "tilt=",
            cDFtr = "treble=",
            cDFe = "ear=";
        baseURL = url.split("?").shift();
        let match = decodeURIComponent(url.replace(/_/g," ")).match(/share=([^&]+)/);
        let str = match && match[1] ? match[1].replace("share=", "") : null;
        let cTiltParams = decodeURIComponent(url.replace(/_/g," ")).match(/bass=([^&]+)&tilt=([^&]+)&treble=([^&]+)&ear=([^&]+)/);
        if (url.includes(par) && url.includes(emb)) {
            initReq = str.split(",");
            loadFromShare = 2;
            
            setModeEmbed();
        } else if (url.includes(par)) {
            initReq = str.split(",");
            loadFromShare = 1;
        } else if (url.includes(emb)) {
            setModeEmbed();
        }

        if (cTiltParams) {
            if (url.includes(cDFb)) {
                let parsedBass = parseFloat(cTiltParams[1]);
                if (Number.isFinite(parsedBass)) boost = parsedBass;
            }
            if (url.includes(cDFt)) {
                let parsedTilt = parseFloat(cTiltParams[2]);
                if (Number.isFinite(parsedTilt)) tilt = parsedTilt;
            }
            if (url.includes(cDFtr)) {
                let parsedTreb = parseFloat(cTiltParams[3]);
                if (Number.isFinite(parsedTreb)) treble = parsedTreb;
            }
            if (url.includes(cDFe)) {
                let parsedEar = parseFloat(cTiltParams[4]);
                if (Number.isFinite(parsedEar)) ear = parsedEar;
            }
        }
    }
    
    // Apply user config to inits
    userConfigAppendInits(initReq);
    
    let isInit = initReq ? f => initReq.indexOf(f) !== -1
                         : _ => false;
    
    if (loadFromShare === 1) {
        initMode = "share";
    } else if (loadFromShare === 2) {
        initMode = "embed";
    } else {
        initMode = "config";
    }

    if (fileInventoryMap.size > 0) {
        const missingFromInventory = [];
        brands = brands.map(b => {
            const keptPhones = [];
            (b.phones || []).forEach(p => {
                if (typeof p === "string") {
                    if (fileInventoryMap.has(p)) {
                        keptPhones.push(p);
                    } else {
                        missingFromInventory.push(p);
                    }
                    return;
                }
                const f = p.file || p.name;
                if (typeof f === "string") {
                    if (fileInventoryMap.has(f)) {
                        keptPhones.push(p);
                    } else {
                        missingFromInventory.push(f);
                    }
                } else if (Array.isArray(f)) {
                    const hasSuffixes = Array.isArray(p.suffix) && p.suffix.length === f.length;
                    const keptFiles = [];
                    const keptSuffixes = [];
                    f.forEach((fn, idx) => {
                        if (fileInventoryMap.has(fn)) {
                            keptFiles.push(fn);
                            if (hasSuffixes) keptSuffixes.push(p.suffix[idx]);
                        } else {
                            missingFromInventory.push(fn);
                        }
                    });
                    if (keptFiles.length > 0) {
                        const updated = Object.assign({}, p);
                        if (keptFiles.length === 1 && (!hasSuffixes || keptSuffixes[0] === "")) {
                            updated.file = keptFiles[0];
                            delete updated.suffix;
                        } else {
                            updated.file = keptFiles;
                            if (hasSuffixes) updated.suffix = keptSuffixes;
                        }
                        keptPhones.push(updated);
                    }
                } else {
                    keptPhones.push(p);
                }
            });
            return Object.assign({}, b, { phones: keptPhones });
        }).filter(b => b.phones.length > 0);
        if (missingFromInventory.length > 0) {
            console.warn("Phonebook entries missing from file_inventory.json (hidden from selector):", missingFromInventory);
        }
    }

    brands.push({ name: "Uploaded", phones: [] });
    brands.forEach(b => brandMap[b.name] = b);
    brands.forEach(function (b) {
        b.active = false;
        b.phoneObjs = b.phones.map(function (p) {
            return asPhoneObj(b, p, isInit, inits);
        });
    });

    let allPhones = window.allPhones = d3.merge(brands.map(b=>b.phoneObjs)).filter(p => !p.isTarget),
        currentBrands = [];
    if (!initReq && allPhones.length > 0) inits.push(allPhones[0]);
    startBackgroundPrefetching();

    // setClicks hoisted globally

    let brandSel = doc.select("#brands").selectAll()
        .data(brands).join("div")
        .text(b => b.name + (b.suffix?" "+b.suffix:""))
        .call(setClicks(setBrand));

    let bg = (h) => function (p) {
        (p.objs||[p]).forEach(q=>hl(q,h));
    }
    window.updatePhoneSelect = () => {
        doc.select("#phones").selectAll("div.phone-item")
            .data(allPhones)
            .join((enter) => {
                let phoneDiv = enter.append("div")
                    .attr("class","phone-item")
                    .attr("name", p=>p.fullName)
                    .on("mouseover", bg(true))
                    .on("mouseout" , bg(false))
                    .call(setClicks(showPhone));
                phoneDiv.append("span").text(p=>p.fullName);
                let variantPhones = phoneDiv.filter(p => p.fileNames);
                variantPhones.append("svg")
                    .attr("class","tree-chevron")
                    .attr("viewBox","-7 -9 24 25")
                    .append("path").attr("fill","currentColor")
                    .attr("d","M1 2L5 6L9 2L8 1L6 3Q5 4 4 3L2 1Z");
                variantPhones.select(".tree-chevron")
                    .on("mousedown", function () {
                        d3.event.stopPropagation();
                        d3.event.preventDefault();
                    })
                    .on("click", function (p) {
                        d3.event.stopPropagation();
                        setVariantTreeOpen(p, !p.treeOpen);
                    });
                // Adding the + selection button
                phoneDiv.append("div")
                    .attr("class", "phone-item-add")
                    .on("click", p => {
                        d3.event.stopPropagation();
                        showPhone(p, 0);
                    });
                variantPhones.append("div").attr("class","variant-tree");
           });
        doc.select("#phones").selectAll("div.phone-item").each(function (p) {
            if (p.fileNames && p.treeOpen) renderVariantTree(p);
        });
    };
    updatePhoneSelect();

    if (targets) {
        let b = window.brandTarget = { name:"Targets", active:false },
            ti = -targets.length,
            ph = t => ({
                isTarget:true, brand:b,
                dispName:t, phone:t, fullName:t+" Target", fileName:t+" Target"
            });
        d3.select(".manage").insert("div",".customDF")
            .attr("class", "targets collapseTools");
        let l = (text,c) => s => s.append("div").attr("class","targetLabel").append("span").text(text);
        let ts = b.phoneObjs = doc.select(".targets").call(l("Reference View"))
            .selectAll().data(targets).join("div").call(l(t=>t.type))
            .style("flex-grow",t=>t.files.length).attr("class","targetClass")
            .selectAll().data(t=>t.files.map(ph))
            .join("div").text(t=>t.dispName).attr("class","target")
            .call(setClicks(showPhone))
            .data();
        ts.forEach((t,i) => {
            t.id = i-ts.length;
            if (isInit(t.fileName)) {
                inits.push(t);
                if (tiltableTargets.includes(t.dispName)) df = t;
            }
        });
    }

    if (!df) df = window.brandTarget.phoneObjs.find(p => p.dispName === customTiltName);
    if (loadFromShare && Array.isArray(initReq)) {
        const resolvedNames = new Set(inits.map(x => x.fileName));
        const missingShared = initReq.filter(req =>
            req && !resolvedNames.has(req) && !req.startsWith("CUSTOM")
        );
        if (missingShared.length > 0) {
            console.warn("Shared URL measurement(s) not found:", missingShared);
            showGraphNotice("Measurement not found: " + missingShared.join(", "));
        }
    }
    inits.map(p => p.copyOf ? showVariant(p.copyOf, p, initMode)
                            : showPhone(p,0,1, initMode));
    if (inits.length > 0 && inits[0].brand && !inits[0].isTarget) {
        setBrand(inits[0].brand, true);
    }

    window.loadHeadphoneByMeta = function(meta, callback) {
        if (typeof callback !== "function") callback = () => {};
        if (!meta || meta.isSandbox) {
            callback(null);
            return;
        }
        let matchPhoneObj = (q) => q && !q.isTarget && !q.isPrefBounds && !q.eqParent && !q.isEQSnapshot &&
            ((meta.fileName && q.fileName === meta.fileName) ||
             (meta.key && q.brand && (q.brand.name + " " + q.dispName) === meta.key));

        let activeMatch = activePhones.find(matchPhoneObj);
        if (activeMatch) {
            if (activeMatch.rawChannels) {
                callback(activeMatch);
            } else {
                loadFiles(activeMatch, (ch) => {
                    if (!ch) { callback(null); return; }
                    activeMatch.rawChannels = ch;
                    if (activeMatch.vars) activeMatch.vars[activeMatch.fileName] = ch;
                    callback(activeMatch);
                });
            }
            return;
        }

        // Search allPhones base entries and variant arrays
        for (let i = 0; i < allPhones.length; i++) {
            let p = allPhones[i];
            if (!p || p.isTarget) continue;

            if (p.fileNames && p.fileNames.length) {
                let vIdx = -1;
                if (meta.fileName) {
                    vIdx = p.fileNames.indexOf(meta.fileName);
                }
                if (vIdx === -1 && meta.key && p.dispNames) {
                    vIdx = p.dispNames.findIndex(dn => p.brand && (p.brand.name + " " + dn) === meta.key);
                }
                if (vIdx !== -1) {
                    let fn = p.fileNames[vIdx];
                    let dn = (p.dispNames && p.dispNames[vIdx]) ? p.dispNames[vIdx] : fn;
                    if (vIdx === 0 && !p.active) {
                        p.fileName = fn;
                        p.dispName = dn;
                        if (p.vars && p.vars[fn]) p.rawChannels = p.vars[fn];
                        if (p.rawChannels) {
                            showPhone(p, false, true, "preset");
                            callback(p);
                        } else {
                            loadFiles(p, (ch) => {
                                if (!ch) { callback(null); return; }
                                p.rawChannels = ch;
                                if (p.vars) p.vars[fn] = ch;
                                showPhone(p, false, true, "preset");
                                callback(p);
                            });
                        }
                        return;
                    }
                    let varCopy = { fileName: fn, dispName: dn };
                    if (p.vars && p.vars[fn]) {
                        showVariant(p, varCopy, "preset");
                        callback(varCopy);
                    } else {
                        let tmpLoad = { brand: p.brand, fileName: fn, dispName: dn };
                        loadFiles(tmpLoad, (ch) => {
                            if (!ch) { callback(null); return; }
                            if (!p.vars) p.vars = {};
                            p.vars[fn] = ch;
                            showVariant(p, varCopy, "preset");
                            callback(varCopy);
                        });
                    }
                    return;
                }
            }

            let isBaseMatch = (meta.fileName && p.fileName === meta.fileName) ||
                              (meta.key && p.brand && (p.brand.name + " " + p.dispName) === meta.key);
            if (isBaseMatch) {
                if (p.rawChannels) {
                    if (!p.active) showPhone(p, false, true, "preset");
                    callback(p);
                } else {
                    loadFiles(p, (ch) => {
                        if (!ch) { callback(null); return; }
                        p.rawChannels = ch;
                        if (p.vars) p.vars[p.fileName] = ch;
                        showPhone(p, false, true, "preset");
                        callback(p);
                    });
                }
                return;
            }
        }
        callback(null);
    };

    // init phone poofing bandaid
    if (ifURL) {
        let lastSig = null, stable = 0, attempts = 0;
        (function trySync() {
            let sig = activePhones
                .filter(p => !p.isDynamic && !p.isPrefBounds)
                .map(p => p.fileName).join("|");
            if (sig === lastSig) {
                if (++stable >= 2) { addPhonesToUrl(); return; }
            } else {
                lastSig = sig; stable = 0;
            }
            if (++attempts >= 10) { addPhonesToUrl(); return; }
            setTimeout(trySync, 300);
        })();
    }

    // band-aid
    loadFiles(df, function (ch) {
        df.rawChannels = ch;
        smoothPhone(df);
        normalizePhone(df);
        df.offset=df.offset||0;
        dfBase = getBaseline(df);
        renderTargetsUI();
    });

    // update y scaling
    if (default_y_scale && scales[default_y_scale.toLowerCase()]) changeScaling(default_y_scale);

    // -------------------- Custom DF Tilt -------------------- //
    function updateDispVals() {
        doc.select("#cusdf-bass").node().value = boost;
        doc.select("#cusdf-tilt").node().value = tilt;
        doc.select("#cusdf-ear").node().value = ear;
        doc.select("#cusdf-treb").node().value = treble;
    }
    updateDispVals();

    let UnTiltTHIS = doc.select("#cusdf-UnTiltTHIS");
    // if UnTiltTHIS is clicked, clear active custom view and reset adjustments to 0
    UnTiltTHIS.on("click", function () {
        activeCustomViewId = null;
        boost = 0;
        tilt = 0;
        ear = 0;
        treble = 0;
        updateDispVals();
        updateDF(boost, tilt, ear, treble);
    });
    
    updateDF = (boostArg, tiltArg, earArg, trebleArg) => {
        // check if user is trying to tilt non tiltable targets
        let activeTarget = activePhones.filter(p => p.isTarget)[0];
        if (activeTarget && activeTarget.isTarget && !tiltableTargets.includes(activeTarget.dispName) && activeTarget.phone != "Custom Tilt") {
            return alert("This target is not supported for Custom Tilt");
        }
        // Bass Shelf
        let filters = [
            {disabled: false, type:"LSQ", freq:105, q:0.707, gain:boostArg},
            {disabled: false, type:"PK", freq:2750, q:1, gain:earArg},
            {disabled: false, type:"HSQ", freq:2500, q:0.42, gain:trebleArg}
        ]; 
        let bass = df.rawChannels.map(c => c ? Equalizer.apply(c, filters) : null);
        // Tilt
        let tiltOct = new Array(bass.length).fill(null);
        for(let i = 0; i < bass[0].length; i++) {
            let gainAdjustment = tiltArg * Math.log2(bass[0][i][0]);
            let tiltedMagnitude = bass[0][i][1] + gainAdjustment;
            tiltOct[i] = [bass[0][i][0], tiltedMagnitude];
        }
        // New Tilt
        let brand = window.brandTarget;
        let phoneObjs = brand.phoneObjs;
        let parts = [];
        if (tiltArg   != 0) parts.push("Tilt: " + tiltArg   + "dB/Oct");
        if (boostArg  != 0) parts.push("B: "    + boostArg  + "dB");
        if (trebleArg != 0) parts.push("T: "    + trebleArg + "dB");
        if (earArg    != 0) parts.push("3kHz: " + earArg    + "dB");
        let preferenceAdjustments = parts.length ? " (" + parts.join(", ") + ")" : " ";

        if (harmanFilters) {
            let match = harmanFilters.find(f =>
                tiltArg   == f.tilt       && boostArg == f.bass_shelf &&
                trebleArg == f.treble     && earArg   == f.ear);
            if (match) preferenceAdjustments += ` (${match.name} Filters)`;
        }

        let state = resolveCurrentCustomState();
        let targetPrefix = state.isPresetDF ? "Fc-Construct DF-HRTF"
            : (state.isPresetTilt10 ? "10 dB downwards tilt"
            : (state.matchingSaved ? state.matchingSaved.name : getNextCustomName()));

        let phoneObj = { isTarget:true, brand:brand, phone:"Custom Tilt",
            fullName:targetPrefix + preferenceAdjustments,
            dispName:targetPrefix,
            fileName:targetPrefix + " Target",
            // basedOn: when dfBaseline auto-applies dfBase, the original `df`
            // target has been filtered out of activePhones, so the Custom Tilt
            // row needs to mirror its baseline-selected state.
            basedOn: df};
        phoneObj.rawChannels = [tiltOct];
        phoneObj.id = -69;
        
        let oldPhoneObj = phoneObjs.filter(p => p.phone == "Custom Tilt")[0];
        if (oldPhoneObj) {
            // Replace in-place rather than removePhone(oldPhoneObj) so the visual transition stays smooth.
            phoneObj.id = oldPhoneObj.id;
            phoneObjs[phoneObjs.indexOf(oldPhoneObj)] = phoneObj;
            oldPhoneObj.active = false;
            activePhones = activePhones.filter(p => p.active);
            updatePhoneTable();
        } else {
            phoneObjs.push(phoneObj);
        }
        showPhone(phoneObj, true);

        if (dfBaseline) {
            setBaseline(dfBase);
            drawLabels();
        }
        renderTargetsUI();
    };

    const COMPLETE_NUMBER_INPUT = /^-?(?:\d+\.?\d*|\.\d+)$/;
    let customTargetTrackTimer = null;
    function bindCusdfInput(selector, setter) {
        doc.select(selector)
            .on("change input", function () {
                let raw = (this.value || "").trim();
                if (!COMPLETE_NUMBER_INPUT.test(raw)) return;
                let num = Number(raw);
                if (!Number.isFinite(num)) return;
                setter(num);
                updateDF(boost, tilt, ear, treble);
                if (typeof window.trackFeatureUsed === "function") {
                    window.trackFeatureUsed("custom_target_adjusted");
                }
                clearTimeout(customTargetTrackTimer);
                customTargetTrackTimer = setTimeout(() => {
                    if (typeof window.trackTargetSelected === "function") {
                        window.trackTargetSelected("Custom Tilt", "custom_sliders");
                    }
                }, 1200);
            })
            .on("blur", function () {
                updateDispVals();
            });
    }
    bindCusdfInput("#cusdf-bass", v => boost  = v);
    bindCusdfInput("#cusdf-tilt", v => tilt   = v);
    bindCusdfInput("#cusdf-ear",  v => ear    = v);
    bindCusdfInput("#cusdf-treb", v => treble = v);
                            
    // Harman Filters button
    if (harmanFilters) {
        doc.select("#cusdf-harmanfilters").on("click", function () {
            const currentClass = this.classList[0];
            const currentIndex = harmanFilters.findIndex(filter => filter.name.split(' ').join('') === currentClass);
            const nextIndex = (currentIndex + 1) % harmanFilters.length;
            const nextFilter = harmanFilters[nextIndex];
        
            this.classList.remove(currentClass);
            this.classList.add(nextFilter.name.split(' ').join(''));
            tilt = nextFilter.tilt;
            boost = nextFilter.bass_shelf;
            treble = nextFilter.treble;
            ear = nextFilter.ear;
        
            updateDF(boost, tilt, ear, treble);
            updateDispVals();
        });
    }

    // Preference Bounds
    let targetsHiddenByBounds = [];

    // button to toggle preference bounds
    let boundsBtn = doc.select("#cusdf-bounds").on("click", function () {
        // set button class to selected
        if (boundsBtn.classed("selected")) {
            boundsBtn.classed("selected", false);
            // remove preference bounds
            removePhone(prefBoundsObj);

            // Un-hide only the targets we hid, and only if they're still hidden
            // (user may have un-hidden one manually in the meantime).
            targetsHiddenByBounds.forEach(p => { if (p.hide) toggleHide(p); });
            targetsHiddenByBounds = [];
        } else {
            boundsBtn.classed("selected", true);
            // set baseline
            prepPrefBounds();
            setBaseline(dfBase);

            // show preference bounds
            activePhones.push(prefBoundsObj);
            prefBoundsObj.active = true;
            setCurves(prefBoundsObj, undefined, prefBoundsObj.lr);
            updatePaths();

            // Hide currently-shown targets and remember them so disable can restore.
            targetsHiddenByBounds = activePhones.filter(p => p.isTarget && !p.hide);
            targetsHiddenByBounds.forEach(p => toggleHide(p));
        }
    });

    function setBrand(b, exclusive) {
        let phoneSel = doc.select("#phones").selectAll("div.phone-item");
        let incl = currentBrands.indexOf(b) !== -1;
        let hasBrand = (p,b) => p.brand===b || p.collab===b;
        if (exclusive || currentBrands.length===0) {
            currentBrands.forEach(br => br.active = false);
            if (incl) {
                currentBrands = [];
                phoneSel.style("display", null);
                phoneSel.select("span").text(p=>p.fullName);
            } else {
                currentBrands = [b];
                phoneSel.style("display", p => hasBrand(p,b)?null:"none");
                phoneSel.filter(p => hasBrand(p,b)).select("span").text(p=>p.phone);
            }
        } else {
            if (incl) return;
            if (currentBrands.length === 1) {
                phoneSel.select("span").text(p=>p.fullName);
            }
            currentBrands.push(b);
            phoneSel.filter(p => hasBrand(p,b)).style("display", null);
        }
        if (!incl) b.active = true;
        brandSel.classed("active", br => br.active);
    }

    let phoneSearch = new Fuse(
        allPhones,
        {
            shouldSort: false,
            tokenize: false,
            threshold: 0.2,
            minMatchCharLength: 2,
            keys: [
                {weight:0.3, name:"dispBrand"},
                {weight:0.1, name:"brand.suffix"},
                {weight:0.6, name:"phone"}
            ]
        }
    );
    let brandSearch = new Fuse(
        brands,
        {
            shouldSort: false,
            tokenize: false,
            threshold: 0.05,
            minMatchCharLength: 3,
            keys: [
                {weight:0.9, name:"name"},
                {weight:0.1, name:"suffix"},
            ]
        }
    );
    doc.select(".search").on("input", function () {
        //d3.select(this).attr("placeholder",null);
        let fn, bl = brands;
        let c = currentBrands;
        let test = p => c.indexOf(p.brand )!==-1
                     || c.indexOf(p.collab)!==-1;
        if (this.value.length > 1) {
            let s = phoneSearch.search(this.value),
                t = c.length ? s.filter(test) : s;
            if (t.length) s = t;
            fn = p => s.indexOf(p)!==-1;
            let b = brandSearch.search(this.value);
            if (b.length) bl = b;
        } else {
            fn = c.length ? test : (p=>true);
        }
        let phoneSel = doc.select("#phones").selectAll("div.phone-item");
        phoneSel.style("display", p => fn(p)?null:"none");
        brandSel.style("display", b => bl.indexOf(b)!==-1?null:"none");
    });


    doc.select("#theme").on("click", function () {
        themeChooser("change");
    });
    
    userConfigApplyNormalization();
});

let pathHoverTimeout;
function pathHL(c, m, imm) {
    gpath.selectAll("path").classed("highlight", c ? d=>d===c   : false);
    table.selectAll("tr")  .classed("highlight", c ? p=>p===c.p : false);
    if (pathHoverTimeout) { clearTimeout(pathHoverTimeout); }
    if(!stickyLabels) {
        clearLabels();
        pathHoverTimeout =
            imm ? pathTooltip(c, m) :
            c   ? setTimeout(pathTooltip, 400, c, m) :
            undefined;
    }
}
function pathTooltip(c, m) {
    let g = getLabelsLayer().selectAll(".lineLabel").data([c])
        .join("g").attr("class","lineLabel");
    let t = g.append("text")
        .attrs({x:m[0], y:m[1]-6, fill:getTooltipColor(c)})
        .text(d => getCurveDisplayLabel(d));
    let b = t.node().getBBox(),
        o = pad.l+W - b.width;
    if (o < b.x) { t.attr("x",o); b.x=o; }
    // Background
    g.insert("rect", "text")
        .attrs({x:b.x-1, y:b.y-1, width:b.width+2, height:b.height+2});
}
let interactInspect = false;

function getInspectChannelRank(c) {
    let ch = c.channel;
    if (!ch && c.chIdx !== undefined) ch = (c.chIdx === 1 ? "R" : (c.chIdx === 0 ? "L" : null));
    if (!ch && c.id) {
        if (/─\s*R|\(\s*R/i.test(c.id)) ch = "R";
        else if (/-\s*-\s*L|\(\s*L/i.test(c.id)) ch = "L";
        else if (/\(\s*AVG/i.test(c.id)) ch = "AVG";
    }
    if (ch === "R") return 0;
    if (ch === "L") return 1;
    if (ch === "AVG") return 2;
    return 3;
}

function getOrderedInspectCurves() {
    let phoneOrder = new Map();
    activePhones.forEach((p, idx) => phoneOrder.set(p, idx));

    let targets = [];
    let models = [];
    activePhones.forEach(p => {
        if (!p || p.hide || p.isPrefBounds || !p.activeCurves) return;
        p.activeCurves.forEach(c => {
            if (c.isTarget || (c.p && c.p.isTarget)) {
                targets.push(c);
            } else {
                models.push(c);
            }
        });
    });

    models.sort((a, b) => {
        let pa = phoneOrder.get(a.p) ?? 9999;
        let pb = phoneOrder.get(b.p) ?? 9999;
        if (pa !== pb) return pa - pb;
        let ra = getInspectChannelRank(a);
        let rb = getInspectChannelRank(b);
        if (ra !== rb) return ra - rb;
        return (a.sIdx || 0) - (b.sIdx || 0);
    });

    return targets.concat(models);
}

function renderInspectAt(m, opts) {
    let freqOnly = !!(opts && opts.freqOnly);
    let orderedCs = freqOnly ? [] : getOrderedInspectCurves();
    if (!m || (!freqOnly && !orderedCs.length)) {
        stopInspect();
        return;
    }

    let ind = fr_to_ind(x.invert(m[0]));
    ind = Math.max(0, Math.min(ind, f_values.length - 1));
    let x1 = x(f_values[ind]),
        x0 = ind > 0 ? x(f_values[ind - 1]) : x1,
        sel = m[0] - x0 < x1 - m[0],
        xv = sel ? x0 : x1;
    ind -= sel;
    ind = Math.max(0, Math.min(ind, f_values.length - 1));

    function initInspector(e) {
        e.attr("class", "inspector");
        e.append("line").attrs({ x1: 0, x2: 0, y1: pad.t, y2: pad.t + H });
        let c = e.append("g").attr("class", "inspectContent").style("filter", "url(#inspect-halo)");
        c.append("text").attr("class", "insp_dB").attr("x", 2);
    }

    let insp = getToolsLayer().selectAll(".inspector").data([xv])
        .join(enter => enter.append("g").call(initInspector))
        .attr("transform", "translate(" + xv + ",0)");
    insp.raise();

    let content = insp.select(".inspectContent");
    if (content.empty()) {
        insp.selectAll("*").remove();
        initInspector(insp);
        content = insp.select(".inspectContent");
    }

    // Reset transform before measuring bounding box
    content.attr("transform", "translate(0,0)");

    let rawFreq = f_values[ind] || 1000;
    let fmtFreq = rawFreq >= 1000 ? (rawFreq / 1000).toFixed(1) + " kHz" : Math.round(rawFreq) + " Hz";
    let dBText = content.select(".insp_dB").text(fmtFreq);

    if (freqOnly) {
        content.selectAll(".inspectLabel").remove();
        let targetY = y((typeof yCenter !== "undefined" ? yCenter : 0) + 14);
        let upperGridY = Math.max(pad.t + 58, Math.min(pad.t + H - 14, targetY));
        dBText.attr("y", upperGridY);
    } else {
        let entries = orderedCs.map(c => {
            let fn = baseline.fn(c.l);
            let pt = fn && fn[ind];
            let val = pt ? pt[1] + getOffset(c.p) : 0;
            return { c: c, val: val, curveY: y(val) };
        });

        function newTooltip(t) {
            t.attr("class", "inspectLabel");
            t.append("text").attr("class", "insp_name").attrs({ x: 2 });
            let valG = t.append("g").attr("class", "insp_val");
            valG.append("text").attrs({ x: -16, "text-anchor": "end" });
            valG.append("text").attrs({ x: -16, "text-anchor": "start" });
        }

        let tt = content.selectAll(".inspectLabel").data(entries.map(d => d.c), d => (d.p && d.p.eqSnapshotId ? d.p.eqSnapshotId + ":" : "") + d.id)
            .join(enter => enter.append("g").call(newTooltip))
            .order();

        tt.select(".insp_name")
            .style("fill", d => (d.isTarget || (d.p && d.p.isTarget)) ? "var(--graph-target-text, #666666)" : getTooltipColor(d).toString())
            .text(d => getCurveDisplayLabel(d));

        tt.select(".insp_val").selectAll("text")
            .style("fill", function() {
                let parentDatum = d3.select(this.parentNode.parentNode).datum();
                return (parentDatum.isTarget || (parentDatum.p && parentDatum.p.isTarget)) ? "var(--graph-target-text, #666666)" : getTooltipColor(parentDatum).toString();
            });

        tt.each(function(_, i) {
            let val = entries[i].val;
            let s = val < -0.05 ? "-" : "";
            let absVal = Math.abs(val) + 0.05;
            let intPart = s + Math.floor(absVal) + ".";
            let decPart = Math.floor((absVal % 1) * 10);

            let valTexts = d3.select(this).select(".insp_val").selectAll("text").nodes();
            if (valTexts.length >= 2) {
                d3.select(valTexts[0]).text(intPart);
                d3.select(valTexts[1]).text(decPart);
            }
        });

        // Unified consistent stacked block layout: frequency header on top, then Reference -> R -> L
        let rowStep = 15;
        let headerGap = 16;
        let rowsSpan = Math.max(0, entries.length - 1) * rowStep;
        let meanCurveY = entries.length ? d3.mean(entries, e => e.curveY) : (pad.t + H / 2);
        let desiredHeaderY = meanCurveY - headerGap - rowsSpan / 2;
        let minHeaderY = pad.t + 14;
        let maxHeaderY = Math.max(minHeaderY, pad.t + H - 6 - headerGap - rowsSpan);
        let headerY = Math.max(minHeaderY, Math.min(maxHeaderY, desiredHeaderY));

        dBText.attr("y", headerY);
        tt.attr("transform", (_, i) => "translate(0," + (headerY + headerGap + i * rowStep) + ")");
    }

    // Clamp horizontally inside [pad.l, pad.l + W]
    let bbox = content.node() ? content.node().getBBox() : null;
    let minX = pad.l;
    let maxX = pad.l + W;
    let dx = 0;
    if (bbox && bbox.width > 0) {
        let leftEdge = xv + bbox.x;
        let rightEdge = xv + bbox.x + bbox.width;
        if (leftEdge < minX) {
            dx = minX - leftEdge;
        } else if (rightEdge > maxX) {
            dx = maxX - rightEdge;
        }
    }
    content.attr("transform", "translate(" + dx + ",0)");
}

let graphInteract = imm => function () {
    let m = d3.mouse(gr.node());
    if (interactInspect) {
        renderInspectAt(m);
        return;
    }
    let cs = d3.merge(activePhones.map(p => (p.hide || p.isPrefBounds) ? [] : p.activeCurves));
    if (!cs.length) return;
    let d = 30 * W0 / gr.node().getBoundingClientRect().width,
        sl = range_to_slice([-1, 1], s => m[0] + d * s);
    let ind = cs
        .map(c =>
            sl(baseline.fn(c.l))
                .map(p => Math.hypot(x(p[0]) - m[0], y(p[1] + getOffset(c.p)) - m[1]))
                .reduce((a, b) => Math.min(a, b), d)
        )
        .reduce((a, b, i) => b < a[1] ? [i, b] : a, [-1, d])[0];
    pathHL(ind === -1 ? false : cs[ind], m, imm);
};

function stopInspect() { getToolsLayer().selectAll(".inspector").remove(); }
function deactivateInspect() {
    interactInspect = false;
    doc.select("#inspector").classed("selected", false);
    stopInspect();
    if (typeof window.syncGraphToolOverlayState === "function") {
        window.syncGraphToolOverlayState();
    }
}
function resetGraphTools() {
    deactivateInspect();
    if (typeof window.deactivateCalc === "function") {
        window.deactivateCalc();
    }
}
window.renderInspectAt = renderInspectAt;
window.stopInspect = stopInspect;
window.deactivateInspect = deactivateInspect;
window.resetGraphTools = resetGraphTools;

doc.select("#inspector").on("click", function () {
    let btn = d3.select(this);
    interactInspect = !interactInspect;
    btn.classed("selected", interactInspect);
    if (interactInspect && typeof window.deactivateCalc === "function") {
        window.deactivateCalc();
    }
    if (typeof window.syncGraphToolOverlayState === "function") {
        window.syncGraphToolOverlayState();
    }
    if (!interactInspect && !(typeof interactCalc !== "undefined" && interactCalc)) {
        stopInspect();
    }
    if (interactInspect && typeof window.trackFeatureUsed === "function") {
        window.trackFeatureUsed("inspect_tool");
    }
});

let graphInteractRect = gr.append("rect")
    .attrs({x:pad.l,y:pad.t,width:W,height:H,opacity:0})
    .on("mousemove", graphInteract())
    .on("mouseout", () => {
        if (interactInspect) {
            stopInspect();
        } else if (!(typeof interactCalc !== "undefined" && interactCalc)) {
            pathHL(false);
        }
    })
    .on("click", graphInteract(true))
    .on("dblclick", function () {
        if (typeof window.onGraphDoubleClickEQ === "function") {
            window.onGraphDoubleClickEQ(d3.mouse(this));
        }
    });

let eqHandlesLayer = gr.append("g")
    .attr("class", "eq-handles-layer")
    .attr("mask", "url(#graphFade)");


// ==========================================
// Calculate Band Area Mode Integration
// ==========================================

// Initialize Calculate Band Area Component
document.addEventListener("DOMContentLoaded", function() {
    if (typeof initCalculateComponent === 'function') {
        initCalculateComponent();
    }
});
doc.select("#expandTools").on("click", function () {
    let t=doc.select(".tools"), cl="collapseTools", v=!t.classed(cl);
    [t,doc.select(".targets")].forEach(s=>s.classed(cl, v));
});

d3.selectAll(".helptip").on("click", function() {
    let e = d3.select(this);
    e.classed("active", !e.classed("active"));
});

// Copy URL button functionality
function copyUrlInit() {
    let copyUrlButton = document.querySelector("button#copy-url");

    copyUrlButton.addEventListener("click", function(e) {
        let urlHost = document.createElement('input'),
            currentUrl = targetWindow.location.href;

        urlHost.setAttribute("style","position: fixed; opacity: 0.0;");
        urlHost.value = currentUrl;
        document.body.appendChild(urlHost);

        urlHost.select();
        document.execCommand('copy');
        document.body.removeChild(urlHost);

        e.stopPropagation();

        copyUrlButton.classList.add("clicked");
        setTimeout(function() {
            copyUrlButton.classList.remove("clicked");
        }, 600);
        
        // Analytics event
        if (typeof window.trackGraphExported === "function") {
            window.trackGraphExported("copy_url");
        }
    });
}
copyUrlInit();

// Theme switcher (themeChooser) lives in assets/js/theme.js.

// Map faux download button
function mapDownloadFaux() {
    let downloadButton = document.querySelector("button#download"),
        downloadFaux = document.querySelector("button#download-faux");
    
    if (downloadFaux && downloadButton) {
        downloadFaux.addEventListener("click", function() {
            downloadButton.click();
        });
    }
}
mapDownloadFaux();

function mapScreenshotBtn() {
    let screenshotBtn = document.querySelector("button#screenshot-btn");
    if (screenshotBtn) {
        screenshotBtn.addEventListener("click", function() {
            if (window.copyGraphScreenshot4K) window.copyGraphScreenshot4K();
        });
    }
}
mapScreenshotBtn();

// Set focused scroll list
function setFocusedList(selectedList) {
    let listsContainer = document.querySelector("div.select");

    listsContainer.setAttribute("data-selected", selectedList)
}

function focusedListClicks() {
    let listClickTragets = document.querySelectorAll("*[data-list=\"brands\"], *[data-list=\"models\"]");

    listClickTragets.forEach((clickedTarget) => {
        clickedTarget.addEventListener("click", () => {
            let selectedList = clickedTarget.getAttribute("data-list")
            setFocusedList(selectedList);
            window.hideExtraPanel && window.hideExtraPanel(selectedList);
        });
    });

    let brandsList = document.querySelector("div.scroll#brands");
    
    brandsList.addEventListener("click", function(e) {
        let clickedElem = e.target,
            clickedElemIsBrand = clickedElem.matches("div.scroll#brands div");
        
        if (clickedElemIsBrand) {
            setFocusedList("models");
            e.stopPropagation();
        }
    });

}
focusedListClicks();

function focusedListSwipes() {
    let horizontalSwipeTarget = document.querySelector("div.scroll-container"),
        listsContainer = document.querySelector("div.select"),
        swipableList = document.querySelector("div.scrollOuter[data-list=\"models\"]");
    
    if (!horizontalSwipeTarget || !listsContainer || !swipableList) return;

    let touchDelta = 0,
        touchStart = 0,
        selectedList = "";
    
    horizontalSwipeTarget.addEventListener("touchstart", function(e) {
        selectedList = listsContainer.getAttribute("data-selected");
        touchStart = e.targetTouches[0].screenX;
        touchDelta = 0;
    }, { passive: true });

    horizontalSwipeTarget.addEventListener("touchmove", function(e) {
        if (!touchStart) return;
        let touchNow = e.targetTouches[0].screenX;
        touchDelta = touchNow - touchStart;
        let touchDeltaNegative = 0 - touchDelta;
        
        if ( selectedList === "models" && touchDelta > 0 && touchDelta < 100 ) {
            swipableList.setAttribute("style","right: "+ touchDeltaNegative +"px;");
        }
        
        if ( selectedList === "brands" && touchDelta < 0 && touchDelta > -100 ) {
            swipableList.setAttribute("style","right: "+ touchDeltaNegative +"px;");
        }
    }, { passive: true });

    horizontalSwipeTarget.addEventListener("touchend", function(e) {
        if ( touchDelta > 49 ) {
            listsContainer.setAttribute("data-selected","brands");
        }

        if ( touchDelta < -50 ) {
            listsContainer.setAttribute("data-selected","models");
        }
        
        swipableList.setAttribute("style","");
        touchStart = 0;
        touchDelta = 0;
    });
}
focusedListSwipes();

// Scroll list to active phone on init
function scrollToActive() {
    try {
        let phoneList = document.querySelector('div.scroll#phones'),
            firstActivePhone = document.querySelector('div.phone-item[style*=border]'),
            offset = firstActivePhone.offsetTop - 26;

        phoneList.scrollTop = offset;
    }
    catch {}
}

// Set focused panel
function setFocusedPanel() {
    let panelsContainer = document.querySelector("main.main"),
        primaryPanel = document.querySelector(".parts-primary"),
        secondaryPanel = document.querySelector(".parts-secondary"),
        phonesList = document.querySelector("div#phones"),
        mobileHelper = document.querySelector("tr.mobile-helper");
    
    if (panelsContainer) {
        panelsContainer.setAttribute("data-focused-panel","secondary");
    }
    
    if (mobileHelper && panelsContainer) {
        mobileHelper.addEventListener("click", function() {
            panelsContainer.setAttribute("data-focused-panel","secondary");
        });
    }

    let drawerToggle = document.querySelector("#drawer-toggle");
    if (drawerToggle && panelsContainer) {
        drawerToggle.addEventListener("click", function(e) {
            e.stopPropagation();
            let current = panelsContainer.getAttribute("data-focused-panel");
            panelsContainer.setAttribute("data-focused-panel", current === "primary" ? "secondary" : "primary");
        });
    }

    if (secondaryPanel && panelsContainer) {
        secondaryPanel.addEventListener("click", function(e) {
            // When collapsed, tapping anywhere on the visible drawer peek expands it
            if (panelsContainer.getAttribute("data-focused-panel") === "primary") {
                panelsContainer.setAttribute("data-focused-panel","secondary");
            }
        });
    }

    if (primaryPanel && panelsContainer) {
        primaryPanel.addEventListener("click", function(e) {
            // Tap-to-dismiss: when drawer is open, tapping anywhere outside on the upper panel dismisses it
            if (panelsContainer.getAttribute("data-focused-panel") === "secondary" && window.innerWidth <= 1000) {
                panelsContainer.setAttribute("data-focused-panel", "primary");
            }
        });
    }
    
    // Vertical swipe targets on drawer handle and tabs (excludes input.search to avoid keyboard typing conflicts)
    let verticalSwipeTargets = document.querySelectorAll("div.drawer-handle, div.selector-tabs");
    
    verticalSwipeTargets.forEach(function(target) {
        let touchStart = 0,
            touchDelta = 0,
            focusedPanel = "";

        target.addEventListener("touchstart", function(e) {
            let panels = document.querySelector("main.main");
            focusedPanel = panels ? panels.getAttribute("data-focused-panel") : "secondary";
            touchStart = e.targetTouches[0].screenY;
            touchDelta = 0;
        }, { passive: true });

        target.addEventListener("touchmove", function(e) {
            if (!touchStart) return;
            let touchNow = e.targetTouches[0].screenY;
            touchDelta = touchNow - touchStart;

            if ( focusedPanel === "secondary" && touchDelta > 0 && touchDelta < 200 && secondaryPanel) {
                secondaryPanel.setAttribute("style", "top: " + touchDelta + "px;");
            } else if ( focusedPanel === "primary" && touchDelta < 0 && touchDelta > -200 && secondaryPanel) {
                secondaryPanel.setAttribute("style", "top: " + touchDelta + "px;");
            }
        }, { passive: true });

        target.addEventListener("touchend", function(e) {
            if ( touchDelta > 49 && panelsContainer ) {
                panelsContainer.setAttribute("data-focused-panel","primary");
            }

            if ( touchDelta < -50 && panelsContainer ) {
                panelsContainer.setAttribute("data-focused-panel","secondary");
            }

            if (secondaryPanel) {
                secondaryPanel.setAttribute("style", "");
            }
            touchStart = 0;
            touchDelta = 0;
        });
    
        target.addEventListener("wheel", function(e) {
            let wheelDelta = e.deltaY;

            if (wheelDelta < -5) {
                panelsContainer.setAttribute("data-focused-panel","primary");
            }

            if (wheelDelta > 5) {
                panelsContainer.setAttribute("data-focused-panel","secondary");
            }
        });
    });
}
setFocusedPanel();

// Mobile Top Adjustments Tray (Views / Preferences)
function initMobileAdjustments() {
    let btnViews = document.querySelector("#btn-toggle-views"),
        btnPrefs = document.querySelector("#btn-toggle-prefs");

    if (btnViews) {
        btnViews.addEventListener("click", function(e) {
            e.stopPropagation();
            let targets = document.querySelector(".targets");
            let prefs = document.querySelector(".customDF");
            let isOpen = targets && targets.classList.contains("mobile-tray-open");

            if (prefs) prefs.classList.remove("mobile-tray-open");
            if (btnPrefs) btnPrefs.classList.remove("active");

            if (targets) {
                targets.classList.toggle("mobile-tray-open", !isOpen);
                btnViews.classList.toggle("active", !isOpen);
            }
        });
    }

    if (btnPrefs) {
        btnPrefs.addEventListener("click", function(e) {
            e.stopPropagation();
            let targets = document.querySelector(".targets");
            let prefs = document.querySelector(".customDF");
            let isOpen = prefs && prefs.classList.contains("mobile-tray-open");

            if (targets) targets.classList.remove("mobile-tray-open");
            if (btnViews) btnViews.classList.remove("active");

            if (prefs) {
                prefs.classList.toggle("mobile-tray-open", !isOpen);
                btnPrefs.classList.toggle("active", !isOpen);
            }
        });
    }
}
initMobileAdjustments();

// Shared horizontal drag + wheel scroll helper for compact mobile tool strips
function enableHorizontalDragScroll(el) {
    if (!el || el.dataset.dragScrollBound === "true") return;
    el.dataset.dragScrollBound = "true";

    let isDown = false;
    let startX = 0;
    let startScrollLeft = 0;
    let hasDragged = false;

    el.addEventListener("dragstart", function(e) {
        e.preventDefault();
    });

    el.addEventListener("mousedown", function(e) {
        if (e.button !== 0) return;
        if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "SELECT")) return;
        if (el.scrollWidth <= el.clientWidth) return;
        isDown = true;
        hasDragged = false;
        startX = e.clientX;
        startScrollLeft = el.scrollLeft;
        el.classList.add("is-dragging");
    });

    window.addEventListener("mousemove", function(e) {
        if (!isDown) return;
        let dx = e.clientX - startX;
        if (Math.abs(dx) > 4) {
            hasDragged = true;
            e.preventDefault();
        }
        el.scrollLeft = startScrollLeft - dx;
    });

    window.addEventListener("mouseup", function() {
        if (!isDown) return;
        isDown = false;
        el.classList.remove("is-dragging");
        if (hasDragged) {
            let blockClick = function(ev) {
                ev.preventDefault();
                ev.stopPropagation();
            };
            window.addEventListener("click", blockClick, true);
            setTimeout(function() {
                window.removeEventListener("click", blockClick, true);
            }, 0);
        }
    });

    el.addEventListener("wheel", function(e) {
        if (el.scrollWidth <= el.clientWidth) return;
        if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
            el.scrollLeft += e.deltaY;
            e.preventDefault();
        }
    }, { passive: false });
}
window.enableHorizontalDragScroll = enableHorizontalDragScroll;
enableHorizontalDragScroll(document.querySelector("div.tools"));
enableHorizontalDragScroll(document.querySelector("div.external-links"));

function initMobileGraphTopSync() {
    let mainEl = document.querySelector("main.main");
    let graphBox = document.querySelector("div.graphBox");
    if (!mainEl || !graphBox) return;

    function syncTop() {
        if (window.innerWidth > 1000) {
            mainEl.style.removeProperty("--graph-total-top");
            return;
        }
        let h = graphBox.getBoundingClientRect().height;
        if (h > 0) {
            mainEl.style.setProperty("--graph-total-top", Math.round(h) + "px");
        }
    }

    if (typeof ResizeObserver !== "undefined") {
        new ResizeObserver(syncTop).observe(graphBox);
    }
    window.addEventListener("resize", syncTop);
    requestAnimationFrame(syncTop);
}
initMobileGraphTopSync();

// Blur focus from inputs on submit
function blurFocus() {
    let inputFields = document.querySelectorAll("input"),
        body = document.querySelector("body");
    
    inputFields.forEach(function(field) {
        field.addEventListener("keyup", function(e) {
            if (e.keyCode === 13) {
                field.blur();
            }
        });
        
        field.addEventListener("focus", function() {
            body.setAttribute("data-input-state","focus");
        });
        
        field.addEventListener("blur", function() {
            body.setAttribute("data-input-state","blur");
        });
    });
}
blurFocus();

// Extra panel (parametric EQ, uploads, tone generator) lives in assets/js/eqPanel.js.
// Exposes window.showExtraPanel, window.hideExtraPanel, window.updateEQPhoneSelect.

// Add accessories to the bottom of the page, if configured
function addAccessories() {
    let accessoriesBar = document.querySelector("div.accessories"),
        accessoriesContainer = document.createElement("aside");
    
    accessoriesContainer.innerHTML = whichAccessoriesToUse;
    accessoriesBar.append(accessoriesContainer);
}
if (accessories) { addAccessories(); }

// Helper: crisp monochrome SVGs for social channels & external tool icon
function getBrandSocialSvg(id) {
    switch (id) {
        case "youtube":
            return `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M23.5 6.2a3.01 3.01 0 0 0-2.12-2.13C19.5 3.56 12 3.56 12 3.56s-7.5 0-9.38.51A3.01 3.01 0 0 0 .5 6.2 31.4 31.4 0 0 0 0 12a31.4 31.4 0 0 0 .5 5.8 3.01 3.01 0 0 0 2.12 2.13c1.88.51 9.38.51 9.38.51s7.5 0 9.38-.51a3.01 3.01 0 0 0 2.12-2.13A31.4 31.4 0 0 0 24 12a31.4 31.4 0 0 0-.5-5.8ZM9.6 15.6V8.4l6.26 3.6-6.26 3.6Z"/></svg>`;
        case "tiktok":
            return `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.3 0 .58.04.85.13V9.01a6.33 6.33 0 0 0-.85-.06A6.34 6.34 0 0 0 3.15 15.3 6.34 6.34 0 0 0 9.49 21.64a6.34 6.34 0 0 0 6.34-6.34V8.73a8.2 8.2 0 0 0 4.78 1.52V6.81a4.85 4.85 0 0 1-1.02-.12Z"/></svg>`;
        case "instagram":
            return `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M7.75 2h8.5A5.75 5.75 0 0 1 22 7.75v8.5A5.75 5.75 0 0 1 16.25 22h-8.5A5.75 5.75 0 0 1 2 16.25v-8.5A5.75 5.75 0 0 1 7.75 2Zm0 2A3.75 3.75 0 0 0 4 7.75v8.5A3.75 3.75 0 0 0 7.75 20h8.5A3.75 3.75 0 0 0 20 16.25v-8.5A3.75 3.75 0 0 0 16.25 4h-8.5ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm5.5-2.75a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5Z"/></svg>`;
        default:
            return "";
    }
}

function getExternalArrowSvg() {
    return `<svg class="tool-ext-icon" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" d="M6.5 3.5H12.5V9.5M12.5 3.5L5.5 10.5"/></svg>`;
}

function getVisibleSocials() {
    if (typeof socialLinks === "undefined" || !Array.isArray(socialLinks)) return [];
    return socialLinks.filter(s => s && !s.hidden && s.url);
}

function getVisibleTools() {
    if (typeof ecosystemTools === "undefined" || !Array.isArray(ecosystemTools)) return [];
    return ecosystemTools.filter(t => t && !t.hidden && t.url);
}

function buildToolPillElement(tool, extraClass) {
    const a = document.createElement("a");
    a.className = "tool-pill" + (extraClass ? " " + extraClass : "");
    a.href = tool.url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.innerHTML = `<span class="tool-pill-label"></span>${getExternalArrowSvg()}`;
    a.querySelector(".tool-pill-label").textContent = tool.name;
    a.addEventListener("click", function() {
        if (typeof window.trackOutboundClick === "function") {
            window.trackOutboundClick("tool", tool.name, tool.url);
        }
    });
    return a;
}

function buildSocialLinkElement(social, showLabel) {
    const a = document.createElement("a");
    a.className = "social-link social-link-" + social.id + (showLabel ? " social-link-labeled" : "");
    a.href = social.url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.setAttribute("title", social.name);
    a.setAttribute("aria-label", social.name);
    a.innerHTML = getBrandSocialSvg(social.id);
    if (showLabel) {
        const span = document.createElement("span");
        span.textContent = social.name;
        a.append(span);
    }
    a.addEventListener("click", function() {
        if (typeof window.trackOutboundClick === "function") {
            window.trackOutboundClick("social", social.name, social.url);
        }
    });
    return a;
}

// Add header to alt layout
function addHeader() {
    let graphToolContainer = document.querySelector("div.graphtool"),
        altHeaderElem = document.createElement("header"),
        headerTopRow = document.createElement("div"),
        headerButton = document.createElement("button"),
        headerLogoElem = document.createElement("div"),
        headerLogoLink = document.createElement("a"),
        headerLogoImg = document.createElement("img"),
        headerLogoSpan = document.createElement("span"),
        headerSocials = document.createElement("div"),
        headerToolsRow = document.createElement("div"),
        headerDrawer = document.createElement("div"),
        linksList = document.createElement("ul");

    altHeaderElem.className = "header";
    altHeaderElem.setAttribute("data-links", "collapsed");

    headerTopRow.className = "header-top-row";
    headerButton.className = "header-button";
    headerButton.setAttribute("type", "button");
    headerButton.setAttribute("aria-label", "Toggle navigation menu");
    headerButton.setAttribute("aria-expanded", "false");

    headerLogoElem.className = "logo";
    headerLogoLink.setAttribute('href', (typeof headerLogoUrl !== "undefined" && headerLogoUrl) ? headerLogoUrl : site_url);
    headerLogoSpan.innerText = headerLogoText;
    headerLogoLink.append(headerLogoSpan);
    if (headerLogoImgUrl) {
        headerLogoImg.setAttribute("src", headerLogoImgUrl);
        headerLogoLink.append(headerLogoImg);
    }
    headerLogoElem.append(headerLogoLink);

    headerSocials.className = "header-socials";
    headerSocials.setAttribute("aria-label", "Social media");
    const visibleSocials = getVisibleSocials();
    visibleSocials.forEach(function(social) {
        headerSocials.append(buildSocialLinkElement(social, false));
    });

    headerTopRow.append(headerButton, headerLogoElem, headerSocials);
    altHeaderElem.append(headerTopRow);

    // Row 2 (desktop): Audio ecosystem tool pills
    const visibleTools = getVisibleTools();
    headerToolsRow.className = "header-tools-row";
    headerToolsRow.setAttribute("aria-label", "Audio tools");
    visibleTools.forEach(function(tool) {
        headerToolsRow.append(buildToolPillElement(tool));
    });
    if (visibleTools.length > 0) {
        altHeaderElem.append(headerToolsRow);
    }

    // Mobile slide-out drawer (Tools + Socials + optional links + Sponsor slot)
    headerDrawer.className = "header-drawer";
    headerDrawer.setAttribute("aria-label", "Mobile navigation");

    if (visibleTools.length > 0) {
        const toolsSection = document.createElement("div");
        toolsSection.className = "drawer-section";
        const toolsTitle = document.createElement("div");
        toolsTitle.className = "drawer-section-title";
        toolsTitle.textContent = "Audio Tools";
        const toolsWrap = document.createElement("div");
        toolsWrap.className = "drawer-tools-list";
        visibleTools.forEach(function(tool) {
            toolsWrap.append(buildToolPillElement(tool, "drawer-tool-pill"));
        });
        toolsSection.append(toolsTitle, toolsWrap);
        headerDrawer.append(toolsSection);
    }

    if (visibleSocials.length > 0) {
        const socialsSection = document.createElement("div");
        socialsSection.className = "drawer-section";
        const socialsTitle = document.createElement("div");
        socialsTitle.className = "drawer-section-title";
        socialsTitle.textContent = "Socials";
        const socialsWrap = document.createElement("div");
        socialsWrap.className = "drawer-socials-list";
        visibleSocials.forEach(function(social) {
            socialsWrap.append(buildSocialLinkElement(social, true));
        });
        socialsSection.append(socialsTitle, socialsWrap);
        headerDrawer.append(socialsSection);
    }

    linksList.className = "header-links";
    if (headerLinks && headerLinks.length > 0) {
        headerLinks.forEach(function(link) {
            let linkContainerElem = document.createElement("li"),
                linkElem = document.createElement("a");

            linkElem.setAttribute("href", link.url);
            if (alt_header_new_tab || (link.url && link.url.startsWith("http"))) {
                linkElem.setAttribute("target", "_blank");
                linkElem.setAttribute("rel", "noopener noreferrer");
            }
            if (link.external) {
                linkElem.setAttribute("target", "_blank");
                linkElem.setAttribute("rel", "noopener noreferrer");
                linkElem.classList.add('external');
            }
            linkElem.textContent = link.name;
            linkContainerElem.append(linkElem);
            linksList.append(linkContainerElem);
        });
        headerDrawer.append(linksList);
    }

    const mobileSponsorMount = document.createElement("div");
    mobileSponsorMount.className = "mobile-menu-sponsor";
    mobileSponsorMount.id = "mobile-menu-sponsor";
    headerDrawer.append(mobileSponsorMount);

    altHeaderElem.append(headerDrawer);

    if (allowCreatorSupport && typeof creatorSupportUrl !== "undefined" && creatorSupportUrl) {
        const scriptHtml = `<a href='${creatorSupportUrl}' target='_blank' style="margin-top: auto; margin-bottom: auto; margin-right: 10px"><img height='33' style='border:0px; height:33px;'
                            src='https://storage.ko-fi.com/cdn/kofi5.png?v=3' border='0' alt='Support the Creator' /></a>`;
        headerTopRow.insertAdjacentHTML('beforeend', scriptHtml);
    }

    graphToolContainer.prepend(altHeaderElem);

    function setDrawerOpen(open) {
        altHeaderElem.setAttribute("data-links", open ? "expanded" : "collapsed");
        headerButton.setAttribute("aria-expanded", open ? "true" : "false");
    }

    headerButton.addEventListener("click", function() {
        const isExpanded = altHeaderElem.getAttribute("data-links") === "expanded";
        setDrawerOpen(!isExpanded);
    });

    headerDrawer.addEventListener("click", function(e) {
        if (e.target.closest("a")) {
            setDrawerOpen(false);
        }
    });

    document.addEventListener("keydown", function(e) {
        if (e.key === "Escape" && altHeaderElem.getAttribute("data-links") === "expanded") {
            setDrawerOpen(false);
        }
    });
}
if (alt_layout && alt_header) { addHeader(); }

// Subtle below-controls duplicate of audio tools & social channels
function addFooterEcosystem() {
    const container = document.querySelector("div.footer-ecosystem");
    if (!container) return;

    const visibleTools = getVisibleTools();
    const visibleSocials = getVisibleSocials();
    if (visibleTools.length === 0 && visibleSocials.length === 0) return;

    if (visibleTools.length > 0) {
        const toolsGroup = document.createElement("div");
        toolsGroup.className = "footer-eco-group";
        const label = document.createElement("span");
        label.className = "footer-eco-label";
        label.textContent = "Tools";
        toolsGroup.append(label);
        visibleTools.forEach(function(tool) {
            toolsGroup.append(buildToolPillElement(tool, "footer-eco-pill"));
        });
        container.append(toolsGroup);
    }

    if (visibleSocials.length > 0) {
        const socialsGroup = document.createElement("div");
        socialsGroup.className = "footer-eco-group footer-eco-socials";
        const label = document.createElement("span");
        label.className = "footer-eco-label";
        label.textContent = "Follow";
        socialsGroup.append(label);
        visibleSocials.forEach(function(social) {
            socialsGroup.append(buildSocialLinkElement(social, false));
        });
        container.append(socialsGroup);
    }
}
addFooterEcosystem();

// Add external links to bar at bottom of page, if configured
function addExternalLinks() {
    const externalLinksBar = document.querySelector("div.external-links");

    linkSets.forEach(function(set) {
        let setLabelHtml = document.createElement("span"),
            setLabelText = set.label,
            links = set.links;
        
        setLabelHtml.textContent = setLabelText;
        externalLinksBar.append(setLabelHtml);
        
        links.forEach(function(link) {
            let linkHtml = document.createElement("a"),
                linkName = link.name,
                linkUrl = link.url;
            
            linkHtml.textContent = linkName;
            linkHtml.setAttribute("href", linkUrl);
            linkHtml.setAttribute("target", "_blank");
            linkHtml.setAttribute("rel", "noopener noreferrer");
            linkHtml.addEventListener("click", function() {
                if (typeof window.trackOutboundClick === "function") {
                    window.trackOutboundClick("resource", linkName, linkUrl);
                }
            });
            externalLinksBar.append(linkHtml);
        });
    });
}
if (externalLinksBar) { addExternalLinks(); }

// Tutorial overlay (addTutorial) lives in assets/js/tutorial.js.

// Set active graph site link
function setActiveDatabase() {
    let url = targetWindow.location.href,
        dbLinks = document.querySelectorAll("div.external-links a");

    dbLinks.forEach(function(link) {
        let linkUrl = link.getAttribute("href");

        if ( url.includes(linkUrl) ) {
            link.setAttribute("class", "active");
        }
    });
}
setActiveDatabase();

// Expand / collapse function
function toggleExpandCollapse() {
    const graphIsIframe = window.top !== window.self,
        graphBody = document.querySelector("body"),
        parentBody = window.top.document.querySelector("body"),
        expandCollapseButton = document.querySelector("button#expand-collapse");
    
    
    if ( graphIsIframe) { graphBody.setAttribute("data-graph-frame", "collapsed"); }
    
    
    if ( graphIsIframe && expandableOnly ) {
        const expandOnlyMax = ( expandableOnly === true ) ? 1000000:expandableOnly,
            expandOnlyStyle = document.createElement("style"),
            expandOnlyCss = `
            @media ( max-width: `+ expandOnlyMax +`px ) {
                body[data-expandable="only"][data-graph-frame="collapsed"] {
                    overflow: hidden;
                }

                body[data-expandable="only"][data-graph-frame="collapsed"] div.expand-collapse {
                    position: fixed;
                    top: 0;
                    left: 0;

                    display: flex;
                    justify-content: center;
                    align-items: center;

                    width: 100%;
                    height: 100%;
                    padding: 0;

                    background-color: var(--background-color);
                    background-color: transparent;
                    border: none;
                }

                body[data-expandable="only"][data-graph-frame="collapsed"] div.expand-collapse:after {
                    position: absolute;

                    content: 'Tap to launch graph tool';

                    color: var(--font-color-primary);
                    font-family: var(--font-secondary);
                    font-size: 11px;
                    line-height: 1em;
                    text-transform: uppercase;

                    pointer-events: none;
                }

                body[data-expandable="only"][data-graph-frame="collapsed"] div.expand-collapse button#expand-collapse {
                    display: flex;
                    justify-content: center;
                    align-items: center;

                    width: 100%;
                    height: 100%;

                    background-color: transparent;
                }

                body[data-expandable="only"][data-graph-frame="collapsed"] div.expand-collapse button#expand-collapse:before {
                    position: relative;
                    z-index: 1;

                    transform: scale(7);
                }

                body[data-expandable="only"][data-graph-frame="collapsed"] div.expand-collapse button#expand-collapse:after {
                    position: absolute;
                    top: 0;
                    left: 0;

                    content: '';

                    display: block;
                    width: 100%;
                    height: 100%;

                    background-color: var(--background-color);

                    opacity: 0.9;
                }

                body[data-expandable="only"][data-graph-frame="collapsed"] section.parts-primary {
                    flex: 100% 1 1;
                    overflow: hidden;
                }

                body[data-expandable="only"][data-graph-frame="collapsed"] section.parts-secondary {
                    display: none;
                }
            }
        `;
        
        expandOnlyStyle.textContent = expandOnlyCss;
        expandOnlyStyle.setAttribute("type", "text/css");
        document.querySelector("body").append(expandOnlyStyle);
        
        graphBody.setAttribute("data-expandable", "only");
    } else if ( graphIsIframe && expandable ) {
        graphBody.setAttribute("data-expandable", "true");
    }
    
    const parentStyle = window.top.document.createElement("style"),
          parentCss = `
            :root {
                --header-height: `+ headerHeight +`;
            }
            
            body[data-graph-frame="expanded"] {
                width: 100%;
                height: 100%;
                max-height: -webkit-fill-available;
                overflow: hidden;
            }
            
            body[data-graph-frame="expanded"] button.graph-frame-collapse {
                display: inherit;
            }
            
            body[data-graph-frame="expanded"] iframe#GraphTool {
                position: fixed;
                top: var(--header-height);
                left: 0;
                
                width: 100% !important;
                height: calc(100% - var(--header-height)) !important;

                animation-name: graph-tool-expand;
                animation-duration: 0.15s;
                animation-iteration-count: 1;
                animation-timing-function: ease-out;
                animation-fill-mode: forwards;
            }

            @keyframes graph-tool-expand {
                0% {
                    position: relative;
                    opacity: 1.0;
                    transform: scale(1.0);
                }
                48% {
                    position: relative;
                    opacity: 0.0;
                    transform: scale(0.9);
                }
                50% {
                    position: fixed;
                    opacity: 0.0;
                    transform: scale(0.9);
                }
                52% {
                    position: fixed;
                    opacity: 0.0;
                    transform: scale(0.9);
                }
                100% {
                    position: fixed;
                    opacity: 1.0;
                    transform: scale(1.0);
                }
            }`;
    
    parentStyle.textContent = parentCss;
    parentStyle.setAttribute("type", "text/css");
    parentBody.append(parentStyle);
    
    expandCollapseButton.addEventListener("click", function(e) {
        let frameState = document.querySelector("body").getAttribute("data-graph-frame");
        
        if ( frameState === "expanded" ) {
            graphBody.setAttribute("data-graph-frame", "collapsed");
            parentBody.setAttribute("data-graph-frame", "collapsed");
        } else {
            graphBody.setAttribute("data-graph-frame", "expanded");
            parentBody.setAttribute("data-graph-frame", "expanded");
        }
        
        e.stopPropagation();
    });
        
}

if ( expandable && accessDocumentTop ) { toggleExpandCollapse(); }

// Update user config for target + baseline
function setUserConfig() {
    let urlObj = new URL(document.URL),
        pathClean = urlObj.pathname.replace(/\W/g, ""),
        configName = pathClean.length > 0 ? "_" + pathClean + "_a" : "_a",
        configJson = {
            "phones": [],
            "normalMode": (norm_sel === 1) ? "Hz" : "dB",
            "normalValue": (norm_sel === 1) ? norm_fr : norm_phon
        },
        activeBaseline = baseline.p ? baseline.p.fileName : 0;
    
    activePhones.forEach(function(phone) {
        let phoneJson = {},
            fullName = phone.fullName,
            fileName = phone.fileName,
            isTarget = Boolean(phone.isTarget),
            isHidden = Boolean(phone.hide),
            isBaseline = fileName === activeBaseline,
            isPinned = Boolean(phone.pin);
        
        if (isTarget || isBaseline) {
            phoneJson.fullName = fullName;
            phoneJson.fileName = fileName;
            phoneJson.isTarget = isTarget;
            phoneJson.isHidden = isHidden;
            phoneJson.isBaseline = isBaseline;
            phoneJson.isPinned = isPinned;
            
            configJson.phones.push(phoneJson);
        }
    });
    
    localStorage.setItem("userConfig" + configName, JSON.stringify(configJson));
}

// Insert user config phones to inits
function userConfigAppendInits(initReq) {
    if (targetRestoreLastUsed) {
        let urlObj = new URL(document.URL),
            pathClean = urlObj.pathname.replace(/\W/g, ""),
            configName = pathClean.length > 0 ? "_" + pathClean + "_a" : "_a",
            configJson = JSON.parse(localStorage.getItem("userConfig" + configName)),
            configNumOfPhones = configJson ? configJson.phones.length : 0;

        if (configJson && configNumOfPhones) {
            initReq.slice(0).forEach(function(item) {
                if (item.endsWith(' Target')) {
                    initReq.splice(initReq.indexOf(item), 1);
                }
            });

            configJson.phones.forEach(function(phone) {
                if (!initReq.includes(phone.fileName)) {
                    initReq.push(phone.fileName);
                }
            });
        }
    }
}

// Apply baseline and hide settings
function userConfigApplyViewSettings(phoneInTable) {
    if (targetRestoreLastUsed) {
        userConfigApplicationActive = 1;

        let urlObj = new URL(document.URL),
            pathClean = urlObj.pathname.replace(/\W/g, ""),
            configName = pathClean.length > 0 ? "_" + pathClean + "_a" : "_a",
            configJson = JSON.parse(localStorage.getItem("userConfig" + configName));

        if (configJson) {
            let phone = configJson.phones.find(item => item.fileName === phoneInTable);

            if (typeof phone !== "undefined") {
                let row = document.querySelector("tr[data-filename='"+ phone.fileName +"']"),
                    hideButton  = row.querySelector("td.hideIcon"),
                    baselineButton  = row.querySelector("td.button-baseline"),
                    pinButton = row.querySelector("td.button-pin");

                if (hideButton && phone.isHidden && !hideButton.classList.contains("selected")) {
                    hideButton.click();
                }

                if (baselineButton && phone.isBaseline && !baselineButton.classList.contains("selected")) {
                    baselineButton.click();
                }

                if (pinButton && phone.isPinned && pinButton.getAttribute('data-pinned') !== "true") {
                    pinButton.click();
                }
            }
        }

        userConfigApplicationActive = 0;
    }
};

// Apply normalization config
function userConfigApplyNormalization() {
    userConfigApplicationActive = 1;
    
    let urlObj = new URL(document.URL),
        pathClean = urlObj.pathname.replace(/\W/g, ""),
        configName = pathClean.length > 0 ? "_" + pathClean + "_a" : "_a",
        configJson = JSON.parse(localStorage.getItem("userConfig" + configName));
    
    if ( configJson && configJson.normalMode === "Hz" ) {
        document.querySelector("input#norm-fr").value = configJson.normalValue;
        document.querySelector("input#norm-fr").dispatchEvent(new Event("change"));
    } else if ( configJson && configJson.normalMode === "dB" ) {
        document.querySelector("input#norm-phon").value = configJson.normalValue;
        document.querySelector("input#norm-phon").dispatchEvent(new Event("change"));
    }
    
    userConfigApplicationActive = 0;
}
