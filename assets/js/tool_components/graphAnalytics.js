// Google Analytics 4 (GA4) Event Helper
// Strictly gated by analyticsEnabled and analyticsAllowedHosts in config.js.
(function () {
    const firedSessionFeatures = new Set();
    let lastTargetKey = null;

    function isHostAllowed() {
        const hosts = (typeof analyticsAllowedHosts !== "undefined" && Array.isArray(analyticsAllowedHosts))
            ? analyticsAllowedHosts
            : ["fc-construct.github.io"];
        return hosts.indexOf(window.location.hostname) !== -1;
    }

    function isAnalyticsActive() {
        if (typeof analyticsEnabled === "undefined" || !analyticsEnabled) return false;
        if (!isHostAllowed()) return false;
        return typeof window.gtag === "function";
    }

    function cleanParams(params) {
        const out = {};
        if (!params || typeof params !== "object") return out;
        Object.keys(params).forEach(k => {
            const v = params[k];
            if (v !== undefined && v !== null && v !== "") {
                out[k] = v;
            }
        });
        return out;
    }

    function trackGAEvent(eventName, params) {
        if (!eventName || !isAnalyticsActive()) return;
        try {
            window.gtag("event", eventName, cleanParams(params));
        } catch (_) {}
    }

    function resolvePhoneMeta(phoneObj) {
        if (!phoneObj) return null;
        if (phoneObj.isTarget || phoneObj.isPrefBounds || phoneObj.is90Bounds || phoneObj.eqParent) {
            return null;
        }
        const brandName = (phoneObj.brand && typeof phoneObj.brand === "object" && phoneObj.brand.name)
            ? phoneObj.brand.name
            : (typeof phoneObj.brand === "string" ? phoneObj.brand : "");
        if (brandName === "Uploaded" || brandName === "Targets") return null;

        const dispBrand = phoneObj.dispBrand || brandName;
        const baseModel = phoneObj.phone || phoneObj.dispName || "";
        const dispName = phoneObj.dispName || baseModel;
        if (!baseModel && !dispName) return null;

        let variant = "Stock";
        if (dispName && baseModel && dispName !== baseModel) {
            if (dispName.indexOf(baseModel + " ") === 0) {
                variant = dispName.slice(baseModel.length + 1).trim() || "Stock";
            } else {
                variant = dispName;
            }
        }

        const phoneName = dispBrand ? (dispBrand + " " + dispName) : dispName;
        return {
            brand: dispBrand,
            model: baseModel,
            variant: variant,
            phone_name: phoneName
        };
    }

    function trackPhoneViewed(phoneObj, source) {
        const meta = resolvePhoneMeta(phoneObj);
        if (!meta) return;
        trackGAEvent("phone_viewed", {
            brand: meta.brand,
            model: meta.model,
            variant: meta.variant,
            phone_name: meta.phone_name,
            source: source || "sidebar"
        });
    }

    function trackTargetSelected(targetName, source) {
        const name = (targetName || "").trim();
        if (!name) return;
        const key = name + "::" + (source || "");
        if (key === lastTargetKey) return;
        lastTargetKey = key;
        trackGAEvent("target_selected", {
            target_name: name,
            source: source || "preset"
        });
    }

    function trackFeatureUsed(feature, detail) {
        if (!feature) return;
        if (firedSessionFeatures.has(feature)) return;
        firedSessionFeatures.add(feature);
        trackGAEvent("feature_used", {
            feature: feature,
            feature_detail: detail
        });
    }

    function trackOutboundClick(category, name, url) {
        trackGAEvent("outbound_link_clicked", {
            category: category || "resource",
            name: name || url || "unknown",
            link_url: url
        });
    }

    const seenSponsorImpressions = new Set();

    function trackGraphExported(format) {
        if (!format) return;
        trackGAEvent("graph_exported", {
            format: format
        });
    }

    function trackSponsorImpression(info) {
        if (!info) return;
        const sponsorId = info.id || info.name || "unknown";
        const sponsorName = info.name || info.id || "Sponsor";
        const placement = info.placement || "desktop_sidebar";
        const key = sponsorId + "::" + placement;
        if (seenSponsorImpressions.has(key)) return;
        seenSponsorImpressions.add(key);
        trackGAEvent("sponsor_impression", {
            sponsor_id: sponsorId,
            sponsor_name: sponsorName,
            sponsor_type: info.type || "productSpotlight",
            placement: placement
        });
    }

    function trackSponsorClick(info) {
        if (!info) return;
        const sponsorId = info.id || info.name || "unknown";
        const sponsorName = info.name || info.id || "Sponsor";
        const placement = info.placement || "desktop_sidebar";
        const url = info.url || "";
        trackGAEvent("sponsor_click", {
            sponsor_id: sponsorId,
            sponsor_name: sponsorName,
            sponsor_type: info.type || "productSpotlight",
            placement: placement,
            link_url: url
        });
        trackOutboundClick("sponsor", sponsorName, url);
    }

    // Backwards-compatible shims for any legacy call sites
    function pushEventTag(eventName, _targetWindow, otherData) {
        if (!eventName) return;
        if (eventName === "clicked_download") return trackGraphExported("save_png");
        if (eventName === "clicked_screenshot") return trackGraphExported("screenshot");
        if (eventName === "clicked_copyUrl") return trackGraphExported("copy_url");
        if (eventName === "clicked_equalizerTab") return trackFeatureUsed("eq_tab");
        if (eventName === "tutorial_activated") return trackFeatureUsed("tutorial_region", otherData);
        trackGAEvent(eventName, otherData ? { other: otherData } : undefined);
    }

    function pushPhoneTag(eventName, phone, trigger) {
        if (!phone) return;
        if (eventName === "phone_displayed") return trackPhoneViewed(phone, trigger);
        const meta = resolvePhoneMeta(phone);
        if (meta) {
            trackGAEvent(eventName, {
                brand: meta.brand,
                model: meta.model,
                variant: meta.variant,
                trigger: trigger
            });
        }
    }

    window.trackGAEvent = trackGAEvent;
    window.trackPhoneViewed = trackPhoneViewed;
    window.trackTargetSelected = trackTargetSelected;
    window.trackFeatureUsed = trackFeatureUsed;
    window.trackOutboundClick = trackOutboundClick;
    window.trackGraphExported = trackGraphExported;
    window.trackSponsorImpression = trackSponsorImpression;
    window.trackSponsorClick = trackSponsorClick;
    window.pushEventTag = pushEventTag;
    window.pushPhoneTag = pushPhoneTag;
})();