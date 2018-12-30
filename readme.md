# 3D Tic Tac Toe
Three dimensional tic tac toe, with up to four players!

latest build is [here](https://ttt.davecode.me/) on my site

## how to setup stuff
1. install nodejs (and npm)
1. clone repo
1. run `npm install`
1. run `node .`
1. fill out details in `.env` to configure ports and HTTPS

## how to build the production front end
1. do "how to setup stuff"
1. run `node build` inside of the root directory
1. creates a dist folder
1. tweak env to point to `dist` not `game`

## pm2
theres a `ecosystem.config.js`, which has information to deploy to my local testing server. you can tweak it to use to deploy to production or your own local development server.

## goals
- mobile first
- handle edge cases (wierd reconnection scenerios) (probably failed here)
    - the lobby/join system is fancy i guess due to this
- learn 3d
- keep simple

## outcome
i really love the result of this project. near the end I realized something: three.js is very large. 500kb+ minified. that one thing made the entire program take more time to load. other than that i really like how i was able to make a secure* socket server to make it so anyone can simply load up their browser and play a game, and nothing else needed. no account, sign up, just send a url and you are connected.

it would be really cool if there was the ability to spectate games, or play with more than four people. or even 4x4 grids.
