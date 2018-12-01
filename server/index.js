// This file is the entry point, use it to start up all services
const fs = require('fs');
const chalk = require('chalk');

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

app.use(express.static('../game/'));

// HTTP
if (process.env.HTTP_PORT) {
    const server = require('http').Server(app);
    server.listen(parseInt(process.env.HTTP_PORT), function () {
        console.log('HTTP Listening on *:' + process.env.HTTP_PORT);
    });
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
}
