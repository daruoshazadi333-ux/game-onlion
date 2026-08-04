// ============================================================
//  مدیریت صفحات و کاربر
// ============================================================
let playerName = '';
let selectedGame = '';
let currentGame = '';

// PeerJS
let peer = null;
let connection = null;
let roomId = '';
let roomCreator = false;

// عناصر DOM
const loginPage = document.getElementById('loginPage');
const menuPage = document.getElementById('menuPage');
const roomPage = document.getElementById('roomPage');
const gamePage = document.getElementById('gamePage');
const playerNameInput = document.getElementById('playerName');
const menuUsername = document.getElementById('menuUsername');
const roomIdInput = document.getElementById('roomId');
const inviteBox = document.getElementById('inviteBox');
const roomCodeSpan = document.getElementById('roomCode');
const selectedGameTitle = document.getElementById('selectedGameTitle');
const p1Name = document.getElementById('p1Name');
const p2Name = document.getElementById('p2Name');
const turnIndicator = document.getElementById('turnIndicator');
const gameStatus = document.getElementById('gameStatus');
const gameBoard = document.getElementById('gameBoard');

// ============================================================
//  صفحه ۱: ورود
// ============================================================
function enterMenu() {
    const name = playerNameInput.value.trim();
    if (!name) {
        alert('لطفاً اسم خودت رو وارد کن!');
        return;
    }
    playerName = name;
    menuUsername.textContent = playerName;
    loginPage.classList.remove('active');
    menuPage.classList.add('active');
}

function backToLogin() {
    menuPage.classList.remove('active');
    loginPage.classList.add('active');
}

// ============================================================
//  صفحه ۲: منوی بازی‌ها
// ============================================================
function selectGame(game) {
    selectedGame = game;
    const names = {
        'chess': '♟️ شطرنج',
        'xo': '❌ دوز (XO)',
        'dots': '🔴 خط و نقطه',
        'four': '🟡 چهار تایی'
    };
    selectedGameTitle.textContent = names[game] || '🎮 بازی';
    menuPage.classList.remove('active');
    roomPage.classList.add('active');
    inviteBox.style.display = 'none';
    roomIdInput.value = '';
}

function backToMenu() {
    roomPage.classList.remove('active');
    menuPage.classList.add('active');
    if (peer) {
        peer.destroy();
        peer = null;
    }
}

// ============================================================
//  صفحه ۳: اتاق
// ============================================================
function createRoom() {
    if (!playerName) {
        alert('لطفاً اول اسم خودت رو وارد کن!');
        return;
    }

    roomCreator = true;
    if (peer) {
        peer.destroy();
        peer = null;
    }

    peer = new Peer(undefined, { debug: 2 });

    peer.on('open', (id) => {
        roomId = id;
        roomCodeSpan.textContent = roomId;
        inviteBox.style.display = 'block';
        roomIdInput.value = roomId;

        gameStatus.textContent = '⏳ منتظر ورود حریف...';
        roomPage.classList.remove('active');
        gamePage.classList.add('active');
        setupGameUI();

        peer.on('connection', (conn) => {
            connection = conn;
            setupConnection();
            gameStatus.textContent = '✅ حریف پیدا شد!';
            startGame();
        });
    });

    peer.on('error', (err) => {
        console.error('Peer error:', err);
        alert('❌ خطا در ایجاد اتاق! دوباره تلاش کن.');
    });
}

function joinRoom() {
    const targetId = roomIdInput.value.trim();
    if (!targetId) {
        alert('لطفاً کد اتاق رو وارد کن!');
        return;
    }

    roomCreator = false;
    if (peer) {
        peer.destroy();
        peer = null;
    }

    peer = new Peer(undefined, { debug: 2 });

    peer.on('open', () => {
        connection = peer.connect(targetId);
        setupConnection();

        roomPage.classList.remove('active');
        gamePage.classList.add('active');
        setupGameUI();
        gameStatus.textContent = '🔗 در حال اتصال...';
    });

    peer.on('error', (err) => {
        console.error('Peer error:', err);
        alert('❌ خطا در ورود به اتاق! کد رو چک کن.');
    });
}

