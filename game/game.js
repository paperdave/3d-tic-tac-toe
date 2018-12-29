var name = "";
var room = null;
var players = null;
var isLeader = false;
var id = null;
var secret = null;
var our_index = 0;
var DisconnectedPrevState = null;
var map = [...Array(3)].map(x => [...Array(3)].map(x => [...Array(3)].map(x => -1)));
var cubes = [...Array(3)].map(x => [...Array(3)].map(x => [...Array(3)].map(x => -1)));
var scene;
var raycaster;
var camera;
var mouse;
var selectedObject;
var renderer;
var turn = 0;
var allow3DClicks = false;
var hasEnteredName = false;
var started3D = false;
var gameWinner = -1;
var drag = 900;
var isDragging = false;
var showHelper = true;
var recovering = false;
var socket = io();

// var _realsocketemit = socket.emit;
// socket.emit = function(ev, ...args) {
//     if (arguments[0] !== "ping" && arguments[0] !== "pong") {
//         if (Array.isArray(args)) {
//             console.log("EMIT: `" + ev + "`",  ...args);
//         } else {
//             console.log("EMIT: `" + ev + "`");
//         }
//     }
    
//     _realsocketemit.bind(this, ...arguments)();
// }
// var _realsocketon = socket.on;
// socket.on = function(event, callback) {
//     _realsocketon.bind(this)(event,function(){
//         console.log("MESSAGE: `" + event + "`", ...arguments)
//         callback(...arguments);

//     });
// }

//#region Socket Handlers 
socket.on("socket code", (code, secretCode) => {
    id = code;
    secret = secretCode;

    if (room === "help+info") return;

    if (recovering || started3D) {

        setState("recover");

        let recovery = JSON.parse(sessionStorage["recovery"]);
        
        setTimeout(() => {
            socket.emit("recover me", recovery);
        }, 250);
        
    } else {
        
        socket.emit("join room", room);
    
        if (hasEnteredName) {
            socket.emit("name entry", name);
        }
    
        // if disconnected, go back to its state.
        if (DisconnectedPrevState) {
    
            setState(DisconnectedPrevState);
            DisconnectedPrevState = null;
    
        }
    }

});
// current room information, and our index.
socket.on("join info", (index, list) => {
    our_index = index;
    players = list;
    updateLobbyUI();
});
// when someone new joins, their name is always placed at the end of the list
socket.on("player join", (newPlayer) => {
    players.push(newPlayer);
    updateLobbyUI();
});
// when someone sets their name
socket.on("player name set", (playerId, playerName) => {

    players.some((x) => {
        if (x.id === playerId) {
            x.name = playerName;

            return true;
        }
    });

    updateLobbyUI();
});
// when someone leaves, also gives updated index
socket.on("player leave", (playerID, yourNewIndex) => {
    players = players.filter(x => x.id !== playerID);
    our_index = yourNewIndex;

    updateLobbyUI();
});
// when you recieve leader, also given at room join
socket.on("youre leader", () => {
    isLeader = true;
    updateLobbyUI();
});
// when you are no longer leader; this is probably unused, but maybe
socket.on("youre not leader", () => {
    isLeader = false;
    updateLobbyUI();
});
// disconnnected
socket.on("disconnect", () => {
    // to big will disconnect us, so ignore
    if (state == "too-big") return;
    if (state == "game-started-without-us") return;
    if (state == "help") return;
    if (gameWinner !== -1) return;
    
    DisconnectedPrevState = state;
    setState("disconnected");
});
// this also disconnects us
socket.on("room too big", () => {
    setState("too-big");
})
// this also disconnects us
socket.on("room started :(", () => {
    setState("game-started-without-us");
})
// game is about to start
socket.on("game is about to start", () => {
    start3d();
});
socket.on("paint", (pos, who) => {
    var x = pos[0];
    var y = pos[1];
    var z = pos[2];

    turn = (who + 1) % (players.length + 1);

    setCubeColor(x, z, y, who);
    
    updateGameHudUI();
});
socket.on("back to lobby, guys and gals", () => {
    setState("lobby");
    stop3d();
});
socket.on("recover success", (game) => {
    console.log("RECOVER SUCCESS");
    
    players = game.players;
    turn = game.turn;
    our_index = game.index;
    id = game.id;
    secret = game.secret;

    name = JSON.parse(sessionStorage.recovery).name;

    start3d();

    for (let x = 0; x < 3; x++) {
        for (let y = 0; y < 3; y++) {
            for (let z = 0; z < 3; z++) {
                setCubeColor(x, z, y, game.map[x][y][z], "force")
            }
        }
    }
});
socket.on("recover failed", () => {
    console.log("RECOVER FAILED");
    recovering = false;

    sessionStorage.clear();

    setState("name-screen");

    socket.emit("join room", room);

    // if disconnected, go back to its state.
    if (DisconnectedPrevState) {
        setState(DisconnectedPrevState);
        DisconnectedPrevState = null;
    }
});

