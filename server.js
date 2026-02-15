const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname + '/public'));

// Начальные настройки (сохраняются между играми)
let gameState = {
    status: 'LOBBY',
    tables: {}, 
    countdown: 5,
    winner: null,
    // Настройки из админки
    totalTables: 7,
    maxPlayersPerTable: 3,
    minTeamsToStart: 2,
    speedMultiplier: 1.0
};

const broadcast = () => io.emit('updateState', gameState);

io.on('connection', (socket) => {
    socket.emit('updateState', gameState);

    socket.on('join', ({ tableId, teamName }) => {
        if (!gameState.tables[tableId]) {
            gameState.tables[tableId] = { id: tableId, name: teamName || `Стол ${tableId}`, score: 0, count: 1 };
        } else {
            if (gameState.tables[tableId].count < gameState.maxPlayersPerTable) {
                gameState.tables[tableId].count++;
            } else {
                return socket.emit('errorMsg', 'Команда полная');
            }
        }
        socket.tableId = tableId;
        socket.emit('joinSuccess');
        broadcast();
    });

    socket.on('shake', () => {
        if (gameState.status !== 'RACING' || !socket.tableId) return;
        let t = gameState.tables[socket.tableId];
        if (t && t.score < 100) {
            // Применяем коэффициент скорости
            t.score += (0.5 * gameState.speedMultiplier); 
            if (t.score >= 100) {
                t.score = 100;
                gameState.status = 'FINISHED';
                gameState.winner = t.name;
            }
            broadcast();
        }
    });

    socket.on('adminConfig', (c) => {
        gameState.totalTables = parseInt(c.totalTables);
        gameState.maxPlayersPerTable = parseInt(c.maxPlayers);
        gameState.minTeamsToStart = parseInt(c.minTeams);
        gameState.speedMultiplier = parseFloat(c.speed);
        broadcast();
    });

    socket.on('adminStartCountdown', () => {
        // Проверка на минимальное кол-во команд перед стартом
        if (Object.keys(gameState.tables).length < gameState.minTeamsToStart) return;
        
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
        // Настройки totalTables, maxPlayers и т.д. НЕ СБРАСЫВАЮТСЯ
        io.emit('gameRestarted');
        broadcast();
    });
});

server.listen(3000, () => console.log('SERVER READY: PORT 3000'));
