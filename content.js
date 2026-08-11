let lastFen = "";
let lastGrid = null;
let currentTurn = 'w';

const chessComMap = {
    'wp': 'P', 'wr': 'R', 'wn': 'N', 'wb': 'B', 'wq': 'Q', 'wk': 'K',
    'bp': 'p', 'br': 'r', 'bn': 'n', 'bb': 'b', 'bq': 'q', 'bk': 'k'
};

const lichessMap = {
    'white pawn': 'P', 'white rook': 'R', 'white knight': 'N', 'white bishop': 'B', 'white queen': 'Q', 'white king': 'K',
    'black pawn': 'p', 'black rook': 'r', 'black knight': 'n', 'black bishop': 'b', 'black queen': 'q', 'black king': 'k'
};

function readBoard() {
    if (window.location.hostname.includes("chess.com")) {
        scanChessCom();
    } else if (window.location.hostname.includes("lichess.org")) {
        scanLichess();
    }
}

function scanChessCom() {
    let pieces = document.querySelectorAll('.piece');
    if (pieces.length === 0) return;

    let isAnimating = false;
    let grid = Array(8).fill("").map(() => Array(8).fill(""));

    pieces.forEach(piece => {
        if (piece.className.includes('dragging') || piece.className.includes('ghost') || piece.className.includes('animating')) {
            isAnimating = true; 
        }
        let classes = piece.className.split(' ');
        let pieceType = classes.find(c => chessComMap[c]); 
        let position = classes.find(c => c.startsWith('square-')); 
        
        if (pieceType && position) {
            let num = position.replace('square-', ''); 
            let col = parseInt(num[0]) - 1; 
            let row = 8 - parseInt(num[1]); 
            grid[row][col] = chessComMap[pieceType];
        }
    });

    if (isAnimating) return;
    processGrid(grid);
}

function scanLichess() {
    let board = document.querySelector('cg-board');
    let wrap = document.querySelector('.cg-wrap');
    if (!board || !wrap) return;

    let isAnimating = false;
    let pieces = board.querySelectorAll('piece');
    
    pieces.forEach(p => { 
        if (p.classList.contains('anim') || p.classList.contains('dragging') || p.classList.contains('ghost')) {
            isAnimating = true; 
        }
    });
    
    if (isAnimating) return;

    let grid = Array(8).fill("").map(() => Array(8).fill(""));
    let sqWidth = board.clientWidth / 8;
    let sqHeight = board.clientHeight / 8;
    let isBlackBottom = wrap.className.includes('orientation-black');

    pieces.forEach(p => {
        let colorType = p.className;
        let pieceChar = null;
        
        for (let key in lichessMap) {
            let [color, type] = key.split(' ');
            if (colorType.includes(color) && colorType.includes(type)) {
                pieceChar = lichessMap[key];
                break;
            }
        }
        if (!pieceChar) return;

        let transform = p.style.transform;
        if (!transform) return;

        let match = transform.match(/translate\(([\d.-]+)(px|%),\s*([\d.-]+)(px|%)\)/);
        if (match) {
            let x = parseFloat(match[1]);
            let xUnit = match[2];
            let y = parseFloat(match[3]);
            let yUnit = match[4];
            
            let col = xUnit === '%' ? Math.round(x / 100) : Math.round(x / sqWidth);
            let row = yUnit === '%' ? Math.round(y / 100) : Math.round(y / sqHeight);
            
            if (isBlackBottom) {
                col = 7 - col;
                row = 7 - row;
            }

            if (row >= 0 && row < 8 && col >= 0 && col < 8) {
                grid[row][col] = pieceChar;
            }
        }
    });

    processGrid(grid);
}

function processGrid(grid) {
    let currentFen = "";
    for (let r = 0; r < 8; r++) {
        let emptyCount = 0;
        for (let c = 0; c < 8; c++) {
            if (grid[r][c] === "") emptyCount++;
            else {
                if (emptyCount > 0) { currentFen += emptyCount; emptyCount = 0; }
                currentFen += grid[r][c];
            }
        }
        if (emptyCount > 0) currentFen += emptyCount;
        if (r < 7) currentFen += "/";
    }

    if (currentFen.includes('K') && currentFen.includes('k')) {
        // FIX: Calculate turn logic ONLY if the board actually changed
        if (currentFen !== lastFen) {
            if (lastGrid) {
                let whiteArrived = false;
                let blackArrived = false;

                for (let r = 0; r < 8; r++) {
                    for (let c = 0; c < 8; c++) {
                        if (grid[r][c] !== lastGrid[r][c] && grid[r][c] !== "") {
                            let p = grid[r][c];
                            if (p === p.toUpperCase()) whiteArrived = true;
                            if (p === p.toLowerCase()) blackArrived = true;
                        }
                    }
                }
                if (whiteArrived && !blackArrived) currentTurn = 'b';
                else if (blackArrived && !whiteArrived) currentTurn = 'w';
            }
            
            lastGrid = grid.map(row => [...row]); 
            lastFen = currentFen;
        }
        
        // FIX: ALWAYS broadcast the state so the Side Panel catches up instantly
        try {
            chrome.runtime.sendMessage({ type: "FEN_UPDATE", fen: currentFen, turn: currentTurn }).catch(() => {});
        } catch(err) {
            // Ignore background context errors if panel is closed
        }
    }
}

setInterval(readBoard, 500);
