// Phone-table UI

// Owns the right-side phone table (rows, color picker popup, variant
// selector, channel selector, hide/pin/baseline buttons, color refresh).
// Reads many globals from graphtool.js (table, gpath, baseline, activePhones,
// etc.) and from sibling modules (color.js, smoothing.js, normalization.js,
// prefBounds.js); cross-script let/const at top level resolve via the realm's
// shared global lexical environment.

// --- Row styling + channel-box layout helpers ---
function setPhoneTr(phtr) {
    phtr.each(function (p) {
        if (!p) return;
        let activeMember = (typeof activePhones !== 'undefined')
            ? activePhones.find(q => q === p || q.copyOf === p || (p.objs && p.objs.includes(q)))
            : null;
        if (activeMember) {
            p.highlight = true;
            p.activeId = activeMember.id !== undefined ? activeMember.id : p.id;
        } else {
            p.highlight = p.active || false;
            p.activeId = p.id;
        }
    });
    phtr.classed("phone-highlighted", p => p && p.highlight)
        .style("border-color", p => (p && p.highlight) ? getDivColor(p.activeId !== undefined ? p.activeId : p.id, 1, p.hexColor, p) : null);
    phtr.filter(p => p && !p.isTarget)
        .select(".phone-item-add")
        .selectAll(".remove").data(p => (p && p.highlight) ? [p] : [])
        .join("span").attr("class", "remove").text("⊗")
        .on("click", p => { d3.event.stopPropagation(); removeCopies(p); });
}

let channelbox_x = c => c?-86:-36,
    channelbox_tr = c => "translate("+channelbox_x(c)+",0)";

// --- Hide toggle and color-bar SVG data URI ---
let colorBar = p=>'url(\'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 5 8"><path d="M0 8v-8h1c0.05 1.5,-0.3 3,-0.16 5s0.1 2,0.15 3z" fill="'+getBgColor(p)+'"/></svg>\')';

function toggleHide(p) {
    let h = p.hide;
    let t = table.selectAll("tr").filter(q=>q===p);
    t.select(".keyLine").on("click", h?null:toggleHide)
        .selectAll("path,.imbalance").attr("opacity", h?null:0.5);
    t.select(".hideIcon").classed("selected", !h);
    gpath.selectAll("path").filter(c=>c.p===p)
        .attr("opacity", h?null:0);
    p.hide = !h;
    if (labelsShown) {
        clearLabels();
        drawLabels();
    }
}


// --- Seating selection helpers ---
function cycleSeating(p) {
    let n = Math.floor(validChannels(p).length / LR.length);
    if (n <= 1) return;
    let current = p.seating || "avg";
    let next;
    if (current === "avg") {
        next = "1";
    } else if (current === "all") {
        next = "avg";
    } else {
        let num = parseInt(current, 10);
        if (num < n) {
            next = String(num + 1);
        } else {
            next = "all";
        }
    }
    updateCurves(p, undefined, p.lr, next === "all", next);
    hl(p, true);
}

function updateSeatingOptions(selectElem, p) {
    let n = Math.floor(validChannels(p).length / LR.length);
    if (n <= 1) {
        selectElem.style("display", "none");
        return;
    }
    selectElem.style("display", null);
    let options = [
        { value: "avg", label: "AVG (" + n + ")" }
    ];
    for (let i = 1; i <= n; i++) {
        options.push({ value: String(i), label: "Seat " + i });
    }
    options.push({ value: "all", label: "All " + n });

    let sel = selectElem.selectAll("option").data(options, d => d.value);
    sel.exit().remove();
    sel.enter().append("option")
        .attr("value", d => d.value)
        .text(d => d.label);
    selectElem.property("value", p.seating || "avg");
}

