const minify = true;

const fs = require("fs-extra");
const minifyHTML = require("html-minifier").minify;
const UglifyJS = require("uglify-es");
const chalk = require("chalk");

if(fs.pathExistsSync("./dist")) fs.removeSync("./dist");``
fs.mkdirsSync("./dist");

// javascript payload
let js_playload;
const files = [
    "./node_modules/socket.io-client/dist/socket.io.js",
    "./game/lib.js",
    "./game/lib/three.js",
    "./game/lib/OrbitControlsSmooth.js",
    "./game/win-detect.js",
    "./game/game.js"
]

if (minify) {
    let code = {}
    
    files.forEach(file => {
        code[file.replace("./game/", "./")] = fs.readFileSync(file).toString();
    });

    let result = UglifyJS.minify(code, {
        warnings: true,
    });
    
    if (result.error) {
        console.log(chalk.red("Minification Error!"))
        console.log(chalk.red(result.error.message));
        console.log("At " + result.error.filename + result.error.line + "," + result.error.col);
    } else {
        if(result.warnings) {
            result.warnings.forEach(warning => {
                if (warning.includes("./node_modules/")) return;
                if (warning.includes("./lib")) return;

                console.warn(chalk.yellow("[WARN] " + warning));
            });
        }
    
        js_playload = result.code;
    }
} else {
    // un minified
    js_playload = "(function() {";

    files.forEach(file => {
        js_playload += fs.readFileSync(file).toString().split("\n").map(x => "\t" + x).join("\n") + "\n";
    });

    js_playload += "})();";

}

fs.writeFileSync("./dist/puzzle-game.js", js_playload);

// index.html
let indexContent = fs.readFileSync("./game/index.html").toString();
indexContent = indexContent.replace(/\<\!-- START SCRIPTS --\>((.|\n|\r)*)\<\!-- END SCRIPTS --\>/g,"<script src='puzzle-game.js'></script>");

if (minify) {
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
