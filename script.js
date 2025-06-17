const board = document.getElementById("board");
const ai = new ai_player();  // 创建 AI 玩家实例
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
let moveHistory = [];  // 用于存储悔棋记录

const cells = document.querySelectorAll(".cell");// html的类为一级，名称为二级，属性为三级，形如div.cell.red
cells.forEach(cell => {
  cell.addEventListener("click", () => {
    const col = parseInt(cell.dataset.col);
    handleMove(col);
  });
});

function handleMove(col) {
  console.log("gameOver 状态：", gameOver);
  if (gameOver) {
    alert("游戏已结束，请重新开始！");
    return;  // 如果游戏已经结束，直接返回
  }
  // 从底部向上找空位
  for (let row = 5; row >= 0; row--) {
    const target = document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
    if (!target.classList.contains("red") && !target.classList.contains("blue")) {
      target.classList.add(currentPlayer);
      target.classList.add("falling"); // 添加下落动画类
      setTimeout(() => {
        target.classList.remove("falling"); // 动画结束后移除下落动画
      }, 500); // 假设下落动画持续500毫秒
      boardState[row][col] = currentPlayer;  // 更新数据结构
      moveHistory.push({ row, col, player: currentPlayer });
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
  // 检查水平、垂直和对角线方向的胜利条件
  const directions = [
    { r: 0, c: 1 },   // 水平
    { r: 1, c: 0 },   // 垂直
    { r: 1, c: 1 },   // 主对角线
    { r: 1, c: -1 }   // 副对角线
  ];

  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 7; col++) {
      if (board[row][col] === player) {
        for (const { r, c } of directions) {
          if (checkDirection(board, row, col, r, c, player) === 3) {
            highlightpotentialWin(row, col, r, c, player, 3);  // 高亮潜在胜利位置
          }
          if (checkDirection(board, row, col, r, c, player) === 4) {
            document.getElementById("gameStatus").textContent = "游戏状态：已结束";
            highlightpotentialWin(row, col, r, c, player, 4);  // 高亮潜在胜利位置
            setTimeout(() => { // 第二步，等待落子动画结束后高亮胜利位置
            const r2 = row + r * 3;
            const c2 = col + c * 3;
            highlightWin(row, col, r2, c2, player === "red" ? "crimson" : "dodgerblue");
            setTimeout(() => {
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



function checkDirection(board, row, col, r, c, player) { // 检查在指定方向上的连续棋子数量
  let count = 0;
  for (let i = 0; i < 4; i++) {
    const newRow = row + r * i;
    const newCol = col + c * i;
    if (newRow < 0 || newRow >= 6 || newCol < 0 || newCol >= 7 || board[newRow][newCol] !== player) {
      break;  // 因为我们最多查4个，如果查到3个就越界了返回3，而不是false
    }
    count++;
  }
  return count;
}

function switchPlayer() {
  currentPlayer = currentPlayer === "red" ? "blue" : "red";  // 切换玩家
  document.getElementById("currentPlayer").textContent = `当前玩家: ${currentPlayer}`;  // 更新当前玩家显示
  const aiCol = ai.easy_move(boardState);
  if (currentPlayer === "blue" && !gameOver)  // 如果当前是 AI 的回合且游戏未结束，注意此处默认 AI 蓝方
    handleMove(aiCol); // AI 随机选择一个列进行落子
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
}

function undoMove() {
  if (moveHistory.length <= 1 || gameOver) {
    alert("无法悔棋！");// 一悔悔两步，AI也要撤销一步
    return;
  }

  // 撤销 AI 落子
  const aiMove = moveHistory.pop();
  boardState[aiMove.row][aiMove.col] = null;
  document
    .querySelector(`.cell[data-row="${aiMove.row}"][data-col="${aiMove.col}"]`)
    .classList.remove("red", "blue");

  // 撤销人类落子
  const playerMove = moveHistory.pop();
  boardState[playerMove.row][playerMove.col] = null;
  document
    .querySelector(`.cell[data-row="${playerMove.row}"][data-col="${playerMove.col}"]`)
    .classList.remove("red", "blue");

  currentPlayer = playerMove.player;
  document.getElementById("current-player").textContent = `当前玩家: ${currentPlayer}`;
}
