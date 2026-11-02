from flask import Flask, request, jsonify, render_template
import mysql.connector
from werkzeug.security import generate_password_hash, check_password_hash
import secrets
import datetime

app = Flask(__name__)

# ---------- CONFIG (edit these) ----------
DB_HOST = "localhost"
DB_USER = "root"              # or skillswap_user
DB_PASSWORD = "root123"              # your mysql password
DB_NAME = "skillswap"
DB_PORT = 3306

TOKEN_TTL_HOURS = 24
# ----------------------------------------


def get_conn():
    return mysql.connector.connect(
        host=DB_HOST,
        user=DB_USER,
        password=DB_PASSWORD,
        database=DB_NAME,
        port=DB_PORT,
    )


def create_session(user_id: int) -> str:
    token = secrets.token_urlsafe(48)  # fits in varchar(128)
    expires_at = datetime.datetime.utcnow() + datetime.timedelta(hours=TOKEN_TTL_HOURS)

    conn = get_conn()
    cur = conn.cursor()
    try:
        cur.execute(
            "INSERT INTO sessions (token, user_id, expires_at) VALUES (%s, %s, %s)",
            (token, user_id, expires_at),
        )
        conn.commit()
        return token
    finally:
        cur.close()
        conn.close()


def get_user_id_from_token():
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return None

    token = auth.split(" ", 1)[1].strip()
    if not token:
        return None

    conn = get_conn()
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute(
            "SELECT user_id, expires_at FROM sessions WHERE token=%s",
            (token,),
        )
        row = cur.fetchone()
        if not row:
            return None

        expires_at = row["expires_at"]
        if expires_at is not None:
            # expires_at from MySQL is usually naive datetime; compare with utcnow() naive
            if expires_at < datetime.datetime.utcnow():
                # session expired -> delete it
                cur2 = conn.cursor()
                cur2.execute("DELETE FROM sessions WHERE token=%s", (token,))
                conn.commit()
                cur2.close()
                return None

        return int(row["user_id"])
    finally:
        cur.close()
        conn.close()


def require_auth():
    uid = get_user_id_from_token()
    if not uid:
        return None, (jsonify({"message": "Unauthorized"}), 401)
    return uid, None


# -------------------- PAGES (templates) --------------------
@app.get("/")
def home():
    return render_template("index.html")

@app.get("/index.html")
def index():
    return render_template("index.html")

@app.get("/login.html")
def login_page():
    return render_template("login.html")

@app.get("/register.html")
def register_page():
    return render_template("register.html")

@app.get("/dashboard.html")
def dashboard_page():
    return render_template("dashboard.html")

@app.get("/community.html")
def community_page():
    return render_template("community.html")

@app.get("/profile.html")
def profile_page():
    return render_template("profile.html")


# -------------------- API --------------------

@app.post("/api/register")
def api_register():
    data = request.get_json(force=True)
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not name or not email or not password:
        return jsonify({"message": "name, email, password are required"}), 400

    pw_hash = generate_password_hash(password)

    conn = get_conn()
    cur = conn.cursor(dictionary=True)
    try:
        try:
            cur.execute(
                "INSERT INTO users (name, email, password_hash) VALUES (%s, %s, %s)",
                (name, email, pw_hash),
            )
            conn.commit()
        except mysql.connector.IntegrityError:
            return jsonify({"message": "Email already registered"}), 409

        user_id = cur.lastrowid
        token = create_session(user_id)
        return jsonify({"token": token}), 201
    finally:
        cur.close()
        conn.close()


@app.post("/api/login")
def api_login():
    data = request.get_json(force=True)
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not email or not password:
        return jsonify({"message": "email and password are required"}), 400

    conn = get_conn()
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute("SELECT id, password_hash FROM users WHERE email=%s", (email,))
        row = cur.fetchone()
        if not row or not check_password_hash(row["password_hash"], password):
            return jsonify({"message": "Invalid email or password"}), 401

        token = create_session(row["id"])
        return jsonify({"token": token}), 200
    finally:
        cur.close()
        conn.close()


@app.get("/api/me")
def api_me():
    uid, err = require_auth()
    if err:
        return err

    conn = get_conn()
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute("SELECT id, name, email, bio, created_at FROM users WHERE id=%s", (uid,))
        user = cur.fetchone()
        return jsonify(user), 200
    finally:
        cur.close()
        conn.close()


@app.get("/api/me/skills")
def api_me_skills():
    uid, err = require_auth()
    if err:
        return err

    conn = get_conn()
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute(
            """
            SELECT us.skill_type, us.level,
                   s.id AS skill_id,
                   s.name AS skill_name
            FROM user_skills us
            JOIN skills s ON s.id = us.skill_id
            WHERE us.user_id = %s
            ORDER BY us.skill_type, s.name
            """,
            (uid,),
        )
        rows = cur.fetchall()
        return jsonify(rows), 200
    finally:
        cur.close()
        conn.close()


