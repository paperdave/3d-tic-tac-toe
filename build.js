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
    "./game/lib/lib.js",
    "./game/lib/copy.js",
    "./game/lib/three.js",
    "./game/lib/OrbitControlsSmooth.js",
    "./game/win-detect.js",
    "./game/game.js"
]

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
    return;
} else {
    if(result.warnings) {
        result.warnings.forEach(warning => {
            if (warning.includes("./node_modules/")) return;
            // if (warning.includes("./lib")) return;

            console.warn(chalk.yellow("[WARN] " + warning));
        });
    }

    js_playload = result.code;
}

fs.writeFileSync("./dist/puzzle-game.js", js_playload);

// index.html
let indexContent = fs.readFileSync("./game/index.html").toString();
let css = indexContent.replace(/((.|\n|\r)*)<style>((.|\n|\r)*)\<\/style\>((.|\n|\r)*)/g,"$3");
indexContent = indexContent.replace(/\<style>((.|\n|\r)*)\<\/style\>/g,"!!!replace with processed css!!!");
indexContent = indexContent.replace(/\<\!-- START SCRIPTS --\>((.|\n|\r)*)\<\!-- END SCRIPTS --\>/g,"<script src='puzzle-game.js'></script>");

var autoprefixer = require('autoprefixer');
var postcss = require('postcss');
postcss([autoprefixer]).process(css, {from: undefined}).then(function (result) {
    result.warnings().forEach(function (warn) {
        console.warn(warn.toString());
    });
    
    indexContent = indexContent.replace("!!!replace with processed css!!!", "<style>" + result.css + "</style>");

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

    fs.writeFileSync("./dist/index.html", indexContent);
});

