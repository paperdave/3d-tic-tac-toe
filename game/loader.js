module.exports = function(document, style) {
    style = document.createElement("link");
    style.href = "./style.css";
    style.rel = "stylesheet";
    style.onload = (script) => {
        script = document.createElement("script");
        script.src = "./puzzle-game.js";
        document.body.appendChild(script);
    }
    document.body.appendChild(style);
};