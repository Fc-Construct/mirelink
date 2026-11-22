// Squiglink Sites & Sponsorship Framework
let mode = 'prod',
    cacheBuster = 'squig';

// Opted-out sites list
let optedOut = [
    '64audio',
    'cammyfi',
    'crinacle',
    'eliseaudio',
    'hbb',
    'joycesreview',
    'kr0mka',
    'graph',
    'vsg',
    'fc-construct'
];

currentSite = getCurrentSite();
currentSiteOptedOut = optedOut.includes(currentSite) ? true : false;

function getCurrentSite() {
    let host = window.location.host,
        path = window.location.pathname;

    if (host.split('.')[1] === 'squig') {
        return host.split('.')[0];
    } else if (host.split('.')[0] === 'squig' && path.indexOf('/lab/') > -1) {
        return window.location.pathname.split('/')[2];
    } else if (host.split('.')[0] === 'squig' && path.indexOf('/lab/') === -1) {
        return 'superreview';
    } else if (window.location.host.split('.')[1] === 'hangout') {
        return 'crinacle';
    } else {
        return 'fc-construct';
    }
}

// Squiglink intro / sponsorship modal loader
function loadSquiglinkIntro() {
    let body = document.querySelector('body'),
        introScript = document.createElement('script'),
        introScriptSrc = mode === 'dev' ? 'squiglink-intro.js' : 'https://squig.link/squiglink-intro.js?' + cacheBuster;
    introScript.setAttribute('type', 'text/javascript');
    introScript.setAttribute('src', introScriptSrc);
    body.append(introScript);
}

// Shoplinks loader (affiliate/store links)
function loadShoplinks() {
    let body = document.querySelector('body'),
        shoplinksScript = document.createElement('script'),
        shoplinksScriptSrc = mode === 'dev' ? 'shoplinks.js' : 'https://squig.link/shoplinks.js?' + cacheBuster;
    shoplinksScript.setAttribute('type', 'text/javascript');
    shoplinksScript.setAttribute('src', shoplinksScriptSrc);
    body.append(shoplinksScript);
}

