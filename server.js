const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname + '/public'));

let gameState = { status: 'LOBBY', tables: {}, countdown: 5 };

const sync = () => io.emit('updateState', gameState);

io.on('connection', (socket) => {
    socket.on('join', ({ tableId, teamName }) => {
        if (!tableId) return;
        socket.tableId = tableId;
        if (!gameState.tables[tableId]) {
            gameState.tables[tableId] = { id: tableId, name: teamName || `Стол ${tableId}`, score: 0 };
        }
        sync();
    });

    socket.on('shake', () => {
        if (gameState.status !== 'RACING' || !socket.tableId) return;
        const table = gameState.tables[socket.tableId];
        if (table && table.score < 100) {
            table.score += 0.3; // Шаг скорости
            if (table.score >= 100) {
                table.score = 100;
                gameState.status = 'FINISHED';
                
                // ЗАЩИТА: Шлем победу всем устройствам ПОВТОРНО (5 раз через каждые 100мс)
                // чтобы исключить пропуск события из-за лагов
                let repeat = 0;
                const winnerInterval = setInterval(() => {
                    io.emit('winner', { name: table.name });
                    repeat++;
                    if (repeat > 5) clearInterval(winnerInterval);
                }, 100);

                sync();
            }
        }
    });

    socket.on('adminStartCountdown', () => {
        if (gameState.status !== 'LOBBY') return;
        gameState.status = 'COUNTDOWN';
        gameState.countdown = 5;
        sync();
        const timer = setInterval(() => {
            gameState.countdown--;
            if (gameState.countdown <= 0) {
                clearInterval(timer);
                gameState.status = 'RACING';
                const raceInterval = setInterval(() => {
                    if (gameState.status !== 'RACING') return clearInterval(raceInterval);
                    sync();
                }, 50);
            }
            sync();
        }, 1000);
    });

    socket.on('restart', () => {
        gameState = { status: 'LOBBY', tables: {}, countdown: 5 };
        io.emit('gameRestarted');
        sync();
    });
});

server.listen(3000, () => console.log('SERVER READY'));
