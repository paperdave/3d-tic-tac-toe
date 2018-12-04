// This file is the entry point, use it to start up all services
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const uuidv4 = require('uuid/v4');

function genGameCode() {
    return Math.random().toFixed(5).substring(2);
}

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

function TTCPreGame() {
    let uid, destroy, players, join, leave;

    players = [];
    uid = genGameCode();
    destroy = () => {
        //console.log(chalk.red("PreGame " + uid + " empty, destroying"));
        delete availableGames[uid];
    };
    join = (socket) => {
        players.forEach(player => {
            player.emit("new player", {uid: socket.id, name: player.name});
        });
        players.push(socket);
    };
    leave = (socket) => {
        players = players.filter(x => x.id != socket.id);
        if(players.length===0) destroy();
    };

    return {
        uid,
        destroy,
        leave,
        join,
        players
    };
}
function TTCGame(players, colors) {
    let board, placeItem, turn, uid;

    uid = uuidv4();
    turn = 0;
    board = [...Array(3)].map(x => [...Array(3)].map(x => [...Array(3)].map(x => 0)));
    
    place = (x,y,z,player) => {
        board[x][y][z] = player;
        turn++;
        if(turn >= players) turn = 0;
    };

    return {
        placeItem,
        
        board,
        turn,
        colors,
        players,
        uid,
    }
}

const availableGames = {};
const games = {};

function newTTCPreGame() {
    const game = TTCPreGame();
    availableGames[game.uid] = availableGames;
    console.log(chalk.green("PreGame " + game.uid + " created"));
    return game;
}
function newTTCGame() {
    const game = TTCPreGame();
    games[game.uid] = availableGames;
    return game;
}


io.on("connection", (socket) => {
    // make a game code for this game
    socket.id = uuidv4();
    socket.name = null;
    let state = "pregame/owner";
    let game = null;
    let pregame = newTTCPreGame();
    socket.emit("init game code", pregame.uid);
    socket.emit("socket code", socket.id);
    pregame.join(socket);

    socket.on("name is", (name) => {
        // todo: check validness
        if(socket.name === null) {
            name;
        }
    })
    socket.on("disconnect", () => {
        if (state == "pregame" || state == "pregame/owner") {
            pregame.leave(socket);
        }
    })
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
