const CONFIG_URL = "config.json";

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

function removeClassName(element, name) {
    var s = " " + element.className + " ";
    s = s.replace(" " + name + " ", " ");
    element.className = s.trim();
}

function addClassName(element, name) {
    var s = " " + element.className + " ";
    if (s.search(" " + name + " ") !== -1) {
        return;
    }
    s += name;
    element.className = s.trim();
}

function showScene(scene) {
    [loading, menu, play, error].forEach(function (e) {
        if (e === scene) {
            removeClassName(e, "hidden");
        } else {
            addClassName(e, "hidden");
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
            startGame(newState);
        };
        modes.appendChild(link);
    });
    copyright.innerHTML = config["copyright"];
}

function randomState(mode) {
    var puzzle = mode.puzzles[Math.floor(Math.random() * mode.puzzles.length)];
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

function checkFinished() {
    for (var i = 0; i < 9; i++) {
        var rowSet = Array.apply(null, Array(10)).map(function(_, i) {return i === 0;});
        var colSet = Array.apply(null, Array(10)).map(function(_, i) {return i === 0;});
        var boxSet = Array.apply(null, Array(10)).map(function(_, i) {return i === 0;});
        for (var j = 0; j < 9; j++) {
            var rowValue = state[i * 9 + j].value;
            var colValue = state[i + j * 9].value;
            var boxCol = 3 * (i % 3);
            var boxRow = 3 * Math.floor(i / 3);
            var boxCellCol = boxCol + (j % 3);
            var boxCellRow = boxRow + Math.floor(j / 3);
            var boxValue = state[boxCellCol + boxCellRow * 9].value;
            if (rowSet[rowValue] || colSet[colValue] || boxSet[boxValue]) {
                return false;
            }
            rowSet[rowValue] = true;
            colSet[colValue] = true;
            boxSet[boxValue] = true;
        }
    }
    return true;
}
function populatePlay() {
    for (var i = 0; i < 9 * 9; i++) {
        var cellState = state[i];
        var cell = cells[i];
        if (cellState.fixed) {
            addClassName(cell, "fixed");
        } else {
            removeClassName(cell, "fixed");
        }
        if (cellState.value !== 0) {
            removeClassName(cell, "notes");
            cell.textContent = cellState.value;
        } else if (cellState.notes.length !== 0) {
            cell.textContent = cellState.notes.join("");
            addClassName(cell, "notes");
        } else {
            cell.textContent = "";
            removeClassName(cell, "notes");
        }
        if (i === activeCell) {
            addClassName(cell, "active");
        } else {
            removeClassName(cell, "active");
        }
        
    }
    for (var i = 1; i <= 9; i++) {
        keyboard[i].forEach(function(e) {
            if (activeCell === -1) {
                removeClassName(e, "active");
                addClassName(e, "disabled");
            } else if (i === state[activeCell].value ||
                        state[activeCell].notes.indexOf(i) !== -1) {
                removeClassName(e, "disabled");
                addClassName(e, "active");
            } else {
                removeClassName(e, "active");
                removeClassName(e, "disabled");
            }
        });
    }
    keyboard["clear"].forEach(function(e) {
        if (activeCell !== -1 && (state[activeCell].value !== 0 ||
                                  state[activeCell].notes.length !== 0)) {
            removeClassName(e, "disabled");
        } else {
            addClassName(e, "disabled");
        }
    });
    keyboard["note"].forEach(function(e) {
        if (activeCell !== -1) {
            removeClassName(e, "disabled");
            if (notes) {
                addClassName(e, "active");
            } else {
                removeClassName(e, "active");
            }
        } else {
            removeClassName(e, "active");
            addClassName(e, "disabled");
        }
    });
    if (finished) {
        removeClassName(win, "hidden");
    } else {
        addClassName(win, "hidden");
    }
}

function startGame(newState) {
    state = newState;
    activeCell = -1;
    notes = false;
    finished = checkFinished();
    populatePlay();
    showScene(play);
}

window.addEventListener("load", function() {
    loading = document.querySelector("#loading");
    menu = document.querySelector("#menu");
    modes = menu.querySelector("[name=modes]");
    copyright = menu.querySelector("[name=copyright]");
    play = document.querySelector("#play");
    error = document.querySelector("#error");
    errorMessage = error.querySelector("[name=message]");
    cells = [];
    for (var i = 0; i < 9 * 9; i++) {
        var row = Math.floor(i / 9);
        var col = i % 9;
        cells.push(play.querySelector(".row" + row + ".col" + col));
    }
    keyboard = {};
    ["restart", "fullscreen", 1, 2, 3, 4, 5, 6, 7, 8, 9, "note", "clear"].forEach(function(n) {
        keyboard[n] = Array.prototype.slice.call(play.querySelectorAll("[name=button" + n + "]"));
    });
    win = play.querySelector("#win");

    if (!fullscreenEnabled()) {
        keyboard["fullscreen"].forEach(function(e) {addClassName(e, "disabled")});
    } else {
        addFullscreenchangeEventListener(function() {
            if (fullscreenElement() !== null) {
                keyboard["fullscreen"].forEach(function(e) {addClassName(e, "active")});
            } else {
                keyboard["fullscreen"].forEach(function(e) {removeClassName(e, "active")});
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
                notes = state[activeCell].notes.length !== 0;
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
            } else {
                cellState.value = i;
                finished = checkFinished();
            }
            history.replaceState(state, "");
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
            cellState.value = 0;
            cellState.notes.splice(0, cellState.notes.length);
            history.replaceState(state, "");
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
            cellState.value = 0;
            cellState.notes.splice(0, cellState.notes.length);
            notes = !notes;
            history.replaceState(state, "");
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
            state.forEach(function(cellState) {
                if (!cellState.fixed) {
                    cellState.value = 0;
                }
                cellState.notes.splice(0, cellState.notes.length);
            });
            history.replaceState(state, "");
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
                showScene(menu);
            }
            window.onpopstate = function() {
                if (history.state) {
                    startGame(history.state);
                } else {
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
