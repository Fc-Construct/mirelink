// Theme switcher (Dark / Light / Contrast)
// Persists choice in localStorage as `theme-pref`. Default is `theme-dark`.
function themeChooser(command) {
    let docBody = document.querySelector("body"),
        themeButton = document.querySelector("button#theme");

    if (!themeButton) return;
    let themeCurrent = themeButton.getAttribute("current-theme") || localStorage.getItem("theme-pref") || "theme-dark";

    // Cycle through states: Dark -> Light (default) -> Contrast -> Dark
    if (command === "change") {
        if (themeCurrent === "theme-dark") {
            themeCurrent = "theme-default"; // Light mode
        } else if (themeCurrent === "theme-default") {
            themeCurrent = "theme-contrast"; // Contrast mode
        } else {
            themeCurrent = "theme-dark"; // Dark mode
        }
        localStorage.setItem("theme-pref", themeCurrent);
    }

    let themePref = localStorage.getItem("theme-pref") || "theme-dark";

    // Apply theme class and update label to show the CURRENT active theme
    if (themePref === "theme-dark") {
        docBody.classList.remove("theme-default", "theme-contrast");
        docBody.classList.add("theme-dark");
        themeButton.textContent = "Dark Mode";
    } else if (themePref === "theme-contrast") {
        docBody.classList.remove("theme-default", "theme-dark");
        docBody.classList.add("theme-contrast");
        themeButton.textContent = "Contrast Mode";
    } else {
        docBody.classList.remove("theme-dark", "theme-contrast");
        docBody.classList.add("theme-default");
        themeButton.textContent = "Light Mode";
    }

    themeButton.setAttribute("current-theme", themePref);
}

if (typeof themingEnabled !== "undefined" && themingEnabled) {
    let themeButton = document.createElement("button"),
        miscTools = document.querySelector("div.miscTools");

    themeButton.setAttribute("id", "theme");
    let initPref = localStorage.getItem("theme-pref") || "theme-dark";
    themeButton.setAttribute("current-theme", initPref);

    if (initPref === "theme-dark") {
        themeButton.textContent = "Dark Mode";
    } else if (initPref === "theme-contrast") {
        themeButton.textContent = "Contrast Mode";
    } else {
        themeButton.textContent = "Light Mode";
    }

    themeButton.addEventListener("click", function () {
        themeChooser("change");
    });

    if (miscTools && !document.querySelector("button#theme")) {
        miscTools.append(themeButton);
    }
    themeChooser();
}

