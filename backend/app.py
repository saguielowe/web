from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room, leave_room
from ai_player import AI
import random, string
app = Flask(__name__)
CORS(app)  # 允许跨域请求（否则网页访问失败）
socketio = SocketIO(app, cors_allowed_origins="*")


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

rooms = {}

def generate_room_id(length=6):
    while True:
        room = ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))
        if room not in rooms:
            return room

@socketio.on("request_create_room")
def handle_create_room():
    room_id = generate_room_id()
    ip = request.remote_addr
    sid = request.sid

    rooms[room_id] = {"players": {ip: sid}, "turn": ip}
    join_room(room_id)
    emit("room_created", {"room": room_id})

@socketio.on("join_room")
def handle_join_room(data):
    room_id = data.get("room")
    ip = request.remote_addr
    sid = request.sid

    if room_id not in rooms or len(rooms[room_id]["players"]) >= 2:
        emit("join_failed", {"message": "房间不存在或已满"})
        return

    rooms[room_id]["players"][ip] = sid
    join_room(room_id)
    emit("join_success", {"room": room_id})

    # 通知双方开始游戏
    emit("start_game", {}, room=room_id)

@socketio.on("player_move")
def handle_player_move(data):
    room_id = data.get("room")
    move = data.get("move")
    ip = request.remote_addr

    if room_id not in rooms:
        return

    # 转发给房间内其他玩家
    emit("opponent_move", {"move": move}, room=room_id, include_self=False)

@socketio.on("disconnect")
def handle_disconnect():
    sid = request.sid
    for room_id, info in list(rooms.items()):
        for ip, psid in info["players"].items():
            if psid == sid:
                leave_room(room_id)
                del info["players"][ip]
                if not info["players"]:
                    del rooms[room_id]  # 房间没人了，删除
                else:
                    emit("opponent_disconnected", {}, room=room_id)
                break


if __name__ == "__main__":
    app.run(debug=True)
    socketio.run(app, host="0.0.0.0", port=5000, debug=True)  # 使用 SocketIO 运行 Flask 应用