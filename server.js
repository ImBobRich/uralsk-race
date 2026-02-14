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

// Функция принудительного обновления всех клиентов
const sync = () => io.emit('updateState', gameState);

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
        sync();
    });

    socket.on('shake', () => {
        if (gameState.status !== 'RACING' || !socket.tableId) return;
        const table = gameState.tables[socket.tableId];
        if (table && table.score < 100) {
            table.score += 0.07; // Замедленная скорость для длинной дистанции
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
        sync();

        // Логика отсчета
        const timer = setInterval(() => {
            gameState.countdown--;
            if (gameState.countdown <= 0) {
                clearInterval(timer);
                gameState.status = 'RACING';
                
                // Чтобы игра не замирала, шлем пакеты каждые 100мс принудительно
                const heartBeat = setInterval(() => {
                    sync();
                    if (gameState.status !== 'RACING') clearInterval(heartBeat);
                }, 100);
            }
            sync();
        }, 1000);
    });

    socket.on('restart', () => {
        gameState = { status: 'LOBBY', tables: {}, winner: null, countdown: 5 };
        io.emit('gameRestarted');
        sync();
    });
});

server.listen(3000, () => console.log('Сервер запущен на порту 3000'));
