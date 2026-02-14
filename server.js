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
    winner: null,
    countdown: 5
};

// Функция для рассылки состояния (чтобы ничего не зависало)
const broadcast = () => io.emit('updateState', gameState);

io.on('connection', (socket) => {
    const isAdmin = socket.handshake.query.admin === 'true';

    socket.on('join', ({ tableId, teamName }) => {
        socket.tableId = tableId;
        if (!gameState.tables[tableId]) {
            gameState.tables[tableId] = { 
                id: tableId, 
                name: teamName || `Стол №${tableId}`, 
                score: 0 
            };
        }
        broadcast();
    });

    socket.on('shake', () => {
        if (gameState.status !== 'RACING' || !socket.tableId) return;
        const table = gameState.tables[socket.tableId];
        if (table && table.score < 100) {
            table.score += 0.08; // Скорость замедлена
            if (table.score >= 100) {
                table.score = 100;
                gameState.status = 'FINISHED';
                gameState.winner = table.name;
                io.emit('winner', { name: table.name });
            }
        }
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
                // Запускаем интенсивное обновление только во время гонки
                const raceInterval = setInterval(() => {
                    broadcast();
                    if (gameState.status !== 'RACING') clearInterval(raceInterval);
                }, 100);
            }
            broadcast();
        }, 1000);
    });

    socket.on('restart', () => {
        gameState = { status: 'LOBBY', tables: {}, winner: null, countdown: 5 };
        io.emit('gameRestarted');
        broadcast();
    });
});

const PORT = 3000;
server.listen(PORT, () => console.log(`Сервер: http://localhost:${PORT}`));
