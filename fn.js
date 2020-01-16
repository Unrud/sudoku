if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js");
};

const CONFIG_URL = "config.json";
const restoreHistory = location.search.search(/(^\?|&)restoreHistory(&|$)/) !== -1;

// global configuration
var config;

// HTML elements
var loading;
var menu;
var play;
var error;
var errorMessage;
var cells;
var keyboard;
var win;
var copyright;
var modes;

// active game state
var state;
var activeCell;
var notes;
var validCells = Array.apply(null, Array(9 * 9));
var finished;

function fullscreenEnabled() {
    return (document.fullscreenEnabled ||
        document.webkitFullscreenEnabled ||
        document.mozFullScreenEnabled ||
        document.msFullscreenEnabled ||
        false);
}

function requestFullscreen(e) {
    if (e.requestFullscreen) {
        e.requestFullscreen();
    } else if (e.webkitRequestFullscreen) {
        e.webkitRequestFullscreen();
    } else if (e.mozRequestFullScreen) {
        e.mozRequestFullScreen();
    } else if (e.msRequestFullscreen) {
        e.msRequestFullscreen();
    }
}

function exitFullscreen() {
    if (document.exitFullscreen) {
        document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
    } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
    } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
    }
}

function fullscreenElement() {
    return (document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement ||
        null);
}

function addFullscreenchangeEventListener(listener) {
    if (document.fullscreenElement !== undefined) {
        document.addEventListener("fullscreenchange", listener);
    } else if (document.webkitFullscreenElement !== undefined) {
        document.addEventListener("webkitfullscreenchange", listener);
    } else if (document.mozFullScreenElement !== undefined) {
        document.addEventListener("mozfullscreenchange", listener);
    } else if (document.msFullscreenElement !== undefined) {
        document.addEventListener("MSFullscreenChange", listener);
    }
}

function setBackupState(state) {
    if (restoreHistory) {
        localStorage.setItem("state", JSON.stringify(state));
    }
}

function removeBackupState() {
    if (restoreHistory) {
        localStorage.removeItem("state");
    }
}

function showScene(scene) {
    [loading, menu, play, error].forEach(function (e) {
        if (e === scene) {
            e.classList.remove("hidden");
        } else {
            e.classList.add("hidden");
        }
    });
}

function populateMenu() {
    while (modes.firstChild) {
        modes.removeChild(modes.firstChild);
    }
    config["modes"].forEach(function(m) {
        var link = document.createElement("a");
        link.textContent = m["title"];
        link.onclick = function() {
            var newState = randomState(m);
            history.pushState(newState, "");
            setBackupState(newState);
            startGame(newState);
        };
        modes.appendChild(link);
    });
    copyright.innerHTML = config["copyright"];
}

function makeState(puzzle) {
    var newState = [];
    for (var i = 0; i < puzzle.length; i++) {
        var value = parseInt(puzzle[i]);
        newState.push({
            value: value,
            notes: [],
            fixed: value !== 0
        });
    }
    return newState;
}

function randomState(mode) {
    var puzzle = mode.puzzles[Math.floor(Math.random() * mode.puzzles.length)];
    return makeState(puzzle);
}

function updateValidCells() {
    var rowSets = Array.apply(null, Array(9));
    var colSets = Array.apply(null, Array(9));
    var boxSets = Array.apply(null, Array(9));
    for (var i = 0; i < 9; i++) {
        rowSets[i] = Array.apply(null, Array(10)).map(function() {return [];});
        colSets[i] = Array.apply(null, Array(10)).map(function() {return [];});
        boxSets[i] = Array.apply(null, Array(10)).map(function() {return [];});
        for (var j = 0; j < 9; j++) {
            var rowValue = state[i * 9 + j].value;
            var colValue = state[i + j * 9].value;
            var boxCol = 3 * (i % 3);
            var boxRow = 3 * Math.floor(i / 3);
            var boxCellCol = boxCol + (j % 3);
            var boxCellRow = boxRow + Math.floor(j / 3);
            var boxValue = state[boxCellCol + boxCellRow * 9].value;
            rowSets[i][rowValue].push(j);
            colSets[i][colValue].push(j);
            boxSets[i][boxValue].push(j);
        }
    }
    for (var row = 0; row < 9; row++) {
        for (var col = 0; col < 9; col++) {
            var cellIndex = row * 9 + col;
            var value = state[cellIndex].value;
            var boxIndex = 3 * Math.floor(row / 3) + Math.floor(col / 3);
            validCells[cellIndex] = (
                value !== 0 &&
                rowSets[row][value].length === 1 &&
                colSets[col][value].length === 1 &&
                boxSets[boxIndex][value].length === 1);
        }
    }
    finished = true;
    for (var i = 0; i < validCells.length; i++) {
        if (!validCells[i]) {
            finished = false;
            break;
        }
    }
}

