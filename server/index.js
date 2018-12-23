// This file is the entry point, use it to start up all services
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const uuidv4 = require('uuid/v4');

// Write a default .ENV if one does not exist
if (!fs.existsSync(".env")) {
    let dotenvdata = "# Application Configuration File\n"
                    + "HTTP_PORT=80\n"
                    + "HTTPS_PORT=false\n"
                    + "HTTPS_KEY=keys/private.key\n"
                    + "HTTPS_CERT=keys/certificate.crt\n"

    fs.writeFileSync(".env", dotenvdata);
    console.log(chalk.yellow("A default .env file was created, use this to configure the application."))
}

// Load .ENV file
require('dotenv').config();

// Start the express server
const express = require('express');
const app = express();
const io = require('socket.io')();

app.use(express.static(path.join(__dirname, "../game")));

const sockets = {};
const rooms = {};

function makeid() {
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for (var i = 0; i < 5; i++)
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}

const ensureTypeData = {
    "not undefined": (x) => typeof x !== "undefined",
    "string": (x) => typeof x === "string",
    "number": (x) => typeof x === "number",
    "boolean": (x) => typeof x === "boolean",
    "object": (x) => typeof x === "object" && x !== null,
    "array": (x) => Array.isArray(x),
}

function is(input, type) {
    return ensureTypeData[type](input);
}

function ensure(bool, reason, socket) {
    if(!bool) {
        console.log("Kicked: " + chalk.red(reason || "<no reson set>"));
        socket.disconnect();
    }
    return !bool;
}

function SocketToPlayer(socket) {
    return {
        id: socket.id,
        name: socket.name
    }
}

function joinRoom(socket, room) {
    // hard coded "#full" room, you cannot join this, as it always
    // "is full"
    if(room === "full") {
        socket.emit("room too big");
        socket.disconnect();
        return;
    }

    //create a room if needed
    if(!(room in rooms)) {
        rooms[room] = {
            players: [],
            state: "lobby",
            id: room,
            leader: socket,
            isStarted: false,
        };
        socket.emit("youre leader");
    } else {
        socket.emit("youre not leader");
    }

    // if room is too big notify
    if (rooms[room].players.length >= 4) {
        socket.emit("room too big");
        socket.disconnect();
        return;
    }

    // if room is started, failll
    if (rooms[room].isStarted) {
        socket.emit("room started :(");
        socket.disconnect();
        return;
    }

    // notify
    rooms[room].players.forEach(sock => {
        sock.emit("player join", SocketToPlayer(socket));
    });

    // send player list
    socket.emit("join info", rooms[room].players.length, rooms[room].players.map(SocketToPlayer));

    // add
    rooms[room].players.push(socket);

}
function notifyRoomOfName(socket, room, name) {
    // notify
    rooms[room].players.forEach(sock => {
        if(sock === socket) { return; };
        sock.emit("player name set", socket.id, name);
    });
}
function leaveRoom(socket, room) {
    // ignore if room is gone
    if(!(room in rooms)) return;

    // remove
    rooms[room].players = rooms[room].players.filter(x => x.id !== socket.id);
    
    // notify
    rooms[room].players.forEach((sock, index) => {
        if (sock === socket) { return; };

        sock.emit("player leave", socket.id, index);
    });
    
    // if empty destroy room
    if(rooms[room].players.length === 0) {
        delete rooms[room];
    } else {
        // reassign leader
        if(socket.id === rooms[room].leader.id) {
            rooms[room].leader = rooms[room].players[0];
            rooms[room].leader.emit("youre leader");
        }

    }
}
function startRoom(socket, room) {
    // ignore if room is gone
    if (!(room in rooms)) return console.log("[start] no room exist");
    
    // ignore if room started
    if (rooms[room].isStarted) return console.log("[start] started");
    
    // ignore if not leader
    if (rooms[room].leader.id !== socket.id) return console.log("[start] no leader");

    // ignore if room is less than 2
    if (rooms[room].players.length < 2) return console.log("[start] room size");

    rooms[room].isStarted = true;
    rooms[room].players.forEach(sock => {
        sock.emit("game is about to start");
    });

    rooms[room].map = [...Array(3)].map(x => [...Array(3)].map(x => [...Array(3)].map(x => -1)));
    rooms[room].turn = 0;
    rooms[room].isEnded = false;
}
function paintCube(socket, room, position) {
    // ignore if room is gone
    if (!(room in rooms)) return console.log("[paintCube] no room exist");

    // ignore if room not started
    if (!rooms[room].isStarted) return console.log("[paintCube] not started");

    // ignore if not turn


    // ignore if taken


    // go!
    var index = 0;

    rooms[room].players.forEach((sock,i) => {
        if (sock === socket) {
            index = i;
            return;
        };
    });

    rooms[room].players.forEach(sock => {
        if (sock === socket) { return; };
        sock.emit("paint", position, index);
    });
}