// --- Main table builder + channel/comp wiring ---
function updatePhoneTable() {
    let c = table.selectAll("tr").data(activePhones.filter(p => !p.isPrefBounds), p=>p.fileName);
    c.exit().remove();

    let f = c.enter().append("tr").attr("data-filename", p=>p.fileName),
        td = () => f.append("td");
    f.style("color", p => getDivColor(p.id,true,p.hexColor));

    td().attr("class","remove").text("⊗")
        .attr("title", "Remove graph")
        .on("click", removePhone)
        .style("background-image",colorBar)
        .append("svg").call(addColorPicker); // .filter(p=>!p.isTarget) if you want to exclude target from color picker
    td().attr("class","item-line item-target")
        .call(s=>s.filter(p=>!p.isTarget).attr("class","item-line item-phone")
                  .append("span").attr("class","brand").text(p=>p.dispBrand))
        .call(addModel)
        .filter(p => !p.isTarget)
        .append("span")
        .attr("class", "smoothing-warn")
        .style("margin-left", "6px")
        .style("cursor", "help")
        .style("font-size", "11px")
        .style("display", p => p.nonStandardSmoothing ? "inline-block" : "none")
        .html("⚠️")
        .attr("title", p => "Warning: Measurement smoothing is non-standard (" + (p.nonStandardSmoothing || "Unknown") + "). Standard MIRE measurements use 1/6 octave acoustic smoothing.");
    td().attr("class","curve-color").append("button")
        .style("background-color",p=>getColor_AC({p:p}))
        .call(makeColorPicker); // .filter(p=>!p.isTarget) if you want to exclude target from color picker
    td().attr("class","channels").call(addChannelControls);
    let sSel = f.filter(p=>!p.isTarget).append("td").attr("class","seating").style("display","none").append("select")
        .attr("class","seating-select")
        .attr("title","Select seating measurement (individual, average, or all)");
    sSel.each(function(p) { updateSeatingOptions(d3.select(this), p); });
    sSel.on("change", function(p) {
        let val = this.value;
        updateCurves(p, undefined, p.lr, val === "all", val);
        hl(p, true);
    });
    let levTd = td().attr("class","levels");
    let offsetPill = levTd.append("div").attr("class", "offset-pill");
    offsetPill.append("span").attr("class", "offset-pill-label").text("OFFSET");
    offsetPill.append("input")
        .attrs({type:"number",step:"any",value:0})
        .property("value", p=>p.offset)
        .attr("placeholder", "0")
        .attr("title", "Offset: Add or subtract dB on the graph")
        .on("change input",function(p){ setOffset(p, +this.value); });
    let cSel = f.filter(p=>!p.isTarget).append("td").attr("class", "comp").append("select");
    cSel.selectAll("option").data(["<no comp>", ...compTargets])
        .enter().append("option").text(d=>d);
    cSel.property("value", p=>p.comp);
    cSel.on("change", function(p) { handleComp(p, this.value); });
    td().attr("class","button button-baseline")
        .attr("title", "Set as baseline")
        .html("<svg viewBox='-170 -120 340 240'><use xlink:href='#baseline-icon'></use></svg>")
        .on("click", p => {
            let isBaselined = p===baseline.p || (p.basedOn && p.basedOn===baseline.p);
            setBaseline(isBaselined ? baseline0 : getBaseline(p));
        });

    function showNinetyInclusion(p) {
        let t = table.selectAll("tr").filter(q=>q===p);
        t.select(".button-ninety").classed("selected", !t.select(".button-ninety").classed("selected"));
        if (t.select(".button-ninety").classed("selected")) {
            // Calculate 90% Confidence Interval
            // let ch = calculateConfidenceIntervals(p.rawChannels);
            // Calculate 90% inclusion zone
            let rawChannels = [];
            if (p.fileNames) { // collecting raw channels from all variants
                let promises = p.fileNames.map(fileName => {
                    return new Promise((resolve, reject) => {
                        loadFiles({ ...p, fileName }, channels => {
                            if (channels) {
                                rawChannels = rawChannels.concat(channels);
                            }
                            resolve();
                        });
                    });
                });

                Promise.all(promises).then(() => {
                    let ch = calculateInclusionWindows(rawChannels);
                    let ninetyPercentInclusion = setBoundsPhone(p, ch);
                    showPhone(ninetyPercentInclusion);
                    console.log(rawChannels)
                });
            } else {
                let ch = calculateInclusionWindows(p.rawChannels);
                let ninetyPercentInclusion = setBoundsPhone(p, ch);
                showPhone(ninetyPercentInclusion);
            }
        } else {
            let ninetyPercentInclusion = activePhones.filter(q=>q.fullName===p.fullName+inclusionName);
            removePhone(ninetyPercentInclusion[0]);
        }
    }
    f.filter(p=>!p.isTarget && !p.is90Bounds).append("td").attr("class","button button-ninety")
        .html("<svg width='100' height='100' viewBox='0 0 100 100' stroke-width='1.5'><use xlink:href='#ninety-icon'></use></svg>")
        .on("click", showNinetyInclusion);

    td().attr("class","button hideIcon")
        .attr("title", "Hide graph")
        .html("<svg viewBox='-2.5 0 19 12'><use xlink:href='#hide-icon'></use></svg>")
        .on("click", toggleHide);
    td().attr("class","button button-pin")
        .attr("title", "Pin graph")
        .attr("data-pinned","false")
        .html("<svg viewBox='-135 -100 270 200'><use xlink:href='#pin-icon'></use></svg>")
        .on("click",function(p){
            // Pin is one-way: replace the button with a permanent pin mark.
            p.pin = true;
            nextPN = null;
            this.setAttribute("data-pinned","true");
            d3.select(this)
                .text(null).classed("button",false).on("click",null)
                .insert("svg").attr("class","pinMark")
                .attr("viewBox","0 0 280 145")
                .insert("path").attrs({
                    fill:"none",
                    "stroke-width":30,
                    "stroke-linecap":"round",
                    d:"M265 110V25q0 -10 -10 -10H105q-24 0 -48 20l-24 20q-24 20 -2 40l18 15q24 20 42 20h100"
                });
            if (!userConfigApplicationActive) setUserConfig();
        });
    if (allowSquigDownload) {
        function saveSquiggle(p) {
            let channels = p.activeCurves.map(c => c.l);
            let LR = p.activeCurves.map(c => c.id.match(/(?<=\().(?=\))/)? c.id.match(/(?<=\().(?=\))/)[0] : "Target");
            
            let squig = document.createElement("a");
            squig.style.display = 'none';
            document.body.appendChild(squig);

            // this code is if you want to download the average curve if multiple channels are visible
            if (channels.length > 1) {
                let squigName = p.fullName + " AVG";
                p.comp ? squigName += " - Comp: " + p.comp : null;
                let filename = squigName + ".txt";
                let data = avgCurves(channels).map(d => d.join("\t")).join("\n");
                let blob = new Blob([data], {type: "text/plain; charset=utf-8"});
                let url = URL.createObjectURL(blob);

                squig.href = url;
                squig.download = filename;
                squig.click();
                URL.revokeObjectURL(url);
            } else {
                let squigName = p.fullName + " " + LR[0];
                p.comp ? squigName += " - " + p.comp : null;
                let filename = squigName + ".txt";
                let data = channels[0].map(d => d.join("\t")).join("\n");
                let blob = new Blob([data], {type: "text/plain; charset=utf-8"});
                let url = URL.createObjectURL(blob);

                squig.href = url;
                squig.download = filename;
                squig.click();
                URL.revokeObjectURL(url);
            }

            // cleanup
            document.body.removeChild(squig);
        }

        td().attr("class","button button-saveSquig")
            .html("<svg viewBox='0 0 24 24'><use xlink:href='#save-icon'></svg>")
            .on("click", saveSquiggle);
    }
}

