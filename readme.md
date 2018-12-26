# 3D Tic Tac Toe
Three dimensional tic tac toe, with up to four players!

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

## goals
- mobile first
- handle edge cases (wierd reconnection scenerios) (probably failed here)
    - the lobby/join system is fancy i guess due to this
- learn 3d
- keep simple

## outcome