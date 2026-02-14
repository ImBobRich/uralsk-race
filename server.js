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
    countdown: 5
};

const sync = () => io.emit('updateState', gameState);

io.on('connection', (socket) => {
    // Регистрация участника
    socket.on('join', ({ tableId, teamName }) => {
        if (!tableId) return;
        socket.tableId = tableId; // Привязываем ID стола к этому конкретному соединению
        
        if (!gameState.tables[tableId]) {
            gameState.tables[tableId] = { 
                id: tableId, 
                name: teamName || `Стол ${tableId}`, 
                score: 0 
            };
        }
        console.log(`Подключился: ${gameState.tables[tableId].name}`);
        sync();
    });

    // Обработка тряски
    socket.on('shake', () => {
        if (gameState.status !== 'RACING' || !socket.tableId) return;
        
        const table = gameState.tables[socket.tableId];
        if (table && table.score < 100) {
            table.score += 0.2; // Шаг прогресса
            
            if (table.score >= 100) {
                table.score = 100;
                gameState.status = 'FINISHED';
                io.emit('winner', { name: table.name });
                sync();
            }
        }
    });

    // Запуск отсчета (только от админа)
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
                
                // Интенсивная синхронизация во время гонки для исключения фризов
                const raceInterval = setInterval(() => {
                    sync();
                    if (gameState.status !== 'RACING') clearInterval(raceInterval);
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

const PORT = 3000;
server.listen(PORT, () => console.log(`Работаем на порту ${PORT}`));
