// server/server.js
const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const { setTimeout } = require("timers/promises");
const { randomInt } = require("crypto");

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  }
});

const rooms = {};

// 示例 socket.io 通信
io.on("connection", (socket) => {
  console.log("New client connected:", socket.id);

  socket.on("create-room", () => {
    // 检查是否已经在房间中，如果是，则先将其从所有房间中移除
    for (const roomId in rooms) {
      if (rooms[roomId].players.includes(socket.id)) {
        rooms[roomId].players = rooms[roomId].players.filter(id => id !== socket.id);
      }
    }
    const roomId = generateUniqueRoomId();  // 确保不重复
    rooms[roomId] = {
        players: [socket.id],
        status: "waiting"
    };

    socket.join(roomId);
    socket.emit("room-created", roomId);
    console.log(`房间 ${roomId} 已创建，玩家 ${socket.id} 加入`);
  });

  socket.on("disconnect", () => {
    // 从所有房间中移除用户
    for (const roomId in rooms) {
      const room = rooms[roomId];
      room.players = room.players.filter(playerId => playerId !== socket.id);
      if (room.players.length === 0) {
        delete rooms[roomId]; // 如果房间没有玩家，则删除房间
        console.log(`房间 ${roomId} 已被删除`);//TODO 这里可以延迟删除房间。
      } else {
        socket.to(roomId).emit("opponent-left", {
          message: `${socket.id} has left the room`,
        });
        room.status = "waiting"; // 如果还有玩家，则将房间状态设置为“waiting”
      }
    }
    console.log("Client disconnected:", socket.id);
  });

  socket.on("join-room", (roomId) => {
    // 检查房间是否存在
    if (!rooms[roomId]) {
      socket.emit("room-error", {
        message: `Room ${roomId} does not exist, please create it first.`,
        errortype: "room-not-found",
      });
      return;
    }

    // 将用户加入房间
    rooms[roomId].players.push(socket.id);
    socket.join(roomId);

    // 向当前用户反馈连接成功
    socket.emit("room-joined", {
      message: `Joined room ${roomId} successfully`,
      roomId: roomId,
    });
    // 向其他用户发送通知
    socket.to(roomId).emit("room-message", {
        message: `${socket.id} has joined the room`,
    });
    console.log(`${socket.id} joined room ${roomId}`);

    if (rooms[roomId].players.length === 2) { // 如果房间内有两个玩家，则将房间状态设置为“ready”
      rooms[roomId].status = "ready";
      randomInt(0, 1).then((firstPlayer) => {
        let currentPlayer = firstPlayer; // 随机选择第一个玩家
        console.log(`Game initialized. First player: ${players[currentPlayer]}`);
        socket.to(roomId).emit("start-game", { // 通知所有玩家开始游戏
          roomId: roomId,
          players: rooms[roomId].players,
          firstPlayer: rooms[roomId].players[firstPlayer],
        });
        socket.emit("start-game", {
          roomId: roomId,
          players: rooms[roomId].players, //players[0]是房主
          firstPlayer: rooms[roomId].players[firstPlayer],
        });
        console.log(`Room ${roomId} is ready with players: ${rooms[roomId].players.join(", ")}`);
        initGame(firstPlayer); // 初始化游戏
    });
  }

});

// 启动服务
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

function generateUniqueRoomId(length = 6) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let id;

  do {
    id = Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  } while (rooms[id]);

  return id;
}
// 生成唯一房间 ID 的函数
function initGame(firstPlayer) {
  // 游戏初始化逻辑
  const board = document.getElementById("board");
  let boardState = Array.from({ length: 6 }, () => Array(7).fill(null));
  let gameOver = false;  // 游戏是否结束
  let currentPlayer = firstPlayer; // 随机选择第一个玩家
  console.log(`Game initialized. First player: ${players[currentPlayer]}`);
  // 监听玩家的落子事件
  socket.on("player-move", (data) => {
    if (gameOver) return; // 如果游戏已经结束，则不处理落子

    const { column, playerId } = data;
    if (players[currentPlayer] !== playerId) {
      console.log(`It's not player ${playerId}'s turn.`);
      return; // 如果不是当前玩家的回合，则忽略
    }
    // 落子逻辑
    for (let row = 5; row >= 0; row--) {
      if (!boardState[row][column]) {
        boardState[row][column] = currentPlayer;
        moveHistory.push({ row, column, currentPlayer });
        socket.emit("update-board", { boardState, currentPlayer });
        console.log(`Player ${playerId} placed a piece in column ${column}`);
        gameOver = checkWin(boardState);
        if (gameOver) {
          socket.emit("game-over", { winner: players[currentPlayer], boardState });
          console.log(`Game over! Winner: ${players[currentPlayer]}`);
        }
        currentPlayer = (currentPlayer + 1) % players.length; // 切换到下一个玩家
        return; // 成功落子后退出循环
      }
    }
    console.log(`Column ${column} is full. Player ${playerId} cannot place a piece.`);
    });
  }
});

function checkDirection(board, row, col, dr, dc, player) {
  let count = 0;

  for (let i = 0; i < 4; i++) {
    const r = row + dr * i;
    const c = col + dc * i;

    // 越界直接失败
    if (r < 0 || r >= 6 || c < 0 || c >= 7) return count;

    const cell = board[r][c];

    if (cell === player) {
      count++;
    } else if (cell === null && i === 3) {
      // 第4格是空，前三个是我方 → 潜力三连
      return 3.5;
    } else {
      // 中间断了（空或对手），直接返回当前计数
      return count;
    }
  }

  return count; // 能走到这里，说明是完整4连
}

function checkWin(board, player) {
  // 检查水平、垂直和对角线方向的胜利条件
  const directions = [
    { r: 0, c: 1 },   // 水平
    { r: 0, c: -1 },  // 水平反向
    { r: 1, c: 0 },   // 垂直
    { r: -1, c: 0 },  // 垂直反向
    { r: 1, c: 1 },   // 主对角线
    { r: -1, c: -1 }, // 主对角线反向
    { r: 1, c: -1 },   // 副对角线
    { r: -1, c: 1 }   // 副对角线反向
  ];

  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 7; col++) {
      if (board[row][col] != null) {
        for (const { r, c } of directions) {
          if (checkDirection(board, row, col, r, c, player) === 4) {
            // 如果找到4连，发出游戏结束报文
            return player;
          }
        }
      }
    }
  }
  return 0;
}