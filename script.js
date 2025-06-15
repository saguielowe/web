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

const cells = document.querySelectorAll(".cell");
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
      boardState[row][col] = currentPlayer;  // 更新数据结构
      // 检查是否有玩家获胜，注意要延后判断
      setTimeout(() => {
  if (checkWin(boardState, currentPlayer) === 1) {
    alert(`${currentPlayer === "red" ? "红方" : "蓝方"} 获胜！`);
    gameOver = true;  // 设置游戏结束标志
  } else {
    switchPlayer();
  }
      }, 80);
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
          if (checkDirection(board, row, col, r, c, player) === 4) {
            return 1;  // 返回1表示有玩家获胜
          }
        }
      }
    }
  }
  return -1;  // 没有玩家获胜
}
function checkDirection(board, row, col, r, c, player) {
  let count = 0;
  for (let i = 0; i < 4; i++) {
    const newRow = row + r * i;
    const newCol = col + c * i;
    if (newRow < 0 || newRow >= 6 || newCol < 0 || newCol >= 7 || board[newRow][newCol] !== player) {
      return false;  // 越界或不匹配
    }
    count++;
  }
  return count;
}

function switchPlayer() {
  currentPlayer = currentPlayer === "red" ? "blue" : "red";  // 切换玩家
  document.getElementById("currentPlayer").textContent = `当前玩家: ${currentPlayer}`;  // 更新当前玩家显示
  const aiCol = getRandomMove(boardState);
  handleMove(aiCol); // AI 随机选择一个列进行落子
}

function resetGame() {
  boardState = Array.from({ length: 6 }, () => Array(7).fill(null));  // 重置棋盘状态
  gameOver = false;  // 重置游戏结束标志
  currentPlayer = "red";  // 重置当前玩家为红方
  document.getElementById("currentPlayer").textContent = `当前玩家: ${currentPlayer}`;  // 更新当前玩家显示
  document.querySelectorAll(".cell").forEach(cell => {
    cell.classList.remove("red", "blue");
  });
}

function getRandomMove(boardState) {
  // 返回一个还没满的列
  const validCols = [];
  for (let col = 0; col < 7; col++) {
    if (boardState[0][col] === null) {
      validCols.push(col);
    }
  }
  const randomIndex = Math.floor(Math.random() * validCols.length);
  return validCols[randomIndex];
}
