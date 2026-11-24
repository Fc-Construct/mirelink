// Extra panel: parametric EQ, file uploads, target/song uploads, pure EQ curve overlay,
// real-time FFT spectrum analyzer, tone generator, and channel balance.

// Exposes window.showExtraPanel, window.hideExtraPanel, window.updateEQPhoneSelect,
// window.redrawEQOverlay, window.transitionEQOverlay
// (referenced from showPhone / removePhone / updateVariant / zoom / y-scale / updatePaths in graphtool.js & phoneTable.js).
// Reads activePhones, showPhone, removePhone, Equalizer, f_values, doc, gr, eqOverlayLayer, x, y, yCenter, pad, W, H, W0, H0.

const SVG_ICON = {
    play:    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M3 22v-20l18 10-18 10z"/></svg>',
    pause:   '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M11 22h-4v-20h4v20zm6-20h-4v20h4v-20z"/></svg>',
    volume:  '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M6 7l8-5v20l-8-5v-10zm-6 10h4v-10h-4v10zm20.264-13.264l-1.497 1.497c1.847 1.783 2.983 4.157 2.983 6.767 0 2.61-1.135 4.984-2.983 6.766l1.498 1.498c2.305-2.153 3.735-5.055 3.735-8.264s-1.43-6.11-3.736-8.264zm-.489 8.264c0-2.084-.915-3.967-2.384-5.391l-1.503 1.503c1.011 1.049 1.637 2.401 1.637 3.888 0 1.488-.623 2.841-1.634 3.891l1.503 1.503c1.468-1.424 2.381-3.309 2.381-5.394z"/></svg>',
    muted:   '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M19 7.358v15.642l-8-5v-.785l8-9.857zm3-6.094l-1.548-1.264-3.446 4.247-6.006 3.753v3.646l-2 2.464v-6.11h-4v10h.843l-3.843 4.736 1.548 1.264 18.452-22.736z"/></svg>'
};

const DEFAULT_EQ_FILTERS = [
    { type: "LSQ", freq: 60,    gain: 0, q: 0.71, disabled: false },
    { type: "PK",  freq: 200,   gain: 0, q: 1.0,  disabled: false },
    { type: "PK",  freq: 500,   gain: 0, q: 1.0,  disabled: false },
    { type: "PK",  freq: 1000,  gain: 0, q: 1.0,  disabled: false },
    { type: "PK",  freq: 3000,  gain: 0, q: 1.0,  disabled: false },
    { type: "PK",  freq: 6000,  gain: 0, q: 1.0,  disabled: false },
    { type: "PK",  freq: 8000,  gain: 0, q: 1.0,  disabled: false },
    { type: "HSQ", freq: 10000, gain: 0, q: 0.71, disabled: false }
];