@app.post("/api/me/skills")
def api_add_skill():
    uid, err = require_auth()
    if err:
        return err

    data = request.get_json(force=True)
    skill_name = (data.get("skill_name") or "").strip()
    skill_type = (data.get("skill_type") or "").strip().lower()
    level = data.get("level", None)

    if not skill_name or skill_type not in ("offer", "want"):
        return jsonify({"message": "skill_name and skill_type (offer/want) are required"}), 400

    if level is not None and level != "":
        try:
            level = int(level)
            if level < 1 or level > 5:
                return jsonify({"message": "level must be 1 to 5"}), 400
        except ValueError:
            return jsonify({"message": "level must be a number"}), 400
    else:
        level = None

    conn = get_conn()
    cur = conn.cursor(dictionary=True)
    try:
        # create skill if not exists
        cur.execute("INSERT IGNORE INTO skills (name) VALUES (%s)", (skill_name,))
        conn.commit()

        cur.execute("SELECT id FROM skills WHERE name=%s", (skill_name,))
        skill_id = cur.fetchone()["id"]

        # upsert into user_skills
        cur.execute(
            """
            INSERT INTO user_skills (user_id, skill_id, skill_type, level)
            VALUES (%s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE level=VALUES(level)
            """,
            (uid, skill_id, skill_type, level),
        )
        conn.commit()

        return jsonify({"ok": True, "skill_id": skill_id}), 201
    finally:
        cur.close()
        conn.close()


@app.delete("/api/me/skills")
def api_delete_skill():
    uid, err = require_auth()
    if err:
        return err

    data = request.get_json(force=True)
    skill_id = data.get("skill_id")
    skill_type = (data.get("skill_type") or "").strip().lower()

    if not skill_id or skill_type not in ("offer", "want"):
        return jsonify({"message": "skill_id and skill_type are required"}), 400

    conn = get_conn()
    cur = conn.cursor()
    try:
        cur.execute(
            "DELETE FROM user_skills WHERE user_id=%s AND skill_id=%s AND skill_type=%s",
            (uid, skill_id, skill_type),
        )
        conn.commit()
        return jsonify({"ok": True}), 200
    finally:
        cur.close()
        conn.close()


@app.get("/api/users/<int:user_id>")
def api_user_profile(user_id: int):
    uid, err = require_auth()
    if err:
        return err

    conn = get_conn()
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute("SELECT id, name, email, bio FROM users WHERE id=%s", (user_id,))
        user = cur.fetchone()
        if not user:
            return jsonify({"message": "User not found"}), 404

        cur.execute(
            """
            SELECT us.skill_type, us.level,
                   s.id AS skill_id,
                   s.name AS skill_name
            FROM user_skills us
            JOIN skills s ON s.id = us.skill_id
            WHERE us.user_id = %s
            ORDER BY us.skill_type, s.name
            """,
            (user_id,),
        )
        skills = cur.fetchall()

        # IMPORTANT: frontend expects skills at top level: data.skills
        user["skills"] = skills
        return jsonify(user), 200
    finally:
        cur.close()
        conn.close()


@app.get("/api/matches")
def api_matches():
    uid, err = require_auth()
    if err:
        return err

    conn = get_conn()
    cur = conn.cursor(dictionary=True)
    try:
        # my offers & wants
        cur.execute(
            """
            SELECT us.skill_type, s.name AS skill_name
            FROM user_skills us
            JOIN skills s ON s.id = us.skill_id
            WHERE us.user_id = %s
            """,
            (uid,),
        )
        mine = cur.fetchall()
        my_offers = {r["skill_name"] for r in mine if r["skill_type"] == "offer"}
        my_wants = {r["skill_name"] for r in mine if r["skill_type"] == "want"}

        # everyone else skills
        cur.execute(
            """
            SELECT u.id AS user_id, u.name, u.bio,
                   us.skill_type, s.name AS skill_name
            FROM users u
            LEFT JOIN user_skills us ON us.user_id = u.id
            LEFT JOIN skills s ON s.id = us.skill_id
            WHERE u.id <> %s
            ORDER BY u.id
            """,
            (uid,),
        )
        rows = cur.fetchall()

        grouped = {}
        for r in rows:
            oid = r["user_id"]
            if oid not in grouped:
                grouped[oid] = {
                    "user_id": oid,
                    "name": r["name"],
                    "bio": r["bio"] or "",
                    "offers": set(),
                    "wants": set(),
                }
            if r["skill_name"]:
                if r["skill_type"] == "offer":
                    grouped[oid]["offers"].add(r["skill_name"])
                elif r["skill_type"] == "want":
                    grouped[oid]["wants"].add(r["skill_name"])

        results = []
        for other in grouped.values():
            can_teach_them = sorted(list(my_offers & other["wants"]))
            they_can_teach = sorted(list(other["offers"] & my_wants))

            denom = max(1, (len(my_wants) + len(other["wants"])))
            match_percent = round(100 * (len(can_teach_them) + len(they_can_teach)) / denom)

            if match_percent > 0:
                results.append({
                    "user_id": other["user_id"],
                    "name": other["name"],
                    "bio": other["bio"],
                    "match_percent": match_percent,
                    "can_teach_them": can_teach_them,   # community.js uses this
                    "they_can_teach": they_can_teach,   # community.js uses this
                })

        results.sort(key=lambda x: x["match_percent"], reverse=True)
        return jsonify(results), 200
    finally:
        cur.close()
        conn.close()

@app.put("/api/me")
def api_update_me():
    uid, err = require_auth()
    if err:
        return err

    data = request.get_json(force=True)
    bio = (data.get("bio") or "").strip()

    if len(bio) > 500:
        return jsonify({"message": "Bio must be 500 characters or less"}), 400

    conn = get_conn()
    cur = conn.cursor()
    try:
        cur.execute("UPDATE users SET bio=%s WHERE id=%s", (bio, uid))
        conn.commit()
        return jsonify({"ok": True}), 200
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)