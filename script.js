// ============================================================
//  تنظیمات اولیه
// ============================================================
let peer = null;
let connection = null;
let roomId = '';
let playerName = '';
let playerSymbol = 'X'; // X همیشه سازنده اتاق
let isMyTurn = false;
let gameOver = false;
let board = Array(9).fill(null);
let roomCreator = false;

// عناصر DOM
const lobbyPage = document.getElementById('lobbyPage');
const gamePage = document.getElementById('gamePage');
const playerNameInput = document.getElementById('playerName');
const roomIdInput = document.getElementById('roomId');
const inviteBox = document.getElementById('inviteBox');
const roomCodeSpan = document.getElementById('roomCode');
const p1Name = document.getElementById('p1Name');
const p2Name = document.getElementById('p2Name');
const turnIndicator = document.getElementById('turnIndicator');
const gameStatus = document.getElementById('gameStatus');
const xoBoard = document.getElementById('xoBoard');

// ============================================================
//  ایجاد اتاق (میزبان)
// ============================================================
function createRoom() {
    playerName = playerNameInput.value.trim() || 'کاربر';
    roomCreator = true;
    playerSymbol = 'X';

    // ایجاد Peer جدید
    peer = new Peer(undefined, {
        debug: 2
    });

    peer.on('open', (id) => {
        roomId = id;
        roomCodeSpan.textContent = roomId;
        inviteBox.style.display = 'block';
        document.querySelector('.room-box input').value = roomId;

        // منتظر اتصال حریف
        gameStatus.textContent = '⏳ منتظر ورود حریف...';
        lobbyPage.classList.remove('active');
        gamePage.classList.add('active');
        updatePlayerNames();

        // شروع بازی وقتی حریف وصل شد
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

// ============================================================
//  ورود به اتاق (مهمان)
// ============================================================
function joinRoom() {
    playerName = playerNameInput.value.trim() || 'کاربر';
    const targetId = roomIdInput.value.trim();

    if (!targetId) {
        alert('لطفاً کد اتاق رو وارد کن!');
        return;
    }

    roomCreator = false;
    playerSymbol = 'O';

    // اتصال به Peer میزبان
    peer = new Peer(undefined, {
        debug: 2
    });

    peer.on('open', () => {
        connection = peer.connect(targetId);
        setupConnection();

        // نمایش صفحه بازی
        lobbyPage.classList.remove('active');
        gamePage.classList.add('active');
        updatePlayerNames();
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
function setupConnection() {
    connection.on('open', () => {
        // ارسال نام به طرف مقابل
        sendData({
            type: 'name',
            name: playerName
        });

        if (!roomCreator) {
            // مهمان: درخواست شروع بازی
            sendData({ type: 'ready' });
        }
    });

    connection.on('data', (data) => {
        handleIncomingData(data);
    });

    connection.on('close', () => {
        gameStatus.textContent = '❌ حریف قطع شد!';
        turnIndicator.textContent = '🔌 قطع شد';
        disableBoard(true);
    });
}

// ============================================================
//  ارسال و دریافت داده
// ============================================================
function sendData(data) {
    if (connection && connection.open) {
        connection.send(data);
    }
}

function handleIncomingData(data) {
    console.log('Received:', data);

    switch (data.type) {
        case 'name':
            // دریافت نام حریف
            if (roomCreator) {
                p2Name.textContent = data.name;
            } else {
                p1Name.textContent = data.name;
            }
            break;

        case 'ready':
            // مهمان آماده است
            if (roomCreator) {
                gameStatus.textContent = '✅ حریف آماده شد!';
                startGame();
            }
            break;

        case 'move':
            // دریافت حرکت از حریف
            if (!isMyTurn && !gameOver) {
                makeMove(data.index, data.symbol);
                isMyTurn = true;
                updateTurnIndicator();
            }
            break;

        case 'reset':
            // درخواست بازی جدید
            resetBoard();
            break;

        case 'reset_confirm':
            // تأیید بازی جدید
            resetBoard();
            break;
    }
}

// ============================================================
//  شروع بازی
// ============================================================
function startGame() {
    // ارسال وضعیت اولیه
    if (roomCreator) {
        isMyTurn = true; // میزبان شروع می‌کند (X)
        sendData({
            type: 'start',
            turn: 'X'
        });
    } else {
        isMyTurn = false;
    }

    gameOver = false;
    board = Array(9).fill(null);
    renderBoard();
    updateTurnIndicator();
    gameStatus.textContent = '🎮 بازی شروع شد!';
    disableBoard(false);
}

// ============================================================
//  منطق بازی
// ============================================================
function renderBoard() {
    xoBoard.innerHTML = '';
    for (let i = 0; i < 9; i++) {
        const cell = document.createElement('div');
        cell.className = 'xo-cell';
        if (board[i] === 'X') cell.classList.add('x');
        if (board[i] === 'O') cell.classList.add('o');
        if (gameOver) cell.classList.add('disabled');
        cell.textContent = board[i] || '';
        cell.dataset.index = i;

        if (!gameOver && isMyTurn && !board[i]) {
            cell.addEventListener('click', () => onCellClick(i));
        } else {
            cell.style.cursor = 'not-allowed';
        }

        xoBoard.appendChild(cell);
    }
}

function onCellClick(index) {
    if (gameOver || !isMyTurn || board[index]) return;

    // انجام حرکت
    makeMove(index, playerSymbol);

    // ارسال حرکت به حریف
    sendData({
        type: 'move',
        index: index,
        symbol: playerSymbol
    });

    // نوبت را عوض کن
    isMyTurn = false;
    updateTurnIndicator();
    renderBoard();
}

function makeMove(index, symbol) {
    board[index] = symbol;

    // بررسی برنده
    const winner = checkWinner();
    if (winner) {
        gameOver = true;
        gameStatus.textContent = `🏆 ${winner === 'X' ? p1Name.textContent : p2Name.textContent} برنده شد!`;
        turnIndicator.textContent = '🎉 بازی تمام شد!';
        highlightWinner(winner);
        renderBoard();
        return;
    }

    // بررسی مساوی
    if (board.every(cell => cell !== null)) {
        gameOver = true;
        gameStatus.textContent = '🤝 مساوی!';
        turnIndicator.textContent = '😐 بازی مساوی شد';
        renderBoard();
        return;
    }

    renderBoard();
}

function checkWinner() {
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
            return board[w[0]];
        }
    }
    return null;
}

function highlightWinner(symbol) {
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
        if (board[w[0]] === symbol && board[w[1]] === symbol && board[w[2]] === symbol) {
            w.forEach(i => {
                const cell = document.querySelector(`.xo-cell[data-index="${i}"]`);
                if (cell) cell.classList.add('win');
            });
            break;
        }
    }
}

function updateTurnIndicator() {
    if (gameOver) return;
    if (isMyTurn) {
        turnIndicator.textContent = '🎯 نوبت شما';
        turnIndicator.style.color = '#00f0ff';
    } else {
        turnIndicator.textContent = '⏳ نوبت حریف';
        turnIndicator.style.color = '#ff6b6b';
    }
    renderBoard();
}

function updatePlayerNames() {
    if (roomCreator) {
        p1Name.textContent = `${playerName} (X)`;
        p2Name.textContent = 'در انتظار... (O)';
    } else {
        p1Name.textContent = 'در انتظار... (X)';
        p2Name.textContent = `${playerName} (O)`;
    }
}

// ============================================================
//  کنترل‌های بازی
// ============================================================
function resetGame() {
    if (!gameOver) {
        if (!confirm('بازی فعلی رو از دست می‌دی، مطمئنی؟')) return;
    }

    // ارسال درخواست ریست به حریف
    sendData({ type: 'reset' });

    // ریست خودمان
    resetBoard();
}

function resetBoard() {
    board = Array(9).fill(null);
    gameOver = false;

    // تعیین نوبت: میزبان (X) همیشه شروع می‌کند
    if (roomCreator) {
        isMyTurn = true;
    } else {
        isMyTurn = false;
    }

    gameStatus.textContent = '🔄 بازی جدید!';
    updateTurnIndicator();
    renderBoard();
    disableBoard(false);
}

function disableBoard(disabled) {
    document.querySelectorAll('.xo-cell').forEach(cell => {
        if (disabled) {
            cell.classList.add('disabled');
            cell.style.cursor = 'not-allowed';
        } else {
            cell.classList.remove('disabled');
            cell.style.cursor = 'pointer';
        }
    });
}

function leaveRoom() {
    if (connection) {
        connection.close();
    }
    if (peer) {
        peer.destroy();
    }
    gamePage.classList.remove('active');
    lobbyPage.classList.add('active');
    inviteBox.style.display = 'none';
    roomIdInput.value = '';
    gameStatus.textContent = '';
}

// ============================================================
//  کپی کد اتاق
// ============================================================
function copyRoomCode() {
    const code = document.getElementById('roomCode').textContent;
    navigator.clipboard.writeText(code).then(() => {
        alert('✅ کد اتاق کپی شد!');
    }).catch(() => {
        // روش جایگزین
        const input = document.createElement('input');
        input.value = code;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
        alert('✅ کد اتاق کپی شد!');
    });
}

// ============================================================
//  راه‌اندازی اولیه
// ============================================================
console.log('🎮 نئون دوز چندنفره با PeerJS');
console.log('📌 برای بازی: یکی اتاق بسازه، دیگری با کد وارد بشه');
