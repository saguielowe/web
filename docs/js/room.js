// 获取 URL 参数
let roomId = null;
let myturn = false; // 是否是先手
let currentPlayer = 0; // 当前玩家，0表示玩家自己，1表示对手
let oppId = null; // 对手ID
let host = false; // 是否是房主
document.addEventListener("DOMContentLoaded", function() {
	const urlParams = new URLSearchParams(window.location.search);
	roomId = urlParams.get('room');
  oppId = urlParams.get('oppsid');
  host = (urlParams.get('host') === "true"); // true表示房主
  myturn = (urlParams.get('first') === "true"); // true表示先手
  currentPlayer = 1 - myturn; // 当前玩家，0表示玩家自己，1表示对手
  console.log("房间号:", roomId, "对手ID:", oppId, "是否房主:", host, "是否先手:", myturn);
  if (myturn) {
    document.getElementById("currentPlayer").textContent = "当前玩家: 你";
  } else { 
    document.getElementById("currentPlayer").textContent = "当前玩家: 对手";
  }
  if (host && document.getElementById("startGame")) {
    document.getElementById("startGame").style.display = "block";
  }
	const roomIdElement = document.getElementById("roomId");
	if (roomIdElement) {
		roomIdElement.textContent = "四子棋 - 房间号: " + roomId;
	}
  const opponentIdElement = document.getElementById("opponent-id");
  if (opponentIdElement) {
    opponentIdElement.textContent = "对手ID: " + oppId;
  }
});
window.addEventListener("message", (event) => {
  const data = event.data;
  if (data.type === "error") {
    console.error("Error from server:", data.message);
    alert("错误: " + data.message);
    if (window.opener && !window.opener.closed) {
      window.opener.focus();
    }
    window.close();
  }
  if (data.type === "update-board") {
    console.log("更新棋盘状态：", data);
    lockSettings();  // 锁定设置，防止在游戏进行中修改设置
    handleMove(data.data.row, data.data.col); // 处理服务器发送的落子
  }
  if (data.type === "game-over") {
    gameOver = true;  // 设置游戏结束标志
    if (data.data.winner !== null) {
      gameResult = data.data.winner === oppId ? 0 : 1; // 0表示对手胜利，1表示玩家胜利
      if (gameResult === 1) {
        document.getElementById("gameStatus").textContent = "游戏结束：你胜利了！";
        playSound("win");
      }
      else {
        document.getElementById("gameStatus").textContent = "游戏结束：对手胜利";
        playSound("lose");
      }
    }
    else {
      gameResult = 2; // 2表示平局
      document.getElementById("gameStatus").textContent = "游戏结束：平局";
    }
    unlockSettings();  // 解锁设置，允许修改游戏设置
  }
  if (data.type === "chat-message") {
    const chatList = document.getElementById("chat-list");
    const li = document.createElement('li');
    li.textContent = data.data.message;
    li.style.textAlign = "left"; // 对手的消息靠左
    chatList.appendChild(li);
  }
  if (data.type === "reset-game") {
    console.log("收到重置游戏请求：", data);
    to_resetGame(data.data.firstPlayer); // 被动重置游戏
  }
});

const board = document.getElementById("board");
let boardState = Array.from({ length: 6 }, () => Array(7).fill(null)); // 初始化棋盘状态
let moveHistory = []; // 初始化落子历史
let gameOver = false; // 游戏结束标志
let gameEnable = true; // 游戏是否可进行
// 初始化棋盘：6行7列，全是 null
for (let row = 0; row < 6; row++) {
  for (let col = 0; col < 7; col++) {
    const cell = document.createElement("div");
    // Create a cell for each position in the 6x7 grid
    cell.classList.add("cell");
    cell.dataset.row = row;
    cell.dataset.col = col;
    board.appendChild(cell);
  }
}
const cells = document.querySelectorAll(".cell");// html的类为一级，名称为二级，属性为三级，形如div.cell.red
cells.forEach(cell => {
  cell.addEventListener("click", () => {
    const col = parseInt(cell.dataset.col);
    calculateMove(col); // 传入 true 表示本地落子
  });
});

