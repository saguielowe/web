const board = document.getElementById("board");

for (let row = 0; row < 6; row++) {
  for (let col = 0; col < 7; col++) {
    const cell = document.createElement("div");
    cell.classList.add("cell");
    cell.dataset.row = row;
    cell.dataset.col = col;
    board.appendChild(cell);
  }
}