function updateChannels(p, ch, comp) {
    if (comp) { // if comp exists means we are compensating
        // subtract the comp curve from the phone curve
        for (let i=0; i<ch.length; i++) {
            ch[i] = ch[i].map((d, j) => [d[0], d[1] - comp[Math.min(j, comp.length-1)]]);
        }
    }

    p.channels = ch;
    p.rawChannels = ch;
    if (p.activeCurves.length > 1) {
        for (let i=0; i<p.activeCurves.length; i++) {
            p.activeCurves[i].l = ch[i];
            p.activeCurves[i].p = p;
        }
    } else {
        p.activeCurves[0].l = avgCurves(ch);
    }
    normalizePhone(p);
    p.smooth = null;
    smoothPhone(p);
        
    // update the graph
    updatePaths();
}

function handleComp(p, opt) {
    if (!p.preComp) p.preComp = p.rawChannels; // save the original channels
    let ch = [...p.preComp]; // copy the original channels
    if (opt !== "<no comp>") {
        let compTarget = window.brandTarget.phoneObjs.find(p => p.dispName == opt);
        p.comp = opt;
        if (!compTarget.rawChannels) {
            loadFiles(compTarget, function (tch) { // Haruto: fuck promises imma just slap down a "it works for now" solution
                compTarget.rawChannels = tch;
                let comp = compTarget.rawChannels[0].map(d => d[1]);
            
                updateChannels(p, ch, comp);
            });
        } else {
            let comp = compTarget.rawChannels[0].map(d => d[1]);
        
            updateChannels(p, ch, comp);
        }
    } else {
        p.comp = opt;
        updateChannels(p, ch);
    }
}

