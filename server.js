const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname + '/public'));

let gameState = {
    status: 'LOBBY',
    tables: {}, 
    countdown: 5,
    winner: null,
    totalTables: 7 
};

const broadcast = () => io.emit('updateState', gameState);

io.on('connection', (socket) => {
    socket.emit('updateState', gameState);

    socket.on('join', ({ tableId, teamName }) => {
        if (!tableId) return;
        socket.tableId = tableId;
        if (!gameState.tables[tableId]) {
            gameState.tables[tableId] = { id: tableId, name: teamName || `Стол ${tableId}`, score: 0, count: 1 };
        } else {
            gameState.tables[tableId].count++;
        }
        broadcast();
    });

    socket.on('shake', () => {
        if (gameState.status !== 'RACING' || !socket.tableId) return;
        let t = gameState.tables[socket.tableId];
        if (t && t.score < 100) {
            t.score += 0.08; // ЕЩЕ МЕДЛЕННЕЕ ДЛЯ КАЙФА
            if (t.score >= 100) {
                t.score = 100;
                gameState.status = 'FINISHED';
                gameState.winner = t.name;
                broadcast();
            }
        }
    });

    socket.on('adminSetTables', (num) => {
        gameState.totalTables = parseInt(num);
        broadcast();
    });

    socket.on('adminStartCountdown', () => {
        if (gameState.status !== 'LOBBY') return;
        gameState.status = 'COUNTDOWN';
        gameState.countdown = 5;
        broadcast();
        const timer = setInterval(() => {
            gameState.countdown--;
            if (gameState.countdown <= 0) {
                clearInterval(timer);
                gameState.status = 'RACING';
            }
            broadcast();
        }, 1000);
    });

    socket.on('restart', () => {
        gameState = { ...gameState, status: 'LOBBY', tables: {}, winner: null };
        io.emit('gameRestarted');
        broadcast();
    });
});

setInterval(() => { if (gameState.status === 'RACING') broadcast(); }, 50);
server.listen(3000, () => console.log('SERVER OK'));
