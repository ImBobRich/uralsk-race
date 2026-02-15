const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname + '/public'));

const SETTINGS_FILE = './settings.json';

let gameState = {
    status: 'LOBBY',
    tables: {}, 
    countdown: 5,
    winner: null,
    totalTables: 7,
    maxPlayersPerTable: 3,
    minTeamsToStart: 2,
    speedMultiplier: 1.0
};

// Загрузка
if (fs.existsSync(SETTINGS_FILE)) {
    try {
        const saved = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
        gameState = { ...gameState, ...saved };
    } catch (e) { console.log("Ошибка чтения настроек"); }
}

const broadcast = () => io.emit('updateState', gameState);

io.on('connection', (socket) => {
    socket.emit('updateState', gameState);

    socket.on('join', ({ tableId, teamName }) => {
        if (!gameState.tables[tableId]) {
            gameState.tables[tableId] = { id: tableId, name: teamName || `Стол ${tableId}`, score: 0, count: 1 };
        } else if (gameState.tables[tableId].count < gameState.maxPlayersPerTable) {
            gameState.tables[tableId].count++;
        } else return;
        socket.tableId = tableId;
        socket.emit('joinSuccess');
        broadcast();
    });

    socket.on('shake', () => {
        if (gameState.status !== 'RACING' || !socket.tableId) return;
        let t = gameState.tables[socket.tableId];
        if (t && t.score < 100) {
            t.score += (0.5 * (gameState.speedMultiplier || 1)); 
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
        fs.writeFileSync(SETTINGS_FILE, JSON.stringify({
            totalTables: gameState.totalTables,
            maxPlayersPerTable: gameState.maxPlayersPerTable,
            minTeamsToStart: gameState.minTeamsToStart,
            speedMultiplier: gameState.speedMultiplier
        }));
        broadcast();
    });

    socket.on('restart', () => {
        gameState.status = 'LOBBY';
        gameState.tables = {};
        gameState.winner = null;
        io.emit('gameRestarted');
        broadcast();
    });
});

server.listen(3000, () => console.log('SERVER READY'));