// --- Per-row channel pills, variants, color picker popup, colorPhones ---
const EYE_OPEN_SVG = '<svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor"><path d="M8 3.5C4.5 3.5 1.5 6 0 8.5c1.5 2.5 4.5 5 8 5s6.5-2.5 8-5c-1.5-2.5-4.5-5-8-5zm0 8.2A3.2 3.2 0 1 1 8 5.3a3.2 3.2 0 0 1 0 6.4zm0-5A1.8 1.8 0 1 0 8 10.3 1.8 1.8 0 0 0 8 6.7z"/></svg>';
const EYE_CLOSED_SVG = '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor"><path d="M2.5 7.5Q8 13.5 13.5 7.5" stroke-width="1.8" stroke-linecap="round"/><line x1="4.8" y1="10" x2="3.8" y2="12" stroke-width="1.4" stroke-linecap="round"/><line x1="8" y1="11" x2="8" y2="13.5" stroke-width="1.4" stroke-linecap="round"/><line x1="11.2" y1="10" x2="12.2" y2="12" stroke-width="1.4" stroke-linecap="round"/></svg>';

function addChannelControls(tdSelection) {
    tdSelection.each(function(p) {
        let td = d3.select(this);
        if (p.isTarget) return;

        let container = td.append("div").attr("class", "channel-pills-group");

        const CHANNELS = [
            { key: "L", label: "Left" },
            { key: "R", label: "Right" },
            { key: "LR", label: "L+R" }
        ];

        CHANNELS.forEach(ch => {
            let pill = container.append("div")
                .attr("class", "channel-pill")
                .attr("data-channel", ch.key);

            // 1. Eye Button
            pill.append("button")
                .attr("type", "button")
                .attr("class", "pill-eye")
                .attr("title", "Toggle " + ch.label + " visibility")
                .on("click", function() {
                    d3.event.stopPropagation();
                    if (!p.channelState) setCurves(p);
                    p.channelState[ch.key].visible = !p.channelState[ch.key].visible;
                    updateCurves(p);
                })
                .append("span").attr("class", "pill-eye-icon");

            // Divider
            pill.append("div").attr("class", "pill-divider");

            // 2. Cycle Label Button
            pill.append("button")
                .attr("type", "button")
                .attr("class", "pill-label")
                .attr("title", "Click to cycle AVG / ALL")
                .on("click", function() {
                    d3.event.stopPropagation();
                    if (!p.channelState) setCurves(p);
                    let curr = p.channelState[ch.key].seating;
                    let next = (curr === "all") ? "avg" : "all";
                    p.channelState[ch.key].seating = next;
                    p.channelState[ch.key].visible = true; // Ensure visible when cycling
                    updateCurves(p);
                })
                .append("span").attr("class", "pill-label-text");

            // 3. Chevron Wrap with Native Select Overlay
            let chevronWrap = pill.append("div")
                .attr("class", "pill-chevron-wrap")
                .attr("title", "Select seating for " + ch.label);

            chevronWrap.append("span").attr("class", "pill-chevron-icon").text("▾");

            let select = chevronWrap.append("select")
                .attr("class", "pill-native-select")
                .on("change", function() {
                    let val = this.value;
                    if (!p.channelState) setCurves(p);
                    p.channelState[ch.key].seating = val;
                    p.channelState[ch.key].visible = true;
                    updateCurves(p);
                });

            // Populate options dynamically
            let n = Math.floor(validChannels(p).length / LR.length);
            if (n < 1) n = 1;
            let options = [
                { value: "avg", label: "AVG" + (n > 1 ? " (" + n + ")" : "") },
                { value: "all", label: "ALL" + (n > 1 ? " (" + n + ")" : "") }
            ];
            for (let i = 1; i <= n; i++) {
                let sLabel = ch.key === "L" ? ("L" + i) : (ch.key === "R" ? ("R" + i) : ("Seat " + i));
                options.push({ value: String(i), label: sLabel });
            }
            select.selectAll("option").data(options)
                .enter().append("option")
                .attr("value", d => d.value)
                .text(d => d.label);

            // Channel-specific hover highlighting
            pill.on("mouseenter", function() {
                hl(p, c => {
                    if (ch.key === "L") {
                        return c.channel === "L" || c.chIdx === 0 || (c.id && (c.id.indexOf(" (L") !== -1 || c.id.indexOf("- - L") !== -1));
                    }
                    if (ch.key === "R") {
                        return c.channel === "R" || c.chIdx === 1 || (c.id && (c.id.indexOf(" (R") !== -1 || c.id.indexOf("─ R") !== -1));
                    }
                    return c.channel === "AVG" || (c.id && c.id.indexOf("AVG") !== -1);
                });
            }).on("mouseleave", function() {
                hl(p, false);
            });
        });

        // Imbalance badge
        container.append("span")
            .attr("class", "imbalance-badge")
            .attr("title", "Channel imbalance detected")
            .text("⚠️")
            .style("display", hasImbalance(p) ? "inline-flex" : "none");

        renderPillsState(p, td);
    });
}

