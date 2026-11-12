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

    function buildAutoTitle(phones) {
        if (!phones || phones.length === 0) return "";
        let primaryBrand = getPhoneBrand(phones[0]);
        let primaryBrandLower = primaryBrand.toLowerCase();

        let parts = phones.map((p, idx) => {
            let brand = getPhoneBrand(p);
            let model = getPhoneModel(p, brand);
            if (idx === 0) {
                return brand ? (brand + " " + model).trim() : model;
            }
            if (brand && primaryBrandLower && brand.toLowerCase() === primaryBrandLower) {
                return model;
            }
            return brand ? (brand + " " + model).trim() : model;
        }).filter(Boolean);

        if (!parts.length) return "";
        return parts.join(" vs. ") + " MIRE";
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
            titleInput.value = "";
            subtitleInput.value = "";
        } else {
            let autoTitle = buildAutoTitle(visiblePhones);
            if (titleInput.dataset.userEdited !== "true") {
                titleInput.value = autoTitle;
            }
            if (subtitleInput.dataset.userEdited !== "true") {
                subtitleInput.value = DEFAULT_SUBTITLE;
            }
        }

        let titleEdited = titleInput.dataset.userEdited === "true" && titleInput.value.trim().length > 0;
        let subtitleEdited = subtitleInput.dataset.userEdited === "true" && subtitleInput.value.trim().length > 0;
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
        let title = titleInput ? titleInput.value.trim() : buildAutoTitle(visiblePhones);
        let subtitle = subtitleInput ? subtitleInput.value.trim() : (visiblePhones.length ? DEFAULT_SUBTITLE : "");
        return { title: title, subtitle: subtitle };
    }

    function initGraphHeader() {
        let { titleInput, subtitleInput } = getElements();
        if (!titleInput || !subtitleInput) return;

        titleInput.placeholder = "Graph title";
        subtitleInput.placeholder = "Graph subtitle";

        titleInput.addEventListener("input", function () {
            titleInput.dataset.userEdited = "true";
        });
        subtitleInput.addEventListener("input", function () {
            subtitleInput.dataset.userEdited = "true";
        });

        [titleInput, subtitleInput].forEach(input => {
            input.addEventListener("blur", function () {
                if (getVisibleDataPhones().length === 0 && !input.value.trim()) {
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
