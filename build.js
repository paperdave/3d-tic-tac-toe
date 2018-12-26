const full_production = true;

const fs = require("fs-extra");
const minifyHTML = require("html-minifier").minify;

if(fs.pathExistsSync("./dist")) fs.removeSync("./dist");
fs.mkdirsSync("./dist");

// javascript payload
let js_playload = `(function() {`

function readJSSection(file) {
    return fs.readFileSync(file).toString().split("\n").map(x=>"\t"+x).join("\n") + "\n";
}

js_playload += readJSSection("./node_modules/socket.io-client/dist/socket.io.js");
js_playload += readJSSection("./game/lib.js");
js_playload += readJSSection("./game/lib/three.js")
js_playload += readJSSection("./game/lib/OrbitControlsSmooth.js");
js_playload += readJSSection("./game/win-detect.js");
js_playload += readJSSection("./game/game.js");

js_playload += "})();";

if (full_production) {
    
}

fs.writeFileSync("./dist/puzzle-game.js", js_playload);

// index.html
let indexContent = fs.readFileSync("./game/index.html").toString();
indexContent = indexContent.replace(/\<\!-- START SCRIPTS --\>((.|\n|\r)*)\<\!-- END SCRIPTS --\>/g,"<script src='puzzle-game.js'></script>");

if (full_production) {
    // minify
    indexContent = minifyHTML(indexContent, {
        caseSensitive: true,
        collapseInlineTagWhitespace: true,
        collapseWhitespace: true,
        minifyURLs: true,
        minifyCSS: true,
        minifyJS: {
            ie8: false,
            mangle: {
                toplevel: true,
                keep_fnames: false
            },

        },
        removeComments: true,
        removeAttributeQuotes: true,
        removeOptionalTags: true,
        removeRedundantAttributes: true,
        removeScriptTypeAttributes: true,
        removeStyleLinkTypeAttributes: true,
        removeTagWhitespace: true,
        useShortDoctype: true
    });
}

fs.writeFileSync("./dist/index.html", indexContent);