function renderPillsState(p, td) {
    if (!p || p.isTarget || !td || td.empty()) return;
    if (!p.channelState) setCurves(p);
    let state = p.channelState;

    td.selectAll(".channel-pill").each(function() {
        let pill = d3.select(this);
        let chKey = pill.attr("data-channel");
        let chState = state[chKey];
        if (!chState) return;

        pill.attr("data-visible", chState.visible ? "true" : "false");
        pill.select(".pill-eye-icon").html(chState.visible ? EYE_OPEN_SVG : EYE_CLOSED_SVG);

        let st = chState.seating || "avg";
        let labelPrefix = (chKey === "L" ? "Left: " : chKey === "R" ? "Right: " : "L+R: ");
        let labelSuffix = (st === "avg") ? "AVG" : (st === "all") ? "ALL" : (chKey === "L" ? ("L" + st) : chKey === "R" ? ("R" + st) : ("S" + st));
        pill.select(".pill-label-text").text(labelPrefix + labelSuffix);

        pill.select(".pill-native-select").property("value", st);
    });

    td.select(".imbalance-badge")
        .style("display", hasImbalance(p) ? "inline-flex" : "none");
}

function updateChannelPills(p) {
    if (!p) {
        if (typeof table !== "undefined") {
            table.selectAll("tr").each(function(q) {
                renderPillsState(q, d3.select(this).select("td.channels"));
            });
        }
        return;
    }
    if (typeof table !== "undefined") {
        let tr = table.selectAll("tr").filter(q => q === p);
        renderPillsState(p, tr.select("td.channels"));
    }
}

function addKey(s) {
    addChannelControls(s);
}

function updateKey(s) {
    updateChannelPills();
}

function addModel(t) {
    let n = t.append("div").attr("class","phonename").text(p=>p.dispName);
    t.filter(p=>p.fileNames)
        .append("div").attr("class","variants")
        .call(function (s) {
            s.append("svg").attr("viewBox","0 -2 10 11")
                .append("path").attr("fill","currentColor")
                .attr("d","M1 2L5 6L9 2L8 1L6 3Q5 4 4 3L2 1Z");
        })
        .attr("tabindex",0) // Make focusable
        .on("focus", function (p) {
            if (p.selectInProgress) return;
            p.selectInProgress = true;
            p.vars[p.fileName] = p.rawChannels;
            d3.select(this)
                .on("mousedown", function () {
                    d3.event.preventDefault();
                    this.blur();
                })
                .select("path").attr("transform","translate(0,7)scale(1,-1)");
            let n = d3.select(this.parentElement).select(".phonename");
            n.text("");
            let q = p.copyOf || p,
                o = q.objs || [p],
                active_fns = o.map(v=>v.fileName),
                vars = p.fileNames.map((f,i) => {
                    let j = active_fns.indexOf(f);
                    return j!==-1 ? o[j] :
                        {fileName:f, dispName:q.dispNames[i]};
                });
            let nVariantNames = n.append("div").attr("class","variant-names");
            let nVariantPopouts = n.append("div").attr("class","variant-popouts");
            let d = nVariantNames.selectAll().data(vars).join("div")
                     .attr("class","variantName").text(v=>v.dispName),
                w = d3.max(d.nodes(), d=>d.getBoundingClientRect().width);
            d.style("width",w+"px");
            d.filter(v=>v.active)
                .style("cursor","initial")
                .style("color", getTextColor)
                .call(setHover, h => p =>
                    table.selectAll("tr").filter(q=>q===p)
                        .classed("highlight", h)
                );
            let c = nVariantPopouts.selectAll().data(vars).join("span")
                .html("&nbsp;+&nbsp;").attr("class","variantPopout")
                .style("left",(w+5)+"px")
                .style("display",v=>v.active?"none":null);
            [d,c].forEach(e=>e.transition().style("top",(_,i)=>i*1.3+"em"));
            d.filter(v=>!v.active).on("mousedown", v => showVariant(q, v));
            c.on("mousedown", function (v) {
                showVariant(q, v);
            });
        })
        .on("blur", function endSelect(p) {
            if (document.activeElement === this) return;
            p.selectInProgress = false;
            d3.select(this)
                .on("mousedown", null)
                .select("path").attr("transform", null);
            let n = d3.select(this.parentElement).select(".phonename");
            n.selectAll("div")
                .call(setHover, h=>p=>null)
                .transition().style("top",0+"em").remove()
                .end().then(()=>n.text(p=>p.dispName));
            changeVariant(p, updateVariant);
            table.selectAll("tr").classed("highlight", false); // Prevents some glitches
        });
    t.filter(p=>p.isTarget).append("span").text(" Target");
}