function calculateMove(col) { // 本地落子时计算落子位置
  console.log("当前盘面：", boardState);
  if (currentPlayer) {
    alert("请等待对手落子！");
    return;  // 如果是对手的回合，直接返回
  }
  for (let row = 5; row >= 0; row--) {
    if (boardState[row][col] === null) { // 修改数据在handleMove函数中
      window.opener.postMessage({ type: "player-move", row: row, col: col, roomId: roomId }, "*"); // 向父窗口发送玩家落子信息
      handleMove(row, col); // 处理本地落子
      lockSettings(); // 锁定设置，防止在游戏进行中修改设置
      return; // 找到第一个空位后退出
    }
  }
}

function handleMove(row, col) {
  if (gameOver) {
    alert("游戏已结束，请重新开始！");
    return;  // 如果游戏已经结束，直接返回
  }

  lockSettings();  // 锁定设置，防止在游戏进行中修改设置
  document.getElementById("gameStatus").textContent = "游戏状态：进行中";
  document.getElementById("currentPlayer").textContent = `当前玩家: ${currentPlayer === 0 ? "你" : "对手"}`; // 更新当前玩家显示
  const target = document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
  console.log(row, col);
  currentColor = moveHistory.length % 2 === 0 ? "red" : "blue"; // 根据落子历史确定当前玩家
  target.classList.add(currentColor);
  target.classList.add("falling"); // 添加下落动画类
  gameEnable = false;  // 设置游戏不可进行，等待动画结束
      setTimeout(() => {
        gameEnable = true;  // 动画结束后恢复游戏可进行状态
        target.classList.remove("falling"); // 动画结束后移除下落动画
        if (document.getElementById("showMoveNumber").checked) {
          const moveNumber = moveHistory.length;  // 当前是第几步
          const numberTag = document.createElement("span");
          numberTag.classList.add("move-number");
          numberTag.textContent = moveNumber;
          const colors = ["#e74c3c", "#3498db", "#f1c40f", "#2ecc71", "#9b59b6"];
          numberTag.style.color = colors[moveNumber % colors.length];
          target.appendChild(numberTag);
        }
      }, 500); // 假设下落动画持续500毫秒
      boardState[row][col] = currentPlayer;  // 更新数据结构
      moveHistory.push({ row, col});
      // 检查是否有玩家获胜，注意要延后判断
      setTimeout(() => {
          currentPlayer = 1 - currentPlayer; // 切换到下一个玩家
          document.getElementById("currentPlayer").textContent = `当前玩家: ${currentPlayer === 0 ? "你" : "对手"}`; // 更新当前玩家显示
      }, 520);
      return;
}

function highlightpotentialWin(row, col, dr, dc, player, cnt) {
  for (let i = 0; i < cnt; i++) {
    const r = row + dr * i;
    const c = col + dc * i;
    const cell = document.querySelector(`.cell[data-row="${r}"][data-col="${c}"]`);
    console.log(`Highlighting cell at (${r}, ${c}) for player ${player}`);
    if (cell) cell.classList.add("highlight");
  }
}

function highlightWin(r1, c1, r2, c2, color) {
  console.log(r1, c1, r2, c2);
  const cell1 = document.querySelector(`.cell[data-row="${r1}"][data-col="${c1}"]`);
  const cell2 = document.querySelector(`.cell[data-row="${r2}"][data-col="${c2}"]`);
  console.log(cell1, cell2);

  if (!cell1 || !cell2) return;

  const rect1 = cell1.getBoundingClientRect();
  const rect2 = cell2.getBoundingClientRect();

  const x1 = rect1.left + rect1.width / 2;
  const y1 = rect1.top + rect1.height / 2;
  const x2 = rect2.left + rect2.width / 2;
  const y2 = rect2.top + rect2.height / 2;

  const svg = document.getElementById("win-line");
  svg.innerHTML = "";

  const ns = "http://www.w3.org/2000/svg";
  const line = document.createElementNS(ns, "line");
  line.setAttribute("x1", x1);
  line.setAttribute("y1", y1);
  line.setAttribute("x2", x2);
  line.setAttribute("y2", y2);
  line.setAttribute("stroke", color);
  line.setAttribute("stroke-width", "10");
  line.setAttribute("stroke-linecap", "round");

  svg.appendChild(line);
}

