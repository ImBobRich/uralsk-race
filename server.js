const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static('public'));

let players = {};
let raceActive = true;

io.on('connection', (socket) => {
    socket.on('join', (data) => {
        players[socket.id] = { id: socket.id, name: data.name, pos: 0 };
        io.emit('updatePlayers', players);
    });

    socket.on('shake', () => {
        if (raceActive && players[socket.id]) {
            players[socket.id].pos += 0.15; // Скорость за один встрях
            io.emit('updatePlayers', players);
        }
    });

    socket.on('finish', (data) => {
        raceActive = false;
        io.emit('raceOver', data);
    });

    socket.on('disconnect', () => {
        delete players[socket.id];
        io.emit('updatePlayers', players);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Сервер запущен на порту ${PORT}`));