// ============================================================
//  کپی کد اتاق
// ============================================================
function copyRoomCode() {
    const code = roomCodeSpan.textContent;
    if (!code) {
        alert('❌ کد اتاق پیدا نشد!');
        return;
    }
    if (navigator.clipboard) {
        navigator.clipboard.writeText(code).then(() => {
            showToast('✅ کد اتاق کپی شد!');
        });
    } else {
        const input = document.createElement('input');
        input.value = code;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
        showToast('✅ کد اتاق کپی شد!');
    }
}

function showToast(msg) {
    const t = document.createElement('div');
    t.className = 'toast-message';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => {
        t.style.opacity = '0';
        t.style.transition = 'opacity 0.3s';
        setTimeout(() => t.remove(), 300);
    }, 2500);
}

// ============================================================
//  صفحه ۴: بازی
// ============================================================
function setupGameUI() {
    gameBoard.className = '';
    gameBoard.innerHTML = '';
    p1Name.textContent = playerName + ' (X)';
    p2Name.textContent = 'در انتظار... (O)';
    turnIndicator.textContent = '⏳ در حال اتصال...';
    gameStatus.textContent = '⏳ منتظر حریف...';
}

function setupConnection() {
    connection.on('open', () => {
        sendData({ type: 'name', name: playerName });
        sendData({ type: 'game', game: selectedGame });
        if (!roomCreator) {
            sendData({ type: 'ready' });
        }
    });

    connection.on('data', (data) => {
        handleIncomingData(data);
    });

    connection.on('close', () => {
        gameStatus.textContent = '❌ حریف قطع شد!';
        turnIndicator.textContent = '🔌 قطع شد';
    });
}

function sendData(data) {
    if (connection && connection.open) {
        connection.send(data);
    }
}

function handleIncomingData(data) {
    console.log('📩 Received:', data);

    switch (data.type) {
        case 'name':
            if (roomCreator) {
                p2Name.textContent = data.name + ' (O)';
            } else {
                p1Name.textContent = data.name + ' (X)';
            }
            break;
        case 'game':
            currentGame = data.game;
            break;
        case 'ready':
            if (roomCreator) {
                gameStatus.textContent = '✅ حریف آماده شد!';
                startGame();
            }
            break;
        case 'move':
            if (!gameOver) {
                handleMove(data);
            }
            break;
        case 'reset':
            resetBoard();
            sendData({ type: 'reset_confirm' });
            break;
        case 'reset_confirm':
            resetBoard();
            break;
    }
}

// ============================================================
//  منطق بازی‌ها
// ============================================================
let gameOver = false;
let isMyTurn = false;
let board = [];
let gameState = {};

function startGame() {
    gameOver = false;
    if (roomCreator) {
        isMyTurn = true;
    } else {
        isMyTurn = false;
    }

    switch (selectedGame) {
        case 'xo':
            startXO();
            break;
        case 'dots':
            startDots();
            break;
        case 'four':
            startFour();
            break;
        case 'chess':
            startChess();
            break;
        default:
            startXO();
    }

    updateTurnIndicator();
    gameStatus.textContent = '🎮 بازی شروع شد!';
}

// ===== بازی دوز (XO) =====
function startXO() {
    gameBoard.className = 'xo-board';
    board = Array(9).fill(null);
    renderBoard('xo');
}

// ===== بازی خط و نقطه =====
function startDots() {
    gameBoard.className = 'dots-board';
    const size = 5;
    board = [];
    for (let i = 0; i < size * size; i++) {
        board.push(null);
    }
    gameState = { size: size, currentPlayer: 'X' };
    renderBoard('dots');
}

// ===== بازی چهار تایی =====
function startFour() {
    gameBoard.className = 'four-board';
    const rows = 6,
        cols = 7;
    board = [];
    for (let i = 0; i < rows * cols; i++) {
        board.push(null);
    }
    gameState = { rows: rows, cols: cols, currentPlayer: 'X' };
    renderBoard('four');
}

