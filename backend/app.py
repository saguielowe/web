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

    try:
        ai = AI(board)
        move = ai.hard_move()
        print("AI 落子：", move)
        return jsonify({"move": move})
    except Exception as e:
        print("AI 计算失败：", e)
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True)