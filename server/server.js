// server/server.js
const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const { setTimeout } = require("timers/promises");

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
      socket.to(roomId).emit("start-game", { // 通知所有玩家开始游戏
        roomId: roomId,
        players: rooms[roomId].players,
      });
      socket.emit("start-game", {
        roomId: roomId,
        message: rooms[roomId].players,
      });
      console.log(`Room ${roomId} is ready with players: ${rooms[roomId].players.join(", ")}`);
    }
  });
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