function resetGame() {
  // if (!gameOver) {
  //   alert("游戏尚未结束，无法重置！");
  //   return;
  // }
  document.getElementById("win-line").innerHTML = ""; // 清空胜利线
  document.getElementById("currentPlayer").textContent = `当前玩家: 待分配`;  // 更新当前玩家显示
  document.getElementById("gameStatus").textContent = "游戏状态：待开始";
  document.querySelectorAll(".cell").forEach(cell => {
    cell.classList.remove("red", "blue", "highlight");  // 清除所有格子的样式
  });
  document.querySelectorAll(".move-number").forEach(e => e.remove());
  boardState.forEach(row => row.fill(null)); // 重置棋盘状态
  moveHistory = []; // 清空落子历史
  gameOver = false; // 重置游戏结束标志
  window.opener.postMessage({ type: "reset-game", roomId: roomId }, "*"); // 向父窗口发送重置游戏消息，只有房主可以重置游戏，非房主这里只是被动执行
  console.log("重置游戏请求已发送到服务器");
  unlockSettings();  // 解锁设置，允许修改游戏设置
}

function to_resetGame(firstPlayer) {
  // if (!gameOver) {
  //   alert("游戏尚未结束，无法重置！");
  //   return;
  // }
  document.getElementById("win-line").innerHTML = ""; // 清空胜利线
  if (firstPlayer === oppId) {
    currentPlayer = 1; // 如果对手是先手，则当前玩家为1
    document.getElementById("currentPlayer").textContent = `当前玩家: 对手`;  // 更新当前玩家显示
  }
  else {
    currentPlayer = 0; // 如果自己是先手，则当前玩家为0
    document.getElementById("currentPlayer").textContent = `当前玩家: 你`;  // 更新当前玩家显示
  }
  document.getElementById("gameStatus").textContent = "游戏状态：待开始";
  document.querySelectorAll(".cell").forEach(cell => {
    cell.classList.remove("red", "blue", "highlight");  // 清除所有格子的样式
  });
  document.querySelectorAll(".move-number").forEach(e => e.remove());
  boardState.forEach(row => row.fill(null)); // 重置棋盘状态
  moveHistory = []; // 清空落子历史
  gameOver = false; // 重置游戏结束标志
  unlockSettings();  // 解锁设置，允许修改游戏设置
}

function exportGameData() {
  if (!gameOver) {
    alert("游戏尚未结束，无法导出数据！");
    return;
  }
  const data = {
    player1: "Player",
    player2: oppId,
    timestamp: new Date().toISOString().replace("T", " ").slice(0, 19),
    first_player: myturn === 1 ? "Player" : oppId,
    moves: moveHistory,
    result: gameResult  // 假设你已有 result 状态，1/2/0
  };

  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `Player_${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

const winSound = new Audio("win.mp3");
const loseSound = new Audio("lose.mp3");
function playSound(flag) {
  if (flag === "win") {
    winSound.currentTime = 0;
    winSound.play();
  }
  if (flag === "lose") {
    loseSound.currentTime = 0;
    loseSound.play();
  }
}

function updateWinrate(winrate, loserate) {
  const win = winrate / (winrate + loserate);
  const lose = loserate / (winrate + loserate);
  const winRateElement = document.querySelector(".winrate-bar");
  winRateElement.querySelector(".player-a").style.width = `${win * 100}%`;
  winRateElement.querySelector(".player-a").textContent = `${(win * 100).toFixed(1)}%`;
  winRateElement.querySelector(".player-b").style.width = `${lose * 100}%`;
  winRateElement.querySelector(".player-b").textContent = `${(lose * 100).toFixed(1)}%`;
}

function lockSettings() {
  const inputs = document.querySelectorAll("input[type=checkbox], input[type=radio]");
  inputs.forEach(input => {
    input.disabled = true;
  });
}

function unlockSettings() {
  const inputs = document.querySelectorAll("input[type=checkbox], input[type=radio]");
  inputs.forEach(input => {
    input.disabled = false;
  });
}

function sendChat(){
  const chatInput = document.getElementById("chat");
  const message = chatInput.value.trim();
  if (message) {
    console.log("发送聊天信息：", message);
    window.opener.postMessage({ type: "chat-message", message: message, roomId: roomId}, "*"); // 向父窗口发送聊天信息
    chatInput.value = ""; // 清空输入框
    const chatList = document.getElementById("chat-list");
    const li = document.createElement('li');
    li.textContent = message;
    li.style.textAlign = "right";
    chatList.appendChild(li);
  }
}