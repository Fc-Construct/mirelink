// ==========================================
// Calculate Band Area Component
// ==========================================
let interactCalc = false;
let calcBrush = null;
let calcBrushGroup = null;
let lastCalcSelection = null;

const MAX_CALC_REF_MODELS = 4;

function stopCalc() {
    lastCalcSelection = null;
    if (calcBrushGroup) {
        calcBrushGroup.remove();
        calcBrushGroup = null;
    }
    let tools = typeof getToolsLayer === 'function' ? getToolsLayer() : gr;
    tools.selectAll(".calc-brush-group, .calc-badge").remove();
    if (!(typeof interactInspect !== "undefined" && interactInspect) && typeof window.stopInspect === "function") {
        window.stopInspect();
    }
}

function deactivateCalc() {
    interactCalc = false;
    doc.select("#calcBtn").classed("selected", false);
    stopCalc();
    if (typeof window.syncGraphToolOverlayState === "function") {
        window.syncGraphToolOverlayState();
    }
}
window.deactivateCalc = deactivateCalc;

function logWeightedMeanAbsDiff(curveA, phoneA, curveB, phoneB, idx0, idx1) {
    let fnA = baseline.fn(curveA);
    let fnB = baseline.fn(curveB);
    let offA = getOffset(phoneA);
    let offB = getOffset(phoneB);
    let sumWeightedAbsDiff = 0;
    let sumWeights = 0;

    for (let i = idx0; i < idx1; i++) {
        let freqCurr = f_values[i];
        let freqNext = f_values[i + 1] || freqCurr;
        let logStep = Math.log2(freqNext / freqCurr) || 0.01;

        let valA = (fnA && fnA[i] ? fnA[i][1] : 0) + offA;
        let valB = (fnB && fnB[i] ? fnB[i][1] : 0) + offB;

        sumWeightedAbsDiff += Math.abs(valA - valB) * logStep;
        sumWeights += logStep;
    }

    return sumWeights > 0 ? (sumWeightedAbsDiff / sumWeights) : 0;
}

function logWeightedMeanAbsLevel(curve, phone, idx0, idx1) {
    let fn = baseline.fn(curve);
    let off = getOffset(phone);
    let sumWeightedVal = 0;
    let sumWeights = 0;

    for (let i = idx0; i < idx1; i++) {
        let freqCurr = f_values[i];
        let freqNext = f_values[i + 1] || freqCurr;
        let logStep = Math.log2(freqNext / freqCurr) || 0.01;

        let val = (fn && fn[i] ? fn[i][1] : 0) + off;
        sumWeightedVal += Math.abs(val) * logStep;
        sumWeights += logStep;
    }

    return sumWeights > 0 ? (sumWeightedVal / sumWeights) : 0;
}

