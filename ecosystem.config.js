// Options reference: https://pm2.io/doc/en/runtime/reference/ecosystem-file/
module.exports = {
  apps : [{
    name: 'ttt',
    script: 'app.js',

    instances: 1,
    autorestart: true,
  }],

  deploy : {
    staging : {
      key: '/c/Users/Dave/.ssh/id_rsa',
      user : 'dave',
      host : '192.168.1.97',
      ref  : 'origin/master',
      repo : 'git@github.com:imdaveead/3d-tic-tac-toe.git',
      path : '/home/dave/programs/ttt',
      'post-deploy' : 'npm install && pm2 reload ecosystem.config.js --env production'
    }
  }
};