io.on("connection", (socket) => {
    // make a game code for this game
    socket.id = uuidv4();
    socket.name = null;
    
    sockets[socket.id] = socket;

    var room = null;
    var T = (bool, reason) => ensure(bool, reason, socket);

    socket.emit("socket code", socket.id);

    socket.on("join room", (newroom) => {
        if(0
            || T(room === null, "[join room] Already in a room")
            || T(is(newroom, "string"), "[join room] Invalid Type")
            || T(newroom.length < 6, "[join room] Invalid Length")
            || T(/[^a-zA-Z0-9]/.exec(newroom) === null, "[join room] Invalid Chars")
        ) return socket.disconnect();

        room = newroom;

        joinRoom(socket, room);
    });
    socket.on("name entry", (newname) => {
        if(0
            || T(socket.name === null, "[name entry] Name Already Set")
            || T(is(newname, "string"), "[name entry] Invalid Type")
            || T(newname.length >= 2, "[name entry] Invalid Length")
            || T(newname.length <= 12, "[name entry] Invalid Length")
            || T(/[^a-zA-Z0-9  '"]/.exec(newname) === null, "[name entry] Invalid Characters")
        ) return;

        socket.name = newname;

        if(room) {
            notifyRoomOfName(socket, room, socket.name);
        }
    });
    socket.on("start game", () => {
        if(room) {
            startRoom(socket, room);
        }
    });
    socket.on("disconnect", () => {
        if(room) leaveRoom(socket, room);

        delete sockets[socket.id];
    });
    socket.on("paint", (pos) => {
        if (0
            || T(room !== null, "[paint] not in room")
            || T(is(pos, "array"), "[paint] position not array")
            || T(is(pos[0], "number"), "[paint] position not number")
            || T(is(pos[1], "number"), "[paint] position not number")
            || T(is(pos[2], "number"), "[paint] position not number")
            || T(pos[0] >= 0, "[paint] position not number")
            || T(pos[0] <= 2 , "[paint] position not number")
            || T(pos[1] >= 0, "[paint] position not number")
            || T(pos[1] <= 2 , "[paint] position not number")
            || T(pos[2] >= 0, "[paint] position not number")
            || T(pos[2] <= 2 , "[paint] position not number")
        ) return;
        
        paintCube(socket, room, pos);
    });
});

app.get("/empty-room", (req,res) => {
    let id;

    do {
        id = makeid();
    } while (id in rooms);

    res.send(id);
});

if (isNaN(parseInt(process.env.HTTP_PORT)) && isNaN(parseInt(process.env.HTTPS_PORT))) {
    console.log(chalk.red("No HTTP or HTTPS server configured! How else are you gonna play the game!?"));
    console.log(chalk.red("Please configure the .env file to start at least one server on a port."));
    return;
}
if (parseInt(process.env.HTTP_PORT) === parseInt(process.env.HTTPS_PORT)) {
    console.log(chalk.red("HTTP and HTTPS on the same port!? We can't do that!"));
    console.log(chalk.red("Please configure the .env file to start the two servers on different ports, or disable one."));
    return;
}

// HTTP
if (!isNaN(parseInt(process.env.HTTP_PORT))) {
    const server = require('http').Server(app);
    server.listen(parseInt(process.env.HTTP_PORT), function () {
        console.log('HTTP Enabled.  ' + chalk.blue(`http://localhost:${process.env.HTTP_PORT}/`));
    });
    io.attach(server);
}

// HTTPS
if (!isNaN(parseInt(process.env.HTTPS_PORT))) {
    var server = require('https').createServer({
        key: fs.readFileSync(process.env.HTTPS_KEY),
        cert: fs.readFileSync(process.env.HTTPS_CERT),
    }, app);
    server.listen(parseInt(process.env.HTTPS_PORT), function () {
        console.log('HTTPS Enabled. ' + chalk.blue(`https://localhost:${process.env.HTTPS_PORT}/`));
    });
    io.attach(server);
}