function populatePlay() {
    for (var i = 0; i < 9 * 9; i++) {
        var cellState = state[i];
        var cell = cells[i];
        if (cellState.fixed) {
            cell.classList.add("fixed");
        } else {
            cell.classList.remove("fixed");
        }
        cell.classList.remove("notes");
        cell.classList.remove("invalid");
        if (cellState.value !== 0) {
            if (!cellState.fixed && !validCells[i]) {
                cell.classList.add("invalid");
            }
            cell.textContent = cellState.value;
        } else if (cellState.notes.length !== 0) {
            cell.textContent = cellState.notes.join("");
            cell.classList.add("notes");
        } else {
            cell.textContent = "";
        }
        if (i === activeCell) {
            cell.classList.add("active");
        } else {
            cell.classList.remove("active");
        }
        
    }
    for (var i = 1; i <= 9; i++) {
        keyboard[i].forEach(function(e) {
            if (activeCell === -1) {
                e.classList.remove("active");
                e.classList.add("disabled");
            } else if (i === state[activeCell].value ||
                       notes && state[activeCell].notes.indexOf(i) !== -1) {
                e.classList.remove("disabled");
                e.classList.add("active");
            } else {
                e.classList.remove("active");
                e.classList.remove("disabled");
            }
        });
    }
    keyboard["clear"].forEach(function(e) {
        if (activeCell !== -1 && (state[activeCell].value !== 0 ||
                                  notes && state[activeCell].notes.length !== 0)) {
            e.classList.remove("disabled");
        } else {
            e.classList.add("disabled");
        }
    });
    keyboard["note"].forEach(function(e) {
        if (activeCell !== -1) {
            e.classList.remove("disabled");
            if (notes) {
                e.classList.add("active");
            } else {
                e.classList.remove("active");
            }
        } else {
            e.classList.remove("active");
            e.classList.add("disabled");
        }
    });
    if (finished) {
        win.classList.remove("hidden");
    } else {
        win.classList.add("hidden");
    }
}

function startGame(newState) {
    state = newState;
    activeCell = -1;
    notes = false;
    updateValidCells();
    populatePlay();
    showScene(play);
}

(function() {
    if (history.state === null) {
        history.replaceState(false, "");
        if (restoreHistory) {
            var jsonState = localStorage.getItem("state");
            if (jsonState) {
                history.pushState(JSON.parse(jsonState), "");
            }
        }
    }
})();

