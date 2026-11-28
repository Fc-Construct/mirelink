// Extra panel: parametric EQ, file uploads, target/song uploads, pure EQ curve overlay,
// real-time FFT spectrum analyzer, tone generator, and channel balance.

// Exposes window.showExtraPanel, window.hideExtraPanel, window.updateEQPhoneSelect,
// window.redrawEQOverlay, window.transitionEQOverlay
// (referenced from showPhone / removePhone / updateVariant / zoom / y-scale / updatePaths in graphtool.js & phoneTable.js).
// Reads activePhones, showPhone, removePhone, Equalizer, f_values, doc, gr, eqOverlayLayer, x, y, yCenter, pad, W, H, W0, H0.

const SVG_ICON = {
    play:    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M3 22v-20l18 10-18 10z"/></svg>',
    pause:   '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M11 22h-4v-20h4v20zm6-20h-4v20h4v20z"/></svg>',
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
        const extraDemo = document.querySelector("div.extra-panel > div.extra-demo");
        if (extraDemo) extraDemo.style["display"] = "none";
        const extraMusicPlayer = document.querySelector("div.extra-panel > div.extra-music-player");
        if (extraMusicPlayer) extraMusicPlayer.style["display"] = "none";
    }

    // Show and hide extra panel
    window.showExtraPanel = () => {
        document.querySelector("div.select > div.selector-panel").style["display"] = "none";
        document.querySelector("div.select > div.extra-panel").style["display"] = "flex";
        document.querySelector("div.select").setAttribute("data-selected", "extra");
        if (typeof window.trackFeatureUsed === "function") {
            window.trackFeatureUsed("eq_tab");
        }
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
        uploadedAudio, uploadedSource, uploadedObjectURL, currentAudio, currentSource,
        demoAudio, demoSource;
    let toneGenActive = false;
    let isPlayingAudio = false;
    let externalYieldCallback = null;
    const volumeSubscribers = new Set();

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
    const openMusicPlayerBtn = document.getElementById("open-music-player");
    if (openMusicPlayerBtn) {
        openMusicPlayerBtn.addEventListener("click", () => {
            if (window.matchMedia && window.matchMedia("(max-width: 1000px)").matches) {
                if (typeof showGraphNotice === "function") {
                    showGraphNotice("Music Player works on desktop only.");
                }
                return;
            }
            if (typeof window.toggleMusicPlayer === "function") {
                window.toggleMusicPlayer();
            }
        });
    }

    let uploadInfoToggle = document.getElementById("upload-info-toggle");
    let uploadInfoPopover = document.getElementById("upload-info-popover");
    let eqInfoToggle = document.getElementById("eq-info-toggle");
    let eqInfoPopover = document.getElementById("eq-info-popover");
    let filterEnabledInput, filterTypeSelect,
        filterFreqInput, filterQInput, filterGainInput;

    const infoPopoverControllers = [];
    function bindInfoPopover(toggleEl, popoverEl) {
        if (!toggleEl || !popoverEl) return;
        let pinned = false;
        let closeTimer = null;
        const setOpen = (open) => {
            if (open) {
                infoPopoverControllers.forEach((ctrl) => {
                    if (ctrl.toggle !== toggleEl) ctrl.close();
                });
            }
            popoverEl.classList.toggle("hidden", !open);
            toggleEl.setAttribute("aria-expanded", open ? "true" : "false");
        };
        const close = () => {
            clearTimeout(closeTimer);
            pinned = false;
            setOpen(false);
        };
        infoPopoverControllers.push({ toggle: toggleEl, close });
        const scheduleHoverClose = () => {
            clearTimeout(closeTimer);
            closeTimer = setTimeout(() => {
                if (!pinned) setOpen(false);
            }, 120);
        };
        toggleEl.addEventListener("mouseenter", () => {
            clearTimeout(closeTimer);
            setOpen(true);
        });
        toggleEl.addEventListener("mouseleave", scheduleHoverClose);
        popoverEl.addEventListener("mouseenter", () => {
            clearTimeout(closeTimer);
        });
        popoverEl.addEventListener("mouseleave", scheduleHoverClose);
        toggleEl.addEventListener("click", (e) => {
            e.stopPropagation();
            clearTimeout(closeTimer);
            pinned = !pinned;
            setOpen(pinned);
        });
        document.addEventListener("click", (e) => {
            if (popoverEl.classList.contains("hidden")) return;
            if (!toggleEl.contains(e.target) && !popoverEl.contains(e.target)) {
                close();
            }
        });
        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape" && !popoverEl.classList.contains("hidden")) {
                close();
            }
        });
    }

    bindInfoPopover(uploadInfoToggle, uploadInfoPopover);
    bindInfoPopover(eqInfoToggle, eqInfoPopover);

    const cloneDefaultFilters = () => DEFAULT_EQ_FILTERS.map((f, idx) => Object.assign({ baselineSlot: idx }, f));

    // Canonical single-source-of-truth session state for the EQ editor & active preset
    const eqSession = {
        editingPresetId: null,
        scope: "LR", // "LR" | "L" | "R"
        scopes: {
            LR: cloneDefaultFilters(),
            L: cloneDefaultFilters(),
            R: cloneDefaultFilters()
        },
        balance: 0,
        bypassed: false,
        pickedSandbox: false,
        overlayEnabled: false,
        overlayDismissed: false,
        overlayUserEnabled: false
    };
    let eqBands = eqSession.scopes[eqSession.scope].length;

    // Overlay & FFT controls
    let btnEqOverlay = document.querySelector("div.extra-eq button.toggle-eq-overlay");
    let btnFftToggle = document.querySelector("div.extra-eq button.toggle-fft");
    let btnFftDrawer = document.querySelector("div.extra-eq button.toggle-fft-drawer");
    let fftDrawerEl = document.querySelector("div.extra-eq div.fft-drawer");
    let btnFftPeak = document.querySelector("div.extra-eq button.toggle-fft-peak");
    let fftStyleButtons = document.querySelectorAll("div.extra-eq button.fft-style");
    let fftModeButtons = document.querySelectorAll("div.extra-eq button.fft-mode");
    let fftSpeedButtons = document.querySelectorAll("div.extra-eq button.fft-speed");

    let fftEnabled = true;
    let fftStyle = "bars"; // "bars" | "wave"
    let fftMode = "post";  // "post" | "pre"
    let fftSpeed = "slow"; // "slow" | "fast"
    let fftPeakEnabled = false;

    function syncEqOverlayButton() {
        if (btnEqOverlay) {
            btnEqOverlay.classList.toggle("selected", eqSession.overlayEnabled);
        }
    }

    const boundHoverRows = new WeakSet();
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
        Array.from(filtersContainer.children).forEach((row, idx) => {
            row.dataset.bandIdx = String(idx);
            if (!boundHoverRows.has(row)) {
                boundHoverRows.add(row);
                row.addEventListener("mouseenter", () => {
                    let bIdx = parseInt(row.dataset.bandIdx, 10);
                    if (!isNaN(bIdx) && typeof onSidebarBandHover === "function") {
                        onSidebarBandHover(bIdx);
                    }
                });
                row.addEventListener("mouseleave", () => {
                    let bIdx = parseInt(row.dataset.bandIdx, 10);
                    if (!isNaN(bIdx) && typeof onSidebarBandLeave === "function") {
                        onSidebarBandLeave(bIdx);
                    }
                });
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
            clone.classList.remove("is-handle-active");
            delete clone.dataset.baselineSlot;
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
            let rowEl = filtersContainer.children[i];
            let rawSlot = rowEl ? rowEl.dataset.baselineSlot : "";
            let parsedSlot = (rawSlot !== undefined && rawSlot !== "") ? parseInt(rawSlot, 10) : NaN;
            let baselineSlot = (Number.isInteger(parsedSlot) && parsedSlot >= 0 && parsedSlot < DEFAULT_EQ_FILTERS.length) ? parsedSlot : null;
            if (!includeAll && (disabled || !type || !freq || !q || !gain)) {
                continue;
            }
            filters.push({ disabled, type, freq, q, gain, baselineSlot });
        }
        return filters;
    };

    let saveCurrentScopeDOM = () => {
        if (!filterEnabledInput || !filterEnabledInput.length) return;
        eqSession.scopes[eqSession.scope] = readDOMFilters(true);
    };

    let getScopeFilters = (scope, includeAll, ignoreBypass) => {
        if (eqSession.bypassed && !includeAll && !ignoreBypass) {
            return [];
        }
        let list = (scope === eqSession.scope && filterEnabledInput && filterEnabledInput.length)
            ? readDOMFilters(true)
            : (eqSession.scopes[scope] || []);
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
        if (eqSession.scope === "L") return getTotalChannelFilters("L", ignoreBypass);
        if (eqSession.scope === "R") return getTotalChannelFilters("R", ignoreBypass);
        return getTotalChannelFilters("LR", ignoreBypass);
    };

    let elemToFilters = (includeAll, ignoreBypass) => {
        if (includeAll) {
            saveCurrentScopeDOM();
            return (eqSession.scopes[eqSession.scope] || []).map(f => Object.assign({}, f));
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
            let rowEl = filtersContainer.children[i];
            if (rowEl) {
                if (typeof f.baselineSlot === "number" && f.baselineSlot >= 0 && f.baselineSlot < DEFAULT_EQ_FILTERS.length) {
                    rowEl.dataset.baselineSlot = String(f.baselineSlot);
                } else {
                    delete rowEl.dataset.baselineSlot;
                }
            }
        });
        eqSession.scopes[eqSession.scope] = readDOMFilters(true);
    };

    function updateScopeIndicators() {
        saveCurrentScopeDOM();
        syncEQOverlayColors();
        scopeButtons.forEach(btn => {
            let s = btn.getAttribute("data-scope") || "LR";
            btn.classList.toggle("selected", s === eqSession.scope);
            let hasActive = getScopeFilters(s, false, true).length > 0;
            btn.classList.toggle("has-active", hasActive);
        });
    }

    function setActiveEQScope(nextScope) {
        if (nextScope !== "LR" && nextScope !== "L" && nextScope !== "R") return;
        saveCurrentScopeDOM();
        eqSession.scope = nextScope;
        let nextList = eqSession.scopes[eqSession.scope] || cloneDefaultFilters();
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
        eqSession.scopes.LR = cloneDefaultFilters();
        eqSession.scopes.L = cloneDefaultFilters();
        eqSession.scopes.R = cloneDefaultFilters();
        filtersToElem(eqSession.scopes[eqSession.scope]);
        eqSession.overlayEnabled = false;
        eqSession.overlayDismissed = false;
        eqSession.overlayUserEnabled = false;
        syncEqOverlayButton();
        setBypassState(false, false);
        updateScopeIndicators();
    };

    let setBypassState = (bypassed, shouldApply = true) => {
        eqSession.bypassed = !!bypassed;
        if (disableFiltersBtn) {
            disableFiltersBtn.classList.toggle("selected", eqSession.bypassed);
            disableFiltersBtn.innerText = eqSession.bypassed ? "Bypassed" : "Bypass";
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
        let phonesList = (typeof activePhones !== "undefined" && Array.isArray(activePhones)) ? activePhones : [];
        let eqPhone = null;

        if (eqSession.editingPresetId) {
            eqPhone = phonesList.find(p => p && p.isEQSnapshot && p.eqSnapshotId === eqSession.editingPresetId && p.active) || null;
        }
        if (!eqPhone) {
            let phoneSelected = eqPhoneSelect ? eqPhoneSelect.value : "";
            let basePhone = phoneSelected && phonesList.find(
                p => !p.isPrefBounds && !p.isTarget && !p.isEQSnapshot && p.brand && (p.brand.name + " " + p.dispName === phoneSelected)
            );
            if (basePhone && basePhone.eq && basePhone.eq.active) {
                eqPhone = basePhone.eq;
            }
        }
        if (!eqPhone) {
            eqPhone = phonesList.find(p => p && p.eqParent && p.eqParent.eq === p && p.active && !p.isEQSnapshot) || null;
        }
        if (!eqPhone) {
            eqPhone = phonesList.find(p => p && p.isEQSnapshot && p.active) || null;
        }

        let baseHcl = null;
        if (eqPhone && typeof getCurveColor === "function") {
            baseHcl = getCurveColor(eqPhone.id, 0, eqPhone.hexColor, { p: eqPhone });
        } else if (typeof curatedPalette !== "undefined" && curatedPalette.length) {
            let activeDataCount = phonesList.filter(q => q && !q.isTarget && !q.isPrefBounds).length;
            baseHcl = curatedPalette[activeDataCount % curatedPalette.length];
        }

        if (!baseHcl) return;
        let h = isNaN(baseHcl.h) ? 245 : baseHcl.h;
        let c = isNaN(baseHcl.c) ? 75 : baseHcl.c;
        let l = isNaN(baseHcl.l) ? 68 : baseHcl.l;
        let chroma = c < 5 ? c : Math.max(25, c * 0.92);
        let lighterHcl = d3.hcl(h, chroma, Math.min(86, l + 10));
        let rgb = d3.rgb(lighterHcl);
        if (!rgb || isNaN(rgb.r)) return;

        let r = Math.round(Math.max(0, Math.min(255, rgb.r)));
        let g = Math.round(Math.max(0, Math.min(255, rgb.g)));
        let b = Math.round(Math.max(0, Math.min(255, rgb.b)));
        let lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        let overlayColor = `rgb(${r}, ${g}, ${b})`;
        let overlayFill = `rgba(${r}, ${g}, ${b}, 0.055)`;
        let overlayRef = `rgba(${r}, ${g}, ${b}, 0.24)`;
        let handleText = lum > 145 ? "#111111" : "#ffffff";

        // Apply on both <html> and <body> because body.theme-dark / body.theme-contrast redeclare --eq-overlay-* on <body>
        [document.documentElement, document.body].forEach(el => {
            if (!el || !el.style) return;
            el.style.setProperty("--eq-overlay-color", overlayColor);
            el.style.setProperty("--eq-overlay-fill", overlayFill);
            el.style.setProperty("--eq-overlay-ref", overlayRef);
            el.style.setProperty("--eq-handle-text", handleText);
        });
    }

    let hoveredBandIdx = null;
    let activeDragIdx = null;
    let wheelTipTimer = null;
    let dragState = null;
    let handleLayerEventsBound = false;
    let cleanupActiveDrag = null;

    function isGraphToolBlockingHandles() {
        return (typeof interactInspect !== "undefined" && !!interactInspect) ||
               (typeof interactCalc !== "undefined" && !!interactCalc);
    }

    function syncSidebarHandleHighlight(activeIdx) {
        if (!filtersContainer) return;
        Array.from(filtersContainer.children).forEach((row, idx) => {
            row.classList.toggle("is-handle-active", activeIdx !== null && idx === activeIdx);
        });
    }

    function formatEQGain(gain) {
        let rounded = Math.round(gain * 10) / 10;
        if (Math.abs(rounded) < 0.05) return "0.0";
        return (rounded > 0 ? "+" : "") + rounded.toFixed(1);
    }

    function clientToSvgPoint(clientX, clientY) {
        let svgNode = (typeof gr !== "undefined" && gr) ? gr.node() : null;
        if (!svgNode) return null;
        if (svgNode.createSVGPoint && svgNode.getScreenCTM) {
            let ctm = svgNode.getScreenCTM();
            if (ctm) {
                let pt = svgNode.createSVGPoint();
                pt.x = clientX;
                pt.y = clientY;
                let transformed = pt.matrixTransform(ctm.inverse());
                return [transformed.x, transformed.y];
            }
        }
        let rect = svgNode.getBoundingClientRect();
        if (!rect.width || !rect.height) return null;
        return [
            ((clientX - rect.left) / rect.width) * W0,
            ((clientY - rect.top) / rect.height) * H0
        ];
    }

    function getCurrentScopeHandleItems(center) {
        let list = (filterEnabledInput && filterEnabledInput.length)
            ? readDOMFilters(true)
            : (eqSession.scopes[eqSession.scope] || []);
        let hasActiveBand = list.some(f => f && !f.disabled && f.type && f.freq >= 20 && f.freq <= 20000 && f.q > 0 && Math.abs(f.gain) >= 0.05);
        let userStartedEQ = hasActiveBand || activeDragIdx !== null || eqSession.overlayUserEnabled || list.length > DEFAULT_EQ_FILTERS.length;
        if (!userStartedEQ) return [];

        let items = [];
        for (let i = 0; i < list.length; i++) {
            let f = list[i];
            if (!f || f.disabled || !f.type || f.freq < 20 || f.freq > 20000 || f.q <= 0) continue;
            let cx = Math.max(pad.l, Math.min(pad.l + W, x(f.freq)));
            let cy = Math.max(pad.t, Math.min(pad.t + H, y(center + f.gain)));
            items.push({
                idx: i,
                num: i + 1,
                filter: f,
                cx,
                cy
            });
        }
        return items;
    }

    function ensureHandleSubgroups() {
        if (typeof eqHandlesLayer === "undefined" || !eqHandlesLayer || eqHandlesLayer.empty()) {
            return { handlesGroup: null, tooltipGroup: null };
        }
        let handlesGroup = eqHandlesLayer.select("g.eq-handles-group");
        if (handlesGroup.empty()) {
            handlesGroup = eqHandlesLayer.append("g").attr("class", "eq-handles-group");
        }
        let tooltipGroup = eqHandlesLayer.select("g.eq-handle-tooltip-group");
        if (tooltipGroup.empty()) {
            tooltipGroup = eqHandlesLayer.append("g").attr("class", "eq-handle-tooltip-group");
        }
        return { handlesGroup, tooltipGroup };
    }

    function drawEQBandPreview(center, items) {
        if (typeof eqOverlayLayer === "undefined" || !eqOverlayLayer || eqOverlayLayer.empty()) return;
        let focusIdx = activeDragIdx !== null ? activeDragIdx : hoveredBandIdx;
        let focusItem = focusIdx !== null ? items.find(it => it.idx === focusIdx) : null;
        let previewPts = focusItem ? buildEQOverlayData([focusItem.filter]) : [];
        let previewSel = eqOverlayLayer.selectAll("path.eq-band-preview")
            .data(previewPts.length ? [previewPts] : []);
        previewSel.exit().remove();
        previewSel.enter()
            .append("path")
            .attr("class", "eq-band-preview")
            .merge(previewSel)
            .classed("is-bypassed", eqSession.bypassed)
            .attr("d", d => {
                let areaGen = d3.area()
                    .x(p => x(p[0]))
                    .y0(() => y(center))
                    .y1(p => y(p[1]))
                    .curve(d3.curveNatural);
                return areaGen(d);
            });
    }

    function drawEQHandleTooltip(items) {
        let { tooltipGroup } = ensureHandleSubgroups();
        if (!tooltipGroup || tooltipGroup.empty()) return;
        let focusIdx = activeDragIdx !== null ? activeDragIdx : hoveredBandIdx;
        let focusItem = focusIdx !== null ? items.find(it => it.idx === focusIdx) : null;

        let tipSel = tooltipGroup.selectAll("g.eq-handle-tooltip")
            .data(focusItem ? [focusItem] : []);
        tipSel.exit().remove();
        if (!focusItem) return;

        let tipEnter = tipSel.enter()
            .append("g")
            .attr("class", "eq-handle-tooltip");
        tipEnter.append("rect").attr("rx", 3).attr("ry", 3);
        tipEnter.append("text");

        let tipG = tipEnter.merge(tipSel);
        let f = focusItem.filter;
        let label = `${Math.round(f.freq)} Hz | ${formatEQGain(f.gain)} dB | Q ${Number(f.q).toFixed(2)}`;
        let textEl = tipG.select("text").text(label);
        let textNode = textEl.node();
        let textW = textNode && textNode.getComputedTextLength ? textNode.getComputedTextLength() : label.length * 5.0;
        let boxW = Math.ceil(textW + 10);
        let boxH = 15;

        let tx = focusItem.cx - boxW / 2;
        tx = Math.max(pad.l + 4, Math.min(pad.l + W - boxW - 4, tx));
        let ty = focusItem.cy - boxH - 9;
        if (ty < pad.t + 4) {
            ty = Math.min(pad.t + H - boxH - 4, focusItem.cy + 9);
        }

        tipG.attr("transform", `translate(${tx.toFixed(1)}, ${ty.toFixed(1)})`);
        tipG.select("rect").attr("width", boxW).attr("height", boxH);
        textEl.attr("x", 5).attr("y", boxH / 2);
    }

    function onSidebarBandHover(bandIdx) {
        if (!eqSession.overlayEnabled || isGraphToolBlockingHandles() || dragState) return;
        let items = getCurrentScopeHandleItems(getEffectiveCenter());
        if (!items.some(it => it.idx === bandIdx)) return;
        hoveredBandIdx = bandIdx;
        drawEQHandles();
    }

    function onSidebarBandLeave(bandIdx) {
        if (activeDragIdx !== null || dragState) return;
        if (hoveredBandIdx === bandIdx) {
            hoveredBandIdx = null;
            drawEQHandles();
        }
    }

    function applyHandleValues(bandIdx, nextFreq, nextGain, nextQ) {
        if (!filterFreqInput || !filterGainInput || !filterQInput || bandIdx < 0 || bandIdx >= eqBands) return;
        if (nextFreq !== null && nextFreq !== undefined) {
            let clampedFreq = Math.max(20, Math.min(20000, Math.round(nextFreq)));
            filterFreqInput[bandIdx].value = String(clampedFreq);
        }
        if (nextGain !== null && nextGain !== undefined) {
            let roundedGain = Math.max(-40, Math.min(40, Math.round(nextGain * 10) / 10));
            if (Math.abs(roundedGain) < 0.05) roundedGain = 0;
            filterGainInput[bandIdx].value = roundedGain === 0 ? "0" : String(Number(roundedGain.toFixed(1)));
        }
        if (nextQ !== null && nextQ !== undefined) {
            let clampedQ = Math.max(0.1, Math.min(10, Math.round(nextQ * 100) / 100));
            filterQInput[bandIdx].value = String(Number(clampedQ.toFixed(2)));
        }
        applyEQ();
    }

    function getBandIdxFromEventTarget(target) {
        if (!target || typeof target.closest !== "function") return -1;
        let handleEl = target.closest("g.eq-band-handle");
        if (!handleEl) return -1;
        let idxAttr = parseInt(handleEl.getAttribute("data-band-idx"), 10);
        if (!isNaN(idxAttr)) return idxAttr;
        let datum = d3.select(handleEl).datum();
        return (datum && typeof datum.idx === "number") ? datum.idx : -1;
    }

    function findClosestHandleBandIdx(clientX, clientY) {
        let pt = clientToSvgPoint(clientX, clientY);
        if (!pt) return -1;
        let items = getCurrentScopeHandleItems(getEffectiveCenter());
        let bestIdx = -1;
        let bestDist = 14;
        for (let i = 0; i < items.length; i++) {
            let dist = Math.hypot(pt[0] - items[i].cx, pt[1] - items[i].cy);
            if (dist <= bestDist) {
                bestDist = dist;
                bestIdx = items[i].idx;
            }
        }
        return bestIdx;
    }

    function bindHandleLayerEvents() {
        if (handleLayerEventsBound || typeof eqHandlesLayer === "undefined" || !eqHandlesLayer || eqHandlesLayer.empty()) return;
        let layerNode = eqHandlesLayer.node();
        if (!layerNode) return;
        handleLayerEventsBound = true;

        const finishActiveDrag = (ev, skipRedraw) => {
            if (!dragState) return;
            if (ev && ev.pointerId !== undefined && ev.pointerId !== dragState.pointerId) return;
            let endedIdx = dragState.bandIdx;
            let didMove = !!dragState.hasMoved;
            let pid = dragState.pointerId;
            let hadCapture = !!dragState.hasCapture;
            dragState = null;
            activeDragIdx = null;
            window.removeEventListener("pointermove", onWindowPointerMove);
            window.removeEventListener("pointerup", onWindowPointerUp);
            window.removeEventListener("pointercancel", onWindowPointerCancel);
            if (hadCapture) {
                try {
                    if (layerNode.hasPointerCapture && layerNode.hasPointerCapture(pid)) {
                        layerNode.releasePointerCapture(pid);
                    }
                } catch (_) {}
            }

            if (didMove) {
                if (!skipRedraw) {
                    let latest = readDOMFilters(true)[endedIdx];
                    if (!latest || Math.abs(latest.gain) < 0.05) {
                        if (hoveredBandIdx === endedIdx) hoveredBandIdx = null;
                    } else if (ev && typeof ev.clientX === "number" && typeof ev.clientY === "number" && typeof document.elementFromPoint === "function") {
                        let under = document.elementFromPoint(ev.clientX, ev.clientY);
                        let overIdx = getBandIdxFromEventTarget(under);
                        hoveredBandIdx = overIdx >= 0 ? overIdx : null;
                    }
                }
                flushPendingApplyEQ();
                flushAutoSave();
                if (!skipRedraw) {
                    drawEQHandles();
                }
            }
        };
        cleanupActiveDrag = finishActiveDrag;

        const onWindowPointerMove = (ev) => {
            if (!dragState || ev.pointerId !== dragState.pointerId) return;
            if (!eqSession.overlayEnabled || isGraphToolBlockingHandles()) {
                finishActiveDrag(ev);
                return;
            }
            if (!dragState.hasMoved) {
                let movePx = Math.hypot(ev.clientX - dragState.startClientX, ev.clientY - dragState.startClientY);
                if (movePx <= 3) return;
                dragState.hasMoved = true;
                activeDragIdx = dragState.bandIdx;
                hoveredBandIdx = dragState.bandIdx;
                try {
                    if (layerNode.setPointerCapture) {
                        layerNode.setPointerCapture(ev.pointerId);
                        dragState.hasCapture = true;
                    }
                } catch (_) {}
            }
            let pt = clientToSvgPoint(ev.clientX, ev.clientY);
            if (!pt) return;
            let dx = pt[0] - dragState.prevSvgPt[0];
            let dy = pt[1] - dragState.prevSvgPt[1];
            dragState.prevSvgPt = pt;

            let scaleFactor = ev.shiftKey ? 0.25 : 1.0;
            dragState.curPx[0] = Math.max(pad.l, Math.min(pad.l + W, dragState.curPx[0] + dx * scaleFactor));
            dragState.curPx[1] = Math.max(pad.t, Math.min(pad.t + H, dragState.curPx[1] + dy * scaleFactor));

            let center = getEffectiveCenter();
            let nextFreq = x.invert(dragState.curPx[0]);
            let nextGain = y.invert(dragState.curPx[1]) - center;
            applyHandleValues(dragState.bandIdx, nextFreq, nextGain, null);
            if (typeof window.trackFeatureUsed === "function") {
                window.trackFeatureUsed("eq_handle_used");
            }
        };

        const onWindowPointerUp = (ev) => finishActiveDrag(ev);
        const onWindowPointerCancel = (ev) => finishActiveDrag(ev);

        layerNode.addEventListener("pointerdown", (ev) => {
            if (!eqSession.overlayEnabled || isGraphToolBlockingHandles()) return;
            if (ev.pointerType === "mouse" && ev.button !== 0) return;
            let bandIdx = getBandIdxFromEventTarget(ev.target);
            if (bandIdx < 0 || bandIdx >= eqBands) return;
            let f = readDOMFilters(true)[bandIdx];
            if (!f || f.disabled) return;
            let startPt = clientToSvgPoint(ev.clientX, ev.clientY);
            if (!startPt) return;

            ev.stopPropagation();
            clearTimeout(wheelTipTimer);

            if (dragState) finishActiveDrag(null, true);
            let center = getEffectiveCenter();
            dragState = {
                pointerId: ev.pointerId,
                bandIdx,
                startClientX: ev.clientX,
                startClientY: ev.clientY,
                prevSvgPt: startPt,
                curPx: [
                    Math.max(pad.l, Math.min(pad.l + W, x(f.freq))),
                    Math.max(pad.t, Math.min(pad.t + H, y(center + f.gain)))
                ],
                hasMoved: false,
                hasCapture: false
            };

            window.addEventListener("pointermove", onWindowPointerMove);
            window.addEventListener("pointerup", onWindowPointerUp);
            window.addEventListener("pointercancel", onWindowPointerCancel);
        });

        layerNode.addEventListener("pointerover", (ev) => {
            if (dragState || !eqSession.overlayEnabled || isGraphToolBlockingHandles()) return;
            let bandIdx = getBandIdxFromEventTarget(ev.target);
            if (bandIdx < 0 || hoveredBandIdx === bandIdx) return;
            clearTimeout(wheelTipTimer);
            hoveredBandIdx = bandIdx;
            drawEQHandles();
        });

        layerNode.addEventListener("pointerout", (ev) => {
            if (dragState) return;
            let outIdx = getBandIdxFromEventTarget(ev.target);
            if (outIdx < 0) return;
            let nextIdx = getBandIdxFromEventTarget(ev.relatedTarget);
            if (nextIdx === outIdx) return;
            if (hoveredBandIdx === outIdx) {
                hoveredBandIdx = nextIdx >= 0 ? nextIdx : null;
                drawEQHandles();
            }
        });

        layerNode.addEventListener("dblclick", (ev) => {
            if (!eqSession.overlayEnabled || isGraphToolBlockingHandles()) return;
            let bandIdx = getBandIdxFromEventTarget(ev.target);
            if (bandIdx < 0) {
                bandIdx = findClosestHandleBandIdx(ev.clientX, ev.clientY);
            }
            if (bandIdx < 0 || bandIdx >= eqBands) return;
            ev.stopPropagation();
            ev.preventDefault();
            clearTimeout(wheelTipTimer);
            if (dragState) finishActiveDrag(null, true);
            activeDragIdx = null;
            hoveredBandIdx = null;

            saveCurrentScopeDOM();
            let currentList = readDOMFilters(true);
            let targetFilter = currentList[bandIdx];
            if (!targetFilter) return;

            if (typeof targetFilter.baselineSlot === "number" &&
                targetFilter.baselineSlot >= 0 &&
                targetFilter.baselineSlot < DEFAULT_EQ_FILTERS.length) {
                let base = DEFAULT_EQ_FILTERS[targetFilter.baselineSlot];
                filterEnabledInput[bandIdx].checked = true;
                filterTypeSelect[bandIdx].value = base.type;
                filterFreqInput[bandIdx].value = String(base.freq);
                filterGainInput[bandIdx].value = "0";
                filterQInput[bandIdx].value = String(base.q);
                applyEQ();
            } else {
                currentList.splice(bandIdx, 1);
                filtersToElem(currentList);
                applyEQ();
            }
            flushAutoSave();
            if (typeof window.trackFeatureUsed === "function") {
                window.trackFeatureUsed("eq_handle_used");
            }
        });

        layerNode.addEventListener("wheel", (ev) => {
            if (!eqSession.overlayEnabled || isGraphToolBlockingHandles()) return;
            let bandIdx = getBandIdxFromEventTarget(ev.target);
            if (bandIdx < 0 || bandIdx >= eqBands) return;
            ev.preventDefault();
            ev.stopPropagation();
            let f = readDOMFilters(true)[bandIdx];
            if (!f) return;
            let curQ = parseFloat(f.q) || (f.type === "PK" ? 1.0 : 0.71);
            let dir = ev.deltaY < 0 ? 1 : -1;
            let stepFactor = ev.shiftKey ? 1.02 : 1.09;
            let nextQ = dir > 0 ? curQ * stepFactor : curQ / stepFactor;
            hoveredBandIdx = bandIdx;
            clearTimeout(wheelTipTimer);
            applyHandleValues(bandIdx, null, null, nextQ);
            if (typeof window.trackFeatureUsed === "function") {
                window.trackFeatureUsed("eq_handle_used");
            }
        }, { passive: false });
    }

    function drawEQHandles() {
        if (typeof eqHandlesLayer === "undefined" || !eqHandlesLayer || eqHandlesLayer.empty()) return;
        bindHandleLayerEvents();
        if (!eqSession.overlayEnabled) {
            if (dragState && cleanupActiveDrag) cleanupActiveDrag(null, true);
            eqHandlesLayer.selectAll("*").remove();
            syncSidebarHandleHighlight(null);
            return;
        }
        let { handlesGroup } = ensureHandleSubgroups();
        if (!handlesGroup || handlesGroup.empty()) return;

        let center = getEffectiveCenter();
        let items = getCurrentScopeHandleItems(center);
        let focusIdx = activeDragIdx !== null ? activeDragIdx : hoveredBandIdx;
        if (focusIdx !== null && !items.some(it => it.idx === focusIdx)) {
            if (activeDragIdx === focusIdx) activeDragIdx = null;
            if (hoveredBandIdx === focusIdx) hoveredBandIdx = null;
            focusIdx = null;
        }

        eqHandlesLayer
            .classed("is-bypassed", eqSession.bypassed)
            .classed("is-tool-blocked", isGraphToolBlockingHandles());

        let handlesSel = handlesGroup.selectAll("g.eq-band-handle")
            .data(items, d => d.idx);

        handlesSel.exit().remove();

        let enterG = handlesSel.enter()
            .append("g")
            .attr("class", "eq-band-handle");

        enterG.append("circle")
            .attr("class", "eq-handle-hit")
            .attr("r", 12);
        enterG.append("circle")
            .attr("class", "eq-handle-dot")
            .attr("r", 5.5);
        enterG.append("text")
            .attr("class", "eq-handle-num")
            .attr("x", 0)
            .attr("y", 0.2);

        let merged = enterG.merge(handlesSel)
            .attr("data-band-idx", d => String(d.idx))
            .attr("transform", d => `translate(${d.cx.toFixed(2)}, ${d.cy.toFixed(2)})`)
            .classed("is-active", d => d.idx === focusIdx)
            .classed("is-dragging", d => d.idx === activeDragIdx);

        merged.select("circle.eq-handle-dot")
            .attr("r", d => d.idx === focusIdx ? 6.5 : 5.5);

        merged.select("text.eq-handle-num")
            .text(d => String(d.num));

        syncSidebarHandleHighlight(focusIdx);
        drawEQBandPreview(center, items);
        drawEQHandleTooltip(items);
    }

    window.syncEQHandlesInteractivity = function () {
        if (typeof eqHandlesLayer === "undefined" || !eqHandlesLayer || eqHandlesLayer.empty()) return;
        let blocked = isGraphToolBlockingHandles();
        if (blocked && (hoveredBandIdx !== null || activeDragIdx !== null || dragState)) {
            if (dragState && cleanupActiveDrag) {
                cleanupActiveDrag(null, true);
            } else {
                dragState = null;
                activeDragIdx = null;
            }
            hoveredBandIdx = null;
            drawEQHandles();
        } else {
            eqHandlesLayer.classed("is-tool-blocked", blocked);
        }
    };

    function isEqualizerTabActive() {
        let selEl = document.querySelector("div.select");
        return !!(selEl && selEl.getAttribute("data-selected") === "extra");
    }

    window.onGraphDoubleClickEQ = function (pt) {
        if (!isEqualizerTabActive() || isGraphToolBlockingHandles() || !pt) return;
        let center = getEffectiveCenter();
        let nextFreq = Math.max(20, Math.min(20000, Math.round(x.invert(Math.max(pad.l, Math.min(pad.l + W, pt[0]))))));
        let nextGain = Math.max(-40, Math.min(40, Math.round((y.invert(Math.max(pad.t, Math.min(pad.t + H, pt[1]))) - center) * 10) / 10));
        if (Math.abs(nextGain) < 0.1) nextGain = 0.5;

        saveCurrentScopeDOM();
        let currentList = readDOMFilters(true);

        if (!eqSession.overlayEnabled) {
            eqSession.overlayEnabled = true;
            eqSession.overlayDismissed = false;
            eqSession.overlayUserEnabled = true;
            syncEqOverlayButton();

            let logTarget = Math.log(Math.max(20, nextFreq));
            let bestIdx = -1;
            let bestDist = Infinity;
            for (let i = 0; i < currentList.length; i++) {
                let f = currentList[i];
                if (!f || f.disabled) continue;
                if (typeof f.baselineSlot !== "number") continue;
                let dist = Math.abs(Math.log(Math.max(20, f.freq || 1000)) - logTarget);
                if (dist < bestDist) {
                    bestDist = dist;
                    bestIdx = i;
                }
            }
            if (bestIdx < 0) {
                for (let i = 0; i < currentList.length; i++) {
                    let f = currentList[i];
                    if (!f) continue;
                    if (typeof f.baselineSlot !== "number" && i >= DEFAULT_EQ_FILTERS.length) continue;
                    let dist = Math.abs(Math.log(Math.max(20, f.freq || 1000)) - logTarget);
                    if (dist < bestDist) {
                        bestDist = dist;
                        bestIdx = i;
                    }
                }
            }
            if (bestIdx < 0) bestIdx = 0;
            if (filterEnabledInput[bestIdx]) {
                filterEnabledInput[bestIdx].checked = true;
            }
            hoveredBandIdx = bestIdx;
            applyHandleValues(bestIdx, nextFreq, nextGain, null);
            if (typeof window.trackFeatureUsed === "function") {
                window.trackFeatureUsed("eq_handle_used");
            }
            clearTimeout(wheelTipTimer);
            wheelTipTimer = setTimeout(() => {
                if (activeDragIdx === null && hoveredBandIdx === bestIdx) {
                    hoveredBandIdx = null;
                    drawEQHandles();
                }
            }, 1200);
            return;
        }

        if (eqBands >= extraEQBandsMax) {
            if (typeof showGraphNotice === "function") {
                showGraphNotice("Maximum of " + extraEQBandsMax + " EQ bands reached.");
            }
            return;
        }

        eqBands = Math.min(eqBands + 1, extraEQBandsMax);
        updateFilterElements();
        let targetIdx = eqBands - 1;
        let newRow = filtersContainer.children[targetIdx];
        if (newRow) {
            delete newRow.dataset.baselineSlot;
        }
        filterEnabledInput[targetIdx].checked = true;
        filterTypeSelect[targetIdx].value = "PK";
        filterQInput[targetIdx].value = "1";

        hoveredBandIdx = targetIdx;
        applyHandleValues(targetIdx, nextFreq, nextGain, 1);
        if (typeof window.trackFeatureUsed === "function") {
            window.trackFeatureUsed("eq_handle_used");
        }
        clearTimeout(wheelTipTimer);
        wheelTipTimer = setTimeout(() => {
            if (activeDragIdx === null && hoveredBandIdx === targetIdx) {
                hoveredBandIdx = null;
                drawEQHandles();
            }
        }, 1200);
    };

    function drawEQOverlay(durationMs) {
        syncEQOverlayColors();
        if (typeof eqOverlayLayer === "undefined" || !eqOverlayLayer || eqOverlayLayer.empty()) return;
        if (!eqSession.overlayEnabled) {
            eqOverlayLayer.selectAll("*").remove();
            if (dragState && cleanupActiveDrag) {
                cleanupActiveDrag(null, true);
            } else {
                dragState = null;
                activeDragIdx = null;
            }
            hoveredBandIdx = null;
            if (typeof eqHandlesLayer !== "undefined" && eqHandlesLayer && !eqHandlesLayer.empty()) {
                eqHandlesLayer.selectAll("*").remove();
            }
            syncSidebarHandleHighlight(null);
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
            .classed("is-bypassed", eqSession.bypassed)
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
            .classed("is-bypassed", eqSession.bypassed);
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
            .classed("is-bypassed", eqSession.bypassed);
        if (durationMs) {
            strokeSel.transition().duration(durationMs).attr("d", d => line(d));
        } else {
            strokeSel.attr("d", d => line(d));
        }

        drawEQHandles();
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
        if (eqSession.bypassed) {
            preampDisplay.innerText = "Pre-amp: " + peakStr + " · Auto-Gain: Bypassed";
        } else {
            preampDisplay.innerText = "Pre-amp: " + peakStr + " · Auto-Gain: " + fmtDb(state.autoGainDb);
        }
        preampDisplay.title = "Export Peak Pre-amp: " + peakStr +
            " | K-Weighted A/B Auto-Gain: " + fmtDb(state.autoGainDb) +
            " | Shared Clip Guard: " + fmtDb(state.sharedSafetyDb);
    }

    function resolveEditorBasePhone() {
        let phoneSelected = eqPhoneSelect ? eqPhoneSelect.value : "";
        let phonesList = (typeof activePhones !== "undefined" && Array.isArray(activePhones)) ? activePhones : [];
        let selectedPhoneObj = phoneSelected && phonesList.find(
            p => !p.isPrefBounds && !p.isTarget && !p.isEQSnapshot && p.brand && (p.brand.name + " " + p.dispName === phoneSelected)
        );
        if (selectedPhoneObj) return selectedPhoneObj;
        if (!eqSession.pickedSandbox && eqSession.editingPresetId) {
            let activeSnap = findActiveSnapshotCurve(eqSession.editingPresetId);
            if (activeSnap && !activeSnap.isSandboxEQ && activeSnap.eqBasePhone &&
                (!phoneSelected || activeSnap.eqBaseKey === phoneSelected)) {
                return activeSnap.eqBasePhone;
            }
        }
        return null;
    }

    let applyEQHandle = null;
    let applyEQUseRaf = false;
    let applyEQExec = (skipRedraw) => {
        saveCurrentScopeDOM();
        let phoneSelected = eqPhoneSelect.value;
        let anyActive = hasAnyActiveFilters(false);
        let hasSplits = hasChannelTrimFilters(true);

        if (eqSession.editingPresetId) {
            let editingPreset = savedEQPresets.find(x => x.id === eqSession.editingPresetId);
            let editingSnap = editingPreset ? findActiveSnapshotCurve(editingPreset.id) : null;
            if (editingPreset && editingSnap) {
                activePhones
                    .filter(q => q && q.eqParent && q.eqParent.eq === q && !q.isEQSnapshot)
                    .forEach(q => removePhone(q));

                let previewBasePhone = resolveEditorBasePhone();
                mountSnapshotCurve(editingPreset, previewBasePhone, eqSession.bypassed);
                updatePreampDisplay();
                if (!skipRedraw) {
                    drawEQOverlay(0);
                } else {
                    syncEQOverlayColors();
                }
                return;
            }
            eqSession.editingPresetId = null;
        }

        if (anyActive && !phoneSelected && !eqSession.pickedSandbox) {
            let firstPhone = eqPhoneSelect.querySelectorAll("option")[1];
            if (firstPhone) {
                phoneSelected = eqPhoneSelect.value = firstPhone.value;
            }
        }

        let phoneObj = phoneSelected && activePhones.filter(
            p => !p.isPrefBounds && !p.isTarget && !p.isEQSnapshot && p.brand && (p.brand.name + " " + p.dispName == phoneSelected))[0];

        if (phoneObj && (anyActive || (phoneObj.eq && phoneObj.eq.active))) {
            let channels = applyChannelFiltersToPhone(phoneObj, false);
            if (phoneObj.eq && phoneObj.eq.active && phoneObj.eq.eqParent === phoneObj) {
                // Smooth in-place curve update (preserves focus, color, pins, and avoids row flicker)
                let eqCurve = phoneObj.eq;
                let prevSplits = !!eqCurve.hasChannelSplits;
                eqCurve.rawChannels = channels;
                eqCurve.sampleLabels = phoneObj.sampleLabels;
                eqCurve.sampleSeatings = phoneObj.sampleSeatings;
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
                let eqName = phoneObj.dispName + " EQ";
                let prevEQ = phoneObj.eq;
                if (prevEQ && prevEQ.active) {
                    removePhone(prevEQ);
                }
                let phoneObjEQ = asPhoneObj(phoneObj.brand, { name: eqName });
                phoneObjEQ.rawChannels = channels;
                phoneObjEQ.isDynamic = true;
                if (prevEQ) {
                    if (prevEQ.id !== undefined) phoneObjEQ.id = prevEQ.id;
                    if (prevEQ.offset !== undefined) phoneObjEQ.offset = prevEQ.offset;
                }
                phoneObj.eq = phoneObjEQ;
                phoneObjEQ.eqParent = phoneObj;
                phoneObjEQ.sampleLabels = phoneObj.sampleLabels;
                phoneObjEQ.sampleSeatings = phoneObj.sampleSeatings;
                phoneObjEQ.hasChannelSplits = hasSplits;
                updatePreampDisplay();
                showPhone(phoneObjEQ, false, true);
                if (activeElem && typeof activeElem.focus === "function") {
                    activeElem.focus();
                }
            }
        } else {
            updatePreampDisplay();
        }
        if (!skipRedraw) {
            drawEQOverlay(0);
        } else {
            syncEQOverlayColors();
        }
    };

    function flushPendingApplyEQ() {
        if (applyEQHandle === null) return;
        if (applyEQUseRaf && typeof cancelAnimationFrame === "function") {
            cancelAnimationFrame(applyEQHandle);
        } else {
            clearTimeout(applyEQHandle);
        }
        applyEQHandle = null;
        applyEQUseRaf = false;
        applyEQExec(false);
    }

    let applyEQ = () => {
        saveCurrentScopeDOM();
        scheduleAutoSave(false, false);

        if (applyEQHandle === null) {
            if (typeof requestAnimationFrame === "function") {
                applyEQUseRaf = true;
                applyEQHandle = requestAnimationFrame(() => {
                    applyEQHandle = null;
                    applyEQUseRaf = false;
                    applyEQExec(true);
                });
            } else {
                applyEQUseRaf = false;
                applyEQHandle = setTimeout(() => {
                    applyEQHandle = null;
                    applyEQExec(true);
                }, 16);
            }
        }

        updateScopeIndicators();

        let hasConfigured = hasAnyActiveFilters(true);
        if (hasConfigured && typeof window.trackFeatureUsed === "function") {
            window.trackFeatureUsed("eq_adjusted");
        }
        if (hasConfigured && !eqSession.overlayEnabled && !eqSession.overlayDismissed) {
            eqSession.overlayEnabled = true;
            syncEqOverlayButton();
        } else if (!hasConfigured) {
            eqSession.overlayDismissed = false;
        }

        updatePreampDisplay();
        drawEQOverlay(0);
        updateAudioFilters();
        document.dispatchEvent(new CustomEvent("UpdateExtensionFilters", { detail: { filters: elemToFilters(false, false) } }));
    };

    window.updateEQPhoneSelect = () => {
        let oldValue = eqPhoneSelect.value;
        let optionValues = activePhones.filter(p =>
            !p.isPrefBounds && !p.isTarget && !p.eqParent && !p.isEQSnapshot &&
            (!p.dispName || !p.dispName.match(/ EQ( Saved \d+)?$/))
        ).map(p => (p.brand && p.brand.name ? p.brand.name + " " : "") + p.dispName);

        // Preserve locked base headphone option while editing a preset even if its reference curve is removed from the graph
        let lockedBaseKey = "";
        if (eqSession.editingPresetId && !eqSession.pickedSandbox) {
            let activeSnap = findActiveSnapshotCurve(eqSession.editingPresetId);
            if (activeSnap && !activeSnap.isSandboxEQ && activeSnap.eqBaseKey) {
                lockedBaseKey = activeSnap.eqBaseKey;
                if (optionValues.indexOf(lockedBaseKey) < 0) {
                    optionValues.push(lockedBaseKey);
                }
            }
        }

        Array.from(eqPhoneSelect.children).slice(1).forEach(c => eqPhoneSelect.removeChild(c));
        optionValues.forEach(value => {
            let optionElem = document.createElement("option");
            optionElem.setAttribute("value", value);
            optionElem.innerText = value;
            eqPhoneSelect.appendChild(optionElem);
        });
        if (eqSession.pickedSandbox && oldValue === "") {
            eqPhoneSelect.value = "";
        } else if (lockedBaseKey && optionValues.indexOf(lockedBaseKey) >= 0 && (!oldValue || oldValue === lockedBaseKey)) {
            eqPhoneSelect.value = lockedBaseKey;
        } else {
            eqPhoneSelect.value = (optionValues.indexOf(oldValue) >= 0) ? oldValue : "";
            if (!eqPhoneSelect.value && oldValue !== "") {
                eqSession.pickedSandbox = false;
            }
        }
        syncEQOverlayColors();
    };

    // Initialize clean 8-band rack on startup
    resetDefaultFilters();
    eqPhoneSelect.addEventListener("input", () => {
        if (!eqPhoneSelect.value) {
            eqSession.pickedSandbox = true;
            activePhones
                .filter(q => q && q.eqParent && q.eqParent.eq === q && !q.isEQSnapshot)
                .forEach(q => removePhone(q));
        } else {
            eqSession.pickedSandbox = false;
            let selectedKey = eqPhoneSelect.value;
            activePhones
                .filter(q => q && q.eqParent && q.eqParent.eq === q && !q.isEQSnapshot &&
                    (!q.eqParent.brand || (q.eqParent.brand.name + " " + q.eqParent.dispName) !== selectedKey))
                .forEach(q => removePhone(q));
        }
        if (eqSession.editingPresetId) {
            let editedPreset = scheduleAutoSave(true, true) || syncEditingPresetInMemory(true);
            let nextBase = eqSession.pickedSandbox ? null : resolveEditorBasePhone();
            if (editedPreset) {
                mountSnapshotCurve(editedPreset, nextBase, eqSession.bypassed);
            }
            renderSavedEQList();
            drawEQOverlay(0);
            updatePreampDisplay();
            return;
        }
        applyEQ();
    });

    // Add new filter in current scope
    document.querySelector("div.extra-eq button.add-filter").addEventListener("click", () => {
        saveCurrentScopeDOM();
        eqBands = Math.min(eqBands + 1, extraEQBandsMax);
        updateFilterElements();
        eqSession.scopes[eqSession.scope] = readDOMFilters(true);
        scheduleAutoSave(false, false);
        if (!eqSession.overlayEnabled && !eqSession.overlayDismissed) {
            eqSession.overlayEnabled = true;
            syncEqOverlayButton();
        }
        drawEQOverlay(0);
    });

    // Remove last filter in current scope
    document.querySelector("div.extra-eq button.remove-filter").addEventListener("click", () => {
        saveCurrentScopeDOM();
        eqBands = Math.max(eqBands - 1, 1);
        updateFilterElements();
        eqSession.scopes[eqSession.scope] = readDOMFilters(true);
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
        setBypassState(!eqSession.bypassed, true);
        if (typeof window.trackFeatureUsed === "function") {
            window.trackFeatureUsed("eq_bypass");
        }
    });

    // Reset all scopes, balance, and bypass back to clean defaults, and deselect any active Custom EQ preset without losing it
    let resetFiltersBtn = document.querySelector("div.extra-eq button.reset-filters");
    if (resetFiltersBtn) {
        resetFiltersBtn.addEventListener("click", () => {
            flushPendingApplyEQ();
            flushAutoSave();
            let prevId = eqSession.editingPresetId;
            eqSession.editingPresetId = null;
            if (prevId) {
                let activeSnap = findActiveSnapshotCurve(prevId);
                if (activeSnap) removePhone(activeSnap);
            }
            resetEditorToDefaults({ clearScratchEQ: true });
        });
    }

    // -------------------- Unified Saved Custom EQ Presets (Sidebar + Bottom Table + Sandbox) -------------------- //
    const SAVED_EQ_STORAGE_KEY = "mirelink_saved_eq_v1";
    let savedEQPresets = [];
    let customEqCounter = 1;
    let eqSavedSectionEl = document.querySelector("div.extra-eq div.eq-saved-section");
    let eqSavedListEl = document.querySelector("div.extra-eq div.eq-saved-list");

    function cloneFilterArray(list) {
        if (!Array.isArray(list) || !list.length) return cloneDefaultFilters();
        return list.map((f, idx) => {
            let slot = null;
            if (f && typeof f.baselineSlot === "number" && f.baselineSlot >= 0 && f.baselineSlot < DEFAULT_EQ_FILTERS.length) {
                slot = f.baselineSlot;
            } else if (f && f.baselineSlot === null) {
                slot = null;
            } else if (idx < DEFAULT_EQ_FILTERS.length) {
                slot = idx;
            }
            return {
                type: f && f.type ? String(f.type) : "PK",
                freq: Number.isFinite(Number(f && f.freq)) ? Number(f.freq) : 1000,
                gain: Number.isFinite(Number(f && f.gain)) ? Number(f.gain) : 0,
                q: Number.isFinite(Number(f && f.q)) ? Number(f.q) : 1.0,
                disabled: !!(f && f.disabled),
                baselineSlot: slot
            };
        });
    }

    function getNextCustomEqNumber() {
        let used = new Set();
        savedEQPresets.forEach(p => {
            let m = String(p.name || "").trim().match(/^CUSTOM\s+EQ\s+(\d+)$/i);
            if (m) {
                let n = parseInt(m[1], 10);
                if (Number.isFinite(n) && n >= 1) used.add(n);
            }
        });
        let n = 1;
        while (used.has(n)) n++;
        return n;
    }

    function syncCustomEqCounterFloor() {
        customEqCounter = getNextCustomEqNumber();
    }

    function loadSavedEQState() {
        try {
            let raw = window.localStorage ? window.localStorage.getItem(SAVED_EQ_STORAGE_KEY) : null;
            if (!raw) return;
            let parsed = JSON.parse(raw);
            if (parsed && Array.isArray(parsed.presets)) {
                savedEQPresets = parsed.presets
                    .filter(p => p && typeof p.id === "string")
                    .map((p, idx) => ({
                        id: String(p.id),
                        name: String(p.name || ("CUSTOM EQ " + (idx + 1))).trim() || ("CUSTOM EQ " + (idx + 1)),
                        scopes: {
                            LR: cloneFilterArray(p.scopes && p.scopes.LR),
                            L: cloneFilterArray(p.scopes && p.scopes.L),
                            R: cloneFilterArray(p.scopes && p.scopes.R)
                        },
                        balance: Number.isFinite(Number(p.balance)) ? Math.max(-10, Math.min(10, Number(p.balance))) : 0,
                        model: (p.model && !p.model.isSandbox) ? {
                            isSandbox: false,
                            key: String(p.model.key || ""),
                            brandName: String(p.model.brandName || ""),
                            phoneName: String(p.model.phoneName || ""),
                            dispName: String(p.model.dispName || ""),
                            fileName: String(p.model.fileName || "")
                        } : {
                            isSandbox: true,
                            key: "",
                            brandName: "",
                            phoneName: "",
                            dispName: "",
                            fileName: ""
                        }
                    }));
            }
            if (parsed && Number.isFinite(Number(parsed.counter))) {
                customEqCounter = Math.max(1, Math.floor(Number(parsed.counter)));
            }
        } catch (_) {}
        syncCustomEqCounterFloor();
    }

    function persistSavedEQState() {
        syncCustomEqCounterFloor();
        try {
            if (window.localStorage) {
                window.localStorage.setItem(SAVED_EQ_STORAGE_KEY, JSON.stringify({
                    counter: customEqCounter,
                    presets: savedEQPresets
                }));
            }
        } catch (_) {}
    }

    function buildActiveChannelFilterList(scopesObj, channel) {
        const clean = (list) => (list || [])
            .filter(f => f && !f.disabled && f.type && f.freq && f.q && f.gain)
            .map(f => Object.assign({}, f));
        let shared = clean(scopesObj.LR);
        if (channel === "L") return shared.concat(clean(scopesObj.L));
        if (channel === "R") return shared.concat(clean(scopesObj.R));
        return shared;
    }

    function hasSplitsInScopes(scopesObj) {
        if (!scopesObj) return false;
        const hasAny = (list) => (list || []).some(f => f && !f.disabled && f.type && f.freq && f.q && f.gain);
        return hasAny(scopesObj.L) || hasAny(scopesObj.R);
    }

    function buildSnapshotChannels(phoneObj, scopesObj, respectBypass) {
        let totalL = (respectBypass && eqSession.bypassed) ? [] : buildActiveChannelFilterList(scopesObj, "L");
        let totalR = (respectBypass && eqSession.bypassed) ? [] : buildActiveChannelFilterList(scopesObj, "R");
        let totalLR = (respectBypass && eqSession.bypassed) ? [] : buildActiveChannelFilterList(scopesObj, "LR");
        let raw = (phoneObj && phoneObj.rawChannels && phoneObj.rawChannels.length) ? phoneObj.rawChannels : null;
        if (raw) {
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
        let freqs = (typeof f_values !== "undefined") ? f_values : Equalizer.GraphicEQRawFrequences;
        let flat = freqs.map(f => [f, 60]);
        return [
            Equalizer.apply(flat, totalL),
            Equalizer.apply(flat, totalR)
        ];
    }

    function findActiveSnapshotCurve(presetId) {
        if (!presetId || typeof activePhones === "undefined") return null;
        return activePhones.find(p => p && p.isEQSnapshot && p.eqSnapshotId === presetId) || null;
    }

    function getCurrentChannelBalanceValue() {
        let slider = document.querySelector("div.settings-row input[name='balance-vol']");
        if (!slider) return 0;
        let v = parseFloat(slider.value);
        return Number.isFinite(v) ? Math.max(-10, Math.min(10, v)) : 0;
    }

    function captureCurrentModelMeta(phoneObj) {
        if (!phoneObj) {
            return { isSandbox: true, key: "", brandName: "", phoneName: "", dispName: "", fileName: "" };
        }
        return {
            isSandbox: false,
            key: (phoneObj.brand && phoneObj.brand.name ? phoneObj.brand.name + " " : "") + (phoneObj.dispName || phoneObj.phone || ""),
            brandName: (phoneObj.brand && phoneObj.brand.name) ? String(phoneObj.brand.name) : "",
            phoneName: String(phoneObj.phone || ""),
            dispName: String(phoneObj.dispName || phoneObj.phone || ""),
            fileName: String(phoneObj.fileName || "")
        };
    }

    function getPresetModelSubLabel(preset) {
        if (!preset || !preset.model || preset.model.isSandbox) return "Sandbox";
        return preset.model.dispName || preset.model.key || preset.model.phoneName || "Headphone";
    }

    function getSnapshotBrandLabel(preset, phoneObj) {
        if (!preset || !preset.model || preset.model.isSandbox || !phoneObj) return "Sandbox";
        let dispBrand = (phoneObj.dispBrand || (phoneObj.brand && phoneObj.brand.name) || "").trim();
        let dispName = (phoneObj.dispName || phoneObj.phone || "").trim();
        return (dispBrand && dispName) ? (dispBrand + " " + dispName) : (dispName || dispBrand || "Headphone");
    }

    function getSnapshotBaseMeta(preset, phoneObj) {
        if (!preset || !preset.model || preset.model.isSandbox || !phoneObj) {
            return { isSandbox: true, baseBrand: "", baseModel: "Sandbox", baseKey: "" };
        }
        let baseBrand = (phoneObj.dispBrand || (phoneObj.brand && phoneObj.brand.name) || (preset.model && preset.model.brandName) || "").trim();
        let baseModel = (phoneObj.dispName || phoneObj.phone || (preset.model && preset.model.dispName) || "").trim();
        let baseKey = (baseBrand ? (baseBrand + " " + baseModel).trim() : baseModel).trim();
        return { isSandbox: false, baseBrand, baseModel, baseKey };
    }

    function resolvePhoneObjSynchronouslyByMeta(meta) {
        if (!meta || meta.isSandbox) return null;
        let isMatch = (q) => q && !q.isTarget && !q.isPrefBounds && !q.eqParent && !q.isEQSnapshot &&
            ((meta.fileName && q.fileName === meta.fileName) ||
             (meta.key && q.brand && (q.brand.name + " " + q.dispName) === meta.key));
        if (typeof activePhones !== "undefined") {
            let act = activePhones.find(isMatch);
            if (act && act.rawChannels) return act;
        }
        if (typeof allPhones !== "undefined") {
            let p = allPhones.find(isMatch);
            if (p && p.rawChannels) return p;
        }
        return null;
    }

    function mountSnapshotCurve(preset, phoneObj, respectBypass) {
        let isSandbox = !phoneObj || !!(preset.model && preset.model.isSandbox);
        let channels = buildSnapshotChannels(isSandbox ? null : phoneObj, preset.scopes, !!respectBypass);
        let splits = hasSplitsInScopes(preset.scopes);
        let brandLabel = getSnapshotBrandLabel(preset, isSandbox ? null : phoneObj);
        let baseMeta = getSnapshotBaseMeta(preset, isSandbox ? null : phoneObj);
        let existing = findActiveSnapshotCurve(preset.id);
        let activeParent = (!isSandbox && phoneObj && phoneObj.active) ? phoneObj : null;

        if (existing) {
            let prevSplits = !!existing.hasChannelSplits;
            existing.isSandboxEQ = isSandbox;
            existing.eqParent = activeParent;
            existing.eqBasePhone = isSandbox ? null : phoneObj;
            existing.eqBaseRawChannels = isSandbox ? null : phoneObj.rawChannels;
            existing.eqBaseBrand = baseMeta.baseBrand;
            existing.eqBaseModel = baseMeta.baseModel;
            existing.eqBaseKey = baseMeta.baseKey;
            existing.brand = { name: isSandbox ? "Sandbox" : (phoneObj.brand && phoneObj.brand.name ? phoneObj.brand.name : "Custom EQ") };
            existing.dispBrand = brandLabel;
            existing.dispName = preset.name;
            existing.phone = preset.name;
            existing.fullName = brandLabel + " " + preset.name;
            existing.rawChannels = channels;
            existing.sampleLabels = isSandbox ? null : phoneObj.sampleLabels;
            existing.sampleSeatings = isSandbox ? null : phoneObj.sampleSeatings;
            existing.hasChannelSplits = splits;
            existing.smooth = null;
            smoothPhone(existing);
            let wantAvg;
            if (prevSplits !== splits && !existing._userChannelOverride) {
                let comparePhones = activePhones.filter(q => !q.isTarget && !q.isPrefBounds && !q.eqParent && !q.isEQSnapshot);
                wantAvg = (comparePhones.length >= 2) ? false : !splits;
            }
            setCurves(existing, wantAvg);
            normalizePhone(existing);
            if (typeof table !== "undefined") {
                let tr = table.selectAll("tr").filter(q => q === existing);
                tr.select("span.brand").text(brandLabel);
                tr.select("div.phonename").text(preset.name);
            }
            updatePaths("preset");
            updatePhoneTable();
            return existing;
        }

        let snapshotObj = {
            brand: { name: isSandbox ? "Sandbox" : (phoneObj.brand && phoneObj.brand.name ? phoneObj.brand.name : "Custom EQ") },
            dispBrand: brandLabel,
            phone: preset.name,
            dispName: preset.name,
            fullName: brandLabel + " " + preset.name,
            fileName: "__eq_snapshot__" + preset.id,
            rawChannels: channels,
            sampleLabels: isSandbox ? null : phoneObj.sampleLabels,
            sampleSeatings: isSandbox ? null : phoneObj.sampleSeatings,
            isDynamic: true,
            isEQSnapshot: true,
            eqSnapshotId: preset.id,
            isSandboxEQ: isSandbox,
            eqParent: activeParent,
            eqBasePhone: isSandbox ? null : phoneObj,
            eqBaseRawChannels: isSandbox ? null : phoneObj.rawChannels,
            eqBaseBrand: baseMeta.baseBrand,
            eqBaseModel: baseMeta.baseModel,
            eqBaseKey: baseMeta.baseKey,
            hasChannelSplits: splits
        };
        showPhone(snapshotObj, false, true, "preset");
        return snapshotObj;
    }

    let autoSaveTimer = null;
    let suppressAutoSave = false;

    function syncEditingPresetInMemory(includeModel) {
        if (suppressAutoSave || !eqSession.editingPresetId) return null;
        let preset = savedEQPresets.find(p => p.id === eqSession.editingPresetId);
        if (!preset) return null;
        preset.scopes = {
            LR: cloneFilterArray(eqSession.scopes.LR),
            L: cloneFilterArray(eqSession.scopes.L),
            R: cloneFilterArray(eqSession.scopes.R)
        };
        preset.balance = Math.max(-10, Math.min(10, Number(eqSession.balance) || 0));
        if (includeModel) {
            let resolvedBase = eqSession.pickedSandbox ? null : resolveEditorBasePhone();
            preset.model = captureCurrentModelMeta(resolvedBase || null);
        }
        return preset;
    }

    function scheduleAutoSave(includeModel, immediate) {
        if (suppressAutoSave || !eqSession.editingPresetId) return null;
        let preset = syncEditingPresetInMemory(includeModel);
        if (!preset) return null;
        clearTimeout(autoSaveTimer);
        if (immediate) {
            autoSaveTimer = null;
            persistSavedEQState();
        } else {
            autoSaveTimer = setTimeout(() => {
                autoSaveTimer = null;
                persistSavedEQState();
            }, 180);
        }
        return preset;
    }

    function flushAutoSave() {
        if (autoSaveTimer !== null) {
            clearTimeout(autoSaveTimer);
            autoSaveTimer = null;
            persistSavedEQState();
        }
    }

    if (typeof window !== "undefined") {
        window.addEventListener("beforeunload", flushAutoSave);
        window.addEventListener("pagehide", flushAutoSave);
    }

    function syncSnapshotCurveName(preset) {
        let existing = findActiveSnapshotCurve(preset.id);
        if (!existing) return;
        let brandLabel = existing.dispBrand || "Sandbox";
        existing.phone = preset.name;
        existing.dispName = preset.name;
        existing.fullName = brandLabel + " " + preset.name;
        if (typeof table !== "undefined") {
            let tr = table.selectAll("tr").filter(q => q === existing);
            tr.select("div.phonename").text(preset.name);
        }
        setCurves(existing);
        updatePaths("preset");
    }

    function syncSavedEQPillColors() {
        if (!eqSavedListEl) return;
        let pills = eqSavedListEl.querySelectorAll("div.eq-preset-pill[data-eq-id]");
        pills.forEach(pill => {
            let id = pill.getAttribute("data-eq-id");
            let snap = findActiveSnapshotCurve(id);
            let isEditing = (eqSession.editingPresetId === id && !!snap);
            pill.classList.toggle("is-active", !!snap);
            pill.classList.toggle("is-editing", isEditing);
            let dot = pill.querySelector("span.eq-pill-dot");
            if (dot) {
                if (snap && typeof getColor_AC === "function" && typeof d3 !== "undefined") {
                    let col = d3.rgb(getColor_AC({ p: snap })).toString();
                    dot.style.setProperty("--eq-dot-color", col);
                    dot.style.backgroundColor = col;
                    dot.style.borderColor = col;
                } else {
                    dot.style.removeProperty("--eq-dot-color");
                    dot.style.backgroundColor = "";
                    dot.style.borderColor = "";
                }
            }
        });
    }
    window.syncSavedEQPillColors = syncSavedEQPillColors;

    function startPillRename(labelEl, currentName, onSave, onCancel) {
        let input = document.createElement("input");
        input.type = "text";
        input.className = "eq-pill-rename-input";
        input.value = currentName;
        labelEl.innerHTML = "";
        labelEl.appendChild(input);
        input.focus();
        input.select();

        let finished = false;
        const commit = () => {
            if (finished) return;
            finished = true;
            let val = input.value.trim();
            onSave(val || currentName);
        };
        input.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                commit();
            } else if (e.key === "Escape") {
                e.preventDefault();
                finished = true;
                onCancel();
            }
        });
        input.addEventListener("blur", commit);
        input.addEventListener("click", (e) => e.stopPropagation());
        input.addEventListener("dblclick", (e) => e.stopPropagation());
    }

    function applyPresetValuesToEditor(preset) {
        suppressAutoSave = true;
        try {
            eqSession.scopes.LR = cloneFilterArray(preset.scopes && preset.scopes.LR);
            eqSession.scopes.L = cloneFilterArray(preset.scopes && preset.scopes.L);
            eqSession.scopes.R = cloneFilterArray(preset.scopes && preset.scopes.R);
            filtersToElem(eqSession.scopes[eqSession.scope] || eqSession.scopes.LR);
            applyChannelBalance(preset.balance || 0, false);
            setBypassState(false, false);
            eqSession.overlayDismissed = false;
            eqSession.overlayEnabled = true;
            syncEqOverlayButton();
            updateScopeIndicators();
            updatePreampDisplay();
            updateAudioFilters();
            document.dispatchEvent(new CustomEvent("UpdateExtensionFilters", { detail: { filters: elemToFilters(false, false) } }));
        } finally {
            suppressAutoSave = false;
        }
    }

    function resetEditorToDefaults(options) {
        let clearScratch = !options || options.clearScratchEQ !== false;
        clearTimeout(autoSaveTimer);
        autoSaveTimer = null;
        suppressAutoSave = true;
        try {
            eqSession.editingPresetId = null;
            eqSession.pickedSandbox = false;
            resetDefaultFilters();
            applyChannelBalance(0, false);
            if (clearScratch && typeof activePhones !== "undefined") {
                activePhones
                    .filter(q => q && q.eqParent && q.eqParent.eq === q && !q.isEQSnapshot)
                    .forEach(q => removePhone(q));
            }
            updateEQPhoneSelect();
            if (eqPhoneSelect) eqPhoneSelect.value = "";
            updatePreampDisplay();
            drawEQOverlay(0);
            updateAudioFilters();
            document.dispatchEvent(new CustomEvent("UpdateExtensionFilters", { detail: { filters: elemToFilters(false, false) } }));
            renderSavedEQList();
        } finally {
            suppressAutoSave = false;
        }
    }

    function focusPlottedPreset(preset) {
        if (!preset) return;
        let existing = findActiveSnapshotCurve(preset.id);
        if (!existing) {
            activateSavedPreset(preset);
            return;
        }
        flushPendingApplyEQ();
        flushAutoSave();
        activePhones
            .filter(q => q && q.eqParent && q.eqParent.eq === q && !q.isEQSnapshot)
            .forEach(q => removePhone(q));

        eqSession.editingPresetId = preset.id;
        applyPresetValuesToEditor(preset);

        if (existing.isSandboxEQ) {
            eqSession.pickedSandbox = true;
            updateEQPhoneSelect();
            eqPhoneSelect.value = "";
        } else {
            eqSession.pickedSandbox = false;
            updateEQPhoneSelect();
            let matchingActive = (existing.eqParent && existing.eqParent.active) ? existing.eqParent : null;
            if (!matchingActive && existing.eqBaseKey) {
                matchingActive = activePhones.find(p =>
                    p && !p.isPrefBounds && !p.isTarget && !p.isEQSnapshot && !p.eqParent && p.brand &&
                    (p.brand.name + " " + p.dispName) === existing.eqBaseKey
                ) || null;
            }
            if (matchingActive && matchingActive.brand) {
                eqPhoneSelect.value = matchingActive.brand.name + " " + matchingActive.dispName;
            } else if (existing.eqBaseKey) {
                eqPhoneSelect.value = existing.eqBaseKey;
            } else {
                eqPhoneSelect.value = "";
            }
        }
        drawEQOverlay(0);
        renderSavedEQList();
    }

    function activateSavedPreset(preset) {
        if (!preset) return;
        flushPendingApplyEQ();
        flushAutoSave();

        activePhones
            .filter(q => q && q.eqParent && q.eqParent.eq === q && !q.isEQSnapshot)
            .forEach(q => removePhone(q));

        eqSession.editingPresetId = preset.id;
        applyPresetValuesToEditor(preset);

        if (!preset.model || preset.model.isSandbox || typeof window.loadHeadphoneByMeta !== "function") {
            eqSession.pickedSandbox = true;
            updateEQPhoneSelect();
            eqPhoneSelect.value = "";
            mountSnapshotCurve(preset, null, false);
            drawEQOverlay(0);
            renderSavedEQList();
            return;
        }

        eqSession.pickedSandbox = false;
        window.loadHeadphoneByMeta(preset.model, (phoneObj) => {
            if (eqSession.editingPresetId !== preset.id) return;
            if (!phoneObj) {
                if (typeof showGraphNotice === "function") {
                    showGraphNotice("Headphone not found (" + (preset.model.key || preset.model.dispName || "Unknown") + "). Loaded filters in Sandbox.");
                }
                eqSession.pickedSandbox = true;
                updateEQPhoneSelect();
                eqPhoneSelect.value = "";
                mountSnapshotCurve(preset, null, false);
                drawEQOverlay(0);
                renderSavedEQList();
                return;
            }
            mountSnapshotCurve(preset, phoneObj, false);
            updateEQPhoneSelect();
            let selectKey = (phoneObj.brand && phoneObj.brand.name ? phoneObj.brand.name + " " : "") + phoneObj.dispName;
            eqPhoneSelect.value = selectKey;
            drawEQOverlay(0);
            renderSavedEQList();
        });
    }

    function deselectSavedPreset(preset) {
        if (!preset) return;
        flushPendingApplyEQ();
        flushAutoSave();
        let existing = findActiveSnapshotCurve(preset.id);
        if (existing) {
            removePhone(existing);
        } else if (eqSession.editingPresetId === preset.id) {
            resetEditorToDefaults({ clearScratchEQ: true });
        } else {
            renderSavedEQList();
        }
    }

    function deleteSavedPreset(preset) {
        if (!preset) return;
        flushPendingApplyEQ();
        if (eqSession.editingPresetId === preset.id) {
            clearTimeout(autoSaveTimer);
            autoSaveTimer = null;
        } else {
            flushAutoSave();
        }
        savedEQPresets = savedEQPresets.filter(p => p.id !== preset.id);
        persistSavedEQState();
        let existing = findActiveSnapshotCurve(preset.id);
        if (existing) {
            removePhone(existing);
        } else if (eqSession.editingPresetId === preset.id) {
            resetEditorToDefaults({ clearScratchEQ: true });
        } else {
            renderSavedEQList();
        }
    }

    function renderSavedEQList(scrollToBottom) {
        if (!eqSavedSectionEl || !eqSavedListEl) return;
        eqSavedSectionEl.classList.toggle("hidden", savedEQPresets.length === 0);
        eqSavedListEl.innerHTML = "";
        if (!savedEQPresets.length) return;

        savedEQPresets.forEach(preset => {
            let isActive = !!findActiveSnapshotCurve(preset.id);
            let isEditing = isActive && eqSession.editingPresetId === preset.id;
            let pill = document.createElement("div");
            pill.className = "eq-preset-pill" + (isActive ? " is-active" : "") + (isEditing ? " is-editing" : "");
            pill.setAttribute("data-eq-id", preset.id);
            pill.title = isEditing
                ? "Auto-saving edits · Click to deselect · Double-click to rename"
                : (isActive ? "Click to focus in EQ editor · Double-click to rename" : "Click to load onto graph · Double-click to rename");

            let mainArea = document.createElement("div");
            mainArea.className = "eq-pill-main";

            let dotSpan = document.createElement("span");
            dotSpan.className = "eq-pill-dot";

            let labelSpan = document.createElement("span");
            labelSpan.className = "eq-pill-label";
            labelSpan.textContent = preset.name;

            let modelSpan = document.createElement("span");
            modelSpan.className = "eq-pill-model";
            modelSpan.textContent = getPresetModelSubLabel(preset);

            mainArea.appendChild(dotSpan);
            mainArea.appendChild(labelSpan);
            mainArea.appendChild(modelSpan);

            let actions = document.createElement("div");
            actions.className = "eq-pill-actions";

            let delBtn = document.createElement("button");
            delBtn.type = "button";
            delBtn.className = "eq-pill-btn eq-pill-delete";
            delBtn.title = "Delete saved preset permanently";
            delBtn.setAttribute("aria-label", "Delete preset " + preset.name);
            delBtn.textContent = "×";
            delBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                deleteSavedPreset(preset);
            });
            delBtn.addEventListener("dblclick", (e) => e.stopPropagation());

            actions.appendChild(delBtn);

            pill.appendChild(mainArea);
            pill.appendChild(actions);

            let clickTimer = null;
            mainArea.addEventListener("click", () => {
                if (pill.classList.contains("is-renaming")) return;
                clearTimeout(clickTimer);
                clickTimer = setTimeout(() => {
                    clickTimer = null;
                    if (pill.classList.contains("is-renaming")) return;
                    let plotted = findActiveSnapshotCurve(preset.id);
                    if (!plotted) {
                        activateSavedPreset(preset);
                    } else if (eqSession.editingPresetId !== preset.id) {
                        focusPlottedPreset(preset);
                    } else {
                        deselectSavedPreset(preset);
                    }
                }, 210);
            });

            mainArea.addEventListener("dblclick", (e) => {
                e.stopPropagation();
                e.preventDefault();
                clearTimeout(clickTimer);
                clickTimer = null;
                if (pill.classList.contains("is-renaming")) return;
                pill.classList.add("is-renaming");
                startPillRename(labelSpan, preset.name, (newName) => {
                    pill.classList.remove("is-renaming");
                    preset.name = newName;
                    persistSavedEQState();
                    syncSnapshotCurveName(preset);
                    renderSavedEQList();
                }, () => {
                    pill.classList.remove("is-renaming");
                    renderSavedEQList();
                });
            });

            eqSavedListEl.appendChild(pill);
        });

        syncSavedEQPillColors();
        if (scrollToBottom) {
            eqSavedListEl.scrollTop = eqSavedListEl.scrollHeight;
        }
    }

    window.onEQSnapshotRemoved = function(removedId) {
        if (eqSession.editingPresetId && eqSession.editingPresetId === removedId) {
            clearTimeout(autoSaveTimer);
            autoSaveTimer = null;
            eqSession.editingPresetId = null;
            let remainingSnap = (typeof activePhones !== "undefined")
                ? activePhones.find(p => p && p.isEQSnapshot && p.active && p.eqSnapshotId !== removedId)
                : null;
            let remainingPreset = remainingSnap ? savedEQPresets.find(x => x.id === remainingSnap.eqSnapshotId) : null;
            if (remainingPreset) {
                focusPlottedPreset(remainingPreset);
                return;
            }
            let hasLiveScratchEQ = (typeof activePhones !== "undefined") &&
                activePhones.some(p => p && p.eqParent && p.eqParent.eq === p && p.active && !p.isEQSnapshot);
            if (!hasLiveScratchEQ) {
                resetEditorToDefaults({ clearScratchEQ: false });
                return;
            }
            drawEQOverlay(0);
        }
        renderSavedEQList();
    };

    window.onExclusiveEQCleared = function() {
        if (eqSession.editingPresetId) return;
        let hasAnyActiveEQ = (typeof activePhones !== "undefined") &&
            activePhones.some(p => p && p.active && (p.isEQSnapshot || (p.eqParent && p.eqParent.eq === p)));
        if (!hasAnyActiveEQ) {
            resetEditorToDefaults({ clearScratchEQ: false });
        }
    };

    loadSavedEQState();
    renderSavedEQList();

    // Save filters: saves new CUSTOM EQ preset in sidebar + plots snapshot curve in bottom table
    document.querySelector("div.extra-eq button.save-filters").addEventListener("click", () => {
        saveCurrentScopeDOM();
        let balanceVal = getCurrentChannelBalanceValue();
        if (!hasAnyActiveFilters(true) && Math.abs(balanceVal) < 0.01) {
            if (typeof showGraphNotice === "function") {
                showGraphNotice("Please add an active filter or channel balance before saving EQ.");
            }
            return;
        }
        flushPendingApplyEQ();
        flushAutoSave();

        let phoneObj = eqSession.pickedSandbox ? null : resolveEditorBasePhone();

        // Remove any temporary scratch "<Model> EQ" curve so no duplicate curve stays on the graph
        activePhones
            .filter(q => q && q.eqParent && q.eqParent.eq === q && !q.isEQSnapshot)
            .forEach(q => removePhone(q));

        syncCustomEqCounterFloor();
        let preset = {
            id: "eq_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
            name: "CUSTOM EQ " + customEqCounter,
            scopes: {
                LR: cloneFilterArray(eqSession.scopes.LR),
                L: cloneFilterArray(eqSession.scopes.L),
                R: cloneFilterArray(eqSession.scopes.R)
            },
            balance: balanceVal,
            model: captureCurrentModelMeta(phoneObj || null)
        };
        customEqCounter++;
        savedEQPresets.push(preset);
        persistSavedEQState();
        eqSession.editingPresetId = preset.id;
        mountSnapshotCurve(preset, phoneObj || null, eqSession.bypassed);
        drawEQOverlay(0);
        renderSavedEQList(true);
        if (typeof window.trackFeatureUsed === "function") {
            window.trackFeatureUsed("eq_saved");
        }
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
            let targetScope = eqSession.scope;
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

            const assignImportedSlots = (arr) => arr.map((f, idx) => Object.assign({}, f, {
                baselineSlot: idx < DEFAULT_EQ_FILTERS.length ? idx : null
            }));
            let totalParsed = parsed.LR.length + parsed.L.length + parsed.R.length;
            if (totalParsed > 0) {
                setBypassState(false, false);
                if (hasExplicitChannels) {
                    eqSession.scopes.LR = parsed.LR.length ? assignImportedSlots(parsed.LR) : cloneDefaultFilters();
                    eqSession.scopes.L = parsed.L.length ? assignImportedSlots(parsed.L) : cloneDefaultFilters();
                    eqSession.scopes.R = parsed.R.length ? assignImportedSlots(parsed.R) : cloneDefaultFilters();
                    filtersToElem(eqSession.scopes[eqSession.scope]);
                } else {
                    filtersToElem(assignImportedSlots(parsed[eqSession.scope]));
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
        let phoneObj = resolveEditorBasePhone();
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

        let lrAll = eqSession.scopes.LR || [];
        let lActive = getScopeFilters("L", false, true);
        let rActive = getScopeFilters("R", false, true);

        if (lActive.length > 0 || rActive.length > 0) {
            if (getScopeFilters("LR", false, true).length > 0) {
                settings += "Channel: all\r\n" + formatAPOBlock(lrAll);
            }
            if (lActive.length > 0) {
                settings += "Channel: L\r\n" + formatAPOBlock(eqSession.scopes.L || []);
            }
            if (rActive.length > 0) {
                settings += "Channel: R\r\n" + formatAPOBlock(eqSession.scopes.R || []);
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
        if (typeof window.trackGraphExported === "function") {
            window.trackGraphExported("eq_apo");
        }
    });

    // Export filters as graphic EQ (Wavelet 127-band format for active scope total)
    document.querySelector("div.extra-eq button.export-graphic-filters").addEventListener("click", () => {
        saveCurrentScopeDOM();
        let filters = getActiveScopeDisplayFilters(true);
        if (!filters.length) {
            alert("Please add at least one active non-zero filter before export.");
            return;
        }
        let phoneObj = resolveEditorBasePhone();
        let graphicEQ = Equalizer.as_graphic_eq(filters);
        let settings = "GraphicEQ: " + graphicEQ.map(([f, gain]) =>
            f.toFixed(0) + " " + gain.toFixed(1)).join("; ");
        let exportElem = document.querySelector("#file-filters-export");
        exportElem.href && URL.revokeObjectURL(exportElem.href);
        exportElem.href = URL.createObjectURL(new Blob([settings]));
        let baseName = phoneObj ? phoneObj.fullName.replace(/^Uploaded /, "") : "MIRElink EQ";
        let scopeTag = (eqSession.scope === "L" || eqSession.scope === "R") ? (" " + eqSession.scope) : "";
        exportElem.download = baseName + scopeTag + " Graphic Filters.txt";
        exportElem.click();
        if (typeof window.trackGraphExported === "function") {
            window.trackGraphExported("eq_wavelet");
        }
    });

    /* AutoEQ disabled for MIRE workflow (preserved for future use)
    // Readme
    document.querySelector("div.extra-eq button.readme").addEventListener("click", () => { ... });
    // AutoEQ ...
    */

    // Graph Overlays & FFT Spectrum Controls
    if (btnEqOverlay) {
        btnEqOverlay.addEventListener("click", () => {
            eqSession.overlayEnabled = !eqSession.overlayEnabled;
            eqSession.overlayDismissed = !eqSession.overlayEnabled;
            eqSession.overlayUserEnabled = eqSession.overlayEnabled;
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
            if (typeof window.trackFeatureUsed === "function") {
                window.trackFeatureUsed("fft_spectrum");
            }
        });
    }

    if (btnFftDrawer && fftDrawerEl) {
        btnFftDrawer.addEventListener("click", () => {
            let isOpen = !fftDrawerEl.classList.contains("hidden");
            fftDrawerEl.classList.toggle("hidden", isOpen);
            fftDrawerEl.setAttribute("aria-hidden", isOpen ? "true" : "false");
            btnFftDrawer.setAttribute("aria-expanded", isOpen ? "false" : "true");
            if (!isOpen && typeof window.trackFeatureUsed === "function") {
                window.trackFeatureUsed("fft_spectrum");
            }
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
            if (typeof window.trackFeatureUsed === "function") {
                window.trackFeatureUsed("fft_spectrum");
            }
        });
    }

    fftStyleButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            fftStyle = (btn.getAttribute("data-style") === "wave") ? "wave" : "bars";
            fftStyleButtons.forEach(b => b.classList.toggle("selected", b === btn));
            if (typeof window.trackFeatureUsed === "function") {
                window.trackFeatureUsed("fft_spectrum");
            }
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
            if (typeof window.trackFeatureUsed === "function") {
                window.trackFeatureUsed("fft_spectrum");
            }
        });
    });

    fftSpeedButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            fftSpeed = (btn.getAttribute("data-speed") === "fast") ? "fast" : "slow";
            fftSpeedButtons.forEach(b => b.classList.toggle("selected", b === btn));
            let tc = fftSpeed === "fast" ? FFT_SMOOTH_FAST : FFT_SMOOTH_SLOW;
            preAnalyser.smoothingTimeConstant = tc;
            postAnalyser.smoothingTimeConstant = tc;
            if (typeof window.trackFeatureUsed === "function") {
                window.trackFeatureUsed("fft_spectrum");
            }
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

    function emitVolumeState() {
        const muted = volumeIcon ? volumeIcon.classList.contains("muted") : false;
        const vol = muted ? 0 : (parseFloat(volumeRange ? volumeRange.value : currentVolume) || 0);
        const state = { volume: parseFloat(currentVolume) || 0, effectiveVolume: vol, muted };
        volumeSubscribers.forEach((fn) => {
            try { fn(state); } catch (_) {}
        });
    }

    function setMasterVolume(val) {
        const clamped = Math.max(0, Math.min(100, parseFloat(val) || 0));
        if (volumeIcon && volumeIcon.classList.contains("muted") && clamped > 0) {
            volumeIcon.classList.remove("muted");
            volumeIcon.innerHTML = SVG_ICON.volume;
        }
        currentVolume = clamped;
        if (volumeRange) volumeRange.value = clamped;
        const now = audioContext.currentTime;
        volumeNode.gain.cancelScheduledValues(now);
        volumeNode.gain.setTargetAtTime(clamped / 100, now, 0.007);
        syncAudioGainTargets(false);
        updatePreampDisplay();
        emitVolumeState();
    }

    function toggleMasterMute() {
        if (!volumeIcon || !volumeRange) return;
        const now = audioContext.currentTime;
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
        emitVolumeState();
    }

    // Master Volume UI (click-free ramping + syncs Option B shared headroom)
    volumeIcon.addEventListener("click", () => {
        toggleMasterMute();
    });

    volumeRange.addEventListener("input", () => {
        setMasterVolume(volumeRange.value);
    });

    // Channel Balance (attenuates opposite channel cleanly, zero positive gain clipping)
    let channelBalanceSlider = document.querySelector("div.settings-row input[name='balance-vol']");
    let volLeftInput = document.getElementById("vol-left");
    let volRightInput = document.getElementById("vol-right");

    function applyChannelBalance(balValue, shouldAutoSave) {
        let bal = Math.max(-10, Math.min(10, parseFloat(balValue) || 0));
        eqSession.balance = bal;
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

        if (shouldAutoSave) {
            scheduleAutoSave(false, false);
        }
    }

    if (channelBalanceSlider) {
        channelBalanceSlider.addEventListener("input", () => {
            applyChannelBalance(channelBalanceSlider.value, true);
        });
    }

    if (volLeftInput) {
        volLeftInput.addEventListener("input", () => {
            let v = Math.max(-10, Math.min(0, parseFloat(volLeftInput.value) || 0));
            applyChannelBalance(-v, true); // e.g., -3 dB on Left => slider +3 toward Right
        });
    }

    if (volRightInput) {
        volRightInput.addEventListener("input", () => {
            let v = Math.max(-10, Math.min(0, parseFloat(volRightInput.value) || 0));
            applyChannelBalance(v, true); // e.g., -3 dB on Right => slider -3 toward Left
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
        let dryTarget = (eqSession.bypassed || !state.hasActive) ? 1 : 0;
        let wetTarget = (!eqSession.bypassed && state.hasActive) ? Math.pow(10, state.autoGainDb / 20) : 0;
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

        let eqTrack = document.querySelector("div.extra-panel .eq-track");
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

        demoAudio = pinkNoiseAudio;
        demoSource = pinkNoiseSource;
        currentAudio = demoAudio;
        currentSource = demoSource;

        applyFilters(audioContext, currentSource);

        let playButton = document.getElementById("play-button");
        let eqTrack = document.querySelector("div.extra-panel .eq-track");
        let songProgressSlider = document.querySelector("div.eq-demo input[name='demo-time']");
        let songTimeText = document.getElementById("songTime");

        if (eqTrack) {
            syncEqTrackWidth(eqTrack);
        }

        if (songProgressSlider) {
            songProgressSlider.addEventListener("input", () => {
                if (!toneGenActive && demoAudio && currentAudio === demoAudio && demoAudio.duration && isFinite(demoAudio.duration)) {
                    demoAudio.currentTime = (songProgressSlider.value / 100) * demoAudio.duration;
                }
            });
        }

        const resetDemoTransportUI = () => {
            if (playButton) {
                playButton.classList.remove("playing");
                playButton.innerHTML = SVG_ICON.play;
            }
            if (songTimeText) songTimeText.innerText = "00:00:00";
            if (songProgressSlider) songProgressSlider.value = 0;
        };

        const resolveDemoTrack = () => {
            if (!eqTrack) return;
            switch (eqTrack.value) {
                default:
                    toneGenActive = false;
                    toneGenRange.classList.add("hidden");
                    toneGenSlider.classList.add("hidden");
                    demoAudio = pinkNoiseAudio;
                    demoSource = pinkNoiseSource;
                    break;
                case "scarlet":
                    toneGenActive = false;
                    toneGenRange.classList.add("hidden");
                    toneGenSlider.classList.add("hidden");
                    demoAudio = scarletFireAudio;
                    demoSource = scarletFireSource;
                    break;
                case "custom-eq-track":
                    if (!uploadedAudio || !uploadedSource) {
                        if (typeof showGraphNotice === "function") {
                            showGraphNotice("Please upload an audio file first.");
                        }
                        eqTrack.value = "pink";
                        toneGenActive = false;
                        toneGenRange.classList.add("hidden");
                        toneGenSlider.classList.add("hidden");
                        demoAudio = pinkNoiseAudio;
                        demoSource = pinkNoiseSource;
                        break;
                    }
                    toneGenActive = false;
                    toneGenRange.classList.add("hidden");
                    toneGenSlider.classList.add("hidden");
                    demoAudio = uploadedAudio;
                    demoSource = uploadedSource;
                    break;
                case "tone":
                    toneGenActive = true;
                    toneGenRange.classList.remove("hidden");
                    toneGenSlider.classList.remove("hidden");
                    break;
            }
        };

        if (eqTrack) eqTrack.addEventListener("change", () => {
            syncEqTrackWidth(eqTrack);
            if (typeof externalYieldCallback === "function") {
                try { externalYieldCallback(); } catch (_) {}
            }
            if (toneGenActive && toneGeneratorOsc) {
                try { currentSource.stop(); } catch (_) {}
                toneGeneratorOsc = null;
            } else if (currentAudio) {
                currentAudio.pause();
                currentAudio.currentTime = 0;
            }

            isPlayingAudio = false;
            stopFftLoop(true);
            resetDemoTransportUI();

            resolveDemoTrack();
            if (!toneGenActive) {
                currentAudio = demoAudio;
                currentSource = demoSource;
                if (currentSource) updateAudioFilters();
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
                } else if (demoAudio) {
                    demoAudio.pause();
                    demoAudio.currentTime = 0;
                }
                isPlayingAudio = false;
                stopFftLoop(true);
                playButton.classList.remove("playing");
                playButton.innerHTML = SVG_ICON.play;
            } else {
                if (typeof externalYieldCallback === "function") {
                    try { externalYieldCallback(); } catch (_) {}
                }
                audioContext.resume();
                resolveDemoTrack();
                if (toneGenActive) {
                    toneGeneratorOsc = audioContext.createOscillator();
                    toneGeneratorOsc.type = "sine";
                    toneGeneratorOsc.frequency.value = parseInt(toneGeneratorText.innerText) || 20;
                    currentSource = toneGeneratorOsc;
                    updateAudioFilters();
                    currentSource.start();
                } else {
                    currentAudio = demoAudio;
                    currentSource = demoSource;
                    updateAudioFilters();
                    currentAudio.play();
                }
                isPlayingAudio = true;
                playButton.classList.add("playing");
                playButton.innerHTML = SVG_ICON.pause;
                startFftLoop();
                if (typeof window.trackFeatureUsed === "function") {
                    window.trackFeatureUsed("eq_demo_played", eqTrack ? eqTrack.value : "pink");
                }
            }
        });

        window.mireAudioBridge = {
            getAudioContext: () => audioContext,
            createMediaSource: (audioEl) => audioContext.createMediaElementSource(audioEl),
            claimExternalAudio: (audioEl, sourceNode, onYield) => {
                if (toneGenActive && toneGeneratorOsc) {
                    try { toneGeneratorOsc.stop(); } catch (_) {}
                    toneGeneratorOsc = null;
                } else if (demoAudio && !demoAudio.paused) {
                    demoAudio.pause();
                    demoAudio.currentTime = 0;
                }
                if (playButton && playButton.classList.contains("playing")) {
                    resetDemoTransportUI();
                }
                externalYieldCallback = typeof onYield === "function" ? onYield : null;
                toneGenActive = false;
                currentAudio = audioEl;
                currentSource = sourceNode;
                applyFilters(audioContext, sourceNode);
            },
            setExternalPlaying: (audioEl, playing) => {
                if (currentAudio !== audioEl) return;
                if (playing) {
                    audioContext.resume();
                    isPlayingAudio = true;
                    startFftLoop();
                } else {
                    isPlayingAudio = false;
                    stopFftLoop(true);
                }
            },
            releaseExternalAudio: (audioEl) => {
                if (currentAudio === audioEl) {
                    isPlayingAudio = false;
                    stopFftLoop(true);
                    currentAudio = demoAudio;
                    currentSource = demoSource;
                    if (currentSource) applyFilters(audioContext, currentSource);
                }
                if (externalYieldCallback) externalYieldCallback = null;
            },
            getVolume: () => {
                const muted = volumeIcon ? volumeIcon.classList.contains("muted") : false;
                const vol = parseFloat(currentVolume) || 0;
                return { volume: vol, effectiveVolume: muted ? 0 : vol, muted };
            },
            setVolume: (val) => setMasterVolume(val),
            toggleMute: () => toggleMasterMute(),
            subscribeVolume: (fn) => {
                if (typeof fn !== "function") return () => {};
                volumeSubscribers.add(fn);
                return () => volumeSubscribers.delete(fn);
            }
        };
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
            activePhones.find(p => !p.isPrefBounds && !p.isTarget && !p.isEQSnapshot && p.brand && p.brand.name + " " + p.dispName === phoneSelected && p.eq);
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