//#endregion

//#region Before Game / Lobby UI
// this handles updating all components in the lobby state.
function updateLobbyUI() {
    // ignore if not initialized.
    if (!players) return;

    // leader controls
    if (isLeader) {
        $("#start-game-section").show();
        $(".restarts").show();
    } else {
        $("#start-game-section").hide();
        $(".restarts").hide();
    }

    // woah! this says if we are allowed to start the game ✨
    var canStartGame = true;

    // player information
    for (let index = 0; index < 4; index++) {
        let isInLobby = false;
        let playerName = null;

        // get info
        if (index == our_index) {
            // player is us
            isInLobby = true;
            playerName = "You";
        } else {
            // player is them
            const player = players[index > our_index ? index - 1 : index];

            isInLobby = !!player;
            if (isInLobby) {
                playerName = player.name || "(Player)";
                playerColor = "green";

                if(!player.name) {
                    // requirement: we need all players with a set name.
                    canStartGame = false;
                }
            }
        }

        // render
        const elem = $(".player" + (index + 1) + "i");
        if (isInLobby) {
            elem.classList.remove("unjoined");
            elem.$(".player-label").innerHTML = playerName;
        } else {
            elem.classList.add("unjoined");
            elem.$(".player-label").innerHTML = "(Open)";
        }
    }

    if (players.length >= 1 && canStartGame) {
        $("#start-game-button").removeAttribute("disabled");
    } else {
        $("#start-game-button").setAttribute("disabled", "yes");
    }
}

// creates a url tag, the part after the #
function makeid() {
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for (var i = 0; i < 5; i++)
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}


// handle the url stuff
if (!location.href.includes("#")) {
    // you didnt have a room name
    room = makeid();
    history.replaceState({}, document.title, "/#" + room);
} else {
    room = location.href.split("#")[1];
    if(room !== "help+info") {
        if (/[^a-zA-Z0-9]/.exec(room) !== null || room.length > 8) {
            // you failed the format, as its only numbers and letters and under 96 chars
            console.warn("Page loaded with an invalid room id, regenerating!");
            console.warn("The charset allowed in room ids is [a-zA-Z0-9]");
    
            room = makeid();
            history.replaceState({}, document.title, "/#" + room);
        }
    }
}

if (sessionStorage["recovery"]) {
    // validate the recovery status
    let recovery = JSON.parse(sessionStorage["recovery"]);
    
    if (room === recovery.room) {
        recovering = true;
    }
}

$("#join-url-container").appendChild($("#join-url"));
var joinurl = $("#join-url");
var copytextshown = false;
joinurl.innerHTML = location.href;
joinurl.on("click", function handler() {
    if(copytextshown) return;
    copytextshown = true;
    joinurl.style.width = joinurl.clientWidth + "px";

    copyTextToClipboard(location.href);
    
    joinurl.innerHTML = "Copied!";
    
    setTimeout(() => {
        joinurl.style.color = "transparent";
        setTimeout(() => {
            joinurl.style.color = "";
            joinurl.innerHTML = location.href;
            copytextshown = false; 
            setTimeout(() => {
                copytextshown = false; 
            }, 200);
        }, 175);
    }, 1500);
});

// initial state
if (room === "help+info") {
    setState('help');
    socket.disconnect();
} else {
    console.log("a")
    $(".if-previous-room").show();

    if (recovering) {
        setState('recover');
    } else {
        setState('name-screen');   
    }
}