window.addEventListener("load", function() {
    loading = document.querySelector("#loading");
    menu = document.querySelector("#menu");
    modes = menu.querySelector("[data-name=modes]");
    copyright = menu.querySelector("[data-name=copyright]");
    play = document.querySelector("#play");
    error = document.querySelector("#error");
    errorMessage = error.querySelector("[data-name=message]");
    cells = [];
    for (var i = 0; i < 9 * 9; i++) {
        var row = Math.floor(i / 9);
        var col = i % 9;
        cells.push(play.querySelector(".row" + row + ".col" + col));
    }
    keyboard = {};
    ["restart", "fullscreen", 1, 2, 3, 4, 5, 6, 7, 8, 9, "note", "clear"].forEach(function(n) {
        keyboard[n] = Array.prototype.slice.call(play.querySelectorAll("[data-name=button" + n + "]"));
    });
    win = play.querySelector("#win");

    if (!fullscreenEnabled()) {
        keyboard["fullscreen"].forEach(function(e) {e.classList.add("disabled")});
    } else {
        addFullscreenchangeEventListener(function() {
            if (fullscreenElement() !== null) {
                keyboard["fullscreen"].forEach(function(e) {e.classList.add("active")});
            } else {
                keyboard["fullscreen"].forEach(function(e) {e.classList.remove("active")});
            }
        });
    }
    Array.apply(null, Array(9 * 9)).map(function(_, i) {return i;}).forEach(function(i) {
        var cell = cells[i];
        function action() {
            if (finished) {
                return;
            }
            if (i == activeCell || state[i].fixed) {
                activeCell = -1;
                notes = false;
            } else {
                activeCell = i;
                notes = state[activeCell].value === 0 && state[activeCell].notes.length !== 0;
            }
            populatePlay();
        }
        cell.onclick = action;
    });
    Array.apply(null, Array(9)).map(function(_, i) {return i+1;}).forEach(function(i) {
        function action() {
            if (finished || activeCell === -1) {
                return;
            }
            var cellState = state[activeCell];
            if (notes) {
                var index = cellState.notes.indexOf(i);
                if (index === -1) {
                    cellState.notes.push(i);
                    cellState.notes.sort();
                } else {
                    cellState.notes.splice(index, 1);
                }
            } else if (cellState.value === i) {
                cellState.value = 0;
                updateValidCells();
            } else {
                cellState.value = i;
                updateValidCells();
            }
            history.replaceState(state, "");
            setBackupState(state);
            populatePlay();
        }
        keyboard[i].forEach(function(e) {
            e.onclick = action;
        });
    });
    (function() {
        function action() {
            if (finished || activeCell === -1) {
                return;
            }
            var cellState = state[activeCell];
            if (cellState.value !== 0) {
                cellState.value = 0;
                updateValidCells();
            }
            if (notes) {
                cellState.notes.splice(0, cellState.notes.length);
            }
            history.replaceState(state, "");
            setBackupState(state);
            populatePlay();
        }
        keyboard["clear"].forEach(function(e) {
            e.onclick = action;
        });
    })();
    (function() {
        function action() {
            if (finished || activeCell === -1) {
                return;
            }
            var cellState = state[activeCell];
            if (cellState.value !== 0) {
                cellState.value = 0;
                updateValidCells();
            }
            notes = !notes;
            history.replaceState(state, "");
            setBackupState(state);
            populatePlay();
        }
        keyboard["note"].forEach(function(e) {
            e.onclick = action;
        });
    })();
    (function() {
        function action() {
            if (finished) {
                return;
            }
            if (!confirm("Restart puzzle?")) {
                return;
            }
            state.forEach(function(cellState) {
                if (!cellState.fixed) {
                    cellState.value = 0;
                }
                cellState.notes.splice(0, cellState.notes.length);
            });
            history.replaceState(state, "");
            setBackupState(state);
            startGame(state);
        }
        keyboard["restart"].forEach(function(e) {
            e.onclick = action;
        });
    })();
    (function() {
        function action() {
            if (finished) {
                return;
            }
            if (fullscreenElement() !== null) {
                exitFullscreen();
            } else {
                requestFullscreen(play);
            }
        }
        keyboard["fullscreen"].forEach(function(e) {
            e.onclick = action;
        });
    })();

    var request = new XMLHttpRequest();
    request.open("GET", CONFIG_URL);
    request.onreadystatechange = function() {
        if (request.readyState !== 4) {
            return;
        }
        if (request.status === 200) {
            config = JSON.parse(request.responseText);
            populateMenu();
            if (history.state) {
                startGame(history.state);
            } else {
                removeBackupState();
                showScene(menu);
            }
            window.onpopstate = function() {
                if (history.state) {
                    setBackupState(history.state);
                    startGame(history.state);
                } else {
                    removeBackupState();
                    showScene(menu);
                }
            };
        } else {
            errorMessage.textContent = request.statusText;
            showScene(error);
        }
    };
    request.send();
}, false);
