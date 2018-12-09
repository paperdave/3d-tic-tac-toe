// This file is the entry point, use it to start up all services
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const uuidv4 = require('uuid/v4');

// Write a default .ENV if one does not exist
if (!fs.existsSync(".env")) {
    let dotenvdata = "# Application Configuration File\n"
                    + "HTTP_PORT=80"
                    + "HTTPS_PORT=443"
                    + "HTTPS_KEY=keys/private.key"
                    + "HTTPS_CERT=keys/certificate.crt"

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
        console.log("Kicked: " + (reason || "<no reson set>"));
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
    //create a room if needed
    if(!(room in rooms)) {
        rooms[room] = {
            players: [],
            state: "lobby",
            id: room,
            leader: socket
        };
        socket.emit("youre leader");
    }
    // if room is too big notify
    if (rooms[room].players >= 4) {
        socket.emit("room too big");
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
    // notify
    rooms[room].players.forEach(sock => {
        if (sock === socket) { return; };

        sock.emit("player leave", socket.id);
    });

    // remove
    rooms[room].players = rooms[room].players.filter(x => x.id !== socket.id);
    
    console.log("room " + room + " contains " + rooms[room].players.length + " players");

    // if empty destroy room
    if(rooms[room].players.length === 0) {
        delete rooms[room];
        console.log("cleaning up room " + room);
    } else {
        // reassign leader
        if(socket.id === rooms[room].leader.id) {
            rooms[room].leader = rooms[room].players[0];
            rooms[room].leader.emit("youre leader");
        }

    }
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

        console.log("joining room " + newroom);
        room = newroom;

        joinRoom(socket, room);
    });
    socket.on("name entry", (newname) => {
        if(0
            || T(socket.name === null, "[name entry] Name Already Set")
            || T(is(newname, "string"), "[name entry] Invalid Type")
            || T(newname.length < 16, "[name entry] Invalid Length")
            || T(/[^a-zA-Z0-9 ]/.exec(newname) === null, "[name entry] Invalid Characters")
        ) return;

        console.log("setting name " + newname);
        socket.name = newname;

        if(room) {
            notifyRoomOfName(socket, room, socket.name);
        }
    });
    socket.on("disconnect", () => {
        if(room) leaveRoom(socket, room);

        delete sockets[socket.id];
    });
});

// HTTP
if (process.env.HTTP_PORT) {
    const server = require('http').Server(app);
    server.listen(parseInt(process.env.HTTP_PORT), function () {
        console.log('HTTP Listening on *:' + process.env.HTTP_PORT);
    });
    io.attach(server);
}

// HTTPS
if (process.env.HTTPS_PORT) {
    var server = require('https').createServer({
        key: fs.readFileSync(process.env.HTTPS_KEY),
        cert: fs.readFileSync(process.env.HTTPS_CERT),
    }, app);
    server.listen(parseInt(process.env.HTTPS_PORT), function () {
        console.log('HTTPS Listening on *:' + process.env.HTTPS_PORT);
    });
    io.attach(server);
}