function updateVariant(p) {
    let tr = table.selectAll("tr").filter(q=>q===p);
    tr.attr("data-filename", p.fileName);
    tr.select(".phonename").text(p.dispName);
    let chTd = tr.select("td.channels");
    chTd.selectAll("*").remove();
    chTd.call(addChannelControls);
    normalizePhone(p);
    updatePaths();
}
function changeVariant(p, update, trigger) {
    let fn = p.fileName,
        ch = p.vars[fn];
    function set(ch) {
        let savedLr = p.lr;
        let savedAvg = p.avg;
        let savedSeating = p.seating;
        if (savedLr === undefined && !savedAvg) {
            let ap = (typeof activePhones !== 'undefined')
                ? activePhones.filter(q => !q.isTarget && !q.isPrefBounds)
                : [];
            if (ap.length >= 2) {
                savedLr = 1;
            }
        }
        p.rawChannels = ch; p.smooth = undefined;
        smoothPhone(p);
        setCurves(p, savedAvg, savedLr, undefined, savedSeating);
        update(p, 0, 0, trigger);
    }
    if (ch) {
        set(ch);
    } else {
        loadFiles(p, set);
    }
}
function showVariant(p, c, trigger) {
    if (!p.objs) { p.objs = [p]; }
    p.objs.push(c);
    c.active=true; c.copyOf=p;
    ["brand","dispBrand","fileNames","vars"].map(k=>c[k]=p[k]);
    changeVariant(c, showPhone, trigger);
}