// ===== بازی شطرنج (ساده) =====
function startChess() {
    gameBoard.className = 'chess-board';
    board = [];
    const pieces = ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'];
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if (r === 0) board.push({ type: pieces[c], color: 'b' });
            else if (r === 1) board.push({ type: 'P', color: 'b' });
            else if (r === 6) board.push({ type: 'P', color: 'w' });
            else if (r === 7) board.push({ type: pieces[c], color: 'w' });
            else board.push(null);
        }
    }
    gameState = { selected: null };
    renderBoard('chess');
}

// ============================================================
//  رندر تخته
// ============================================================
function renderBoard(type) {
    gameBoard.innerHTML = '';
    const isChess = type === 'chess';
    const isDots = type === 'dots';
    const isFour = type === 'four';
    const isXO = type === 'xo';

    let size = 3;
    if (isXO) size = 3;
    else if (isDots) size = gameState.size || 5;
    else if (isFour) size = gameState.cols || 7;
    else size = 8;

    for (let i = 0; i < board.length; i++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.index = i;

        if (isChess) {
            const r = Math.floor(i / 8),
                c = i % 8;
            cell.classList.add((r + c) % 2 === 0 ? 'light' : 'dark');
            const p = board[i];
            if (p) {
                const symbols = { 'K': '♔', 'Q': '♕', 'R': '♖', 'B': '♗', 'N': '♘', 'P': '♙' };
                cell.textContent = symbols[p.type] || '';
                cell.classList.add(p.color === 'w' ? 'piece-white' : 'piece-black');
            }
        } else {
            const val = board[i];
            if (val === 'X') { cell.classList.add('x');
                cell.textContent = '✕'; }
            if (val === 'O') { cell.classList.add('o');
                cell.textContent = '◯'; }
        }

        if (!gameOver && isMyTurn && !board[i]) {
            cell.addEventListener('click', () => onCellClick(i));
        } else {
            cell.classList.add('disabled');
        }

        gameBoard.appendChild(cell);
    }
}

// ============================================================
//  کلیک روی سلول
// ============================================================
function onCellClick(index) {
    if (gameOver || !isMyTurn || board[index]) return;

    let moveData = { index: index };

    switch (selectedGame) {
        case 'xo':
            if (board[index]) return;
            board[index] = 'X';
            moveData.symbol = 'X';
            break;
        case 'dots':
            board[index] = 'X';
            moveData.symbol = 'X';
            break;
        case 'four':
            const cols = gameState.cols;
            const row = Math.floor(index / cols);
            const col = index % cols;
            // پیدا کردن پایین‌ترین خانه خالی در این ستون
            let targetRow = row;
            for (let r = gameState.rows - 1; r >= 0; r--) {
                const idx = r * cols + col;
                if (!board[idx]) {
                    targetRow = r;
                    break;
                }
            }
            const targetIdx = targetRow * cols + col;
            if (board[targetIdx]) return;
            board[targetIdx] = 'X';
            moveData.index = targetIdx;
            moveData.symbol = 'X';
            break;
        case 'chess':
            // شطرنج ساده
            if (gameState.selected === null) {
                const p = board[index];
                if (p && p.color === 'w') {
                    gameState.selected = index;
                    renderBoard('chess');
                    const cell = document.querySelector(`.cell[data-index="${index}"]`);
                    if (cell) cell.classList.add('selected');
                }
                return;
            } else {
                const from = gameState.selected;
                const p = board[from];
                if (!p) { gameState.selected = null;
                    renderBoard('chess'); return; }
                // حرکت ساده
                board[index] = p;
                board[from] = null;
                gameState.selected = null;
                moveData = { from: from, to: index, piece: p };
            }
            break;
    }

    sendData({ type: 'move', ...moveData });

    isMyTurn = false;
    updateTurnIndicator();
    renderBoardByType();
    checkWinner();
}

// ============================================================
//  دریافت حرکت از حریف
// ============================================================
function handleMove(data) {
    if (gameOver || isMyTurn) return;

    switch (selectedGame) {
        case 'xo':
        case 'dots':
            board[data.index] = data.symbol || 'O';
            break;
        case 'four':
            board[data.index] = data.symbol || 'O';
            break;
        case 'chess':
            if (data.from !== undefined && data.to !== undefined) {
                board[data.to] = data.piece;
                board[data.from] = null;
            }
            break;
    }

    isMyTurn = true;
    updateTurnIndicator();
    renderBoardByType();
    checkWinner();
}