// Custom / Local Sponsorship Framework (1P sponsorships with master + granular feature flags)
function initCustomSponsor(config) {
    if (!config || !config.enabled) return;

    const desktopMount = document.getElementById("sidebar-sponsor");
    const mobileMount = document.getElementById("mobile-menu-sponsor");
    const placements = config.placements || {};
    const allowedTypes = config.allowedTypes || {};
    const rotation = config.rotation || {};
    const items = Array.isArray(config.items) ? config.items : [];

    // Filter eligible sponsors by hidden flag and allowed ad-type sub-flags
    let eligible = items.filter(function(item) {
        if (!item || item.hidden) return false;
        const typeKey = item.type || "productSpotlight";
        return allowedTypes[typeKey] === true;
    });

    if (eligible.length === 0) return;

    if (rotation.shuffleOnLoad && eligible.length > 1) {
        eligible = eligible.slice().sort(function() { return Math.random() - 0.5; });
    }

    function safeUrl(url) {
        if (!url || typeof url !== "string") return "#";
        const trimmed = url.trim();
        if (/^(https?:|\/|\.\/)/i.test(trimmed)) return trimmed;
        return "#";
    }

    function buildSampleBannerGraphic(item) {
        const svgNS = "http://www.w3.org/2000/svg";
        const wrap = document.createElement("div");
        wrap.className = "sponsor-banner-placeholder";

        const emblem = document.createElement("div");
        emblem.className = "sponsor-banner-emblem";
        const svg = document.createElementNS(svgNS, "svg");
        svg.setAttribute("viewBox", "0 0 28 28");
        svg.setAttribute("aria-hidden", "true");
        svg.innerHTML = `<circle cx="14" cy="14" r="11" fill="none" stroke="currentColor" stroke-width="1.6" opacity="0.75"/><path d="M9 15a5 5 0 0 1 10 0M10.5 15v3.5a1.5 1.5 0 0 1-3 0V15m13 0v3.5a1.5 1.5 0 0 1-3 0V15" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>`;
        emblem.append(svg);

        const copy = document.createElement("div");
        copy.className = "sponsor-banner-copy";
        const title = document.createElement("span");
        title.className = "sponsor-banner-title";
        title.textContent = item.name || "Partner Banner";
        const sub = document.createElement("span");
        sub.className = "sponsor-banner-sub";
        sub.textContent = item.tagline || item.alt || "Sponsor Banner Slot";
        copy.append(title, sub);

        wrap.append(emblem, copy);
        return wrap;
    }

    function buildSponsorCard(item) {
        const type = item.type || "productSpotlight";
        const fitMode = item.fitMode || config.defaultFitMode || "ambient";
        const link = document.createElement("a");
        link.className = "sponsor-card sponsor-type-" + type;
        link.href = safeUrl(item.url);
        link.target = "_blank";
        link.rel = "noopener noreferrer sponsored";
        if (item.name) link.setAttribute("aria-label", item.name);
        if (item.bgColor) link.style.backgroundColor = item.bgColor;

        if (item.imageUrl) {
            const frame = document.createElement("div");
            frame.className = "sponsor-image-frame sponsor-fit-" + fitMode;
            if (item.bgColor) {
                frame.style.backgroundColor = item.bgColor;
            }
            if (fitMode === "ambient") {
                const backdrop = document.createElement("div");
                backdrop.className = "sponsor-ambient-bg";
                backdrop.style.backgroundImage = 'url("' + item.imageUrl.replace(/"/g, '\\"') + '")';
                frame.append(backdrop);
            }
            const img = document.createElement("img");
            img.className = "sponsor-banner-img";
            img.src = item.imageUrl;
            img.alt = item.alt || item.name || "Sponsor";
            frame.append(img);
            link.classList.add("has-image");
            link.append(frame);
            return link;
        }

        if (type === "imageBanner") {
            link.append(buildSampleBannerGraphic(item));
            return link;
        }

        const badge = document.createElement("span");
        badge.className = "sponsor-badge";
        badge.textContent = item.badgeText || (item.name ? item.name.slice(0, 2).toUpperCase() : "SP");
        link.append(badge);

        const textWrap = document.createElement("div");
        textWrap.className = "sponsor-text";

        const title = document.createElement("span");
        title.className = "sponsor-title";
        title.textContent = item.name || "Partner";
        textWrap.append(title);

        if (item.tagline) {
            const sub = document.createElement("span");
            sub.className = "sponsor-tagline";
            sub.textContent = item.tagline;
            textWrap.append(sub);
        }
        link.append(textWrap);

        if (type === "productSpotlight" && item.ctaText) {
            const cta = document.createElement("span");
            cta.className = "sponsor-cta";
            cta.textContent = item.ctaText;
            link.append(cta);
        }

        return link;
    }

    const targets = [];
    if (placements.desktopSidebar && desktopMount) targets.push({ mount: desktopMount, variant: "sidebar" });
    if (placements.mobileMenu && mobileMount) targets.push({ mount: mobileMount, variant: "mobile" });
    if (targets.length === 0) return;

    const cardHeight = Math.max(64, Number(config.cardHeight) || 152);
    const controlsEl = desktopMount ? desktopMount.closest(".controls") : null;
    if (controlsEl) {
        controlsEl.style.setProperty("--sponsor-card-height", cardHeight + "px");
    }
    targets.forEach(function(target) {
        target.mount.style.setProperty("--sponsor-card-height", cardHeight + "px");
    });

    let currentIndex = 0;
    let isPaused = false;
    let rotateTimer = null;

    function renderAll() {
        const currentItem = eligible[currentIndex];
        targets.forEach(function(target) {
            target.mount.innerHTML = "";

            if (config.showHeaderMeta) {
                const header = document.createElement("div");
                header.className = "sponsor-meta";

                const disclosure = document.createElement("span");
                disclosure.className = "sponsor-disclosure";
                disclosure.textContent = config.disclosureLabel || "Sponsor";
                header.append(disclosure);

                if (eligible.length > 1) {
                    const dots = document.createElement("div");
                    dots.className = "sponsor-dots";
                    dots.setAttribute("role", "tablist");
                    dots.setAttribute("aria-label", "Sponsor slots");
                    eligible.forEach(function(item, idx) {
                        const dot = document.createElement("button");
                        dot.type = "button";
                        dot.className = "sponsor-dot" + (idx === currentIndex ? " is-active" : "");
                        dot.setAttribute("aria-label", "Show " + (item.name || "sponsor " + (idx + 1)));
                        dot.addEventListener("click", function(e) {
                            e.preventDefault();
                            e.stopPropagation();
                            currentIndex = idx;
                            renderAll();
                            resetTimer();
                        });
                        dots.append(dot);
                    });
                    header.append(dots);
                }

                target.mount.append(header);
            }

            target.mount.append(buildSponsorCard(currentItem));
        });
    }

    function resetTimer() {
        if (rotateTimer) {
            clearInterval(rotateTimer);
            rotateTimer = null;
        }
        if (rotation.enabled && eligible.length > 1) {
            const ms = Math.max(2500, Number(rotation.intervalMs) || 8000);
            rotateTimer = setInterval(function() {
                if (!isPaused) {
                    currentIndex = (currentIndex + 1) % eligible.length;
                    renderAll();
                }
            }, ms);
        }
    }

    targets.forEach(function(target) {
        target.mount.addEventListener("mouseenter", function() { isPaused = true; });
        target.mount.addEventListener("mouseleave", function() { isPaused = false; });
        target.mount.addEventListener("focusin", function() { isPaused = true; });
        target.mount.addEventListener("focusout", function() { isPaused = false; });
    });

    renderAll();
    resetTimer();
}

// Framework invocation: controlled by config options
if (typeof sponsorConfig !== "undefined") {
    initCustomSponsor(sponsorConfig);
}

if (typeof sponsorshipsEnabled !== "undefined" && sponsorshipsEnabled && !currentSiteOptedOut) {
    loadSquiglinkIntro();
}

if (typeof shoplinksEnabled !== "undefined" && shoplinksEnabled && !currentSiteOptedOut) {
    loadShoplinks();
}