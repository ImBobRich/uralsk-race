const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static('public'));

let players = {};

io.on('connection', (socket) => {
    console.log('Кто-то подключился:', socket.id);

    socket.on('join', (data) => {
        players[socket.id] = { id: socket.id, name: data.name, color: data.color, pos: 0 };
        io.emit('updatePlayers', players);
    });

    socket.on('shake', () => {
        if (players[socket.id]) {
            players[socket.id].pos += 2; // Шаг лошадки за один встрях
            io.emit('updatePlayers', players);
        }
    });

    socket.on('disconnect', () => {
        delete players[socket.id];
        io.emit('updatePlayers', players);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Сервер запущен на порту ${PORT}`));
