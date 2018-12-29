const fs = require("fs-extra");
const minifyHTML = require("html-minifier").minify;
const UglifyJS = require("uglify-es");
const chalk = require("chalk");
const cssnano = require("cssnano");

const start_time = Date.now();
console.log("Starting Build");

if(fs.pathExistsSync("./dist")) fs.removeSync("./dist");``
fs.mkdirsSync("./dist");
fs.copySync("./game/res", "./dist/res");

// javascript payload
let puzzlegame;
const files = [
    "./node_modules/socket.io-client/dist/socket.io.js",
    "./game/lib/lib.js",
    "./game/lib/copy.js",
    "./game/lib/three.production.js",
    "./game/lib/OrbitControlsSmooth.js",
    "./game/win-detect.js",
    "./game/game.js"
]

let code = {}

files.forEach(file => {
    code[file.replace("./game/", "./src/")] = fs.readFileSync(file).toString();
});

let result = UglifyJS.minify(code, {
    warnings: true,
    mangle: {
        toplevel: true
    }
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

    puzzlegame = result.code;
}

// puzzlegame = "eval(`" + puzzlegame.replace(/function/g,"✔") + "`.replace(/✔/g,'function'))";

fs.writeFileSync("./dist/puzzle-game.js", puzzlegame);
fs.writeFileSync("./dist/puzzle-game.js.map", result.map);

// index.html
let loader = "(" + require("./game/loader.js").toString() + ")(document)";
loader = UglifyJS.minify(loader, {
    warnings: true,
}).code;

let indexContent = fs.readFileSync("./game/index.html").toString();
let css = indexContent.replace(/((.|\n|\r)*)<style>((.|\n|\r)*)\<\/style\>((.|\n|\r)*)/g,"$3");
indexContent = indexContent.replace(/\<style>((.|\n|\r)*)\<\/style\>/g, "!!!replace with processed css!!!");
indexContent = indexContent.replace(/\<\!-- START SCRIPTS --\>((.|\n|\r)*)\<\!-- END SCRIPTS --\>/g,"<script>" + loader + "</script>");

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
    
    postcss([autoprefixer, cssnano]).process(fs.readFileSync("./game/style.css").toString(), { from: undefined }).then(result => {
        fs.writeFileSync("./dist/style.css", result.css);
        const ms = Date.now() - start_time;
        console.log(chalk.green("Finished! ") + "Took " + ms + "ms")
    });
});
