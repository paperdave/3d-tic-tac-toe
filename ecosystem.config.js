// Options reference: https://pm2.io/doc/en/runtime/reference/ecosystem-file/
module.exports = {
  apps : [{
    name: 'tictactoe',
    script: 'server/index.js',

    instances: 1,
    autorestart: true,

    cwd: __dirname
  }],

  deploy : {
    staging : {
      key: '/c/Users/Dave/.ssh/id_rsa',
      user : 'dave',
      host : 'dev',
      ref  : 'origin/master',
      repo : 'git@github.com:imdaveead/3d-tic-tac-toe.git',
      path : '/home/dave/programs/ttt',
      'post-deploy': 'npm install -D && node ./build.js && pm2 reload ecosystem.config.js --env staging',
      env: {
        "NODE_ENV": "staging",
        "HTTP_PORT": "3000",
        "HTTPS_PORT": "false",
        "STATIC_FOLDER": "game",
      }
    }
  }
};
