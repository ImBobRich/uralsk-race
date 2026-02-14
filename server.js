const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname + '/public'));

// Состояние игры: LOBBY (регистрация), COUNTDOWN (отсчет), RACING (скачки), FINISHED (финал)
let gameState = {
    status: 'LOBBY', 
    tables: {},
    winner: null
};

io.on('connection', (socket) => {
    const isAdmin = socket.handshake.query.admin === 'true';

    // Вход игрока в команду стола
    socket.on('join', ({ tableId, teamName }) => {
        socket.tableId = tableId;
        if (!gameState.tables[tableId]) {
            gameState.tables[tableId] = {
                id: tableId,
                name: teamName || `Стол №${tableId}`,
                score: 0
            };
        }
        io.emit('updateState', gameState);
    });

    // Обработка тряски
    socket.on('shake', () => {
        if (gameState.status !== 'RACING' || !socket.tableId) return;
        
        const table = gameState.tables[socket.tableId];
        if (table && table.score < 100) {
            table.score += 0.4; // Чувствительность скачек
            
            if (table.score >= 100) {
                table.score = 100;
                gameState.status = 'FINISHED';
                gameState.winner = table.name;
                io.emit('winner', { name: table.name });
            }
            io.emit('updateState', gameState);
        }
    });

    // Админ запускает обратный отсчет
    socket.on('adminStartCountdown', () => {
        if (gameState.status !== 'LOBBY') return;
        
        gameState.status = 'COUNTDOWN';
        io.emit('updateState', gameState);

        let timer = 5;
        const countdownInterval = setInterval(() => {
            timer--;
            if (timer <= 0) {
                clearInterval(countdownInterval);
                gameState.status = 'RACING';
                io.emit('updateState', gameState); // Рассылаем команду START всем
            }
        }, 1000);
    });

    // Сброс игры
    socket.on('restart', () => {
        gameState = { status: 'LOBBY', tables: {}, winner: null };
        io.emit('gameRestarted');
        io.emit('updateState', gameState);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Сервер запущен на порту ${PORT}`));
