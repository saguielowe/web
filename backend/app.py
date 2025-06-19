from flask import Flask, request, jsonify
from flask_cors import CORS
from ai_player import AI
app = Flask(__name__)
CORS(app)  # 允许跨域请求（否则网页访问失败）

@app.route("/ai-move", methods=["POST"])
def ai_move():
    data = request.json
    print("AI 收到请求：", data)  # ✅ 看清传过来了什么

    board = data["board"]
    current_player = (data["currentPlayer"] == "blue")
    current_player = 2 - current_player

    try:
        ai = AI(board)
        move = ai.hard_move()
        (win, lose) = ai.cal_winrate(-1, current_player)
        print("AI 落子：", move, "胜率：", win, "失败率：", lose)
        return jsonify({"move": move, "win": win, "lose": lose})
    except Exception as e:
        print("AI 计算失败：", e)
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True)