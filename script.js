// ============================================================
//  مدیریت صفحات و کاربر
// ============================================================
let playerName = '';
let selectedGame = '';
let selectedPlayers = 2;
let currentGame = '';

// PeerJS
let peer = null;
let connections = [];
let roomId = '';
let roomCreator = false;
let players = [];
let maxPlayers = 2;

// عناصر DOM
const loginPage = document.getElementById('loginPage');
const menuPage = document.getElementById('menuPage');
const playersPage = document.getElementById('playersPage');
const roomPage = document.getElementById('roomPage');
const gamePage = document.getElementById('gamePage');
const playerNameInput = document.getElementById('playerName');
const menuUsername = document.getElementById('menuUsername');
const roomIdInput = document.getElementById('roomId');
const inviteBox = document.getElementById('inviteBox');
const roomCodeSpan = document.getElementById('roomCode');
const selectedGameTitle2 = document.getElementById('selectedGameTitle2');
const roomTitle = document.getElementById('roomTitle');
const p1Name = document.getElementById('p1Name');
const p2Name = document.getElementById('p2Name');
const turnIndicator = document.getElementById('turnIndicator');
const gameStatus = document.getElementById('gameStatus');
const gameBoard = document.getElementById('gameBoard');
const playersList = document.getElementById('playersList');
const playersListUl = document.getElementById('playersListUl');

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
    selectedGameTitle2.textContent = names[game] || '🎮 بازی';
    menuPage.classList.remove('active');
    playersPage.classList.add('active');
}

function backToMenu() {
    playersPage.classList.remove('active');
    menuPage.classList.add('active');
}

// ============================================================
//  صفحه ۳: انتخاب تعداد نفرات
// ============================================================
function selectPlayers(count) {
    selectedPlayers = count;
    playersPage.classList.remove('active');
    roomPage.classList.add('active');
    roomTitle.textContent = `🎮 ${selectedGame === 'chess' ? 'شطرنج' : selectedGame === 'xo' ? 'دوز' : selectedGame === 'dots' ? 'خط و نقطه' : 'چهار تایی'} - ${count} نفره`;
    inviteBox.style.display = 'none';
    roomIdInput.value = '';
    playersList.style.display = 'none';
}

function backToPlayers() {
    roomPage.classList.remove('active');
    playersPage.classList.add('active');
    if (peer) {
        peer.destroy();
        peer = null;
    }
}

// ============================================================
//  صفحه ۴: اتاق
// ============================================================
function createRoom() {
    if (!playerName) {
        alert('لطفاً اول اسم خودت رو وارد کن!');
        return;
    }

    roomCreator = true;
    maxPlayers = selectedPlayers;
    players = [playerName];
    connections = [];

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
        updatePlayersList();

        gameStatus.textContent = `⏳ منتظر ورود ${maxPlayers - 1} نفر دیگر...`;
        roomPage.classList.remove('active');
        gamePage.classList.add('active');
        setupGameUI();

        peer.on('connection', (conn) => {
            connections.push(conn);
            setupConnection(conn);
            conn.on('open', () => {
                sendTo(conn, { type: 'name', name: playerName });
                sendTo(conn, { type: 'game', game: selectedGame });
                sendTo(conn, { type: 'players', count: maxPlayers });
                // درخواست اسم از مهمان
                sendTo(conn, { type: 'request_name' });
            });
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
        const conn = peer.connect(targetId);
        connections = [conn];
        setupConnection(conn);

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
//  مدیریت اتصال
// ============================================================
function setupConnection(conn) {
    conn.on('open', () => {
        sendTo(conn, { type: 'name', name: playerName });
        sendTo(conn, { type: 'game', game: selectedGame });
        if (!roomCreator) {
            sendTo(conn, { type: 'ready' });
        }
    });

    conn.on('data', (data) => {
        handleIncomingData(data, conn);
    });

    conn.on('close', () => {
        const idx = connections.indexOf(conn);
        if (idx > -1) connections.splice(idx, 1);
        if (roomCreator) {
            gameStatus.textContent = '❌ یک بازیکن قطع شد!';
        }
    });
}

function sendTo(conn, data) {
    if (conn && conn.open) {
        conn.send(data);
    }
}

function sendAll(data) {
    connections.forEach(conn => {
        sendTo(conn, data);
    });
}

function handleIncomingData(data, conn) {
    console.log('📩 Received:', data);

    switch (data.type) {
        case 'name':
            if (!players.includes(data.name)) {
                players.push(data.name);
                updatePlayersList();
                if (roomCreator && players.length === maxPlayers) {
                    gameStatus.textContent = '✅ همه بازیکنان آماده‌اند!';
                    setTimeout(() => startGame(), 500);
                }
            }
            break;
        case 'request_name':
            sendTo(conn, { type: 'name', name: playerName });
            break;
        case 'game':
            currentGame = data.game;
            break;
        case 'players':
            maxPlayers = data.count;
            break;
        case 'ready':
            if (roomCreator) {
                if (!players.includes(data.name)) {
                    players.push(data.name);
                    updatePlayersList();
                }
                if (players.length === maxPlayers) {
                    gameStatus.textContent = '✅ همه بازیکنان آماده‌اند!';
                    setTimeout(() => startGame(), 500);
                }
            }
            break;
        case 'move':
            if (!gameOver) {
                handleMove(data);
            }
            break;
        case 'reset':
            resetBoard();
            sendAll({ type: 'reset_confirm' });
            break;
        case 'reset_confirm':
            resetBoard();
            break;
    }
}

// ============================================================
//  کپی کد اتاق
// ============================================================
function copyRoomCode() {
    const code = roomCodeSpan.textContent;
    if (!code || code === '-----') {
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

function updatePlayersList() {
    if (!roomCreator) return;
    playersList.style.display = 'block';
    playersListUl.innerHTML = players.map((p, i) =>
        `<li>${i+1}. ${p} ${i === 0 ? '👑' : ''}</li>`
    ).join('');
}

// ============================================================
//  صفحه ۵: بازی
// ============================================================
function setupGameUI() {
    gameBoard.className = '';
    gameBoard.innerHTML = '';
    p1Name.textContent = playerName + ' (X)';
    p2Name.textContent = 'در انتظار... (O)';
    turnIndicator.textContent = '⏳ در حال اتصال...';
    gameStatus.textContent = '⏳ منتظر حریف...';
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
    isMyTurn = roomCreator;

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

   