function namevalid() {
    let error = $(".name-entry-error");
    if (name.length > 12) {
        error.innerHTML = "Names must be at most 12 characters.";
    }
    else if (/[^a-zA-Z0-9 '"]/.exec(name) !== null) {
        error.innerHTML = "You cannot have special characters in your name.";
    }
    else {
        error.innerHTML = "&nbsp;";
        return true;
    }
    return false;
}
// logic for name entry
$("#name-input").on("input", () => {
    if (hasEnteredName) return;

    var elem = $("#name-input");
    name = elem.value.trim().replace(/  +/g, " ");
    namevalid();
});

window.handleNameEnter = function() {
    if (hasEnteredName) return;

    var elem = $("#name-input");
    name = elem.value.trim().replace(/  +/g, " ");
    
    if (name.length < 2) {
        $(".name-entry-error").innerHTML = "Names must be at least 2 characters.";
        return;
    }
    if(!namevalid()) return;

    $("#name-in-corner").innerHTML = name;

    setState("lobby");

    socket.emit("name entry", name);
    hasEnteredName = true;

    elem.blur();
}

// logic for the "room is full" state
$$(".new-room").forEach(x => x.on("click", () => {
    // reload!
    fetch("/empty-room").then(x => x.text()).then(room => {
        location.href = "/#" + room;
        location.reload();
    });
}));

// focus the name input
$("#name-input").focus();
// also focus the name input
$("#state-surface").on("mouseup", function (ev) {
    if (state === "name-screen" && ev.target.id === "state-surface") {
        $("#name-input").focus();
    }
});

// starting the game
$("#start-game-button").on("click", () => {
    if (state === "lobby" && isLeader) {
        socket.emit("start game");
        start3d();
    }
});

//#endregion

//#region Game State

function updateGameHudUI() {
    
    for (let index = 0; index < 4; index++) {
        let isInLobby = false;
        let playerName = null;

        // get info
        if (index == our_index) {
            // us
            isInLobby = true;
            playerName = "You";
        } else {
            // them
            const player = players[index > our_index ? index - 1 : index];

            isInLobby = !!player;
            if (isInLobby) {
                playerName = player.name || "(Player)";
                playerColor = "green";
            }
        }

        // render
        const elem = $(".bh" + (index + 1) + "i");
        if (isInLobby) {
            
            elem.classList.remove("disabled");
            elem.$(".bh-name").innerHTML = playerName;
            elem.classList[turn === index ? "add" : "remove"]("active");

        } else {
            elem.classList.add("disabled");
        }

        if (turn === index) {
            $(".current-player-turn-name").innerHTML = (index === our_index) ? "Your" : (playerName + "'s");
        }
        if (gameWinner === index) {
            $(".top-status-winner").innerHTML = (index === our_index) ? "You Won" : (playerName + "'s Wins");
        }
    }
    if(gameWinner !== -1) {
        $(".top-status-turn").hide();
        $(".top-status-winner").show();
    } else {
        $(".top-status-turn").show();
        $(".top-status-winner").hide();

    }
}

function handleMouseInput(x, y, z) {
    x = x + 1, z = z + 1, y = y + 1;

    setCubeColor(x, z, y, our_index);
    turn = (turn + 1) % (players.length + 1);
    
    socket.emit("paint", [x, y, z]);

    updateGameHudUI();
}

function handleWinning() {
    let winner = doTheWinDetect(map);
    if(winner !== null) {
        turn = -10
        gameWinner = winner;
        updateGameHudUI();
        sessionStorage.removeItem("recovery")

        setTimeout(() => {
            $(".end-game-controls").classList.add("show");
        }, 999);
    }
}

function setCubeColor(x, y, z, id, force = false) {
    cubes[x][y][z].paint(id, force);
    map[x][y][z] = id;
    
    saveSession();

    handleWinning();
}

function MESH() {
    let sc = 1;
    return new THREE.BoxGeometry(sc, sc, sc);
}

function GameCube(x, z, y) {
    var group = new THREE.Group();
    var self = {};

    var color = { r: 1, g: 1, b: 1 };

    //Create main object
    var mesh_geo = MESH(y);
    var mesh_mat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
    var mesh = new THREE.Mesh(mesh_geo, mesh_mat);
    mesh.scale.multiplyScalar(0.75);
    group.add(mesh);

    //Create outline object
    var outline_geo = MESH(y);
    var outline_mat = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.BackSide });
    var outline = new THREE.Mesh(outline_geo, outline_mat);
    outline.scale.multiplyScalar(1.125 * 0.75);
    group.add(outline);

    mesh.isCube = true;
    mesh.outlineMesh = true;
    mesh.cubeEntity = self;

    if(y == 0) {
        outline.position.y += 0.0055;
    }

    group.position.x = x;
    group.position.y = y;
    group.position.z = z;

    var hover = false;
    var scale = 1;

    var painted = false;

    self.model = group;
    self.update = function() {
        scale = lerp(scale, hover ? 1.15 : 1, painted ? 0.1 : 0.7);
        
        group.scale.setScalar(scale );
    }
    self.paintedColor = -1;
    self.paint = function(id, force) {
        var hoverFlag = hover;
        if (hoverFlag) {
            self.hoverOff();
        }

        if (id === -1) color = { r: 1, g: 1, b:1 };
        if (id === 0) color = { r: 255 / 255, g: 66  / 255, b: 66  / 255 };
        if (id === 1) color = { r: 66  / 255, g: 255 / 255, b: 113 / 255 };
        if (id === 2) color = { r: 66  / 255, g: 69  / 255, b: 255 / 255 };
        if (id === 3) color = { r: 186 / 255, g: 66  / 255, b: 255 / 255 };

        mesh_mat.color = color;

        painted = id !== -1;
        self.paintedColor = id;

        scale = 1.25;
    }
    self.hoverOn = function () {
        if (painted) {
            return;
        }

        hover = true;

        outline_mat.color.r = 0.3;
        outline_mat.color.g = 0.3;
        outline_mat.color.b = 0.3;

        mesh_mat.color = {
            r: color.r * 0.9,
            g: color.g * 0.9,
            b: color.b * 0.9,
        }
    };
    self.hoverOff = function () {
        hover = false;

        outline_mat.color.r = 0;
        outline_mat.color.g = 0;
        outline_mat.color.b = 0;

        mesh_mat.color = color;        
    }
    self.onClick = function() {
        handleMouseInput(x/2,y/2,z/2);
    }
    return self;
}

