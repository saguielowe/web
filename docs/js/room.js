// 获取 URL 参数
document.addEventListener("DOMContentLoaded", function() {
	const urlParams = new URLSearchParams(window.location.search);
	const roomId = urlParams.get('room');
  const oppId = urlParams.get('oppsid');
  const host = urlParams.get('host'); // true表示房主
  if (host === "true" && document.getElementById("startGame")) {
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
});

const board = document.getElementById("board");
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
    handleMove(col);
  });
});

function handleMove(col) {
  window.opener.postMessage({ type: "player-move", col: col }, "*"); // 向父窗口发送玩家落子信息
  lockSettings();  // 锁定设置，防止在游戏进行中修改设置
  document.getElementById("gameStatus").textContent = "游戏状态：进行中";
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
  document.getElementById("win-line").innerHTML = ""; // 清空胜利线
  document.getElementById("currentPlayer").textContent = `当前玩家: ${currentPlayer}`;  // 更新当前玩家显示
  document.getElementById("gameStatus").textContent = "游戏状态：待开始";
  document.querySelectorAll(".cell").forEach(cell => {
    cell.classList.remove("red", "blue", "highlight");  // 清除所有格子的样式
  });
  document.querySelectorAll(".move-number").forEach(e => e.remove());
  unlockSettings();  // 解锁设置，允许修改游戏设置
}

function exportGameData() {
  if (!gameOver) {
    alert("游戏尚未结束，无法导出数据！");
    return;
  }
  if (document.querySelector('input[name="ai"]:checked').value === "backend") {
    ai_difficulty = "AI-困难";
  }
  else {
    ai_difficulty = "AI-简单";
  }
  const data = {
    player1: "Player",
    player2: ai_difficulty,
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
