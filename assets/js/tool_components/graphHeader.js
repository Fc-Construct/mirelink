// Editable Graph Header Component (Title & Subtitle)
// Renders inline editable title/subtitle directly above #fr-graph (desktop & mobile)
// so live UI edits flow directly into 4K WYSIWYG Save & Screenshot exports.

(function () {
    const DEFAULT_SUBTITLE = "1/6 Smoothing | Fc-Construct DF-HRTF | MIRE";

    function getVisibleDataPhones() {
        if (typeof activePhones === "undefined" || !Array.isArray(activePhones)) {
            return [];
        }
        return activePhones.filter(p => p && !p.isTarget && !p.isPrefBounds && !p.hide);
    }

    function getPhoneBrand(p) {
        if (!p) return "";
        if (p.dispBrand && typeof p.dispBrand === "string") return p.dispBrand.trim();
        if (p.brand && p.brand.name) return String(p.brand.name).trim();
        return "";
    }

    function getPhoneModel(p, brand) {
        if (!p) return "";
        let raw = (p.dispName || p.phone || p.fullName || "").trim();
        if (brand && raw.toLowerCase().startsWith((brand + " ").toLowerCase())) {
            raw = raw.slice(brand.length).trim();
        }
        return raw || (p.fullName || "").trim();
    }

    function buildAutoTitleParts(phones) {
        if (!phones || phones.length === 0) return [];
        let prevBrandLower = "";

        return phones.map((p, idx) => {
            let brand = getPhoneBrand(p);
            let brandLower = brand.toLowerCase();
            let model = getPhoneModel(p, brand);
            let omitBrand = idx > 0 && brandLower && brandLower === prevBrandLower;
            prevBrandLower = brandLower;
            if (omitBrand) {
                return model;
            }
            return brand ? (brand + " " + model).trim() : model;
        }).filter(Boolean);
    }

    function buildAutoTitle(phones) {
        let parts = buildAutoTitleParts(phones);
        if (!parts.length) return "";
        return parts.join(" vs. ");
    }

    function renderAutoTitle(titleEl, parts) {
        titleEl.textContent = "";
        parts.forEach((part, idx) => {
            if (idx > 0) {
                titleEl.appendChild(document.createTextNode(" vs. "));
            }
            let span = document.createElement("span");
            span.className = "graph-title-token";
            span.textContent = part;
            titleEl.appendChild(span);
        });
    }

    function getElements() {
        return {
            mainEl: document.querySelector("main.main"),
            graphBox: document.querySelector("div.graphBox"),
            graphSizer: document.querySelector("div.graph-sizer"),
            headerEl: document.getElementById("graph-header"),
            titleInput: document.getElementById("graph-title-input"),
            subtitleInput: document.getElementById("graph-subtitle-input")
        };
    }

    function syncGraphToolOverlayState() {
        let { graphSizer } = getElements();
        if (!graphSizer) return;
        let inspectOn = typeof interactInspect !== "undefined" && !!interactInspect;
        let calcOn = typeof interactCalc !== "undefined" && !!interactCalc;
        graphSizer.setAttribute("data-tool-active", (inspectOn || calcOn) ? "true" : "false");
    }

    function syncGraphHeader() {
        let { mainEl, graphBox, titleInput, subtitleInput } = getElements();
        if (!titleInput || !subtitleInput) return;

        let visiblePhones = getVisibleDataPhones();
        let hasData = visiblePhones.length > 0;

        if (!hasData) {
            delete titleInput.dataset.userEdited;
            delete subtitleInput.dataset.userEdited;
            titleInput.textContent = "";
            subtitleInput.textContent = "";
        } else {
            let autoParts = buildAutoTitleParts(visiblePhones);
            if (titleInput.dataset.userEdited !== "true") {
                renderAutoTitle(titleInput, autoParts);
            }
            if (subtitleInput.dataset.userEdited !== "true") {
                subtitleInput.textContent = DEFAULT_SUBTITLE;
            }
        }

        let titleEdited = titleInput.dataset.userEdited === "true" && titleInput.textContent.trim().length > 0;
        let subtitleEdited = subtitleInput.dataset.userEdited === "true" && subtitleInput.textContent.trim().length > 0;
        let showHeader = hasData || titleEdited || subtitleEdited;

        if (mainEl) {
            mainEl.setAttribute("data-has-header", showHeader ? "true" : "false");
        }
        if (graphBox) {
            graphBox.setAttribute("data-has-header", showHeader ? "true" : "false");
        }
        syncGraphToolOverlayState();
    }

    function getGraphHeaderText() {
        let { titleInput, subtitleInput } = getElements();
        let visiblePhones = getVisibleDataPhones();
        let title = titleInput ? titleInput.textContent.replace(/\u00A0/g, " ").trim() : buildAutoTitle(visiblePhones);
        let subtitle = subtitleInput ? subtitleInput.textContent.replace(/\u00A0/g, " ").trim() : (visiblePhones.length ? DEFAULT_SUBTITLE : "");
        return { title: title, subtitle: subtitle };
    }

    function initGraphHeader() {
        let { titleInput, subtitleInput } = getElements();
        if (!titleInput || !subtitleInput) return;

        titleInput.setAttribute("placeholder", "Graph title");
        subtitleInput.setAttribute("placeholder", "Graph subtitle");

        titleInput.addEventListener("input", function () {
            titleInput.dataset.userEdited = "true";
        });
        subtitleInput.addEventListener("input", function () {
            subtitleInput.dataset.userEdited = "true";
        });

        [titleInput, subtitleInput].forEach(input => {
            input.addEventListener("blur", function () {
                if (getVisibleDataPhones().length === 0 && !input.textContent.trim()) {
                    delete input.dataset.userEdited;
                    syncGraphHeader();
                }
            });
        });

        syncGraphHeader();
    }

    window.DEFAULT_GRAPH_SUBTITLE = DEFAULT_SUBTITLE;
    window.syncGraphHeader = syncGraphHeader;
    window.syncGraphToolOverlayState = syncGraphToolOverlayState;
    window.getGraphHeaderText = getGraphHeaderText;
    window.getAutoGraphTitle = function () {
        return buildAutoTitle(getVisibleDataPhones());
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initGraphHeader);
    } else {
        initGraphHeader();
    }
})();
