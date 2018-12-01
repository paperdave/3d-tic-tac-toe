// This file is the entry point, use it to start up all services
const fs = require('fs');
const chalk = require('chalk');

// Write a default .ENV if one does not exist
if (!fs.existsSync(".env")) {
    let dotenvdata = `# Application Configuration File
`;

    fs.writeFileSync(".env", dotenvdata);
    console.log(chalk.yellow("A default .env file was created, use this to configure the application."))
}

// Load .ENV file
require('dotenv').config();
