const board = document.getElementById("board");
// 初始化棋盘：6行7列，全是 null
let boardState = Array.from({ length: 6 }, () => Array(7).fill(null));
let gameOver = false;  // 游戏是否结束
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

let currentPlayer = "red";  // 当前玩家颜色，可为 "red" 或 "blue"
let gameEnable = true;  // 游戏是否可进行
let moveHistory = [];  // 用于存储悔棋记录
let gameResult = 0;  // 游戏结果，0表示平局，1表示红方胜利，2表示蓝方胜利
const cells = document.querySelectorAll(".cell");// html的类为一级，名称为二级，属性为三级，形如div.cell.red
cells.forEach(cell => {
  cell.addEventListener("click", () => {
    const col = parseInt(cell.dataset.col);
    handleMove(col);
  });
});

function handleMove(col) {
  if (gameOver) {
    alert("游戏已结束，请重新开始！");
    return;  // 如果游戏已经结束，直接返回
  }
  if (moveHistory.length >= 42) {
    alert("游戏平局！");
    gameOver = true;  // 设置游戏结束标志
    return;  // 如果棋盘已满，直接返回
  }
  if (!gameEnable) {
    alert("请等待动画完毕后再落子！");
    return;  // 如果游戏未开始或已结束，直接返回
  }
  // 从底部向上找空位
  for (let row = 5; row >= 0; row--) {
    const target = document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
    if (!target.classList.contains("red") && !target.classList.contains("blue")) {
      target.classList.add(currentPlayer);
      target.classList.add("falling"); // 添加下落动画类
      gameEnable = false;  // 设置游戏不可进行，等待动画结束
      setTimeout(() => {
        gameEnable = true;  // 动画结束后恢复游戏可进行状态
        target.classList.remove("falling"); // 动画结束后移除下落动画
        const moveNumber = moveHistory.length;  // 当前是第几步
        const numberTag = document.createElement("span");
        numberTag.classList.add("move-number");
        numberTag.textContent = moveNumber;
        const colors = ["#e74c3c", "#3498db", "#f1c40f", "#2ecc71", "#9b59b6"];
        numberTag.style.color = colors[moveNumber % colors.length];
        target.appendChild(numberTag);
      }, 500); // 假设下落动画持续500毫秒
      boardState[row][col] = currentPlayer;  // 更新数据结构
      moveHistory.push({ row, col});
      // 检查是否有玩家获胜，注意要延后判断
      setTimeout(() => {
        if (checkWin(boardState, currentPlayer) === 1) {
        gameOver = true;  // 设置游戏结束标志
        } else {
        switchPlayer();
      }
      }, 520);
      return;
    }
  }

  // 如果执行到这里说明该列已满
  alert("该列已经满了，请选择其他列！");
}

function checkWin(board, player) {
  document.querySelectorAll(".cell").forEach(cell => {
    cell.classList.remove("highlight");  // 清除所有格子的高亮
  });
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
          if (checkDirection(board, row, col, r, c, "red") === 3.5) {
            highlightpotentialWin(row, col, r, c, "red", 3);  // 高亮潜在胜利位置
          }
          if (checkDirection(board, row, col, r, c, "blue") === 3.5) {
            highlightpotentialWin(row, col, r, c, "blue", 3);  // 高亮潜在胜利位置
          }
          if (checkDirection(board, row, col, r, c, player) === 4) {
            document.getElementById("gameStatus").textContent = "游戏状态：已结束";
            highlightpotentialWin(row, col, r, c, player, 4);  // 高亮潜在胜利位置
            if (player === "red") {
              playSound("win")
            }
            if (player === "blue") {
              playSound("lose")
            }
            setTimeout(() => { // 第二步，等待落子动画结束后高亮胜利位置
            const r2 = row + r * 3;
            const c2 = col + c * 3;
            highlightWin(row, col, r2, c2, player === "red" ? "orange" : "dodgerblue");
            setTimeout(() => {
              gameResult = currentPlayer === "red" ? 1 : 2;
              alert(`${player === "red" ? "红方" : "蓝方"}获胜！`);
            }, 500);  // 第三步，等待胜利动画结束后弹出获胜提示
            }, 520);
            return 1;  // 无视延时，返回1表示有玩家获胜
          }
        }
      }
    }
  }
  return -1;  // 没有玩家获胜
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


