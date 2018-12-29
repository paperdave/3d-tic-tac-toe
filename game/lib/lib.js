// basically jquery
var $ = document.querySelector.bind(document);
var $$ = (q) => Array.from(document.querySelectorAll(q));
var $class = (q) => Array.from(document.getElementsByClassName(q));
// var $tagName = (q) => Array.from(document.getElementsByTagName(q));
var $id = document.getElementById.bind(document);
EventTarget.prototype.on = EventTarget.prototype.addEventListener;
EventTarget.prototype.off = EventTarget.prototype.removeEventListener;
// EventTarget.prototype.emit = EventTarget.prototype.dispatchEvent;
HTMLElement.prototype.hide = function(){this.classList.add("HIDDENJS");}
HTMLElement.prototype.show = function(){this.classList.remove("HIDDENJS");}
HTMLElement.prototype.$ = HTMLElement.prototype.querySelector;
HTMLElement.prototype.$$ = function(q) { return Array.from(HTMLElement.prototype.querySelector.bind(this)(q)); };
// end basically jquery

// form safe
$$("form[submit]").forEach(item => {
    var func = item.getAttribute("submit");
    item.onsubmit = function() {
        try {
            window[func]();
        } catch (error) {
            console.error(error);
        }
        return false;
    };
});
// end form safe

// state magic
var state = "loading";
function setState(newstate) {
    $class("hide:" + state).forEach(x => x.show());
    $class("show:" + state).forEach(x => x.hide());
    state = newstate;
    $class("hide:" + state).forEach(x => x.hide());
    $class("show:" + state).forEach(x => x.show());
}
// end state magic

// math
function lerp(a,b,t) {
    return a + (b - a) * t;
}
// end math