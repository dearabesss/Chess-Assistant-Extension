const stockfish = new Worker('stockfish.js');
stockfish.postMessage("uci");
stockfish.postMessage("setoption name MultiPV value 1");

const moveDisplay = document.getElementById('best-move-text');
const boardDiv = document.getElementById('mini-board');
const colorSelector = document.getElementById('player-color');
const syncBtn = document.getElementById('sync-btn');

const pieceImages = {
    'r': 'https://upload.wikimedia.org/wikipedia/commons/f/ff/Chess_rdt45.svg', 'n': 'https://upload.wikimedia.org/wikipedia/commons/e/ef/Chess_ndt45.svg', 'b': 'https://upload.wikimedia.org/wikipedia/commons/9/98/Chess_bdt45.svg', 'q': 'https://upload.wikimedia.org/wikipedia/commons/4/47/Chess_qdt45.svg', 'k': 'https://upload.wikimedia.org/wikipedia/commons/f/f0/Chess_kdt45.svg', 'p': 'https://upload.wikimedia.org/wikipedia/commons/c/c7/Chess_pdt45.svg',
    'R': 'https://upload.wikimedia.org/wikipedia/commons/7/72/Chess_rlt45.svg', 'N': 'https://upload.wikimedia.org/wikipedia/commons/7/70/Chess_nlt45.svg', 'B': 'https://upload.wikimedia.org/wikipedia/commons/b/b1/Chess_blt45.svg', 'Q': 'https://upload.wikimedia.org/wikipedia/commons/1/15/Chess_qlt45.svg', 'K': 'https://upload.wikimedia.org/wikipedia/commons/4/42/Chess_klt45.svg', 'P': 'https://upload.wikimedia.org/wikipedia/commons/4/45/Chess_plt45.svg'
};


let isMyTurn = false; 
let isFirstLoad = true;
let latestFen = "8/8/8/8/8/8/8/8";

function renderBoard(fen) {
    boardDiv.innerHTML = ''; 
    const rows = fen.split(' ')[0].split('/');
    const playingAs = colorSelector.value;
    const rowOrder = playingAs === 'b' ? [7,6,5,4,3,2,1,0] : [0,1,2,3,4,5,6,7];

    for (let r of rowOrder) {
        let expandedRow = [];
        for (let char of rows[r]) {
            if (!isNaN(char)) {
                for (let i = 0; i < parseInt(char); i++) expandedRow.push('');
            } else { expandedRow.push(char); }
        }
        const colOrder = playingAs === 'b' ? [7,6,5,4,3,2,1,0] : [0,1,2,3,4,5,6,7];
        for (let c of colOrder) {
            boardDiv.appendChild(createSquare(r, c, expandedRow[c]));
        }
    }
}

function createSquare(row, col, pieceChar) {
    const sq = document.createElement('div');
    sq.className = 'square ' + ((row + col) % 2 === 0 ? 'light' : 'dark');
    const letter = String.fromCharCode(97 + col); 
    const number = 8 - row;
    sq.id = `sq-${letter}${number}`;
    
    if (pieceChar !== '') {
        const img = document.createElement('img');
        img.src = pieceImages[pieceChar];
        sq.appendChild(img);
    }
    return sq;
}

function highlightMove(bestMove) {
    document.querySelectorAll('.highlight-move').forEach(el => el.classList.remove('highlight-move'));
    const fromEl = document.getElementById(`sq-${bestMove.substring(0, 2)}`);
    const toEl = document.getElementById(`sq-${bestMove.substring(2, 4)}`);
    if (fromEl) fromEl.classList.add('highlight-move');
    if (toEl) toEl.classList.add('highlight-move');
}

function triggerCalculation() {
    moveDisplay.innerText = "Calculating...";
    moveDisplay.style.color = "#f59e0b"; 
    const fullFen = `${latestFen} ${colorSelector.value} KQkq - 0 1`; 
    stockfish.postMessage(`position fen ${fullFen}`);
    stockfish.postMessage("go depth 12");
}


syncBtn.addEventListener('click', () => {
    isMyTurn = true; 
    triggerCalculation();
});


colorSelector.addEventListener('change', () => {
    isFirstLoad = true;
    isMyTurn = colorSelector.value === 'w'; 
    renderBoard("8/8/8/8/8/8/8/8");
    document.querySelectorAll('.highlight-move').forEach(el => el.classList.remove('highlight-move'));
    moveDisplay.innerText = "Waiting for game...";
});

stockfish.onmessage = function(event) {
    const line = event.data;
    if (line && line.startsWith("bestmove")) {
        const bestMove = line.split(" ")[1];
        if (bestMove !== "(none)") {
            moveDisplay.innerText = "PLAY: " + bestMove.toUpperCase();
            highlightMove(bestMove); 
        }
    }
};

let calcTimer = null;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "FEN_UPDATE") {
        try { renderBoard(message.fen); } catch (error) { return; }
        latestFen = message.fen;
        
        if (message.turn === colorSelector.value) {
        
            clearTimeout(calcTimer);
            
            
            stockfish.postMessage("stop"); 
            
            moveDisplay.innerText = "Locking in move...";
            moveDisplay.style.color = "#888"; 
            
         
            calcTimer = setTimeout(() => {
                triggerCalculation();
            }, 300);
            
        } else {
            clearTimeout(calcTimer);
            stockfish.postMessage("stop"); 
            
            moveDisplay.innerText = "Opponent is thinking...";
            moveDisplay.style.color = "#888"; 
            document.querySelectorAll('.highlight-move').forEach(el => el.classList.remove('highlight-move'));
        }
    }
});
renderBoard("8/8/8/8/8/8/8/8");