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
    winner: null
};

io.on('connection', (socket) => {
    const isAdmin = socket.handshake.query.admin === 'true';

    socket.on('join', ({ tableId, teamName }) => {
        socket.tableId = tableId;
        if (!gameState.tables[tableId]) {
            gameState.tables[tableId] = {
                id: tableId,
                name: teamName || `Стол №${tableId}`,
                score: 0,
                playersCount: 1
            };
        } else {
            gameState.tables[tableId].playersCount++;
        }
        io.emit('updateState', gameState);
    });

    socket.on('shake', () => {
        if (gameState.status !== 'RACING' || !socket.tableId) return;
        const table = gameState.tables[socket.tableId];
        if (table && table.score < 100) {
            table.score += 0.4; // Чуть увеличил скорость прогресса
            if (table.score >= 100) {
                table.score = 100;
                gameState.status = 'FINISHED';
                gameState.winner = table.name;
                io.emit('winner', { name: table.name });
            }
            io.emit('updateState', gameState);
        }
    });

    socket.on('adminStartCountdown', () => {
        gameState.status = 'COUNTDOWN';
        io.emit('updateState', gameState);
    });

    socket.on('adminSetRacing', () => {
        gameState.status = 'RACING';
        io.emit('updateState', gameState);
    });

    socket.on('restart', () => {
        gameState = { status: 'LOBBY', tables: {}, winner: null };
        io.emit('gameRestarted');
        io.emit('updateState', gameState);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server live on ${PORT}`));
