// ============================================================
//  متغیرهای جدید برای چت
// ============================================================
let chatMessages = [];

// ============================================================
//  کپی کد اتاق (با کلیک روی باکس)
// ============================================================
function copyRoomCode() {
    const code = roomCodeSpan.textContent;
    if (!code || code === '-----') {
        showToast('❌ کد اتاق پیدا نشد!');
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

// ============================================================
//  چت
// ============================================================
function sendChat() {
    const input = document.getElementById('chatInput');
    const text = input.value.trim();
    if (!text) return;

    const msg = {
        type: 'chat',
        sender: playerName,
        text: text,
        time: new Date().toLocaleTimeString()
    };

    // نمایش در خودمان
    addChatMessage(msg);
    input.value = '';

    // ارسال به همه
    sendAll(msg);
}

function addChatMessage(msg) {
    const container = document.getElementById('chatMessages');
    if (!container) return;

    const div = document.createElement('div');
    div.className = 'msg';
    const isMe = msg.sender === playerName;
    div.innerHTML = `
        <span class="sender ${isMe ? 'me' : ''}">${msg.sender}:</span>
        <span class="text">${msg.text}</span>
    `;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

// ============================================================
//  دریافت داده - اضافه کردن چت
// ============================================================
function handleIncomingData(data, conn) {
    console.log('📩 Received:', data);

    switch (data.type) {
        case 'name':
            // ... کد قبلی ...
            break;
        case 'chat':
            // پیام چت
            addChatMessage(data);
            break;
        case 'move':
            // ... کد قبلی ...
            break;
        case 'reset':
            // ... کد قبلی ...
            break;
        // ... سایر کیس‌ها ...
    }
}

// ============================================================
//  بازی چهار تایی (Connect Four) - کامل
// ============================================================
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

function onCellClick(index) {
    if (gameOver || !isMyTurn) return;

    // چهار تایی: پیدا کردن پایین‌ترین خانه خالی در ستون
    if (selectedGame === 'four') {
        const cols = gameState.cols;
        const col = index % cols;
        let targetRow = -1;
        for (let r = gameState.rows - 1; r >= 0; r--) {
            const idx = r * cols + col;
            if (!board[idx]) {
                targetRow = r;
                break;
            }
        }
        if (targetRow === -1) return; // ستون پر است
        index = targetRow * cols + col;
    }

    if (board[index]) return;

    board[index] = 'X';

    // ارسال حرکت
    sendAll({ type: 'move', index: index, symbol: 'X' });

    isMyTurn = false;
    updateTurnIndicator();
    renderBoardByType();
    checkWinner();
}

function handleMove(data) {
    if (gameOver || isMyTurn) return;

    // چهار تایی: قبلاً موقعیت محاسبه شده
    board[data.index] = data.symbol || 'O';

    isMyTurn = true;
    updateTurnIndicator();
    renderBoardByType();
    checkWinner();
}

// ============================================================
//  بررسی برنده چهار تایی
// ============================================================
function checkFourWinner() {
    const rows = gameState.rows || 6;
    const cols = gameState.cols || 7;

    const checkDirection = (r, c, dr, dc, player) => {
        let count = 0;
        for (let i = -3; i <= 3; i++) {
            const nr = r + i * dr,
                nc = c + i * dc;
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
                const idx = nr * cols + nc;
                if (board[idx] === player) {
                    count++;
                    if (count >= 4) return true;
                } else {
                    count = 0;
                }
            } else {
                count = 0;
            }
        }
        return false;
    };

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const idx = r * cols + c;
            const p = board[idx];
            if (!p) continue;
            if (checkDirection(r, c, 1, 0, p) ||
                checkDirection(r, c, 0, 1, p) ||
                checkDirection(r, c, 1, 1, p) ||
                checkDirection(r, c, 1, -1, p)) {
                return p;
            }
        }
    }
    return null;
}

function checkWinner() {
    if (selectedGame === 'four') {
        const winner = checkFourWinner();
        if (winner) {
            gameOver = true;
            const winnerName = winner === 'X' ? p1Name.textContent : p2Name.textContent;
            gameStatus.textContent = `🏆 ${winnerName} برنده شد!`;
            turnIndicator.textContent = '🎉 بازی تمام شد!';
            renderBoardByType();
            return;
        }
        if (board.every(c => c)) {
            gameOver = true;
            gameStatus.textContent = '🤝 مساوی!';
            turnIndicator.textContent = '😐 بازی مساوی شد';
            renderBoardByType();
            return;
        }
    }
    // ... سایر بازی‌ها ...
}
