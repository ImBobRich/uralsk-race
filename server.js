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
                score: 0 
            };
        }
        io.emit('updateState', gameState);
    });

    socket.on('shake', () => {
        // Тряска работает ТОЛЬКО в режиме RACING
        if (gameState.status !== 'RACING' || !socket.tableId) return;
        
        const table = gameState.tables[socket.tableId];
        if (table && table.score < 100) {
            table.score += 0.4; 
            
            if (table.score >= 100) {
                table.score = 100;
                gameState.status = 'FINISHED';
                gameState.winner = table.name;
                io.emit('winner', { name: table.name });
            }
            // Оптимизация: шлем обновления только во время гонки
            io.emit('updateState', gameState);
        }
    });

    socket.on('adminStartCountdown', () => {
        if (gameState.status !== 'LOBBY') return;
        gameState.status = 'COUNTDOWN';
        io.emit('updateState', gameState);

        let timer = 5;
        const interval = setInterval(() => {
            timer--;
            if (timer <= 0) {
                clearInterval(interval);
                gameState.status = 'RACING';
                io.emit('updateState', gameState);
            }
        }, 1000);
    });

    socket.on('restart', () => {
        gameState = { status: 'LOBBY', tables: {}, winner: null };
        io.emit('gameRestarted');
        io.emit('updateState', gameState);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server started on port ${PORT}`));