// ============================================================
//  رندر بر اساس نوع بازی
// ============================================================
function renderBoardByType() {
    const type = selectedGame === 'chess' ? 'chess' :
        selectedGame === 'dots' ? 'dots' :
        selectedGame === 'four' ? 'four' : 'xo';
    renderBoard(type);
}

// ============================================================
//  بررسی برنده
// ============================================================
function checkWinner() {
    // دوز
    if (selectedGame === 'xo') {
        const wins = [
            [0, 1, 2],
            [3, 4, 5],
            [6, 7, 8],
            [0, 3, 6],
            [1, 4, 7],
            [2, 5, 8],
            [0, 4, 8],
            [2, 4, 6]
        ];
        for (const w of wins) {
            if (board[w[0]] && board[w[0]] === board[w[1]] && board[w[0]] === board[w[2]]) {
                gameOver = true;
                const winner = board[w[0]] === 'X' ? p1Name.textContent : p2Name.textContent;
                gameStatus.textContent = `🏆 ${winner} برنده شد!`;
                turnIndicator.textContent = '🎉 بازی تمام شد!';
                w.forEach(i => {
                    const cell = document.querySelector(`.cell[data-index="${i}"]`);
                    if (cell) cell.classList.add('win');
                });
                return;
            }
        }
        if (board.every(c => c)) {
            gameOver = true;
            gameStatus.textContent = '🤝 مساوی!';
            turnIndicator.textContent = '😐 بازی مساوی شد';
        }
    }

    // خط و نقطه و چهارتایی ساده
    if (selectedGame === 'dots' || selectedGame === 'four') {
        // ساده: فقط چک کن پر شده
        if (board.every(c => c)) {
            gameOver = true;
            gameStatus.textContent = '🤝 مساوی!';
            turnIndicator.textContent = '😐 بازی مساوی شد';
        }
    }

    // شطرنج ساده
    if (selectedGame === 'chess') {
        let hasKing = false;
        for (const p of board) {
            if (p && p.type === 'K' && p.color === 'b') hasKing = true;
        }
        if (!hasKing) {
            gameOver = true;
            gameStatus.textContent = `🏆 ${p1Name.textContent} برنده شد!`;
            turnIndicator.textContent = '🎉 کیش‌مات!';
        }
    }

    updateTurnIndicator();
}

// ============================================================
//  کنترل‌های بازی
// ============================================================
function resetGame() {
    if (!gameOver) {
        if (!confirm('بازی فعلی رو از دست می‌دی، مطمئنی؟')) return;
    }
    sendData({ type: 'reset' });
    resetBoard();
}

function resetBoard() {
    gameOver = false;
    isMyTurn = roomCreator;
    gameState = {};
    switch (selectedGame) {
        case 'xo':
            board = Array(9).fill(null);
            break;
        case 'dots':
            board = Array(25).fill(null);
            gameState = { size: 5 };
            break;
        case 'four':
            board = Array(42).fill(null);
            gameState = { rows: 6, cols: 7 };
            break;
        case 'chess':
            startChess();
            return;
    }
    renderBoardByType();
    updateTurnIndicator();
    gameStatus.textContent = '🔄 بازی جدید!';
}

function updateTurnIndicator() {
    if (gameOver) {
        turnIndicator.textContent = '🎯 بازی تمام شد';
        return;
    }
    if (isMyTurn) {
        turnIndicator.textContent = '🎯 نوبت شما';
        turnIndicator.style.color = '#00f0ff';
    } else {
        turnIndicator.textContent = '⏳ نوبت حریف';
        turnIndicator.style.color = '#ff6b6b';
    }
}

function leaveGame() {
    if (connection) connection.close();
    if (peer) peer.destroy();
    gamePage.classList.remove('active');
    roomPage.classList.add('active');
    inviteBox.style.display = 'none';
    roomIdInput.value = '';
    gameStatus.textContent = '';
}

// ============================================================
//  راه‌اندازی اولیه
// ============================================================
console.log('⚡ نئون گیمز لود شد!');
console.log('🎮 بازی‌ها: شطرنج، دوز، خط و نقطه، چهار تایی');
