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
    totalTables: 7,
    maxPlayersPerTable: 3 
};

const broadcast = () => io.emit('updateState', gameState);

io.on('connection', (socket) => {
    socket.emit('updateState', gameState);

    socket.on('join', ({ tableId, teamName }) => {
        if (!tableId) return;
        const currentCount = gameState.tables[tableId] ? gameState.tables[tableId].count : 0;
        if (currentCount >= gameState.maxPlayersPerTable) {
            socket.emit('errorMsg', 'В этой команде уже максимум игроков!');
            return;
        }
        socket.tableId = tableId;
        if (!gameState.tables[tableId]) {
            gameState.tables[tableId] = { 
                id: tableId, 
                name: teamName || `Стол ${tableId}`, 
                score: 0, 
                count: 1 
            };
        } else {
            gameState.tables[tableId].count++;
        }
        socket.emit('joinSuccess');
        broadcast();
    });

    socket.on('shake', () => {
        if (gameState.status !== 'RACING' || !socket.tableId) return;
        let t = gameState.tables[socket.tableId];
        if (t && t.score < 100) {
            t.score += 0.15; // Баланс под 3 игрока
            if (t.score >= 100) {
                t.score = 100;
                gameState.status = 'FINISHED';
                gameState.winner = t.name;
                broadcast();
            }
        }
    });

    socket.on('adminConfig', ({ totalTables, maxPlayers }) => {
        gameState.totalTables = parseInt(totalTables) || 7;
        gameState.maxPlayersPerTable = parseInt(maxPlayers) || 3;
        broadcast();
    });

    socket.on('adminStartCountdown', () => {
        if (gameState.status !== 'LOBBY' || Object.keys(gameState.tables).length === 0) return;
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
        gameState.status = 'LOBBY';
        gameState.tables = {};
        gameState.winner = null;
        gameState.countdown = 5;
        io.emit('gameRestarted');
        broadcast();
    });
});

setInterval(() => { if (gameState.status === 'RACING') broadcast(); }, 50);

const PORT = 3000;
server.listen(PORT, () => console.log(`SERVER OK: http://localhost:3000`));
