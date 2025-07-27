from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3, os

DB_FILE = os.path.join(os.path.dirname(__file__), "leaderboard.db")

def init_db():
    conn = sqlite3.connect(DB_FILE)
    conn.execute("""
    CREATE TABLE IF NOT EXISTS scores(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ip TEXT,
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

@app.route("/submit_score", methods=["POST"])
def submit_score():
    user_ip = request.headers.get("X-Forwarded-For", request.remote_addr)
    data = request.json
    score = data.get("score", 0)
    result = 1 if data.get("win", False) else 0  # 前端传 win:true/false

    db = get_db()
    db.execute("INSERT INTO scores(ip, score, result) VALUES (?,?,?)", (user_ip, score, result))
    db.commit()
    return {"status": "ok", "ip": user_ip}

@app.route("/leaderboard")
def leaderboard():
    db = get_db()
    rows = db.execute("""
        SELECT ip,
               SUM(score) as total_score,
               COUNT(*) as total_games,
               SUM(result) as wins
        FROM scores
        GROUP BY ip
        ORDER BY total_score DESC
        LIMIT 10
    """).fetchall()

    return jsonify([
        {
            "ip": r["ip"],
            "total_score": r["total_score"],
            "total_games": r["total_games"],
            "wins": r["wins"],
            "win_rate": round(r["wins"] / r["total_games"] * 100, 1) if r["total_games"] else 0
        }
        for r in rows
    ])

if __name__ == "__main__":
    init_db()
    app.run(host="0.0.0.0", port=5000, debug=True)
