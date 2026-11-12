// 4K 16:9 WYSIWYG Graph Export Component
// Clones live #fr-graph cleanly without mutating UI state, preserves exact IEC 25 dB/decade
// proportions inside a padded 3840x2160 canvas, renders editable Title & Subtitle header,
// and drives direct Save (.png/.svg) and Screenshot (clipboard) actions.

(function () {
    const EXPORT_WIDTH = 3840;
    const EXPORT_HEIGHT = 2160;

    const THEME_CSS_VARS = [
        "--background-color-graph",
        "--background-color-contrast-more",
        "--font-color-primary",
        "--font-primary",
        "--font-secondary",
        "--graph-axis-text",
        "--graph-target-text",
        "--graph-grid-line",
        "--inspector-bg",
        "--inspector-border",
        "--inspector-text",
        "--accent-color",
        "--accent-color-contrast",
        "--svg-filter"
    ];

    function sanitizeFilename(name) {
        return String(name || "")
            .replace(/[\\/:*?"<>|]/g, "")
            .replace(/\s+/g, " ")
            .trim();
    }

    function getExportFilename(ext) {
        let header = (typeof window.getGraphHeaderText === "function")
            ? window.getGraphHeaderText()
            : { title: "", subtitle: "" };

        let autoTitle = (typeof window.getAutoGraphTitle === "function")
            ? window.getAutoGraphTitle()
            : "";

        let base = sanitizeFilename(header.title || autoTitle || "Fc-Construct MIRE");
        if (!base) base = "graph";
        return base + "." + ext;
    }

    function getThemeContext() {
        let svgNode = document.querySelector("#fr-graph") || (typeof gr !== "undefined" ? gr.node() : null);
        let bodyStyle = getComputedStyle(document.body);
        let svgStyle = svgNode ? getComputedStyle(svgNode) : bodyStyle;

        let bgColor = svgStyle.backgroundColor && svgStyle.backgroundColor !== "rgba(0, 0, 0, 0)"
            ? svgStyle.backgroundColor
            : (bodyStyle.getPropertyValue("--background-color-graph").trim() || "#141414");

        let titleColor = bodyStyle.getPropertyValue("--font-color-primary").trim() || "#d9d9d9";
        let subtitleColor = bodyStyle.getPropertyValue("--graph-target-text").trim() || titleColor;
        let fontFamily = bodyStyle.getPropertyValue("--font-primary").trim() || "'Open Sans', sans-serif";

        return {
            svgNode: svgNode,
            bodyStyle: bodyStyle,
            bgColor: bgColor,
            titleColor: titleColor,
            subtitleColor: subtitleColor,
            fontFamily: fontFamily
        };
    }

    function getSvgDimensions(svgNode) {
        let vb = svgNode && svgNode.viewBox && svgNode.viewBox.baseVal;
        let w = (vb && vb.width) ? vb.width : (typeof W0 !== "undefined" ? W0 : 800);
        let h = (vb && vb.height) ? vb.height : (typeof H0 !== "undefined" ? H0 : 457);
        return { width: w, height: h };
    }

    function createExportSvgClone() {
        let ctx = getThemeContext();
        let sourceSvg = ctx.svgNode;
        if (!sourceSvg) throw new Error("Graph SVG element not found");

        let dims = getSvgDimensions(sourceSvg);
        let clone = sourceSvg.cloneNode(true);
        clone.setAttribute("width", String(dims.width));
        clone.setAttribute("height", String(dims.height));

        // Remove transient hover highlights on the clone only (strict WYSIWYG, no live mutation)
        clone.querySelectorAll("path.highlight").forEach(p => p.classList.remove("highlight"));

        // Strip interactive-only controls from export clone while preserving user-toggled labels cleanly
        clone.querySelectorAll("g.dBScaler, g.calc-brush-group, g.inspector, g.inspectLabel").forEach(el => {
            el.setAttribute("display", "none");
        });

        let activeThemeClass = document.body.className || "";
        let originalSvgClass = clone.getAttribute("class") || "";
        clone.setAttribute("class", (originalSvgClass + " " + activeThemeClass).trim());

        THEME_CSS_VARS.forEach(prop => {
            let val = ctx.bodyStyle.getPropertyValue(prop).trim();
            if (val) clone.style.setProperty(prop, val);
        });

        // Attach clone briefly offscreen inside active theme wrapper so saveSvgAsPng getComputedStyle resolves
        let sandbox = document.createElement("div");
        sandbox.className = activeThemeClass;
        sandbox.style.position = "fixed";
        sandbox.style.left = "-99999px";
        sandbox.style.top = "0";
        sandbox.style.width = dims.width + "px";
        sandbox.style.height = dims.height + "px";
        sandbox.style.visibility = "hidden";
        sandbox.style.pointerEvents = "none";
        sandbox.appendChild(clone);
        document.body.appendChild(sandbox);

        return {
            clone: clone,
            dims: dims,
            theme: ctx,
            cleanup: () => {
                if (sandbox.parentNode) sandbox.parentNode.removeChild(sandbox);
            }
        };
    }

    function fitFontSize(canvasCtx, text, maxWidth, maxPx, minPx, weight, fontFamily) {
        for (let size = maxPx; size >= minPx; size -= 2) {
            canvasCtx.font = weight + " " + size + "px " + fontFamily;
            if (canvasCtx.measureText(text).width <= maxWidth) {
                return size;
            }
        }
        canvasCtx.font = weight + " " + minPx + "px " + fontFamily;
        return minPx;
    }

    function compute4KLayout(svgDims) {
        let sideMargin = 160;
        let vertMargin = 90;

        let availW = EXPORT_WIDTH - sideMargin * 2;
        let availH = EXPORT_HEIGHT - vertMargin * 2;
        let scale = Math.min(availW / svgDims.width, availH / svgDims.height);

        let drawW = Math.round(svgDims.width * scale);
        let drawH = Math.round(svgDims.height * scale);
        let drawX = Math.round((EXPORT_WIDTH - drawW) / 2);
        let drawY = Math.round((EXPORT_HEIGHT - drawH) / 2);

        let plotLeft = (typeof pad !== "undefined" && pad.l) ? pad.l : 36;
        let plotW = (typeof W !== "undefined" && W) ? W : 750;
        let plotTop = (typeof pad !== "undefined" && pad.t) ? pad.t : 8;

        let plotCenterX = drawX + ((plotLeft + plotW / 2) / svgDims.width) * drawW;
        let plotGridTopY = drawY + (plotTop / svgDims.height) * drawH;
        let plotMaxTextW = (plotW * 0.88 / svgDims.width) * drawW;

        return {
            scale: scale,
            drawX: drawX,
            drawY: drawY,
            drawW: drawW,
            drawH: drawH,
            plotCenterX: plotCenterX,
            plotGridTopY: plotGridTopY,
            plotMaxTextW: plotMaxTextW
        };
    }

    function render4KCanvas(svgUri, theme, layout, headerText) {
        return new Promise((resolve, reject) => {
            let img = new Image();
            img.onload = () => {
                let canvas = document.createElement("canvas");
                canvas.width = EXPORT_WIDTH;
                canvas.height = EXPORT_HEIGHT;
                let ctx = canvas.getContext("2d");

                // Fill entire 4K 16:9 frame with active graph background color
                ctx.fillStyle = theme.bgColor;
                ctx.fillRect(0, 0, EXPORT_WIDTH, EXPORT_HEIGHT);

                // Draw SVG preserving exact IEC 25 dB/decade proportions
                ctx.drawImage(img, layout.drawX, layout.drawY, layout.drawW, layout.drawH);

                // Overlay centered Title & Subtitle inside top-center of plot box (strict WYSIWYG)
                let titleText = (headerText.title || "").trim();
                let subtitleText = (headerText.subtitle || "").trim();

                if (titleText || subtitleText) {
                    let centerX = layout.plotCenterX;
                    let maxTextW = layout.plotMaxTextW;
                    ctx.textAlign = "center";
                    ctx.textBaseline = "alphabetic";

                    let titleBaselineY = layout.plotGridTopY + Math.round(32 * layout.scale);

                    if (titleText) {
                        let maxTitlePx = Math.round(26.5 * layout.scale);
                        let minTitlePx = Math.round(14 * layout.scale);
                        let titleSize = fitFontSize(ctx, titleText, maxTextW, maxTitlePx, minTitlePx, "700", theme.fontFamily);
                        ctx.font = "700 " + titleSize + "px " + theme.fontFamily;
                        ctx.fillStyle = theme.titleColor;
                        ctx.fillText(titleText, centerX, titleBaselineY);
                    }

                    if (subtitleText) {
                        let subBaselineY = titleText
                            ? (titleBaselineY + Math.round(17.5 * layout.scale))
                            : titleBaselineY;
                        let maxSubPx = Math.round(12.6 * layout.scale);
                        let minSubPx = Math.round(8.5 * layout.scale);
                        let subSize = fitFontSize(ctx, subtitleText, maxTextW, maxSubPx, minSubPx, "400", theme.fontFamily);
                        ctx.font = "400 " + subSize + "px " + theme.fontFamily;
                        ctx.fillStyle = theme.subtitleColor;
                        ctx.fillText(subtitleText, centerX, subBaselineY);
                    }
                }

                resolve(canvas);
            };
            img.onerror = err => reject(err);
            img.src = svgUri;
        });
    }

    function render4KBlob() {
        let prepared = createExportSvgClone();
        let headerText = (typeof window.getGraphHeaderText === "function")
            ? window.getGraphHeaderText()
            : { title: "", subtitle: "" };

        let layout = compute4KLayout(prepared.dims);

        let rasterPromise = svgAsPngUri(prepared.clone, {
            scale: layout.scale,
            backgroundColor: prepared.theme.bgColor
        });

        return rasterPromise
            .then(uri => {
                prepared.cleanup();
                return render4KCanvas(uri, prepared.theme, layout, headerText);
            })
            .catch(err => {
                prepared.cleanup();
                throw err;
            })
            .then(canvas => {
                return new Promise((resolve, reject) => {
                    canvas.toBlob(blob => {
                        if (!blob) return reject(new Error("Failed to generate 4K PNG blob"));
                        resolve(blob);
                    }, "image/png");
                });
            });
    }

    function saveGraph4K(ext) {
        let format = (ext || "png").toLowerCase();
        let filename = getExportFilename(format);

        if (format === "svg") {
            let prepared = createExportSvgClone();
            saveSvg(prepared.clone, filename, {
                scale: 3,
                backgroundColor: prepared.theme.bgColor
            }).then(() => {
                prepared.cleanup();
            }).catch(err => {
                prepared.cleanup();
                console.error("Error saving SVG:", err);
            });
            if (typeof analyticsEnabled !== "undefined" && analyticsEnabled && typeof pushEventTag === "function") {
                pushEventTag("clicked_download", targetWindow);
            }
            return;
        }

        render4KBlob().then(blob => {
            let url = URL.createObjectURL(blob);
            let a = document.createElement("a");
            a.download = filename;
            a.href = url;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 2000);
        }).catch(err => {
            console.error("Error saving 4K PNG:", err);
        });

        if (typeof analyticsEnabled !== "undefined" && analyticsEnabled && typeof pushEventTag === "function") {
            pushEventTag("clicked_download", targetWindow);
        }
    }

    function copyGraphScreenshot4K() {
        let screenshotBtn = document.querySelector("button#screenshot-btn");

        render4KBlob().then(blob => {
            if (navigator.clipboard && window.ClipboardItem) {
                return navigator.clipboard.write([
                    new ClipboardItem({ "image/png": blob })
                ]);
            }
            throw new Error("Clipboard API not supported");
        }).then(() => {
            if (screenshotBtn) {
                screenshotBtn.classList.add("clicked");
                setTimeout(() => {
                    screenshotBtn.classList.remove("clicked");
                }, 600);
            }
        }).catch(err => {
            console.error("Error copying 4K screenshot to clipboard:", err);
        });

        if (typeof analyticsEnabled !== "undefined" && analyticsEnabled && typeof pushEventTag === "function") {
            pushEventTag("clicked_screenshot", targetWindow);
        }
    }

    window.saveGraph4K = saveGraph4K;
    window.copyGraphScreenshot4K = copyGraphScreenshot4K;
})();
