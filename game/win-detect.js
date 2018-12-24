// Win Detection

// most of this is commented out due to how node scopes things,
// and how the browser scopes things, function <name>() goes to
// global scope.

// (function(){
    function doTheWinDetect(map) {
        // for each layer check a win
        for (let x = 0; x < 3; x++) {
            const slice = map[x];

            // x+z col
            for (let y = 0; y < 3; y++) {
                const col = slice[y];
                if (col[0] === col[1] && col[1] === col[2] && col[0] !== -1) {
                    return col[0];
                }
            }
            // x+z col
            for (let z = 0; z < 3; z++) {
                if (slice[0][z] === slice[1][z] && slice[1][z] === slice[2][z] && slice[0][z] !== -1) {
                    return slice[0][z];
                }
            }
            // diags
            if (slice[0][0] === slice[1][1] && slice[1][1] === slice[2][2] && slice[1][1] !== -1) {
                return slice[1][1];
            }
            else if (slice[2][0] === slice[1][1] && slice[1][1] === slice[0][2] && slice[1][1] !== -1) {
                return slice[1][1];
            }
        }

        // for each Y value check a win
        for (let y = 0; y < 3; y++) {
            // check all values in a y+x col ... done above

            // check all values in a y+z col
            for (let z = 0; z < 3; z++) {
                if (map[0][y][z] === map[1][y][z] && map[0][y][z] === map[2][y][z] && map[0][y][z] !== -1) {
                    return map[0][y][z];
                }
            }

            // diagonal edge cases
            if (map[0][y][0] === map[1][y][1] && map[1][y][1] === map[2][y][2] && map[1][y][1] !== -1) {
                return map[1][y][1];
            }
            else if (map[2][y][0] === map[1][y][1] && map[1][y][1] === map[0][y][2] && map[1][y][1] !== -1) {
                return map[1][y][1];
            }
        }

        // for each Z value check a win
        for (let z = 0; z < 3; z++) {
            // check all values in a z+x col ...done above

            // check all values in a y+z col ...done above

            // diagonal edge cases
            if (map[0][0][z] === map[1][1][z] && map[1][1][z] === map[2][2][z] && map[1][1][z] !== -1) {
                return map[1][1][z];
            }
            else if (map[2][0][z] === map[1][1][z] && map[1][1][z] === map[0][2][z] && map[1][1][z] !== -1) {
                return map[1][1][z];
            }
        }

        // big diagonal edge case
        if (map[0][0][0] === map[1][1][1] && map[1][1][1] === map[2][2][2] && map[1][1][1] !== -1) {
            return map[1][1][1];
        }
        if (map[2][0][0] === map[1][1][1] && map[1][1][1] === map[0][2][2] && map[1][1][1] !== -1) {
            return map[1][1][1];
        }
        if (map[2][0][2] === map[1][1][1] && map[1][1][1] === map[0][2][0] && map[1][1][1] !== -1) {
            return map[1][1][1];
        }
        if (map[0][0][2] === map[1][1][1] && map[1][1][1] === map[2][2][0] && map[1][1][1] !== -1) {
            return map[1][1][1];
        }

        return null;
    }
    if (typeof module !== "undefined") {
        module.exports = doTheWinDetect;
    }
//     if (typeof window !== "undefined") {
//         window.doTheWinDetect = doTheWinDetect;
//     }
// })();
