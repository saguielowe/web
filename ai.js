class ai_player{
    constructor() {
        this.name = "AI Assistant";
        this.version = "1.0.0";
        this.description = "An AI assistant to help with various tasks.";
    }
    /**
     * 获取 AI 的移动
     * @param {Array} boardState - 当前棋盘状态，二维数组
     * @returns {number} - AI 选择的列索引
     */
     // 这里的 boardState 是一个二维数组，表示 Connect Four 的棋盘状态
     // 例如：boardState[0][0] 表示第一行第一列的格子
     // 如果格子为空，则为 null，否则为 "red" 或 "blue"
    
    get_valid_columns(boardState) {
        // 返回一个还没满的列
        const validCols = [];
        for (let col = 0; col < 7; col++) {
            if (boardState[0][col] === null) {
                validCols.push(col);
            }
        }
        return validCols;
    }
    easy_move(boardState) {
        const validCols = this.get_valid_columns(boardState);
        if (validCols.length === 0) {
            return -1; // 如果没有可用的列，返回 -1
        }
        const randomIndex = Math.floor(Math.random() * validCols.length);
        return validCols[randomIndex];
    }
    // hard_move以后再实现

}