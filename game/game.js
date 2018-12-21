var name = "name not set name not set";
var socket = io();
var room = null;
var players = null;
var isLeader = false;
var id = null;
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

//#region Socket Handlers 
socket.on("socket code", (code) => {
    id = code;

    socket.emit("join room", room);

    if (name !== "name not set name not set") {
        socket.emit("name entry", name);
    }

    // if disconnected, go back to its state.
    if (DisconnectedPrevState) {

        setState(DisconnectedPrevState);
        DisconnectedPrevState = null;

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

    DisconnectedPrevState = state;
    setState("disconnected");
});
// this also disconnects us
socket.on("room too big", () => {
    setState("too-big");
})
// game is about to start
socket.on("game is about to start", () => {
    start3d();
});
//#endregion

//#region Before Game / Lobby UI
// handles updating all components in the lobby state.
function updateLobbyUI() {
    // ignore if not initialized.
    if (!players) return;

    // leader controls
    if (isLeader) {
        $("#start-game-section").show();
    } else {
        $("#start-game-section").hide();
    }

    // player information
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
        const elem = $(".player" + (index + 1) + "i");
        if (isInLobby) {
            elem.classList.remove("unjoined");
            elem.$(".player-label").innerHTML = playerName;
        } else {
            elem.classList.add("unjoined");
            elem.$(".player-label").innerHTML = "(Open)";
        }
    }
}

function makeid() {
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for (var i = 0; i < 5; i++)
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}

// handle the url stuff
if (!location.href.includes("#")) {
    room = makeid();
    history.replaceState({}, document.title, "/#" + room);
} else {
    room = location.href.split("#")[1];
    if (/[^a-zA-Z0-9]/.exec(room) !== null) {
        console.warn("Page loaded with an invalid room id, regenerating!");
        console.warn("The charset allowed in room ids is [a-zA-Z0-9]");

        room = makeid();
        history.replaceState({}, document.title, "/#" + room);
    }
}
$("#join-url").innerHTML = location.href;
$("#join-url-container").appendChild($("#join-url"));

// initial state
setState('name-screen');

// logic for name entry
function handleNameEnter() {
    var elem = $("#name-input");
    name = elem.value;

    $("#name-in-corner").innerHTML = name;

    setState("lobby");

    socket.emit("name entry", name);
}

// logic for the "room is full" state
$("#new-room").on("click", () => {
    // reload!
    fetch("/empty-room").then(x => x.text()).then(room => {
        location.href = "/#" + room;
        location.reload();
    });
});

// focus the name input
$("#name-input").focus();
// also focus the name input
$("#state-surface").on("click", function (ev) {
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

//#region 3d scene everything

function handleMouseInput(x, y, z) {
    console.log("clicky on: ", {x, y, z});
}

function setCubeColor(x, y, z, id) {
    cubes[x][y][z].paint(id);
}

function meshFromYLEVEL(y) {
    let sc = 1;
    return new THREE.BoxGeometry(sc, sc, sc);
}

function GameCube(x, z, y) {
    var group = new THREE.Group();
    var self = {};

    var color = { r: 1, g: 1, b: 1 };

    //Create main object
    var mesh_geo = meshFromYLEVEL(y);
    var mesh_mat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
    var mesh = new THREE.Mesh(mesh_geo, mesh_mat);
    mesh.scale.multiplyScalar(0.75);
    group.add(mesh);

    //Create outline object
    var outline_geo = meshFromYLEVEL(y);
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
        scale = lerp(scale, hover ? 1.15 : 1, 0.7);
        
        group.scale.setScalar(scale );
    }
    self.paintedColor = -1;
    self.paint = function(id) {
        var hoverFlag = hover;
        if (hoverFlag) {
            self.hoverOff();
        }

        if (id === 0) color = { r: 255 / 255, g: 66  / 255, b: 66  / 255 };
        if (id === 1) color = { r: 66  / 255, g: 255 / 255, b: 113 / 255 };
        if (id === 2) color = { r: 66  / 255, g: 69  / 255, b: 255 / 255 };
        if (id === 3) color = { r: 186 / 255, g: 66  / 255, b: 255 / 255 };

        mesh_mat.color = color;

        painted = true;
        self.paintedColor = id;
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

var started3D = false;
function start3d() {
    if (started3D) return;
    started3D = true;

    console.info("Starting 3D Thing");

    scene = new THREE.Scene();
    raycaster = new THREE.Raycaster()
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    mouse = new THREE.Vector2()
    renderer = new THREE.WebGLRenderer({ alpha: true });
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    var surf = renderer.domElement;
    $("#canvas-container").appendChild(surf);
    surf.id = "game-surface";
    
    function onTouchMove(event) {
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

        onTouchMove(event);

        if (selectedObject) {
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
    
    window.addEventListener('resize', onWindowResize, false);
    window.addEventListener('mousemove', onTouchMove);
    window.addEventListener('touchmove', onTouchMove);
    window.addEventListener('click', onClick)

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
        cubes.forEach(x=>x.forEach(x=>x.forEach(x=>x.update())));
        requestAnimationFrame(animate);
    
        controls.update();
    
        renderer.render(scene, camera);
        // composer.render();
    
    };
    
    animate();

    setState("game");

    surf.classList.add("invisible");
    setTimeout(() => {
        surf.classList.remove("invisible");
    }, 100);
}

//#endregion
