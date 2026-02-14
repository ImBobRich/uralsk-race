const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname + '/public'));

// Состояние игры
let gameState = {
    tables: {}, // { tableId: { name: "Победители", score: 0, playersCount: 0 } }
    active: true
};

io.on('connection', (socket) => {
    // Игрок выбирает стол
    socket.on('join', ({ tableId, teamName }) => {
        socket.tableId = tableId;
        
        if (!gameState.tables[tableId]) {
            // Если стола еще нет, создаем его (первый игрок — капитан)
            gameState.tables[tableId] = {
                name: teamName || `Стол №${tableId}`,
                score: 0,
                playersCount: 1
            };
        } else {
            // Если стол есть, просто увеличиваем счетчик людей
            gameState.tables[tableId].playersCount++;
        }
        
        // Отправляем всем обновленные данные
        io.emit('updatePlayers', gameState.tables);
    });

    // Регистрация «тряски»
    socket.on('shake', () => {
        if (!gameState.active || !socket.tableId) return;
        
        const table = gameState.tables[socket.tableId];
        if (table && table.score < 100) {
            // Каждая тряска добавляет прогресс. 
            // Коэффициент 0.2 можно менять (чем больше людей, тем меньше число)
            table.score += 0.25; 
            
            if (table.score >= 100) {
                table.score = 100;
                if (gameState.active) {
                    gameState.active = false;
                    io.emit('winner', { name: table.name });
                }
            }
            io.emit('updatePlayers', gameState.tables);
        }
    });

    socket.on('restart', () => {
        gameState.tables = {};
        gameState.active = true;
        io.emit('gameRestarted');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