function addExtra() {
    let extraButton = document.querySelector("div.select > div.selector-tabs > button.extra");
    // Disable functions by config
    if (!extraEnabled) {
        if (extraButton) extraButton.remove();
        return;
    }
    if (!extraUploadEnabled) {
        document.querySelector("div.extra-panel > div.extra-upload").style["display"] = "none";
    }
    if (!extraEQEnabled) {
        document.querySelector("div.extra-panel > div.extra-eq").style["display"] = "none";
    }

    // Show and hide extra panel
    window.showExtraPanel = () => {
        document.querySelector("div.select > div.selector-panel").style["display"] = "none";
        document.querySelector("div.select > div.extra-panel").style["display"] = "flex";
        document.querySelector("div.select").setAttribute("data-selected", "extra");
        if (analyticsEnabled) { pushEventTag("clicked_equalizerTab", targetWindow); }
    };
    window.hideExtraPanel = (selectedList) => {
        document.querySelector("div.select > div.selector-panel").style["display"] = "flex";
        document.querySelector("div.select > div.extra-panel").style["display"] = "none";
        document.querySelector("div.select").setAttribute("data-selected", selectedList);
    };
    extraButton.addEventListener("click", showExtraPanel);

    // Upload function
    let uploadType = null;
    let fileFR = document.querySelector("#file-fr");
    document.querySelector("div.extra-upload-buttons > button.upload-fr").addEventListener("click", () => {
        uploadType = "fr";
        fileFR.click();
    });
    document.querySelector("div.extra-upload-buttons > button.upload-target").addEventListener("click", () => {
        uploadType = "target";
        fileFR.click();
    });
    let fileAudio = document.querySelector("#file-audio");
    document.querySelector("div.extra-upload-buttons > button.upload-track").addEventListener("click", () => {
        uploadType = "audio";
        fileAudio.click();
    });

    let addOrUpdatePhone = (brand, phone, ch) => {
        let phoneObj = asPhoneObj(brand, phone);
        phoneObj.rawChannels = ch;
        phoneObj.isDynamic = true;
        let phoneObjs = brand.phoneObjs;
        let oldPhoneObj = phoneObjs.filter(p => p.phone == phone.name)[0];
        if (oldPhoneObj) {
            oldPhoneObj.active && removePhone(oldPhoneObj);
            phoneObj.id = oldPhoneObj.id;
            phoneObj.offset = oldPhoneObj.offset;
            phoneObjs[phoneObjs.indexOf(oldPhoneObj)] = phoneObj;
            allPhones[allPhones.indexOf(oldPhoneObj)] = phoneObj;
        } else {
            brand.phones.push(phone);
            phoneObjs.push(phoneObj);
            allPhones.push(phoneObj);
        }
        updatePhoneSelect();
        return phoneObj;
    };

    fileFR.addEventListener("change", (e) => {
        let file = e.target.files[0];
        if (!file) {
            return;
        }
        let reader = new FileReader();
        reader.onload = (ev) => {
            let name = file.name.replace(/\.[^\.]+$/, "");
            let phone = { name: name };
            let ch = [tsvParse(ev.target.result)];
            if (ch[0].length < 32) {
                alert("Parse frequence response file failed: invalid format.");
                return;
            }
            ch[0] = Equalizer.interp(f_values, ch[0]);
            if (uploadType === "fr") {
                name.match(/ R$/) && ch.splice(0, 0, null);
                let phoneObj = addOrUpdatePhone(brandMap.Uploaded, phone, ch);
                showPhone(phoneObj, false);
            } else if (uploadType === "target") {
                let fullName = name + (name.match(/ Target$/i) ? "" : " Target");
                let existsTargets = targets.reduce((a, b) => a.concat(b.files), []).map(f => f += " Target");
                if (existsTargets.indexOf(fullName) >= 0) {
                    alert("This target already exists on this tool, please select it instead of upload.");
                    return;
                }
                let phoneObj = {
                    isTarget: true,
                    brand: brandTarget,
                    dispName: name,
                    phone: name,
                    fullName: fullName,
                    fileName: fullName,
                    rawChannels: ch,
                    isDynamic: true,
                    id: -brandTarget.phoneObjs.length
                };
                showPhone(phoneObj, true);
            }
        };
        reader.readAsText(file);
        e.target.value = "";
    });

    // Audio context & EQ demo state (hoisted early so fileAudio & filter callbacks can reference safely)
    let pinkNoiseAudio, pinkNoiseSource, scarletFireAudio, scarletFireSource,
        uploadedAudio, uploadedSource, uploadedObjectURL, currentAudio, currentSource;
    let toneGenActive = false;
    let isPlayingAudio = false;

    let audioContext = new (window.AudioContext || window.webkitAudioContext)();
    if (!audioContext) {
        alert("Web audio api is disabled, please enable it if you want to use EQ testing functions.");
        return;
    }

    // Dual AnalyserNodes for high-precision real-time FFT spectrum (16384-pt, pre-fader metering)
    const FFT_SIZE = 16384;
    const FFT_SMOOTH_SLOW = 0.89;
    const FFT_SMOOTH_FAST = 0.74;

    let preAnalyser = audioContext.createAnalyser();
    preAnalyser.fftSize = FFT_SIZE;
    preAnalyser.smoothingTimeConstant = FFT_SMOOTH_SLOW;
    preAnalyser.minDecibels = -95;
    preAnalyser.maxDecibels = -5;

    let postAnalyser = audioContext.createAnalyser();
    postAnalyser.fftSize = FFT_SIZE;
    postAnalyser.smoothingTimeConstant = FFT_SMOOTH_SLOW;
    postAnalyser.minDecibels = -95;
    postAnalyser.maxDecibels = -5;

    let preMeterTap = audioContext.createGain();
    preMeterTap.gain.value = 1;
    preMeterTap.connect(preAnalyser);

    let postMeterTap = audioContext.createGain();
    postMeterTap.gain.value = 1;
    postMeterTap.connect(postAnalyser);

    // Parallel Dry/Wet Audio Backbone (click-free crossfading, K-weighted auto-gain & shared anti-clipping ceiling)
    const volumeIcon = document.querySelector(".volume-icon");
    const volumeRange = document.getElementById("volumeRange");
    let currentVolume = 70;
    let volumeNode = audioContext.createGain();
    volumeNode.gain.value = 0.7;

    let sourceBus = audioContext.createGain();
    sourceBus.gain.value = 1;
    sourceBus.connect(preMeterTap);

    let dryGain = audioContext.createGain();
    dryGain.gain.value = 1;

    let wetInputSplit = audioContext.createChannelSplitter(2);
    let wetOutputMerge = audioContext.createChannelMerger(2);
    let wetGain = audioContext.createGain();
    wetGain.gain.value = 0;

    let postEqSum = audioContext.createGain();
    postEqSum.gain.value = 1;

    let safetyGain = audioContext.createGain();
    safetyGain.gain.value = 1;

    sourceBus.connect(dryGain);
    dryGain.connect(postEqSum);

    sourceBus.connect(wetInputSplit);
    wetOutputMerge.connect(wetGain);
    wetGain.connect(postEqSum);

    let channelSplitter = audioContext.createChannelSplitter(2);
    let channelMerger = audioContext.createChannelMerger(2);
    let rightChannel = audioContext.createGain();
    let leftChannel = audioContext.createGain();

    postEqSum.connect(safetyGain);
    safetyGain.connect(channelSplitter);

    channelSplitter.connect(leftChannel, 0);
    channelSplitter.connect(rightChannel, 1);
    leftChannel.connect(channelMerger, 0, 0);
    rightChannel.connect(channelMerger, 0, 1);

    // Tap post-EQ / post-balance BEFORE monitor volumeNode so spectrum stays independent of listening level
    channelMerger.connect(postMeterTap);
    channelMerger.connect(volumeNode);
    volumeNode.connect(audioContext.destination);

    // EQ State & Additive L+R / L / R Scopes
    let eqPhoneSelect = document.querySelector("div.extra-eq select[name='phone']");
    let filtersContainer = document.querySelector("div.extra-eq > div.filters");
    let fileFiltersImport = document.querySelector("#file-filters-import");
    let disableFiltersBtn = document.querySelector("div.extra-eq button.disable-filters");
    let scopeButtons = document.querySelectorAll("div.extra-eq button.eq-scope-btn");
    let eqInfoToggle = document.getElementById("eq-info-toggle");
    let eqInfoPopover = document.getElementById("eq-info-popover");
    let filterEnabledInput, filterTypeSelect,
        filterFreqInput, filterQInput, filterGainInput;
    let isBypassed = false;

    if (eqInfoToggle && eqInfoPopover) {
        let eqInfoPinned = false;
        let eqInfoCloseTimer = null;
        const setEqInfoOpen = (open) => {
            eqInfoPopover.classList.toggle("hidden", !open);
            eqInfoToggle.setAttribute("aria-expanded", open ? "true" : "false");
        };
        const scheduleHoverClose = () => {
            clearTimeout(eqInfoCloseTimer);
            eqInfoCloseTimer = setTimeout(() => {
                if (!eqInfoPinned) setEqInfoOpen(false);
            }, 120);
        };
        eqInfoToggle.addEventListener("mouseenter", () => {
            clearTimeout(eqInfoCloseTimer);
            setEqInfoOpen(true);
        });
        eqInfoToggle.addEventListener("mouseleave", scheduleHoverClose);
        eqInfoPopover.addEventListener("mouseenter", () => {
            clearTimeout(eqInfoCloseTimer);
        });
        eqInfoPopover.addEventListener("mouseleave", scheduleHoverClose);
        eqInfoToggle.addEventListener("click", (e) => {
            e.stopPropagation();
            clearTimeout(eqInfoCloseTimer);
            eqInfoPinned = !eqInfoPinned;
            setEqInfoOpen(eqInfoPinned);
        });
        document.addEventListener("click", (e) => {
            if (eqInfoPopover.classList.contains("hidden")) return;
            if (!eqInfoToggle.contains(e.target) && !eqInfoPopover.contains(e.target)) {
                eqInfoPinned = false;
                setEqInfoOpen(false);
            }
        });
        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape" && !eqInfoPopover.classList.contains("hidden")) {
                eqInfoPinned = false;
                setEqInfoOpen(false);
            }
        });
    }

    const cloneDefaultFilters = () => DEFAULT_EQ_FILTERS.map(f => Object.assign({}, f));
    let eqScope = "LR"; // "LR" | "L" | "R"
    let scopeFilters = {
        LR: cloneDefaultFilters(),
        L: cloneDefaultFilters(),
        R: cloneDefaultFilters()
    };
    let eqBands = scopeFilters[eqScope].length;

    // Overlay & FFT controls
    let btnEqOverlay = document.querySelector("div.extra-eq button.toggle-eq-overlay");
    let btnFftToggle = document.querySelector("div.extra-eq button.toggle-fft");
    let btnFftDrawer = document.querySelector("div.extra-eq button.toggle-fft-drawer");
    let fftDrawerEl = document.querySelector("div.extra-eq div.fft-drawer");
    let btnFftPeak = document.querySelector("div.extra-eq button.toggle-fft-peak");
    let fftStyleButtons = document.querySelectorAll("div.extra-eq button.fft-style");
    let fftModeButtons = document.querySelectorAll("div.extra-eq button.fft-mode");
    let fftSpeedButtons = document.querySelectorAll("div.extra-eq button.fft-speed");

    let eqOverlayEnabled = false;
    let eqOverlayUserDismissed = false;
    let fftEnabled = true;
    let fftStyle = "bars"; // "bars" | "wave"
    let fftMode = "post";  // "post" | "pre"
    let fftSpeed = "slow"; // "slow" | "fast"
    let fftPeakEnabled = false;

    function syncEqOverlayButton() {
        if (btnEqOverlay) {
            btnEqOverlay.classList.toggle("selected", eqOverlayEnabled);
        }
    }

    let updateFilterRowInputs = () => {
        filterEnabledInput = filtersContainer.querySelectorAll("input[name='enabled']");
        filterTypeSelect = filtersContainer.querySelectorAll("select[name='type']");
        filterFreqInput = filtersContainer.querySelectorAll("input[name='freq']");
        filterQInput = filtersContainer.querySelectorAll("input[name='q']");
        filterGainInput = filtersContainer.querySelectorAll("input[name='gain']");
        filtersContainer.querySelectorAll("input,select").forEach(el => {
            el.removeEventListener("input", onFilterFieldInput);
            el.addEventListener("input", onFilterFieldInput);
            if (el.matches("select[name='type']")) {
                el.removeEventListener("change", onFilterTypeChange);
                el.addEventListener("change", onFilterTypeChange);
            }
        });
    };

    let onFilterTypeChange = (e) => {
        let row = e.target.closest("div.filter");
        if (!row) return;
        let qInput = row.querySelector("input[name='q']");
        if (qInput && (!parseFloat(qInput.value) || parseFloat(qInput.value) <= 0)) {
            qInput.value = (e.target.value === "LSQ" || e.target.value === "HSQ") ? "0.71" : "1";
            applyEQ();
        }
    };

    let onFilterFieldInput = () => {
        applyEQ();
    };

    let updateFilterElements = () => {
        let node = filtersContainer.querySelector("div.filter");
        while (filtersContainer.childElementCount < eqBands) {
            let clone = node.cloneNode(true);
            clone.querySelector("input[name='enabled']").checked = true;
            clone.querySelector("select[name='type']").value = "PK";
            clone.querySelector("input[name='freq']").value = "1000";
            clone.querySelector("input[name='q']").value = "1";
            clone.querySelector("input[name='gain']").value = "0";
            filtersContainer.appendChild(clone);
        }
        while (filtersContainer.childElementCount > eqBands) {
            filtersContainer.children[filtersContainer.childElementCount - 1].remove();
        }
        updateFilterRowInputs();
    };

    let readDOMFilters = (includeAll) => {
        let filters = [];
        for (let i = 0; i < eqBands; ++i) {
            let disabled = !filterEnabledInput[i].checked;
            let type = filterTypeSelect[i].value;
            let freq = parseFloat(filterFreqInput[i].value) || 0;
            let q = parseFloat(filterQInput[i].value) || 0;
            let gain = parseFloat(filterGainInput[i].value) || 0;
            if (!includeAll && (disabled || !type || !freq || !q || !gain)) {
                continue;
            }
            filters.push({ disabled, type, freq, q, gain });
        }
        return filters;
    };

    let saveCurrentScopeDOM = () => {
        if (!filterEnabledInput || !filterEnabledInput.length) return;
        scopeFilters[eqScope] = readDOMFilters(true);
    };

    let getScopeFilters = (scope, includeAll, ignoreBypass) => {
        if (isBypassed && !includeAll && !ignoreBypass) {
            return [];
        }
        let list = (scope === eqScope && filterEnabledInput && filterEnabledInput.length)
            ? readDOMFilters(true)
            : (scopeFilters[scope] || []);
        if (includeAll) {
            return list.map(f => Object.assign({}, f));
        }
        return list.filter(f => !f.disabled && f.type && f.freq && f.q && f.gain)
            .map(f => Object.assign({}, f));
    };

    // Backwards-compatible active filters list for current scope / channel totals
    let getTotalChannelFilters = (channel, ignoreBypass) => {
        let shared = getScopeFilters("LR", false, ignoreBypass);
        if (channel === "L") return shared.concat(getScopeFilters("L", false, ignoreBypass));
        if (channel === "R") return shared.concat(getScopeFilters("R", false, ignoreBypass));
        return shared;
    };

    let getActiveScopeDisplayFilters = (ignoreBypass) => {
        if (eqScope === "L") return getTotalChannelFilters("L", ignoreBypass);
        if (eqScope === "R") return getTotalChannelFilters("R", ignoreBypass);
        return getTotalChannelFilters("LR", ignoreBypass);
    };

    let elemToFilters = (includeAll, ignoreBypass) => {
        if (includeAll) {
            saveCurrentScopeDOM();
            return (scopeFilters[eqScope] || []).map(f => Object.assign({}, f));
        }
        return getActiveScopeDisplayFilters(ignoreBypass);
    };

    let filtersToElem = (filters) => {
        let filtersCopy = filters.map(f => Object.assign({}, f));
        if (!filtersCopy.length) {
            filtersCopy = cloneDefaultFilters();
        }
        eqBands = Math.min(Math.max(filtersCopy.length, 1), extraEQBandsMax);
        filtersCopy = filtersCopy.slice(0, eqBands);
        updateFilterElements();
        filtersCopy.forEach((f, i) => {
            filterEnabledInput[i].checked = !f.disabled;
            filterTypeSelect[i].value = f.type || "PK";
            filterFreqInput[i].value = f.freq;
            filterQInput[i].value = f.q;
            filterGainInput[i].value = f.gain;
        });
        scopeFilters[eqScope] = readDOMFilters(true);
    };

    function updateScopeIndicators() {
        saveCurrentScopeDOM();
        syncEQOverlayColors();
        scopeButtons.forEach(btn => {
            let s = btn.getAttribute("data-scope") || "LR";
            btn.classList.toggle("selected", s === eqScope);
            let hasActive = getScopeFilters(s, false, true).length > 0;
            btn.classList.toggle("has-active", hasActive);
        });
    }

    function setActiveEQScope(nextScope) {
        if (nextScope !== "LR" && nextScope !== "L" && nextScope !== "R") return;
        saveCurrentScopeDOM();
        eqScope = nextScope;
        let nextList = scopeFilters[eqScope] || cloneDefaultFilters();
        filtersToElem(nextList);
        updateScopeIndicators();
        drawEQOverlay(0);
    }

    scopeButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            setActiveEQScope(btn.getAttribute("data-scope") || "LR");
        });
    });

    let resetDefaultFilters = () => {
        scopeFilters.LR = cloneDefaultFilters();
        scopeFilters.L = cloneDefaultFilters();
        scopeFilters.R = cloneDefaultFilters();
        filtersToElem(scopeFilters[eqScope]);
        eqOverlayEnabled = false;
        eqOverlayUserDismissed = false;
        syncEqOverlayButton();
        setBypassState(false, false);
        updateScopeIndicators();
    };

    let setBypassState = (bypassed, shouldApply = true) => {
        isBypassed = !!bypassed;
        if (disableFiltersBtn) {
            disableFiltersBtn.classList.toggle("selected", isBypassed);
            disableFiltersBtn.innerText = isBypassed ? "Bypassed" : "Bypass";
        }
        if (shouldApply) {
            applyEQ();
        }
    };

    // Pure EQ transfer curve overlay on #fr-graph (renders active total for current scope)
    function getEffectiveCenter() {
        return (typeof yCenter !== "undefined") ? yCenter : 60;
    }

    function buildEQOverlayData(filters) {
        if (typeof Equalizer === "undefined" || typeof f_values === "undefined") return [];
        let coeffs = [];
        for (let i = 0; i < filters.length; i++) {
            let f = filters[i];
            if (!f.freq || !f.gain || !f.q) continue;
            if (f.type === "LSQ") coeffs.push(Equalizer.lowshelf(f.freq, f.q, f.gain));
            else if (f.type === "HSQ") coeffs.push(Equalizer.highshelf(f.freq, f.q, f.gain));
            else if (f.type === "PK") coeffs.push(Equalizer.peaking(f.freq, f.q, f.gain));
        }
        let gains = coeffs.length ? Equalizer.calc_gains(f_values, coeffs) : new Array(f_values.length).fill(0);
        let center = getEffectiveCenter();
        return f_values.map((freq, idx) => [freq, center + gains[idx]]);
    }

    function syncEQOverlayColors() {
        if (typeof document === "undefined" || typeof d3 === "undefined") return;
        let phoneSelected = eqPhoneSelect ? eqPhoneSelect.value : "";
        let phonesList = (typeof activePhones !== "undefined" && Array.isArray(activePhones)) ? activePhones : [];
        let basePhone = phoneSelected && phonesList.find(
            p => !p.isPrefBounds && !p.isTarget && (p.brand.name + " " + p.dispName === phoneSelected)
        );
        let eqPhone = (basePhone && basePhone.eq && basePhone.eq.active)
            ? basePhone.eq
            : phonesList.find(p => p.eqParent && p.active);

        let hclColor = null;
        if (eqPhone && typeof getCurveColor === "function") {
            hclColor = getCurveColor(eqPhone.id, 0, eqPhone.hexColor, { p: eqPhone });
            if (typeof color_curveToText === "function") {
                hclColor = color_curveToText(hclColor);
            }
        } else if (typeof curatedPalette !== "undefined" && curatedPalette.length > 1) {
            hclColor = curatedPalette[1];
        }

        if (!hclColor) return;
        let rgb = d3.rgb(hclColor);
        if (!rgb || isNaN(rgb.r)) return;

        let r = Math.round(Math.max(0, Math.min(255, rgb.r)));
        let g = Math.round(Math.max(0, Math.min(255, rgb.g)));
        let b = Math.round(Math.max(0, Math.min(255, rgb.b)));
        let rootStyle = document.documentElement.style;
        rootStyle.setProperty("--eq-overlay-color", `rgb(${r}, ${g}, ${b})`);
        rootStyle.setProperty("--eq-overlay-fill", `rgba(${r}, ${g}, ${b}, 0.10)`);
        rootStyle.setProperty("--eq-overlay-ref", `rgba(${r}, ${g}, ${b}, 0.36)`);
    }

    function drawEQOverlay(durationMs) {
        syncEQOverlayColors();
        if (typeof eqOverlayLayer === "undefined" || !eqOverlayLayer || eqOverlayLayer.empty()) return;
        if (!eqOverlayEnabled) {
            eqOverlayLayer.selectAll("*").remove();
            return;
        }
        let center = getEffectiveCenter();
        let configuredFilters = getActiveScopeDisplayFilters(true);
        let hasConfigured = configuredFilters.length > 0;
        let curvePts = buildEQOverlayData(configuredFilters);

        // Reference zero line at yCenter
        let refLine = eqOverlayLayer.selectAll("line.eq-overlay-ref").data([center]);
        refLine.enter()
            .append("line")
            .attr("class", "eq-overlay-ref")
            .merge(refLine)
            .classed("is-bypassed", isBypassed)
            .attr("x1", pad.l)
            .attr("x2", pad.l + W)
            .attr("y1", y(center))
            .attr("y2", y(center));

        // Subtle fill to center line (kept visually dimmed on Bypass for instant visual A/B)
        let areaGen = d3.area()
            .x(d => x(d[0]))
            .y0(() => y(center))
            .y1(d => y(d[1]))
            .curve(d3.curveNatural);

        let areaPath = eqOverlayLayer.selectAll("path.eq-overlay-area").data(hasConfigured ? [curvePts] : []);
        areaPath.exit().remove();
        let areaSel = areaPath.enter()
            .append("path")
            .attr("class", "eq-overlay-area")
            .merge(areaPath)
            .classed("is-bypassed", isBypassed);
        if (durationMs) {
            areaSel.transition().duration(durationMs).attr("d", d => areaGen(d));
        } else {
            areaSel.attr("d", d => areaGen(d));
        }

        // Main EQ curve stroke: maintains active total EQ shape when Bypassed, dimmed for audio/visual A/B
        let strokePath = eqOverlayLayer.selectAll("path.eq-overlay-line").data(curvePts.length ? [curvePts] : []);
        strokePath.exit().remove();
        let strokeSel = strokePath.enter()
            .append("path")
            .attr("class", "eq-overlay-line")
            .merge(strokePath)
            .classed("is-flat", !hasConfigured)
            .classed("is-bypassed", isBypassed);
        if (durationMs) {
            strokeSel.transition().duration(durationMs).attr("d", d => line(d));
        } else {
            strokeSel.attr("d", d => line(d));
        }
    }

    window.redrawEQOverlay = () => drawEQOverlay(0);
    window.transitionEQOverlay = (dur) => drawEQOverlay(dur || 700);

    function hasAnyActiveFilters(ignoreBypass) {
        return getScopeFilters("LR", false, ignoreBypass).length > 0 ||
               getScopeFilters("L", false, ignoreBypass).length > 0 ||
               getScopeFilters("R", false, ignoreBypass).length > 0;
    }

    function hasChannelTrimFilters(ignoreBypass) {
        return getScopeFilters("L", false, ignoreBypass).length > 0 ||
               getScopeFilters("R", false, ignoreBypass).length > 0;
    }

    function applyChannelFiltersToPhone(phoneObj, ignoreBypass) {
        let totalL = getTotalChannelFilters("L", ignoreBypass);
        let totalR = getTotalChannelFilters("R", ignoreBypass);
        let totalLR = getTotalChannelFilters("LR", ignoreBypass);
        let raw = phoneObj.rawChannels || [];
        let lrLen = (typeof LR !== "undefined" && LR.length) ? LR.length : 2;
        if (raw.length >= 2 && lrLen > 1) {
            let nSeatings = Math.floor(raw.length / lrLen);
            return raw.map((c, idx) => {
                if (!c) return null;
                let filt = (idx < nSeatings) ? totalL : totalR;
                return Equalizer.apply(c, filt);
            });
        }
        return raw.map(c => c ? Equalizer.apply(c, totalLR) : null);
    }

    // Worst-case preamp headroom across Left and Right channels (used for APO export & header readout)
    function computeWorstCasePreamp(ignoreBypass) {
        if (!hasAnyActiveFilters(ignoreBypass)) return 0;
        let totalL = getTotalChannelFilters("L", ignoreBypass);
        let totalR = getTotalChannelFilters("R", ignoreBypass);
        let pL = Equalizer.calc_filters_preamp ? Equalizer.calc_filters_preamp(totalL) : 0;
        let pR = Equalizer.calc_filters_preamp ? Equalizer.calc_filters_preamp(totalR) : 0;
        return Math.min(pL, pR);
    }

    // Compute live K-weighted A/B auto-gain and volume-aware Option B shared safety headroom
    function computeAudioGainState() {
        let hasActive = hasAnyActiveFilters(true);
        if (!hasActive) {
            return { hasActive: false, autoGainDb: 0, sharedSafetyDb: 0, worstPeakPreamp: 0 };
        }
        let totalL = getTotalChannelFilters("L", true);
        let totalR = getTotalChannelFilters("R", true);
        let sr = audioContext ? audioContext.sampleRate : 48000;
        let autoGainDb = (Equalizer.calc_loudness_offset)
            ? Equalizer.calc_loudness_offset(totalL, totalR, sr)
            : 0;
        let pL = Equalizer.calc_filters_preamp ? Equalizer.calc_filters_preamp(totalL, sr) : 0;
        let pR = Equalizer.calc_filters_preamp ? Equalizer.calc_filters_preamp(totalR, sr) : 0;
        let peakL = -pL;
        let peakR = -pR;
        let maxNetWetPeakDb = Math.max(peakL + autoGainDb, peakR + autoGainDb);
        let worstMatchedBoostDb = Math.max(0, maxNetWetPeakDb);

        let isMuted = volumeIcon && volumeIcon.classList.contains("muted");
        let volFraction = (!isMuted && volumeRange)
            ? Math.max(0, Math.min(1, (parseFloat(volumeRange.value) || 0) / 100))
            : 0;
        let masterHeadroomDb = (volFraction > 1e-4) ? (-20 * Math.log10(volFraction)) : 48;
        let freeHeadroomDb = Math.max(0, masterHeadroomDb - 0.2);
        let overflowDb = Math.max(0, worstMatchedBoostDb - freeHeadroomDb);

        return {
            hasActive: true,
            autoGainDb: autoGainDb,
            sharedSafetyDb: -overflowDb,
            worstPeakPreamp: Math.min(pL, pR)
        };
    }

    // Dual Pre-amp (peak export headroom) + Auto-Gain (live K-weighted A/B compensation) readout
    function updatePreampDisplay() {
        let preampDisplay = document.getElementById("preamp-disp");
        if (!preampDisplay) return;
        let state = computeAudioGainState();
        let fmtDb = (v) => {
            let clean = Math.abs(v) < 0.05 ? 0 : v;
            return (clean > 0 ? "+" : "") + clean.toFixed(1) + " dB";
        };
        if (!state.hasActive) {
            preampDisplay.innerText = "Pre-amp: 0.0 dB · Auto-Gain: 0.0 dB";
            preampDisplay.title = "Peak export preamp and live K-weighted A/B loudness offset";
            return;
        }
        let peakStr = state.worstPeakPreamp.toFixed(1) + " dB";
        if (isBypassed) {
            preampDisplay.innerText = "Pre-amp: " + peakStr + " · Auto-Gain: Bypassed";
        } else {
            preampDisplay.innerText = "Pre-amp: " + peakStr + " · Auto-Gain: " + fmtDb(state.autoGainDb);
        }
        preampDisplay.title = "Export Peak Pre-amp: " + peakStr +
            " | K-Weighted A/B Auto-Gain: " + fmtDb(state.autoGainDb) +
            " | Shared Clip Guard: " + fmtDb(state.sharedSafetyDb);
    }

    let applyEQHandle = null;
    let applyEQExec = () => {
        saveCurrentScopeDOM();
        let phoneSelected = eqPhoneSelect.value;
        let anyActive = hasAnyActiveFilters(false);
        let hasSplits = hasChannelTrimFilters(true);

        if (anyActive && !phoneSelected) {
            let firstPhone = eqPhoneSelect.querySelectorAll("option")[1];
            if (firstPhone) {
                phoneSelected = eqPhoneSelect.value = firstPhone.value;
            }
        }

        let phoneObj = phoneSelected && activePhones.filter(
            p => !p.isPrefBounds && p.brand.name + " " + p.dispName == phoneSelected)[0];

        if (phoneObj && (anyActive || (phoneObj.eq && phoneObj.eq.active))) {
            let channels = applyChannelFiltersToPhone(phoneObj, false);
            if (phoneObj.eq && phoneObj.eq.active && phoneObj.eq.eqParent === phoneObj) {
                // Smooth in-place curve update (preserves focus, color, pins, and avoids row flicker)
                let eqCurve = phoneObj.eq;
                let prevSplits = !!eqCurve.hasChannelSplits;
                eqCurve.rawChannels = channels;
                eqCurve.sampleLabels = phoneObj.sampleLabels;
                eqCurve.hasChannelSplits = hasSplits;
                eqCurve.smooth = null;
                smoothPhone(eqCurve);
                normalizePhone(eqCurve);
                setCurves(eqCurve);
                if (prevSplits !== hasSplits && typeof window.syncEQPairChannels === "function") {
                    window.syncEQPairChannels(phoneObj, hasSplits);
                } else {
                    updatePaths();
                }
                updatePreampDisplay();
            } else {
                let activeElem = document.activeElement;
                let phoneEQ = { name: phoneObj.dispName + " EQ" };
                let phoneObjEQ = addOrUpdatePhone(phoneObj.brand, phoneEQ, channels);
                phoneObj.eq = phoneObjEQ;
                phoneObjEQ.eqParent = phoneObj;
                phoneObjEQ.sampleLabels = phoneObj.sampleLabels;
                phoneObjEQ.hasChannelSplits = hasSplits;
                updatePreampDisplay();
                showPhone(phoneObjEQ, false);
                if (activeElem && typeof activeElem.focus === "function") {
                    activeElem.focus();
                }
            }
        } else {
            updatePreampDisplay();
        }
        drawEQOverlay(0);
    };

    let applyEQ = () => {
        clearTimeout(applyEQHandle);
        applyEQHandle = setTimeout(applyEQExec, 1);

        saveCurrentScopeDOM();
        updateScopeIndicators();

        let hasConfigured = hasAnyActiveFilters(true);
        if (hasConfigured && !eqOverlayEnabled && !eqOverlayUserDismissed) {
            eqOverlayEnabled = true;
            syncEqOverlayButton();
        } else if (!hasConfigured) {
            eqOverlayUserDismissed = false;
        }

        updatePreampDisplay();
        drawEQOverlay(0);
        updateAudioFilters();
        document.dispatchEvent(new CustomEvent("UpdateExtensionFilters", { detail: { filters: elemToFilters(false, false) } }));
    };

    window.updateEQPhoneSelect = () => {
        let oldValue = eqPhoneSelect.value;
        let optionValues = activePhones.filter(p =>
            !p.isPrefBounds && !p.isTarget && !p.dispName.match(/ EQ( Saved \d+)?$/)).map(p => p.brand.name + " " + p.dispName);
        Array.from(eqPhoneSelect.children).slice(1).forEach(c => eqPhoneSelect.removeChild(c));
        optionValues.forEach(value => {
            let optionElem = document.createElement("option");
            optionElem.setAttribute("value", value);
            optionElem.innerText = value;
            eqPhoneSelect.appendChild(optionElem);
        });
        eqPhoneSelect.value = (optionValues.indexOf(oldValue) >= 0) ? oldValue : "";
        syncEQOverlayColors();
    };

    // Initialize clean 8-band rack on startup
    resetDefaultFilters();
    eqPhoneSelect.addEventListener("input", applyEQ);

    // Add new filter in current scope
    document.querySelector("div.extra-eq button.add-filter").addEventListener("click", () => {
        saveCurrentScopeDOM();
        eqBands = Math.min(eqBands + 1, extraEQBandsMax);
        updateFilterElements();
        scopeFilters[eqScope] = readDOMFilters(true);
    });

    // Remove last filter in current scope
    document.querySelector("div.extra-eq button.remove-filter").addEventListener("click", () => {
        saveCurrentScopeDOM();
        eqBands = Math.max(eqBands - 1, 1);
        updateFilterElements();
        scopeFilters[eqScope] = readDOMFilters(true);
        applyEQ();
    });

    // Sort filters by frequency in current scope
    document.querySelector("div.extra-eq button.sort-filters").addEventListener("click", () => {
        filtersToElem(elemToFilters(true, true).sort((a, b) =>
            (a.freq || Infinity) - (b.freq || Infinity)));
        applyEQ();
    });

    // Non-destructive master bypass toggle
    disableFiltersBtn.addEventListener("click", () => {
        setBypassState(!isBypassed, true);
    });

    // Reset all scopes back to clean 8-band standard rack (all 0.0 dB)
    let resetFiltersBtn = document.querySelector("div.extra-eq button.reset-filters");
    if (resetFiltersBtn) {
        resetFiltersBtn.addEventListener("click", () => {
            resetDefaultFilters();
            applyEQ();
        });
    }

    // Save filters as a separate comparable snapshot curve
    let savedCounter = 1;
    document.querySelector("div.extra-eq button.save-filters").addEventListener("click", () => {
        let phoneSelected = eqPhoneSelect.value;
        let phoneObj = phoneSelected && activePhones.filter(
            p => !p.isPrefBounds && p.brand.name + " " + p.dispName == phoneSelected)[0];
        if (!phoneObj || !hasAnyActiveFilters(true)) {
            alert("Please select model and add at least one active non-zero filter before saving.");
            return;
        }
        let channels = applyChannelFiltersToPhone(phoneObj, true);
        let phoneEQ = { name: phoneObj.dispName + " EQ Saved " + savedCounter };
        let phoneObjEQ = addOrUpdatePhone(phoneObj.brand, phoneEQ, channels);
        phoneObjEQ.eqParent = phoneObj;
        phoneObjEQ.sampleLabels = phoneObj.sampleLabels;
        phoneObjEQ.hasChannelSplits = hasChannelTrimFilters(true);
        showPhone(phoneObjEQ, false);
        savedCounter++;
    });

    // Import filters (Equalizer APO format — supports single-channel & Channel: L / R / all sections)
    document.querySelector("div.extra-eq button.import-filters").addEventListener("click", () => {
        fileFiltersImport.click();
    });
    fileFiltersImport.addEventListener("change", (e) => {
        let file = e.target.files[0];
        if (!file) {
            return;
        }
        let reader = new FileReader();
        reader.onload = (ev) => {
            let settings = ev.target.result;
            let parsed = { LR: [], L: [], R: [] };
            let targetScope = eqScope;
            let hasExplicitChannels = false;

            settings.split(/\r?\n/).forEach(rawLine => {
                let l = rawLine.trim();
                let chMatch = l.match(/^Channel:\s*(.+)$/i);
                if (chMatch) {
                    let spec = chMatch[1].trim().toUpperCase();
                    hasExplicitChannels = true;
                    if (spec === "L" || spec === "LEFT") targetScope = "L";
                    else if (spec === "R" || spec === "RIGHT") targetScope = "R";
                    else targetScope = "LR";
                    return;
                }
                let r = l.match(/Filter\s*\d+:\s*(\S+)\s*(\S+)\s*Fc\s*(\S+)\s*Hz\s*Gain\s*(\S+)\s*dB(\s*Q\s*(\S+))?/i);
                if (!r) return;
                let disabled = (r[1].toUpperCase() !== "ON");
                let type = r[2].toUpperCase();
                let freq = parseFloat(r[3]) || 0;
                let gain = parseFloat(r[4]) || 0;
                let q = parseFloat(r[6]) || 0;
                if (type === "LS" || type === "HS") {
                    type += "Q";
                    q = q || 0.707;
                } else if (type === "LSC" || type === "HSC") {
                    type = type.substr(0, 2) + "Q";
                    q = q || 0.707;
                }
                parsed[targetScope].push({ disabled, type, freq, q, gain });
            });

            const trimTrailingEmpty = (arr) => {
                while (arr.length > 0) {
                    let last = arr[arr.length - 1];
                    if (!last.freq && !last.q && !last.gain) arr.pop();
                    else break;
                }
            };
            trimTrailingEmpty(parsed.LR);
            trimTrailingEmpty(parsed.L);
            trimTrailingEmpty(parsed.R);

            let totalParsed = parsed.LR.length + parsed.L.length + parsed.R.length;
            if (totalParsed > 0) {
                setBypassState(false, false);
                if (hasExplicitChannels) {
                    scopeFilters.LR = parsed.LR.length ? parsed.LR : cloneDefaultFilters();
                    scopeFilters.L = parsed.L.length ? parsed.L : cloneDefaultFilters();
                    scopeFilters.R = parsed.R.length ? parsed.R : cloneDefaultFilters();
                    filtersToElem(scopeFilters[eqScope]);
                } else {
                    filtersToElem(parsed[eqScope]);
                }
                applyEQ();
            } else {
                alert("Parse filters file failed: no filter found.");
            }
        };
        reader.readAsText(file);
        e.target.value = "";
    });

    // Export filters (Equalizer APO format — supports L+R shared and optional Left / Right channel blocks)
    document.querySelector("div.extra-eq button.export-filters").addEventListener("click", () => {
        saveCurrentScopeDOM();
        if (!hasAnyActiveFilters(true)) {
            alert("Please dial in at least one non-zero filter before export.");
            return;
        }
        let phoneSelected = eqPhoneSelect.value;
        let phoneObj = phoneSelected && activePhones.filter(
            p => !p.isPrefBounds && p.brand.name + " " + p.dispName == phoneSelected)[0];
        let preamp = computeWorstCasePreamp(true);
        let settings = "Preamp: " + preamp.toFixed(1) + " dB\r\n";

        const formatAPOBlock = (filters) => {
            let out = "";
            filters.forEach((f, i) => {
                let on = (!f.disabled && f.type && f.freq && f.gain && f.q) ? "ON" : "OFF";
                let type = f.type;
                if (type === "LSQ" || type === "HSQ") {
                    type = type.substr(0, 2) + "C";
                }
                out += ("Filter " + (i + 1) + ": " + on + " " + type + " Fc " +
                    f.freq.toFixed(0) + " Hz Gain " + f.gain.toFixed(1) + " dB Q " +
                    f.q.toFixed(3) + "\r\n");
            });
            return out;
        };

        let lrAll = scopeFilters.LR || [];
        let lActive = getScopeFilters("L", false, true);
        let rActive = getScopeFilters("R", false, true);

        if (lActive.length > 0 || rActive.length > 0) {
            if (getScopeFilters("LR", false, true).length > 0) {
                settings += "Channel: all\r\n" + formatAPOBlock(lrAll);
            }
            if (lActive.length > 0) {
                settings += "Channel: L\r\n" + formatAPOBlock(scopeFilters.L || []);
            }
            if (rActive.length > 0) {
                settings += "Channel: R\r\n" + formatAPOBlock(scopeFilters.R || []);
            }
        } else {
            settings += formatAPOBlock(lrAll);
        }

        let exportElem = document.querySelector("#file-filters-export");
        exportElem.href && URL.revokeObjectURL(exportElem.href);
        exportElem.href = URL.createObjectURL(new Blob([settings]));
        let baseName = phoneObj ? phoneObj.fullName.replace(/^Uploaded /, "") : "MIRElink EQ";
        exportElem.download = baseName + " Filters.txt";
        exportElem.click();
    });

    // Export filters as graphic EQ (Wavelet 127-band format for active scope total)
    document.querySelector("div.extra-eq button.export-graphic-filters").addEventListener("click", () => {
        saveCurrentScopeDOM();
        let filters = getActiveScopeDisplayFilters(true);
        if (!filters.length) {
            alert("Please add at least one active non-zero filter before export.");
            return;
        }
        let phoneSelected = eqPhoneSelect.value;
        let phoneObj = phoneSelected && activePhones.filter(
            p => !p.isPrefBounds && p.brand.name + " " + p.dispName == phoneSelected)[0];
        let graphicEQ = Equalizer.as_graphic_eq(filters);
        let settings = "GraphicEQ: " + graphicEQ.map(([f, gain]) =>
            f.toFixed(0) + " " + gain.toFixed(1)).join("; ");
        let exportElem = document.querySelector("#file-filters-export");
        exportElem.href && URL.revokeObjectURL(exportElem.href);
        exportElem.href = URL.createObjectURL(new Blob([settings]));
        let baseName = phoneObj ? phoneObj.fullName.replace(/^Uploaded /, "") : "MIRElink EQ";
        let scopeTag = (eqScope === "L" || eqScope === "R") ? (" " + eqScope) : "";
        exportElem.download = baseName + scopeTag + " Graphic Filters.txt";
        exportElem.click();
    });

    /* AutoEQ disabled for MIRE workflow (preserved for future use)
    // Readme
    document.querySelector("div.extra-eq button.readme").addEventListener("click", () => { ... });
    // AutoEQ ...
    */

    // Graph Overlays & FFT Spectrum Controls
    if (btnEqOverlay) {
        btnEqOverlay.addEventListener("click", () => {
            eqOverlayEnabled = !eqOverlayEnabled;
            eqOverlayUserDismissed = !eqOverlayEnabled;
            syncEqOverlayButton();
            drawEQOverlay(0);
        });
    }

    if (btnFftToggle) {
        btnFftToggle.addEventListener("click", () => {
            fftEnabled = !fftEnabled;
            btnFftToggle.classList.toggle("selected", fftEnabled);
            if (!fftEnabled) {
                stopFftLoop(true);
            } else if (isPlayingAudio) {
                startFftLoop();
            }
        });
    }

    if (btnFftDrawer && fftDrawerEl) {
        btnFftDrawer.addEventListener("click", () => {
            let isOpen = !fftDrawerEl.classList.contains("hidden");
            fftDrawerEl.classList.toggle("hidden", isOpen);
            fftDrawerEl.setAttribute("aria-hidden", isOpen ? "true" : "false");
            btnFftDrawer.setAttribute("aria-expanded", isOpen ? "false" : "true");
        });
    }

    if (btnFftPeak) {
        btnFftPeak.addEventListener("click", () => {
            fftPeakEnabled = !fftPeakEnabled;
            btnFftPeak.classList.toggle("selected", fftPeakEnabled);
            if (!fftPeakEnabled) {
                fftPeakPost.fill(-120);
                fftPeakPre.fill(-120);
                fftPeakHoldUntilPost.fill(0);
                fftPeakHoldUntilPre.fill(0);
            }
        });
    }

    fftStyleButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            fftStyle = (btn.getAttribute("data-style") === "wave") ? "wave" : "bars";
            fftStyleButtons.forEach(b => b.classList.toggle("selected", b === btn));
        });
    });

    fftModeButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            let mode = btn.getAttribute("data-mode") || "post";
            fftMode = (mode === "pre") ? "pre" : "post";
            fftModeButtons.forEach(b => b.classList.toggle("selected", b === btn));
            fftPeakPost.fill(-120);
            fftPeakPre.fill(-120);
            fftPeakHoldUntilPost.fill(0);
            fftPeakHoldUntilPre.fill(0);
        });
    });

    fftSpeedButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            fftSpeed = (btn.getAttribute("data-speed") === "fast") ? "fast" : "slow";
            fftSpeedButtons.forEach(b => b.classList.toggle("selected", b === btn));
            let tc = fftSpeed === "fast" ? FFT_SMOOTH_FAST : FFT_SMOOTH_SLOW;
            preAnalyser.smoothingTimeConstant = tc;
            postAnalyser.smoothingTimeConstant = tc;
        });
    });

    // Real-Time 1/12-Octave (120-band) FFT Analyzer:
    // - Exact fractional-bin-overlap power summation -> mathematically flat Pink Noise across 20Hz-20kHz
    // - Renders as crisp Foobar-style micro-bars (default) or Pro-Q smooth continuous wave
    // - True 1000 ms peak hold + frame-rate-independent decay
    const FFT_BANDS = 120;
    const FFT_DB_MIN = -78;
    const FFT_DB_MAX = -8;
    const FFT_PEAK_HOLD_MS = 1000;
    const FFT_LOG_F0 = Math.log(20);
    const FFT_LOG_F1 = Math.log(20000);
    const FFT_LOG_STEP = (FFT_LOG_F1 - FFT_LOG_F0) / (FFT_BANDS - 1);
    const FFT_HALF_STEP = FFT_LOG_STEP * 0.5;

    const fftBandCenter = new Float32Array(FFT_BANDS);
    const fftBandLo = new Float32Array(FFT_BANDS);
    const fftBandHi = new Float32Array(FFT_BANDS);
    for (let i = 0; i < FFT_BANDS; i++) {
        let lf = FFT_LOG_F0 + i * FFT_LOG_STEP;
        fftBandCenter[i] = Math.exp(lf);
        fftBandLo[i] = Math.exp(lf - FFT_HALF_STEP);
        fftBandHi[i] = Math.exp(lf + FFT_HALF_STEP);
    }

    const fftPostDbRaw = new Float32Array(FFT_SIZE / 2);
    const fftPreDbRaw = new Float32Array(FFT_SIZE / 2);
    const fftPostVals = new Float32Array(FFT_BANDS);
    const fftPreVals = new Float32Array(FFT_BANDS);
    const fftPeakPost = new Float32Array(FFT_BANDS).fill(-120);
    const fftPeakPre = new Float32Array(FFT_BANDS).fill(-120);
    const fftPeakHoldUntilPost = new Float64Array(FFT_BANDS);
    const fftPeakHoldUntilPre = new Float64Array(FFT_BANDS);
    let fftLastFrameMs = performance.now();
    let fftRafId = null;

    function computeBandLevels(analyser, rawBuf, outVals, peakVals, peakHoldUntil, nowMs, dtSec) {
        analyser.getFloatFrequencyData(rawBuf);
        const sr = audioContext.sampleRate || 48000;
        const binHz = sr / analyser.fftSize;
        const maxBin = rawBuf.length - 1;
        const decayDbPerSec = (fftSpeed === "fast") ? 14 : 8;

        for (let b = 0; b < FFT_BANDS; b++) {
            const fLo = fftBandLo[b];
            const fHi = fftBandHi[b];
            const bwHz = fHi - fLo;
            let power = 0;

            if (bwHz <= binHz) {
                // Sub-bin continuity at low frequencies: interpolate linear power & scale by band/bin width
                const kCenter = fftBandCenter[b] / binHz;
                const k0 = Math.max(1, Math.min(maxBin - 1, Math.floor(kCenter)));
                const frac = Math.max(0, Math.min(1, kCenter - k0));
                const db0 = (rawBuf[k0] > -120 && isFinite(rawBuf[k0])) ? rawBuf[k0] : -120;
                const db1 = (rawBuf[k0 + 1] > -120 && isFinite(rawBuf[k0 + 1])) ? rawBuf[k0 + 1] : -120;
                const p0 = Math.pow(10, db0 / 10);
                const p1 = Math.pow(10, db1 / 10);
                power = (p0 + (p1 - p0) * frac) * (bwHz / binHz);
            } else {
                const kStart = Math.max(1, Math.floor(fLo / binHz - 0.5));
                const kEnd = Math.min(maxBin, Math.ceil(fHi / binHz + 0.5));
                for (let k = kStart; k <= kEnd; k++) {
                    const db = rawBuf[k];
                    if (db <= -120 || !isFinite(db)) continue;
                    const binLo = (k - 0.5) * binHz;
                    const binHi = (k + 0.5) * binHz;
                    const overlap = Math.min(fHi, binHi) - Math.max(fLo, binLo);
                    if (overlap > 0) {
                        power += Math.pow(10, db / 10) * (overlap / binHz);
                    }
                }
            }

            let levelDb = power > 1e-12 ? (10 * Math.log10(power)) : -120;
            outVals[b] = levelDb;

            if (fftPeakEnabled) {
                if (levelDb >= peakVals[b]) {
                    peakVals[b] = levelDb;
                    peakHoldUntil[b] = nowMs + FFT_PEAK_HOLD_MS;
                } else if (nowMs >= peakHoldUntil[b]) {
                    peakVals[b] = Math.max(levelDb, peakVals[b] - decayDbPerSec * dtSec);
                }
            }
        }
    }

    function getThemeSpectrumColors() {
        let cs = getComputedStyle(document.body);
        return {
            fill:       cs.getPropertyValue("--fft-fill").trim()       || "rgba(59, 130, 246, 0.18)",
            stroke:     cs.getPropertyValue("--fft-stroke").trim()     || "rgba(96, 165, 250, 0.46)",
            preFill:    cs.getPropertyValue("--fft-pre-fill").trim()   || "rgba(161, 161, 170, 0.16)",
            preStroke:  cs.getPropertyValue("--fft-pre-stroke").trim() || "rgba(161, 161, 170, 0.48)",
            peakStroke: cs.getPropertyValue("--fft-peak-stroke").trim()|| "rgba(250, 204, 21, 0.78)"
        };
    }

    function clearFftCanvas() {
        let canvas = document.getElementById("fft-canvas");
        if (!canvas) return;
        let ctx = canvas.getContext("2d");
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    function stopFftLoop(clear) {
        if (fftRafId !== null) {
            cancelAnimationFrame(fftRafId);
            fftRafId = null;
        }
        if (clear) {
            clearFftCanvas();
        }
    }

    function drawSpectrumMicroBars(ctx, vals, peaks, sx, sy, dpr, clipLeft, clipW, colors, isPre) {
        const yBottom = (pad.t + H) * sy;
        const yTop = pad.t * sy;
        const plotH = yBottom - yTop;
        const dbSpan = FFT_DB_MAX - FFT_DB_MIN;
        const clipRight = clipLeft + clipW;
        const fillStyle = isPre ? colors.preFill : colors.fill;
        const strokeStyle = isPre ? colors.preStroke : colors.stroke;

        ctx.save();
        ctx.fillStyle = fillStyle;
        ctx.strokeStyle = strokeStyle;
        ctx.lineWidth = Math.max(0.9 * dpr, 1);

        for (let b = 0; b < FFT_BANDS; b++) {
            const xLo = Math.max(clipLeft, x(fftBandLo[b]) * sx);
            const xHi = Math.min(clipRight, x(fftBandHi[b]) * sx);
            const cellW = xHi - xLo;
            if (cellW <= 0.4) continue;

            const gap = Math.min(cellW * 0.24, Math.max(0.8 * dpr, cellW * 0.14));
            const barX = xLo + gap * 0.5;
            const barW = Math.max(1 * dpr, cellW - gap);
            const normY = Math.max(0, Math.min(1, (vals[b] - FFT_DB_MIN) / dbSpan));
            const barH = normY * plotH;

            if (barH > 0.5) {
                const barY = yBottom - barH;
                ctx.fillRect(barX, barY, barW, barH);
                // Crisp top cap line
                ctx.beginPath();
                ctx.moveTo(barX, barY);
                ctx.lineTo(barX + barW, barY);
                ctx.stroke();
            }

            if (fftPeakEnabled && peaks[b] > FFT_DB_MIN) {
                const peakNorm = Math.max(0, Math.min(1, (peaks[b] - FFT_DB_MIN) / dbSpan));
                const peakY = yBottom - peakNorm * plotH;
                ctx.save();
                ctx.strokeStyle = colors.peakStroke;
                ctx.lineWidth = Math.max(1.4 * dpr, 1.5);
                ctx.beginPath();
                ctx.moveTo(barX, peakY);
                ctx.lineTo(barX + barW, peakY);
                ctx.stroke();
                ctx.restore();
            }
        }

        ctx.restore();
    }

    function drawSpectrumCurve(ctx, vals, sx, sy, strokeStyle, fillStyle, lineWidth, dashed) {
        const yBottom = (pad.t + H) * sy;
        const yTop = pad.t * sy;
        const plotH = yBottom - yTop;
        const dbSpan = FFT_DB_MAX - FFT_DB_MIN;

        ctx.save();
        ctx.beginPath();
        let firstX = null;
        let lastX = null;

        for (let i = 0; i < FFT_BANDS; i++) {
            const px = x(fftBandCenter[i]) * sx;
            const normY = Math.max(0, Math.min(1, (vals[i] - FFT_DB_MIN) / dbSpan));
            const py = yBottom - normY * plotH;
            if (i === 0) {
                firstX = px;
                ctx.moveTo(px, py);
            } else {
                const prevPx = x(fftBandCenter[i - 1]) * sx;
                const prevNorm = Math.max(0, Math.min(1, (vals[i - 1] - FFT_DB_MIN) / dbSpan));
                const prevPy = yBottom - prevNorm * plotH;
                const midX = (prevPx + px) * 0.5;
                const midY = (prevPy + py) * 0.5;
                ctx.quadraticCurveTo(prevPx, prevPy, midX, midY);
                if (i === FFT_BANDS - 1) {
                    ctx.lineTo(px, py);
                }
            }
            lastX = px;
        }

        if (fillStyle && firstX !== null && lastX !== null) {
            ctx.save();
            ctx.lineTo(lastX, yBottom);
            ctx.lineTo(firstX, yBottom);
            ctx.closePath();
            ctx.fillStyle = fillStyle;
            ctx.fill();
            ctx.restore();
        }

        ctx.strokeStyle = strokeStyle;
        ctx.lineWidth = lineWidth;
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        if (dashed) ctx.setLineDash(dashed);
        ctx.stroke();
        ctx.restore();
    }

    function renderFftFrame() {
        fftRafId = null;
        if (!fftEnabled || !isPlayingAudio) {
            clearFftCanvas();
            return;
        }

        const nowMs = performance.now();
        const dtSec = Math.max(0.001, Math.min(0.1, (nowMs - fftLastFrameMs) / 1000));
        fftLastFrameMs = nowMs;

        let canvas = document.getElementById("fft-canvas");
        if (canvas && typeof x === "function" && typeof pad !== "undefined") {
            let cw = canvas.clientWidth || W0;
            let ch = canvas.clientHeight || H0;
            let dpr = Math.min(window.devicePixelRatio || 1, 2);
            let targetW = Math.max(1, Math.round(cw * dpr));
            let targetH = Math.max(1, Math.round(ch * dpr));
            if (canvas.width !== targetW || canvas.height !== targetH) {
                canvas.width = targetW;
                canvas.height = targetH;
            }

            let ctx = canvas.getContext("2d");
            if (ctx) {
                ctx.clearRect(0, 0, targetW, targetH);

                const sx = targetW / W0;
                const sy = targetH / H0;
                const clipLeft = pad.l * sx;
                const clipTop = pad.t * sy;
                const clipW = W * sx;
                const clipH = H * sy;

                ctx.save();
                ctx.beginPath();
                ctx.rect(clipLeft, clipTop, clipW, clipH);
                ctx.clip();

                let colors = getThemeSpectrumColors();
                let isPre = (fftMode === "pre");
                let analyser = isPre ? preAnalyser : postAnalyser;
                let rawBuf = isPre ? fftPreDbRaw : fftPostDbRaw;
                let vals = isPre ? fftPreVals : fftPostVals;
                let peaks = isPre ? fftPeakPre : fftPeakPost;
                let holdUntil = isPre ? fftPeakHoldUntilPre : fftPeakHoldUntilPost;

                computeBandLevels(analyser, rawBuf, vals, peaks, holdUntil, nowMs, dtSec);

                if (fftStyle === "wave") {
                    drawSpectrumCurve(
                        ctx, vals, sx, sy,
                        isPre ? colors.preStroke : colors.stroke,
                        isPre ? colors.preFill : colors.fill,
                        1.5 * dpr, null
                    );
                    if (fftPeakEnabled) {
                        drawSpectrumCurve(ctx, peaks, sx, sy, colors.peakStroke, null, 1.15 * dpr, [3 * dpr, 3 * dpr]);
                    }
                } else {
                    drawSpectrumMicroBars(ctx, vals, peaks, sx, sy, dpr, clipLeft, clipW, colors, isPre);
                }

                ctx.restore();
            }
        }

        fftRafId = requestAnimationFrame(renderFftFrame);
    }

    function startFftLoop() {
        if (!fftEnabled || !isPlayingAudio) return;
        if (fftRafId === null) {
            fftRafId = requestAnimationFrame(renderFftFrame);
        }
    }

    // Tone Generator Controls
    let toneGeneratorFromInput = document.querySelector("div.settings-row input[name='tone-generator-from']");
    let toneGeneratorToInput = document.querySelector("div.settings-row input[name='tone-generator-to']");
    let toneGeneratorSlider = document.querySelector("div.eq-demo input[name='tone-generator-freq']");
    let toneGeneratorText = document.querySelector("div.eq-demo .freq-text");
    let toneGenRange = document.querySelector("div.settings-row[name='tone-gen-range']");
    let toneGenSlider = document.querySelector("div.eq-demo[name='tone-gen-slider']");
    let toneGeneratorOsc = null;

    // Master Volume UI (click-free ramping + syncs Option B shared headroom)
    volumeIcon.addEventListener("click", () => {
        let now = audioContext.currentTime;
        if (volumeIcon.classList.contains("muted")) {
            volumeIcon.classList.remove("muted");
            volumeIcon.innerHTML = SVG_ICON.volume;
            volumeRange.value = currentVolume;
            volumeNode.gain.cancelScheduledValues(now);
            volumeNode.gain.setTargetAtTime((parseFloat(currentVolume) || 0) / 100, now, 0.007);
        } else {
            volumeIcon.classList.add("muted");
            volumeIcon.innerHTML = SVG_ICON.muted;
            currentVolume = volumeRange.value;
            volumeRange.value = 0;
            volumeNode.gain.cancelScheduledValues(now);
            volumeNode.gain.setTargetAtTime(0, now, 0.007);
        }
        syncAudioGainTargets(false);
        updatePreampDisplay();
    });

    volumeRange.addEventListener("input", () => {
        if (volumeIcon.classList.contains("muted") && parseFloat(volumeRange.value) > 0) {
            volumeIcon.classList.remove("muted");
            volumeIcon.innerHTML = SVG_ICON.volume;
        }
        currentVolume = volumeRange.value;
        let now = audioContext.currentTime;
        volumeNode.gain.cancelScheduledValues(now);
        volumeNode.gain.setTargetAtTime((parseFloat(volumeRange.value) || 0) / 100, now, 0.007);
        syncAudioGainTargets(false);
        updatePreampDisplay();
    });

    // Channel Balance (attenuates opposite channel cleanly, zero positive gain clipping)
    let channelBalanceSlider = document.querySelector("div.settings-row input[name='balance-vol']");
    let volLeftInput = document.getElementById("vol-left");
    let volRightInput = document.getElementById("vol-right");

    function applyChannelBalance(balValue) {
        let bal = Math.max(-10, Math.min(10, parseFloat(balValue) || 0));
        let leftDb = bal > 0 ? -bal : 0;   // Sliding right attenuates Left
        let rightDb = bal < 0 ? bal : 0;   // Sliding left attenuates Right
        let leftGain = Math.pow(10, leftDb / 20);
        let rightGain = Math.pow(10, rightDb / 20);
        let now = audioContext.currentTime;

        leftChannel.gain.cancelScheduledValues(now);
        leftChannel.gain.setTargetAtTime(leftGain, now, 0.008);
        rightChannel.gain.cancelScheduledValues(now);
        rightChannel.gain.setTargetAtTime(rightGain, now, 0.008);

        if (volLeftInput) volLeftInput.value = leftDb === 0 ? "0" : leftDb.toFixed(1);
        if (volRightInput) volRightInput.value = rightDb === 0 ? "0" : rightDb.toFixed(1);
        if (channelBalanceSlider) channelBalanceSlider.value = bal;
    }

    if (channelBalanceSlider) {
        channelBalanceSlider.addEventListener("input", () => {
            applyChannelBalance(channelBalanceSlider.value);
        });
    }

    if (volLeftInput) {
        volLeftInput.addEventListener("input", () => {
            let v = Math.max(-10, Math.min(0, parseFloat(volLeftInput.value) || 0));
            applyChannelBalance(-v); // e.g., -3 dB on Left => slider +3 toward Right
        });
    }

    if (volRightInput) {
        volRightInput.addEventListener("input", () => {
            let v = Math.max(-10, Math.min(0, parseFloat(volRightInput.value) || 0));
            applyChannelBalance(v); // e.g., -3 dB on Right => slider -3 toward Left
        });
    }

    // Parallel Dry/Wet Biquad Filter Engine (in-place parameter ramping + click-free A/B crossfade)
    let activeSourceNode = null;
    let activeSourceBridges = [];
    let wetNodesL = [];
    let wetNodesR = [];
    let currentWetSig = "";

    function toWebAudioFilterType(type) {
        if (type === "LSQ") return "lowshelf";
        if (type === "HSQ") return "highshelf";
        return "peaking";
    }

    function sanitizeBiquadParams(f) {
        let enabled = !f.disabled && f.freq > 0 && f.q > 0 && isFinite(f.gain);
        let maxNyq = Math.max(18000, (audioContext.sampleRate || 48000) * 0.48);
        return {
            type: toWebAudioFilterType(f.type),
            freq: Math.max(10, Math.min(maxNyq, parseFloat(f.freq) || 1000)),
            q: Math.max(0.05, Math.min(100, parseFloat(f.q) || 1)),
            gain: enabled ? Math.max(-40, Math.min(40, parseFloat(f.gain) || 0)) : 0
        };
    }

    function syncAudioGainTargets(immediate) {
        let state = computeAudioGainState();
        let now = audioContext.currentTime;
        let dryTarget = (isBypassed || !state.hasActive) ? 1 : 0;
        let wetTarget = (!isBypassed && state.hasActive) ? Math.pow(10, state.autoGainDb / 20) : 0;
        let safetyTarget = Math.pow(10, state.sharedSafetyDb / 20);

        dryGain.gain.cancelScheduledValues(now);
        wetGain.gain.cancelScheduledValues(now);
        safetyGain.gain.cancelScheduledValues(now);

        if (immediate) {
            dryGain.gain.setValueAtTime(dryTarget, now);
            wetGain.gain.setValueAtTime(wetTarget, now);
            safetyGain.gain.setValueAtTime(safetyTarget, now);
        } else {
            // Smooth 7 ms time-constant (~21 ms settle): click-free and immune to rapid A/B clicks
            dryGain.gain.setTargetAtTime(dryTarget, now, 0.007);
            wetGain.gain.setTargetAtTime(wetTarget, now, 0.007);
            safetyGain.gain.setTargetAtTime(safetyTarget, now, 0.007);
        }
    }

    function syncWetFilterChain() {
        let rawL = getScopeFilters("LR", true, true).concat(getScopeFilters("L", true, true));
        let rawR = getScopeFilters("LR", true, true).concat(getScopeFilters("R", true, true));
        let paramsL = rawL.map(sanitizeBiquadParams);
        let paramsR = rawR.map(sanitizeBiquadParams);
        let sig = "L:" + paramsL.map(p => p.type).join(",") + "|R:" + paramsR.map(p => p.type).join(",");
        let now = audioContext.currentTime;

        if (sig === currentWetSig && wetNodesL.length === paramsL.length && wetNodesR.length === paramsR.length) {
            // Update filter coefficients smoothly in-place without disconnecting nodes
            for (let i = 0; i < wetNodesL.length; i++) {
                let p = paramsL[i], n = wetNodesL[i];
                n.frequency.cancelScheduledValues(now);
                n.Q.cancelScheduledValues(now);
                n.gain.cancelScheduledValues(now);
                n.frequency.setTargetAtTime(p.freq, now, 0.012);
                n.Q.setTargetAtTime(p.q, now, 0.012);
                n.gain.setTargetAtTime(p.gain, now, 0.012);
            }
            for (let i = 0; i < wetNodesR.length; i++) {
                let p = paramsR[i], n = wetNodesR[i];
                n.frequency.cancelScheduledValues(now);
                n.Q.cancelScheduledValues(now);
                n.gain.cancelScheduledValues(now);
                n.frequency.setTargetAtTime(p.freq, now, 0.012);
                n.Q.setTargetAtTime(p.q, now, 0.012);
                n.gain.setTargetAtTime(p.gain, now, 0.012);
            }
            return;
        }

        // Structural change (band count/types altered): rebuild L/R chains between wetInputSplit & wetOutputMerge
        try { wetInputSplit.disconnect(); } catch (_) {}
        wetNodesL.forEach(n => { try { n.disconnect(); } catch (_) {} });
        wetNodesR.forEach(n => { try { n.disconnect(); } catch (_) {} });
        wetNodesL = [];
        wetNodesR = [];
        currentWetSig = sig;

        if (paramsL.length) {
            let tailL = wetInputSplit;
            paramsL.forEach((p, idx) => {
                let node = audioContext.createBiquadFilter();
                node.type = p.type;
                node.frequency.value = p.freq;
                node.Q.value = p.q;
                node.gain.value = p.gain;
                if (idx === 0) tailL.connect(node, 0);
                else tailL.connect(node);
                wetNodesL.push(node);
                tailL = node;
            });
            tailL.connect(wetOutputMerge, 0, 0);
        } else {
            wetInputSplit.connect(wetOutputMerge, 0, 0);
        }

        if (paramsR.length) {
            let tailR = wetInputSplit;
            paramsR.forEach((p, idx) => {
                let node = audioContext.createBiquadFilter();
                node.type = p.type;
                node.frequency.value = p.freq;
                node.Q.value = p.q;
                node.gain.value = p.gain;
                if (idx === 0) tailR.connect(node, 1);
                else tailR.connect(node);
                wetNodesR.push(node);
                tailR = node;
            });
            tailR.connect(wetOutputMerge, 0, 1);
        } else {
            wetInputSplit.connect(wetOutputMerge, 1, 1);
        }
    }

    function applyFilters(audioCtx, inputNode) {
        if (inputNode && (inputNode !== activeSourceNode || inputNode === toneGeneratorOsc)) {
            if (activeSourceNode) {
                try { activeSourceNode.disconnect(); } catch (_) {}
            }
            activeSourceBridges.forEach(n => { try { n.disconnect(); } catch (_) {} });
            activeSourceBridges = [];
            activeSourceNode = inputNode;

            try { inputNode.disconnect(); } catch (_) {}
            if (inputNode == pinkNoiseSource || inputNode == toneGeneratorOsc) {
                const splitter = audioCtx.createChannelSplitter(2);
                const merger = audioCtx.createChannelMerger(2);
                inputNode.connect(splitter);
                splitter.connect(merger, 0, 0);
                splitter.connect(merger, 0, 1);
                merger.connect(sourceBus);
                activeSourceBridges.push(splitter, merger);
            } else {
                inputNode.connect(sourceBus);
            }
        }
        syncWetFilterChain();
        syncAudioGainTargets(false);
    }

    function updateAudioFilters() {
        applyFilters(audioContext, currentSource);
    }

    // Bind audio progress/ended listeners safely (once per audio element)
    function formatTime(sec) {
        if (!isFinite(sec) || sec < 0) sec = 0;
        let s = Math.floor(sec % 60);
        let mTotal = Math.floor(sec / 60);
        let m = mTotal % 60;
        let h = Math.floor(mTotal / 60);
        return (h < 10 ? "0" + h : h) + ":" + (m < 10 ? "0" + m : m) + ":" + (s < 10 ? "0" + s : s);
    }

    function attachAudioTrackListeners(audioEl) {
        if (!audioEl || audioEl.dataset.eqBound === "true") return;
        audioEl.dataset.eqBound = "true";

        let songProgressSlider = document.querySelector("div.eq-demo input[name='demo-time']");
        let songTimeText = document.getElementById("songTime");
        let playBtn = document.getElementById("play-button");

        audioEl.addEventListener("timeupdate", () => {
            if (currentAudio !== audioEl || toneGenActive) return;
            if (songTimeText) songTimeText.innerText = formatTime(audioEl.currentTime);
            if (songProgressSlider) {
                songProgressSlider.value = (audioEl.duration && isFinite(audioEl.duration))
                    ? (audioEl.currentTime / audioEl.duration) * 100
                    : 0;
            }
        });

        audioEl.addEventListener("ended", () => {
            if (currentAudio !== audioEl) return;
            isPlayingAudio = false;
            stopFftLoop(true);
            if (playBtn) {
                playBtn.classList.remove("playing");
                playBtn.innerHTML = SVG_ICON.play;
            }
        });
    }

    // Uploaded Audio File Handler
    fileAudio.addEventListener("change", (e) => {
        let file = e.target.files[0];
        if (!file) {
            return;
        }
        if (uploadedAudio) {
            uploadedAudio.pause();
        }
        if (uploadedSource) {
            try { uploadedSource.disconnect(); } catch (_) {}
        }
        if (uploadedObjectURL) {
            URL.revokeObjectURL(uploadedObjectURL);
        }
        if (toneGenActive && toneGeneratorOsc) {
            try { toneGeneratorOsc.stop(); } catch (_) {}
            toneGeneratorOsc = null;
        } else if (currentAudio) {
            currentAudio.pause();
            currentAudio.currentTime = 0;
        }

        isPlayingAudio = false;
        stopFftLoop(true);

        let playBtn = document.getElementById("play-button");
        if (playBtn) {
            playBtn.classList.remove("playing");
            playBtn.innerHTML = SVG_ICON.play;
        }

        uploadedObjectURL = URL.createObjectURL(file);
        uploadedAudio = new Audio(uploadedObjectURL);
        uploadedSource = audioContext.createMediaElementSource(uploadedAudio);
        attachAudioTrackListeners(uploadedAudio);

        let eqTrack = document.querySelector("div.extra-eq .eq-track");
        if (eqTrack) {
            let customOpt = eqTrack.querySelector("option[value='custom-eq-track']");
            if (customOpt) {
                let cleanTitle = (file.name || "Uploaded").replace(/\.[^/.]+$/, "") || file.name || "Uploaded";
                customOpt.textContent = cleanTitle;
                customOpt.title = file.name || cleanTitle;
            }
            eqTrack.value = "custom-eq-track";
            syncEqTrackWidth(eqTrack);
            eqTrack.dispatchEvent(new Event("change"));
        }
        e.target.value = "";
    });

    function syncEqTrackWidth(selectEl) {
        if (!selectEl) return;
        let selectedOpt = selectEl.options[selectEl.selectedIndex];
        let label = selectedOpt ? (selectedOpt.textContent || "") : "";
        let cs = window.getComputedStyle ? window.getComputedStyle(selectEl) : null;
        let canvas = syncEqTrackWidth._canvas || (syncEqTrackWidth._canvas = document.createElement("canvas"));
        let ctx = canvas.getContext("2d");
        if (ctx && cs) {
            ctx.font = cs.font || `${cs.fontWeight || "400"} ${cs.fontSize || "11px"} ${cs.fontFamily || "sans-serif"}`;
        }
        let textW = ctx ? ctx.measureText(label).width : label.length * 7;
        // Account for left padding (~8px), right dropdown arrow padding (~26px), borders & breathing room
        let targetW = Math.min(195, Math.max(88, Math.ceil(textW + 38)));
        selectEl.style.width = `${targetW}px`;
    }

    // Wire built-in audio utilities on DOMContentLoaded (or immediately if ready)
    function initAudioDemo() {
        pinkNoiseAudio = document.getElementById("pinkNoiseAudio");
        scarletFireAudio = document.getElementById("scarletFIRE");
        if (!pinkNoiseAudio || !scarletFireAudio) return;

        pinkNoiseSource = audioContext.createMediaElementSource(pinkNoiseAudio);
        scarletFireSource = audioContext.createMediaElementSource(scarletFireAudio);
        attachAudioTrackListeners(pinkNoiseAudio);
        attachAudioTrackListeners(scarletFireAudio);

        currentAudio = pinkNoiseAudio;
        currentSource = pinkNoiseSource;

        applyFilters(audioContext, currentSource);

        let playButton = document.getElementById("play-button");
        let eqTrack = document.querySelector("div.extra-eq .eq-track");
        let songProgressSlider = document.querySelector("div.eq-demo input[name='demo-time']");
        let songTimeText = document.getElementById("songTime");

        if (eqTrack) {
            syncEqTrackWidth(eqTrack);
        }

        if (songProgressSlider) {
            songProgressSlider.addEventListener("input", () => {
                if (!toneGenActive && currentAudio && currentAudio.duration && isFinite(currentAudio.duration)) {
                    currentAudio.currentTime = (songProgressSlider.value / 100) * currentAudio.duration;
                }
            });
        }

        if (eqTrack) eqTrack.addEventListener("change", () => {
            syncEqTrackWidth(eqTrack);
            if (toneGenActive && toneGeneratorOsc) {
                try { currentSource.stop(); } catch (_) {}
                toneGeneratorOsc = null;
            } else if (currentAudio) {
                currentAudio.pause();
                currentAudio.currentTime = 0;
            }

            isPlayingAudio = false;
            stopFftLoop(true);

            playButton.classList.remove("playing");
            playButton.innerHTML = SVG_ICON.play;
            if (songTimeText) songTimeText.innerText = "00:00:00";
            if (songProgressSlider) songProgressSlider.value = 0;

            switch (eqTrack.value) {
                default:
                    toneGenActive = false;
                    toneGenRange.classList.add("hidden");
                    toneGenSlider.classList.add("hidden");
                    currentAudio = pinkNoiseAudio;
                    currentSource = pinkNoiseSource;
                    break;
                case "scarlet":
                    toneGenActive = false;
                    toneGenRange.classList.add("hidden");
                    toneGenSlider.classList.add("hidden");
                    currentAudio = scarletFireAudio;
                    currentSource = scarletFireSource;
                    break;
                case "custom-eq-track":
                    if (!uploadedAudio || !uploadedSource) {
                        alert("Please upload an audio file first.");
                        eqTrack.value = "pink";
                        toneGenActive = false;
                        toneGenRange.classList.add("hidden");
                        toneGenSlider.classList.add("hidden");
                        currentAudio = pinkNoiseAudio;
                        currentSource = pinkNoiseSource;
                        break;
                    }
                    toneGenActive = false;
                    toneGenRange.classList.add("hidden");
                    toneGenSlider.classList.add("hidden");
                    currentAudio = uploadedAudio;
                    currentSource = uploadedSource;
                    break;
                case "tone":
                    toneGenActive = true;
                    toneGenRange.classList.remove("hidden");
                    toneGenSlider.classList.remove("hidden");
                    break;
            }

            if (!toneGenActive && currentSource) {
                updateAudioFilters();
            }
        });

        toneGeneratorSlider.addEventListener("input", () => {
            let from = Math.min(Math.max(parseInt(toneGeneratorFromInput.value) || 20, 20), 20000);
            let to = Math.min(Math.max(parseInt(toneGeneratorToInput.value) || 20000, from), 20000);
            let position = parseFloat(toneGeneratorSlider.value) || 0;
            let freq = Math.round(Math.exp(
                Math.log(from) + (Math.log(to) - Math.log(from)) * position));
            toneGeneratorText.innerText = freq;
            if (toneGeneratorOsc) {
                let t = audioContext.currentTime;
                toneGeneratorOsc.frequency.cancelScheduledValues(t);
                toneGeneratorOsc.frequency.setTargetAtTime(freq, t, 0.05);
            }
        });

        playButton.addEventListener("click", () => {
            if (playButton.classList.contains("playing")) {
                if (toneGenActive && toneGeneratorOsc) {
                    try { currentSource.stop(); } catch (_) {}
                    toneGeneratorOsc = null;
                } else if (currentAudio) {
                    currentAudio.pause();
                    currentAudio.currentTime = 0;
                }
                isPlayingAudio = false;
                stopFftLoop(true);
                playButton.classList.remove("playing");
                playButton.innerHTML = SVG_ICON.play;
            } else {
                audioContext.resume();
                if (toneGenActive) {
                    toneGeneratorOsc = audioContext.createOscillator();
                    toneGeneratorOsc.type = "sine";
                    toneGeneratorOsc.frequency.value = parseInt(toneGeneratorText.innerText) || 20;
                    currentSource = toneGeneratorOsc;
                    updateAudioFilters();
                    currentSource.start();
                } else {
                    updateAudioFilters();
                    currentAudio.play();
                }
                isPlayingAudio = true;
                playButton.classList.add("playing");
                playButton.innerHTML = SVG_ICON.pause;
                startFftLoop();
            }
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initAudioDemo);
    } else {
        initAudioDemo();
    }

    // Average All button
    function getAvgAll() {
        let v = activePhones.filter(p => !p.isTarget && !p.isPrefBounds).map(getAvgArithmetic);
        return avgCurvesArithmetic(v);
    }
    let avgAllBtn = document.querySelector("button#avg-all");
    if (avgAllBtn) {
        avgAllBtn.addEventListener("click", function () {
            if (!avgAllBtn.classList.contains("selected")) {
                let avgAll = getAvgAll();
                if (!avgAll || !avgAll.length) return;
                let p = { name: "Average of All SPLs" };
                let phone = addOrUpdatePhone(brandMap.Uploaded, p, [avgAll]);
                showPhone(phone, false);
                avgAllBtn.classList.add("selected");
            } else {
                let existing = brandMap.Uploaded.phoneObjs.find(q => q.phone === "Average of All SPLs");
                if (existing) removePhone(existing);
                avgAllBtn.classList.remove("selected");
            }
            updatePaths(true);
        });
    }

    // Preamp helper for external plugins (kept backwards-compatible)
    let calcEqDevPreamp = () => {
        const phoneSelected = eqPhoneSelect.value;
        const phoneObj = phoneSelected &&
            activePhones.find(p => !p.isPrefBounds && p.brand.name + " " + p.dispName === phoneSelected && p.eq);
        if (phoneObj && phoneObj.rawChannels && phoneObj.eq && phoneObj.eq.rawChannels) {
            let maxGain = -Infinity;
            for (let idx = 0; idx < phoneObj.rawChannels.length; idx++) {
                if (!phoneObj.rawChannels[idx] || !phoneObj.eq.rawChannels[idx]) continue;
                let g = -Equalizer.calc_preamp(phoneObj.rawChannels[idx], phoneObj.eq.rawChannels[idx]);
                if (g > maxGain) maxGain = g;
            }
            if (maxGain > -Infinity) return -maxGain;
        }
        return computeWorstCasePreamp(false);
    };

    async function loadPlugins(pluginsToLoad, context) {
        for (const pluginPath of pluginsToLoad) {
            try {
                let initializePlugin;
                if (typeof module !== "undefined" && module.exports) {
                    initializePlugin = require(pluginPath);
                } else {
                    const mod = await (new Function("url", "return import(url)"))(pluginPath);
                    initializePlugin = mod.default || mod;
                }
                await initializePlugin(context);
                console.log(`Successfully loaded plugin: ${pluginPath}`);
            } catch (error) {
                console.error(`Error loading plugin ${pluginPath}:`, error.message);
            }
        }
    }

    let config = { advanced: true, showLogs: true };
    if (typeof extraEQplugins !== "undefined" && Array.isArray(extraEQplugins) && extraEQplugins.length > 0) {
        loadPlugins(extraEQplugins, {
            filtersToElem,
            elemToFilters,
            calcEqDevPreamp,
            applyEQ,
            config
        });
    }
}
addExtra();