function switchPlayer() {
  currentPlayer = currentPlayer === "red" ? "blue" : "red";  // 切换玩家
  document.getElementById("currentPlayer").textContent = `当前玩家: ${currentPlayer}`;  // 更新当前玩家显示
  if (boardState.length === 42) {
    gameOver = true;  // 如果棋盘已满，设置游戏结束标志
    gameResult = 0;  // 设置游戏结果为平局
    alert("游戏平局！");  // 弹出平局提示
  }
  if (currentPlayer === "blue" && !gameOver)  // 如果当前是 AI 的回合且游戏未结束，注意此处默认 AI 蓝方
    if (document.querySelector('input[name="ai"]:checked').value === "backend") {
      handleMove(aiTurn(boardState)); // AI 随机选择一个列进行落子
    }
    else {
      handleMove(Math.floor(Math.random() * 7)); // AI 随机选择一个列进行落子
    }
}

function convertBoardForPython(board) {
  return board.map(row =>
    row.map(cell => {
      if (cell === "red") return 1;
      if (cell === "blue") return 2;
      return 0;
    })
  );
}


// AI 落子主函数（蓝方），只调用一次
async function aiTurn() {
  try {
    // 等待 Python Flask 后端返回 move: [row, col]
    const move = await requestAIMove(boardState);

    // 使用已有的落子函数（传入列）
    handleMove(move);  // 只传列，handleMove 内部负责落子、更新状态
  } catch (err) {
    console.error("AI 请求失败：", err);
    alert("AI 思考失败，请检查后端服务是否启动！");
  }
}

async function requestAIMove(boardState) {
  const response = await fetch("http://localhost:5000/ai-move", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ board: convertBoardForPython(boardState) })
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const data = await response.json();
  return data.move;
}


function resetGame() {
  boardState = Array.from({ length: 6 }, () => Array(7).fill(null));  // 重置棋盘状态
  gameOver = false;  // 重置游戏结束标志
  currentPlayer = "red";  // 重置当前玩家为红方
  moveHistory = [];  // 清空悔棋记录
  document.getElementById("win-line").innerHTML = ""; // 清空胜利线
  document.getElementById("currentPlayer").textContent = `当前玩家: ${currentPlayer}`;  // 更新当前玩家显示
  document.getElementById("gameStatus").textContent = "游戏状态：进行中";
  document.querySelectorAll(".cell").forEach(cell => {
    cell.classList.remove("red", "blue", "highlight");  // 清除所有格子的样式
  });
  document.querySelectorAll(".move-number").forEach(e => e.remove());
}

function undoMove() {
  if (moveHistory.length <= 1 || gameOver) {
    alert("无法悔棋！");// 一悔悔两步，AI也要撤销一步
    return;
  }
  document.querySelectorAll(".cell").forEach(cell => {
    cell.classList.remove("highlight");  // 清除所有格子的高亮
  });
  // 撤销 AI 落子
  const aiMove = moveHistory.pop();
  boardState[aiMove.row][aiMove.col] = null;
  document
    .querySelector(`.cell[data-row="${aiMove.row}"][data-col="${aiMove.col}"]`)
    .classList.remove("red", "blue");
  document.querySelector(`.cell[data-row="${aiMove.row}"][data-col="${aiMove.col}"]`)
    .querySelector(".move-number").remove(); // 移除落子数字标记

  // 撤销人类落子
  const playerMove = moveHistory.pop();
  boardState[playerMove.row][playerMove.col] = null;
  document
    .querySelector(`.cell[data-row="${playerMove.row}"][data-col="${playerMove.col}"]`)
    .classList.remove("red", "blue");
  document.querySelector(`.cell[data-row="${playerMove.row}"][data-col="${playerMove.col}"]`)
    .querySelector(".move-number").remove(); // 移除落子数字标记
  checkWin(boardState, currentPlayer);  // 检查是否有玩家获胜  
}

function exportGameData() {
  if (!gameOver) {
    alert("游戏尚未结束，无法导出数据！");
    return;
  }
  const data = {
    player1: "Player",
    player2: "AI",
    timestamp: new Date().toISOString().replace("T", " ").slice(0, 19),
    first_player: "Player",
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

function toggleTheme() {
  document.body.classList.toggle("dark-theme");
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