function cpCircles(svg) {
    svg.selectAll("circle")
        .data(p => [[3,3,2],[6.6,4,1]].map(([cx,cy,r])=>({cx,cy,r,fill:getBgColor(p)})))
        .join("circle").attrs(d=>d);
}
function addColorPicker(svg) {
    svg.attr("viewBox","0 0 9 5.3");
    svg.append("rect").attrs({x:0,y:0,width:9,height:5.3,fill:"none"});
    svg.call(cpCircles);
    makeColorPicker(svg);
}
function hclToHex(hcl) {
    return d3.hcl(hcl).formatHex();
}
function createPopupMenu(p, x, y) {
    // Remove any existing popup
    d3.select(".colorStylePicker").remove();

    // Create the popup menu
    let popup = d3.select("body").append("div")
        .attr("class", "colorStylePicker")
        .style("position", "absolute")
        .style("left", `${x}px`)
        .style("top", `${y}px`)
        .style("padding", "10px")

    
    // Add a color wheel to the left side
    let colorWheelElement = popup.append("div").attr("class", "left-side").node();
    let colorWheel = new ReinventedColorWheel({
        appendTo: colorWheelElement,
        wheelDiameter: 150,
        wheelThickness: 10,
        handleDiameter: 16,
        wheelReflectsSaturation: true,
        hex: p.hexColor ? p.hexColor : hclToHex(getCurveColor(p.id,0)),
        onChange: function(color) {
            p.hexColor = color.hex;
            input.node().value = color.hex;
            colorPhones();
        }
    })

    // Add a right side menu
    let menuRightSide = popup.append("div").attr("class", "right-side");

    // lmao why button when can div
    menuRightSide.append("div")
    .style("margin-bottom", "3px")
    .style("display", "flex")
    .style("flex-direction", "column")
    .style("align-items", "flex-end")
    .append("span").text("X").style("cursor", "pointer").on("click", function() {popup.remove();});

    // Add input row for hex code
    menuRightSide.append("div").style("margin-bottom", "3px").append("span").text("Custom Graph Color").style("margin-right", "108px");
    let hexMenu = menuRightSide.append("div").attr("class", "row");
    hexMenu.append("span").text("Hex Color");
    let input = hexMenu.append("input")
        .attr("type", "text")
        .attr("value", p.hexColor ? p.hexColor : hclToHex(getCurveColor(p.id,0)))
        .on("input", function() {
            if (!this.value.startsWith("#")) {
                this.value = "#" + this.value.replace(/#/g, "");
            }
            if (this.value.match(/^#[0-9A-Fa-f]{6}$/)) {
                colorWheel.hex = this.value;
            }
        });

    // Add a button to apply random colors
    hexMenu.append("button").text("Random").on("click", function() {
        p.id = getPhoneNumber();
        // colorPhones();
        colorWheel.hex = hclToHex(getCurveColor(p.id,0));
        // change the hex color input value
        // input.node().value = p.hexColor ? p.hexColor : hclToHex(getCurveColor(p.id,0));
    });

    // Add a 2nd row for dash-style buttons
    menuRightSide.append("div").style("margin", "10px 0 3px 0").append("span").text("Custom Graph Dash-Style");
    let styleMenu = menuRightSide.append("div").attr("class", "row");

    let tick, space;
    function getDashStyle() {
        if (!p.dashStyle) {
            if (p.isTarget) {
                tick = 6;
                space = 3;
            } else if (p.isPrefBounds) {
                tick = 6;
                space = 3;
            } else {
                tick = 1;
                space = 0;
            }
        } else {
            let dash = p.dashStyle.split(", ");
            tick = dash[0];
            space = dash[1];
        }
    }
    function resolveDashStyle() {
        p.dashStyle = tick + ", " + space;
        updatePaths();
    }
    getDashStyle();

    styleMenu.append("span").text("Tick").attr("class", "tickText");
    styleMenu.append("input")
        .attr("class", "tickInput")
        .attr("type", "number")
        .attr("value", tick)
        .attr("min", 1)
        .on("input", function() {
            tick = this.value;
            resolveDashStyle();
        });
    styleMenu.append("span").text("Space").style("margin-left", "11px").attr("class", "spaceText");
    styleMenu.append("input")
        .attr("class", "spaceInput")
        .attr("type", "number")
        .attr("value", space)
        .attr("min", 0)
        .on("input", function() {
            space = this.value;
            resolveDashStyle();
        });
    
    // Add an event listener to close the popup when clicking outside of it
    document.addEventListener("click", function(event) {
        if (!popup.node().contains(event.target)) {
            popup.remove();
            document.removeEventListener("click", arguments.callee);
        }
    });
}
function makeColorPicker(elt) {
    elt.on("click", function (p) {
        // Get the bounding box of the clicked element
        let bbox = this.getBoundingClientRect();
        
        // Calculate the position for the popup menu
        let x = bbox.left + window.scrollX + 20;
        let y = bbox.top + window.scrollY - 150;

        createPopupMenu(p, x, y);
        d3.event.stopPropagation();
    });
}

function colorPhones() {
    updatePaths();
    let c = p=>p.active?getDivColor(p.id,true,p.hexColor):null;
    doc.select("#phones").selectAll("div.phone-item")
        .style("border-color",c);
    let t = table.selectAll("tr").filter(p=>!p.isTarget)
        .style("color", c);
    t.select("button").style("background-color",p=>getColor_AC({p:p}));
    t= t.call(s => s.select(".remove").style("background-image",colorBar)
                    .select("svg").call(cpCircles))
        .select("td.channels"); // Key line
    t.select("svg").remove();
    t.append("svg").call(addKey);
}
