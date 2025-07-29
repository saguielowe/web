// server/server.js
// 注意此代码保存后需要重启服务器才能生效，不会自动热更新
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
    for (const room in rooms) {
      if (rooms[room].players.includes(socket.id)) {
        rooms[room].players = rooms[room].players.filter(id => id !== socket.id);
      }
    }
    roomId = generateUniqueRoomId();  // 确保不重复
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
        if (room.status === "ready") {
          room.status = "interrupt"; // 如果游戏进行时一方离线，则将房间状态设置为“interrupt”
          socket.to(roomId).emit("room-status", { status: "interrupt" });
        }
        else room.status = "waiting"; // 如果还有玩家，则将房间状态设置为“waiting”
      }
    }
    console.log("Client disconnected:", socket.id);
  });
  // 游戏状态控制：rooms[roomId].status
  /*
  创建房间：waiting （一方离线后，若棋局未开始为 waiting，若棋局已开始为 interrupt）
  玩家加入：waiting / interrupt → ready（如果有两个玩家）
  游戏开始：ready
  游戏结束：ready → finished（如果有玩家获胜或平局）
  重新开始：finished → ready（如果玩家重新开始游戏）
  */
  socket.on("join-room", (temp_roomId) => {
    roomId = temp_roomId; // 设置当前用户的房间 ID
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
      if (rooms[roomId].status === "interrupt") { // 如果之前是中断状态，则通知各方继续游戏
        rooms[roomId].status = "ready";
        console.log(`Room ${roomId} is now ready again with players: ${rooms[roomId].players.join(", ")}`);
        socket.to(roomId).emit("room-status", { status: "ready" });
        return;
      }
      rooms[roomId].status = "ready";
      const firstPlayer = randomInt(0, 1); // 随机选择第一个玩家，currentplayer = 0 或 1
      let currentPlayer = firstPlayer; // 随机选择第一个玩家
      console.log(`Game initialized. First player: ${rooms[roomId].players[currentPlayer]}`);
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
      rooms[roomId] = { // 初始化房间信息
        players: rooms[roomId].players,
        status: "ready",
        currentPlayer: currentPlayer, // 设置当前玩家
        boardState: Array.from({ length: 6 }, () => Array(7).fill(null)), // 初始化棋盘状态
        moveHistory: [], // 初始化落子历史
      }
      console.log(`Room ${roomId} is ready with players: ${rooms[roomId].players.join(", ")}`);
    }
  });

  // 监听玩家的落子事件
  /*
  本地处理落子，计算落子位置，向服务器发送落子信息（player-move），并维护落子历史，本地处理高亮。
  服务器仅转达落子位置（update-board），监控游戏状态（game-over），并通知其他玩家。
  */
  socket.on("player-move", (data) => {
    console.log("original data:", data);
    if (rooms[data.roomId].status === "finished") return; // 如果游戏已经结束，则不处理落子
    console.log(`Player ${socket.id} made a move in room ${data.roomId}: row ${data.row}, col ${data.col}`);
    rooms[data.roomId].boardState[data.row][data.column] = rooms[data.roomId].currentPlayer;
    rooms[data.roomId].moveHistory.push(data.row, data.column);
    rooms[data.roomId].currentPlayer = (rooms[data.roomId].currentPlayer + 1) % rooms[data.roomId].players.length; // 切换到下一个玩家
    socket.to(data.roomId).emit("update-board", data);
    if (checkWin(rooms[data.roomId].boardState)) {
      rooms[data.roomId].status = "finished"; // 设置房间状态为“finished”
      socket.emit("game-over", { winner: rooms[data.roomId].players[currentPlayer] });
      socket.to(data.roomId).emit("game-over", { winner: rooms[roomId].players[currentPlayer] });
      console.log(`Game over! Winner: ${rooms[roomId].players[currentPlayer]}`);
    }
    if (rooms[roomId].moveHistory.length >= 42) {
      rooms[data.roomId].status = "finished"; // 设置房间状态为“finished”
      socket.emit("game-over", { winner: null }); // 平局
      socket.to(data.roomId).emit("game-over", { winner: null });
      console.log(`Game over! It's a draw.`);
    }
  });

  // 监听聊天消息
  socket.on("chat-message", (data) => {
    if (data.roomId) {
      socket.to(data.roomId).emit("chat-message", {
        message: data.message,
      });
      console.log(`Chat message from ${socket.id} in room ${data.roomId}: ${data.message}`);
    }
  });
})

// 启动服务
const PORT = process.env.PORT || 4000;
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