// Inspects strictly what is currently plotted on screen for headphone p
function getVisibleScreenState(p) {
    let empty = { lCurve: null, rCurve: null, repCurve: null, hasVisibleLR: false, isAveraged: false };
    if (!p || !Array.isArray(p.activeCurves) || !p.activeCurves.length) return empty;

    let lCurves = [];
    let rCurves = [];
    let avgCurvesList = [];

    p.activeCurves.forEach(c => {
        let ch = c.channel;
        if (!ch && c.chIdx !== undefined) ch = (c.chIdx === 0 ? "L" : (c.chIdx === 1 ? "R" : null));
        if (!ch && c.id) {
            if (/-\s*-\s*L|\(\s*L/i.test(c.id)) ch = "L";
            else if (/─\s*R|\(\s*R/i.test(c.id)) ch = "R";
            else if (/\(\s*AVG/i.test(c.id)) ch = "AVG";
        }
        if (ch === "L") lCurves.push(c.l);
        else if (ch === "R") rCurves.push(c.l);
        else if (ch === "AVG") avgCurvesList.push(c.l);
    });

    let lCurve = lCurves.length === 1 ? lCurves[0] : (lCurves.length > 1 ? avgCurves(lCurves) : null);
    let rCurve = rCurves.length === 1 ? rCurves[0] : (rCurves.length > 1 ? avgCurves(rCurves) : null);
    let hasVisibleLR = !!(lCurve && rCurve);

    let repCurve = null;
    let isAveraged = false;
    if (avgCurvesList.length > 0) {
        repCurve = avgCurvesList.length === 1 ? avgCurvesList[0] : avgCurves(avgCurvesList);
        isAveraged = true;
    } else if (hasVisibleLR) {
        repCurve = avgCurves([lCurve, rCurve]);
        isAveraged = true;
    } else if (p.activeCurves.length === 1) {
        repCurve = p.activeCurves[0].l;
    } else {
        repCurve = avgCurves(p.activeCurves.map(c => c.l));
        isAveraged = true;
    }

    return {
        lCurve: lCurve,
        rCurve: rCurve,
        repCurve: repCurve,
        hasVisibleLR: hasVisibleLR,
        isAveraged: isAveraged
    };
}

function getModelShortLabel(p, allDataPhones) {
    let base = (p.dispName || p.phone || p.fullName || "").trim();
    let hasDuplicate = allDataPhones.filter(q => ((q.dispName || q.phone || q.fullName || "").trim().toLowerCase()) === base.toLowerCase()).length > 1;
    if (hasDuplicate && p.dispBrand) {
        base = (p.dispBrand + " " + base).trim();
    }
    if (base.length > 18) {
        base = base.slice(0, 16).trim() + "…";
    }
    return base;
}

function getModelColor(p) {
    if (typeof getTextColor === "function") {
        let c = getTextColor(p);
        if (c) return c.toString();
    }
    return null;
}

function renderCalcBadge(selection, gridHeight) {
    if (!calcBrushGroup) return;
    calcBrushGroup.selectAll(".calc-badge").remove();
    if (!selection) return;

    let x0 = selection[0];
    let x1 = selection[1];
    if (Math.abs(x1 - x0) < 5) return;

    let f0 = x.invert(x0);
    let f1 = x.invert(x1);
    if (f0 >= f1) return;

    let idx0 = fr_to_ind(f0);
    let idx1 = fr_to_ind(f1);
    if (idx0 > idx1) { let tmp = idx0; idx0 = idx1; idx1 = tmp; }
    if (idx0 === idx1) idx1 = Math.min(f_values.length - 1, idx0 + 1);

    let octaves = Math.log2(f_values[idx1] / f_values[idx0]);

    let visiblePhones = (typeof activePhones !== "undefined" && Array.isArray(activePhones))
        ? activePhones.filter(p => p && !p.hide && !p.isPrefBounds && Array.isArray(p.activeCurves) && p.activeCurves.length > 0)
        : [];
    let dataPhones = visiblePhones.filter(p => !p.isTarget);
    let refPhones = visiblePhones.filter(p => p.isTarget);

    if (!dataPhones.length && !refPhones.length) return;

    // Each row: { text: string, color: string | null }
    let metricRows = [];
    let footerNote = "";

    let refPhone = refPhones.length >= 1 ? refPhones[0] : null;
    let refCurve = refPhone ? refPhone.activeCurves[0].l : null;

    if (dataPhones.length === 1) {
        let p = dataPhones[0];
        let state = getVisibleScreenState(p);

        // Channel imbalance only shown when BOTH L & R are visibly plotted on screen
        if (state.hasVisibleLR) {
            let imb = logWeightedMeanAbsDiff(state.lCurve, p, state.rCurve, p, idx0, idx1);
            metricRows.push({ text: "Δ L/R: " + imb.toFixed(2) + " dB", color: null });
        }

        if (refPhone && refCurve && state.repCurve) {
            let refDiff = logWeightedMeanAbsDiff(state.repCurve, p, refCurve, refPhone, idx0, idx1);
            let refLabel = state.isAveraged ? "Δ avg vs. Ref: " : "Δ vs. Ref: ";
            metricRows.push({ text: refLabel + refDiff.toFixed(2) + " dB", color: null });
        } else if (!state.hasVisibleLR && state.repCurve) {
            let avgLvl = logWeightedMeanAbsLevel(state.repCurve, p, idx0, idx1);
            metricRows.push({ text: "Avg Level: " + avgLvl.toFixed(2) + " dB", color: null });
        }
    } else if (dataPhones.length === 2) {
        let p1 = dataPhones[0];
        let p2 = dataPhones[1];
        let s1 = getVisibleScreenState(p1);
        let s2 = getVisibleScreenState(p2);

        if (s1.repCurve && s2.repCurve) {
            let modelDiff = logWeightedMeanAbsDiff(s1.repCurve, p1, s2.repCurve, p2, idx0, idx1);
            metricRows.push({ text: "Δ Models: " + modelDiff.toFixed(2) + " dB", color: null });
        }

        if (refPhone && refCurve) {
            dataPhones.forEach(p => {
                let st = getVisibleScreenState(p);
                if (!st.repCurve) return;
                let refDiff = logWeightedMeanAbsDiff(st.repCurve, p, refCurve, refPhone, idx0, idx1);
                let name = getModelShortLabel(p, dataPhones);
                let refSuffix = st.isAveraged ? "Δ avg vs. Ref: " : "Δ vs. Ref: ";
                metricRows.push({
                    text: name + " " + refSuffix + refDiff.toFixed(2) + " dB",
                    color: getModelColor(p)
                });
            });
        }
    } else if (dataPhones.length >= 3) {
        // Option B: Cap multi-model readout to keep badge readable; per-model Δ vs. Ref when Ref is active
        let shownPhones = dataPhones.slice(0, MAX_CALC_REF_MODELS);
        if (refPhone && refCurve) {
            shownPhones.forEach(p => {
                let st = getVisibleScreenState(p);
                if (!st.repCurve) return;
                let refDiff = logWeightedMeanAbsDiff(st.repCurve, p, refCurve, refPhone, idx0, idx1);
                let name = getModelShortLabel(p, dataPhones);
                let refSuffix = st.isAveraged ? "Δ avg vs. Ref: " : "Δ vs. Ref: ";
                metricRows.push({
                    text: name + " " + refSuffix + refDiff.toFixed(2) + " dB",
                    color: getModelColor(p)
                });
            });
        } else {
            // No Reference curve active: compare subsequent visible models vs. Model 1
            let primary = dataPhones[0];
            let primaryState = getVisibleScreenState(primary);
            let primaryName = getModelShortLabel(primary, dataPhones);
            if (primaryState.repCurve) {
                shownPhones.slice(1).forEach(p => {
                    let st = getVisibleScreenState(p);
                    if (!st.repCurve) return;
                    let diff = logWeightedMeanAbsDiff(st.repCurve, p, primaryState.repCurve, primary, idx0, idx1);
                    let name = getModelShortLabel(p, dataPhones);
                    metricRows.push({
                        text: name + " Δ vs. " + primaryName + ": " + diff.toFixed(2) + " dB",
                        color: getModelColor(p)
                    });
                });
            }
        }

        if (dataPhones.length > MAX_CALC_REF_MODELS) {
            let hiddenCount = dataPhones.length - MAX_CALC_REF_MODELS;
            footerNote = "(+" + hiddenCount + " more model" + (hiddenCount > 1 ? "s" : "") + " omitted)";
        }
    } else if (refPhone && refCurve) {
        let refLvl = logWeightedMeanAbsLevel(refCurve, refPhone, idx0, idx1);
        metricRows.push({ text: "Avg Level: " + refLvl.toFixed(2) + " dB", color: null });
    }

    if (!metricRows.length) return;

    let formatFreq = f => f >= 1000 ? (f / 1000).toFixed(1) + " kHz" : Math.round(f) + " Hz";
    let fRangeText = formatFreq(f_values[idx0]) + " – " + formatFreq(f_values[idx1]) + " (" + octaves.toFixed(2) + " Oct)";

    let rowStep = 16;
    let footerH = footerNote ? 14 : 0;
    let badgeH = 26 + metricRows.length * rowStep + footerH;

    let badge = calcBrushGroup.append("g").attr("class", "calc-badge");
    let bgRect = badge.append("rect")
        .attrs({
            class: "calc-badge-bg",
            width: 184,
            height: badgeH,
            rx: 4,
            ry: 4
        });

    let rangeTextEl = badge.append("text")
        .attrs({ class: "calc-badge-range", x: 92, y: 16, "text-anchor": "middle" })
        .text(fRangeText);

    let metricTextEls = metricRows.map((row, i) => {
        let el = badge.append("text")
            .attrs({ class: "calc-badge-metric", x: 92, y: 33 + i * rowStep, "text-anchor": "middle" })
            .text(row.text);
        if (row.color) {
            el.style("fill", row.color);
        }
        return el;
    });

    let footerEl = null;
    if (footerNote) {
        footerEl = badge.append("text")
            .attrs({
                class: "calc-badge-range",
                x: 92,
                y: 33 + metricRows.length * rowStep - 2,
                "text-anchor": "middle"
            })
            .text(footerNote);
    }

    // Dynamically fit badge width to content
    let maxTextW = rangeTextEl.node() ? rangeTextEl.node().getComputedTextLength() : 150;
    metricTextEls.forEach(el => {
        let w = el.node() ? el.node().getComputedTextLength() : 0;
        if (w > maxTextW) maxTextW = w;
    });
    if (footerEl && footerEl.node()) {
        let w = footerEl.node().getComputedTextLength();
        if (w > maxTextW) maxTextW = w;
    }

    let badgeW = Math.max(182, Math.ceil(maxTextW) + 26);
    bgRect.attrs({ width: badgeW, height: badgeH });
    rangeTextEl.attr("x", badgeW / 2);
    metricTextEls.forEach(el => el.attr("x", badgeW / 2));
    if (footerEl) footerEl.attr("x", badgeW / 2);

    // Place vertically centered on the +10 dB Y-axis line (below header, inside plot)
    let targetDb = (typeof yCenter !== "undefined" ? yCenter : 0) + 10;
    let targetGridY = y(targetDb) - pad.t;
    let maxBadgeY = Math.max(54, gridHeight - badgeH - 8);
    let badgeY = Math.max(54, Math.min(maxBadgeY, targetGridY - badgeH / 2));
    let badgeX = Math.min(pad.l + W - badgeW - 6, Math.max(pad.l + 6, (x0 + x1) / 2 - badgeW / 2));

    badge.attr("transform", "translate(" + badgeX + "," + badgeY + ")");
}

function initCalcBrush() {
    stopCalc();
    let tools = typeof getToolsLayer === 'function' ? getToolsLayer() : gr;
    let gridTopOffset = 0;
    let gridHeight = H - gridTopOffset;
    let isBrushing = false;

    function updateHoverInspect() {
        if (!interactCalc || isBrushing || typeof window.renderInspectAt !== "function") return;
        let m = d3.mouse(gr.node());
        if (!m || m[0] < pad.l || m[0] > pad.l + W || m[1] < pad.t || m[1] > pad.t + H) return;
        window.renderInspectAt(m, { freqOnly: true });
    }

    function clearHoverInspect() {
        if (!(typeof interactInspect !== "undefined" && interactInspect) && typeof window.stopInspect === "function") {
            window.stopInspect();
        }
    }

    calcBrush = d3.brushX()
        .extent([[pad.l, 0], [pad.l + W, gridHeight]])
        .on("start", function() {
            isBrushing = true;
            if (typeof window.stopInspect === "function") {
                window.stopInspect();
            }
        })
        .on("brush end", function() {
            let selection = d3.event.selection;
            lastCalcSelection = selection ? selection.slice() : null;
            renderCalcBadge(selection, gridHeight);

            if (d3.event.type === "end") {
                isBrushing = false;
                if (selection && selection[1] > selection[0] && typeof window.trackFeatureUsed === "function") {
                    window.trackFeatureUsed("calculate_band");
                }
                let src = d3.event.sourceEvent;
                if (src && src.type !== "mouseout") {
                    try {
                        updateHoverInspect();
                    } catch (_) {}
                }
            }
        });

    calcBrushGroup = tools.append("g")
        .attr("class", "calc-brush-group")
        .attr("transform", "translate(0," + (pad.t + gridTopOffset) + ")")
        .call(calcBrush);

    // Ensure Calculate layer sits below .inspector in tools layer
    calcBrushGroup.lower();

    // Theme-aware subtle solid border around selection box
    calcBrushGroup.selectAll(".selection")
        .style("fill", "var(--accent-color, #94a3b8)")
        .style("fill-opacity", 0.08)
        .style("stroke", "var(--inspector-border, rgba(148, 163, 184, 0.55))")
        .style("stroke-opacity", 0.85)
        .style("stroke-width", "1px")
        .style("stroke-dasharray", "none");

    // Live full Inspect hover across both brush overlay and active selection area
    calcBrushGroup.selectAll(".overlay, .selection, .handle")
        .on("mousemove.calcInspect", updateHoverInspect)
        .on("mouseout.calcInspect", clearHoverInspect);
}

window.refreshCalcBadge = function () {
    if (interactCalc && calcBrushGroup && lastCalcSelection) {
        renderCalcBadge(lastCalcSelection, H);
    }
};

function initCalculateComponent() {
    doc.select("#calcBtn").on("click", function () {
        let btn = d3.select(this);
        interactCalc = !interactCalc;
        btn.classed("selected", interactCalc);
        if (interactCalc && typeof window.deactivateInspect === "function") {
            window.deactivateInspect();
        }
        if (typeof window.syncGraphToolOverlayState === "function") {
            window.syncGraphToolOverlayState();
        }
        if (interactCalc) {
            initCalcBrush();
        } else {
            stopCalc();
        }
    });
}