function stop3d() {
    if (!started3D) return;

    // disable the bool, this also stops the render loop
    started3D = false;

    // free/reset a ton of stuff
    scene = null;
    raycaster = null;
    camera = null;
    mouse = null;
    renderer = null;
    turn = 0;
    allow3DClicks = false;
    gameWinner = -1;
    map = [...Array(3)].map(x => [...Array(3)].map(x => [...Array(3)].map(x => -1)));
    cubes = [...Array(3)].map(x => [...Array(3)].map(x => [...Array(3)].map(x => -1)));

    // remove the canvas
    $("#game-surface").remove();

    // unbind events
    window.off('resize', onWindowResize);
    window.off('mousemove', onTouchMove);
    window.off('mousedown', mouseDown);
    window.off('touchstart', onTouchStart);
    window.off('click', onClick);

    // hide end controls
    $(".end-game-controls").classList.remove("show");

    // remove winner
    $(".top-status-winner").innerHTML = "";
    
    // hide status
    $(".top-status-turn").hide();
    $(".top-status-winner").hide();
}
function onTouchMove(event) {
    if (event.target.id === "mobile-swipe-to-refresh") return true;
    
    if(isDragging) drag++;
    else drag = 0;

    if(drag > 5) {
        if (allow3DClicks && isDragging && showHelper) {
            showHelper = false;
            $("#helper").style.opacity = "0";
        }
    }

    var x, y;
    if (event.changedTouches) {
        x = event.changedTouches[0].pageX;
        y = event.changedTouches[0].pageY;
    } else {
        x = event.clientX;
        y = event.clientY;
    }
    mouse.x = (x / window.innerWidth) * 2 - 1;
    mouse.y = - (y / window.innerHeight) * 2 + 1;
    checkIntersection();
}
function onClick(event) {
    if (!allow3DClicks) return;
    if (event.target.id === "mobile-swipe-to-refresh") return true;

    onTouchMove(event);

    if (drag > 5) return;
    isDragging = false;

    if (selectedObject && our_index === turn && selectedObject.cubeEntity.paintedColor === -1) {
        selectedObject.cubeEntity.onClick();
    };
}
function onWindowResize() {
    var width = window.innerWidth;
    var height = window.innerHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
}
function checkIntersection() {

    if (our_index !== turn) {
        if (selectedObject) selectedObject.cubeEntity.hoverOff();
        selectedObject = null;
        return;
    }

    raycaster.setFromCamera(mouse, camera);
    var intersects = raycaster.intersectObjects([scene], true);
    if (intersects.length > 0) {

        if (intersects[0].object.isCube) {
            if (selectedObject !== intersects[0].object) {
                if (selectedObject) selectedObject.cubeEntity.hoverOff();
                intersects[0].object.cubeEntity.hoverOn();
            }
            selectedObject = intersects[0].object;
        }

    } else {
        if (selectedObject) selectedObject.cubeEntity.hoverOff();
        selectedObject = null;
    }
}
function mouseDown(event) {
    if (event.target.id === "mobile-swipe-to-refresh") return true;
    isDragging = true;
    drag = 0;
}
function onTouchStart(event) {
    if (event.target.id === "mobile-swipe-to-refresh") return true;
    isDragging = true;
    drag = 0;
}
// used for restoring from a reload/crash/whatever
function saveSession() {
    sessionStorage["recovery"] = JSON.stringify({
        id,
        name,
        map,
        room,
        index: our_index,
        players,
        secret
    });
}
function start3d() {
    if (started3D) return;
    drag = 999;

    started3D = true;

    updateGameHudUI();

    scene = new THREE.Scene();
    raycaster = new THREE.Raycaster()
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    mouse = new THREE.Vector2()
    renderer = new THREE.WebGLRenderer({ alpha: true });
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    var surf = renderer.domElement;
    $("#canvas-container").appendChild(surf);
    surf.id = "game-surface";
    
    window.on('resize', onWindowResize, false);
    window.on('mousemove', onTouchMove);
    window.on('mousedown', mouseDown);
    surf.on('touchmove', onTouchMove, { passive: false });
    window.on('touchstart', onTouchStart);
    window.on('click', onClick);

    function addCube(x,y,z) {
        const cube = GameCube((x - 1) * 2, (y - 1) * 2, (z - 1)*2);
        cubes[x][y][z] = cube;
        scene.add(cube.model);
    }
    
    for (const x of [...Array(3)].map((x, i) => i)) {
        for (const y of [...Array(3)].map((x, i) => i)) {
            for (const z of [...Array(3)].map((x, i) => i)) {
                addCube(x, y, z);
            }
        }
    }

    camera.position.z = 10;
    
    var controls = new THREE.OrbitControls(camera);
    controls.noZoom = true;
    controls.noPan = true
    controls.damping = 0.095;
    
    var animate = function () {
        if(!started3D) return;

        cubes.forEach(x=>x.forEach(x=>x.forEach(x=>x.update())));
        requestAnimationFrame(animate);
    
        controls.update();
    
        renderer.render(scene, camera);
    };
    
    animate();

    setState("game");

    showHelper = true;

    surf.classList.add("invisible");
    setTimeout(() => {
        surf.classList.remove("invisible");
    }, 100);
    setTimeout(() => {
        allow3DClicks = true;
    }, 800);
    setTimeout(() => {
        if(showHelper) {
            $("#helper").style.opacity = "1";
        }
    }, 3000);

    saveSession();
}

$(".restarts").on("click", () => {
    socket.emit("restart");
});

$(".previous-room").on("click", () => {
    location.href = "/#" + room;
});

//#endregion

//#region states

window.on("popstate", () => {
    var room = location.href.split("#")[1];
    if(room === "help+info") {
        setState("help");
        socket.disconnect();
    } else {
        location.reload();
    }
});

//#endregion

