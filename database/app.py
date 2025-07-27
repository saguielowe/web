from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3, os

DB_FILE = os.path.join(os.path.dirname(__file__), "leaderboard.db")

def init_db():
    conn = sqlite3.connect(DB_FILE)
    # 用户表
    conn.execute("""
    CREATE TABLE IF NOT EXISTS users(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT UNIQUE,          -- 前端生成的 UUID
        username TEXT,                -- 可修改昵称
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    """)
    # 对局记录表
    conn.execute("""
    CREATE TABLE IF NOT EXISTS scores(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        score INTEGER,
        result INTEGER,  -- 1=胜，0=负
        played_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    """)
    conn.commit()
    conn.close()

def get_db():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn

app = Flask(__name__)
CORS(app)  # 允许跨域

# 确保用户存在，否则插入新用户
def ensure_user(user_id, username):
    db = get_db()
    row = db.execute("SELECT * FROM users WHERE user_id=?", (user_id,)).fetchone()
    if not row:
        db.execute("INSERT INTO users(user_id, username) VALUES(?,?)", (user_id, username))
        db.commit()

@app.route("/submit_score", methods=["POST"])
def submit_score():
    data = request.json
    user_id = data.get("userId")
    username = data.get("username")    # 提交时带用户名，首次可能是游客_xxxx
    score = data.get("score", 0)
    result = 1 if data.get("win", False) else 0

    if not user_id or not username:
        return jsonify({"status": "error", "message": "缺少 userId 或 username"}), 400

    db = get_db()
    # 确保用户存在
    ensure_user(user_id, username)
    # 插入对局记录
    db.execute("INSERT INTO scores(user_id, score, result) VALUES (?,?,?)",
               (user_id, score, result))
    db.commit()
    return jsonify({"status": "ok", "userId": user_id})

@app.route("/leaderboard")
def leaderboard():
    db = get_db()
    rows = db.execute("""
        SELECT u.username,
               SUM(s.score) as total_score,
               COUNT(s.id) as total_games,
               SUM(s.result) as wins
        FROM users u
        LEFT JOIN scores s ON u.user_id = s.user_id
        GROUP BY u.user_id
        ORDER BY total_score DESC
        LIMIT 10
    """).fetchall()

    return jsonify([
        {
            "username": r["username"],
            "total_score": r["total_score"] or 0,
            "total_games": r["total_games"] or 0,
            "wins": r["wins"] or 0,
            "win_rate": round((r["wins"] or 0) / (r["total_games"] or 1) * 100, 1)
        }
        for r in rows
    ])

@app.route('/update_username', methods=['POST'])
def update_username():
    data = request.get_json()
    user_id = data.get("userId")
    new_username = data.get("newUsername")

    if not user_id or not new_username:
        return jsonify({"status": "error", "message": "参数缺失"}), 400

    db = get_db()
    db.execute("UPDATE users SET username=? WHERE user_id=?", (new_username, user_id))
    db.commit()
    return jsonify({"status": "ok"})

if __name__ == "__main__":
    init_db()
    app.run(host="0.0.0.0", port=5000, debug=True)
