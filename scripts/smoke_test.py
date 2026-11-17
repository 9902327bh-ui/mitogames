"""End-to-end smoke test against the running server. No external API keys needed.

Run: python scripts/smoke_test.py  (server must be up on 127.0.0.1:8000)
"""

import asyncio
import sys
import uuid
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import httpx

BASE = "http://127.0.0.1:8000/api/v1"
passed = []
failed = []


def check(name, cond, detail=""):
    if cond:
        passed.append(name)
        print(f"  PASS  {name}")
    else:
        failed.append((name, detail))
        print(f"  FAIL  {name}  -> {detail}")


async def main():
    client = httpx.AsyncClient(base_url=BASE, timeout=30.0)
    suffix = uuid.uuid4().hex[:8]
    email = f"smoke_{suffix}@test.com"
    username = f"smoke_{suffix}"
    password = "Password123"

    print("\n[1] Register")
    r = await client.post("/auth/register", json={
        "email": email, "username": username, "password": password, "full_name": "Smoke Tester",
    })
    check("register 201", r.status_code == 201, r.text)
    if r.status_code == 201:
        sid = r.json()["id"]

    print("[2] Duplicate register (should conflict)")
    r = await client.post("/auth/register", json={
        "email": email, "username": username, "password": password, "full_name": "Smoke Tester",
    })
    check("dup register 409", r.status_code == 409, r.text)

    print("[3] Login")
    r = await client.post("/auth/login", json={"email": email, "password": password})
    check("login 200", r.status_code == 200, r.text)
    token = r.json()["access_token"]
    auth = {"Authorization": f"Bearer {token}"}

    print("[4] /auth/me")
    r = await client.get("/auth/me", headers=auth)
    check("me 200", r.status_code == 200, r.text)
    check("me email", r.json().get("email") == email, r.text)

    print("[5] Auth required without token")
    r = await client.get("/auth/me")
    check("unauth 401", r.status_code == 401, r.text)

    print("[6] Subjects")
    r = await client.get("/subjects", headers=auth)
    check("subjects 200", r.status_code == 200, r.text)
    check("subjects count==4", len(r.json()) == 4, r.text)
    subject_id = r.json()[0]["id"] if r.status_code == 200 else None

    print("[7] Topics for first subject")
    r = await client.get(f"/subjects/{subject_id}/topics", headers=auth)
    check("topics 200", r.status_code == 200, r.text)

    print("[8] Simulations")
    r = await client.get("/simulations", headers=auth)
    check("simulations 200", r.status_code == 200, r.text)
    check("simulations count==4", len(r.json()) == 4, r.text)
    sim = r.json()[0]
    sim_id = sim["id"]

    print("[9] Simulation detail (content has items)")
    r = await client.get(f"/simulations/{sim_id}", headers=auth)
    check("sim detail 200", r.status_code == 200, r.text)
    content = r.json().get("content", {})
    items = content.get("items", [])
    check("sim has items", len(items) == 4, str(content)[:200])

    print("[10] Submit simulation attempt (all correct)")
    correct = {item["id"]: item["correct_index"] for item in items}
    r = await client.post(f"/simulations/{sim_id}/attempts", headers=auth, json={"responses": correct})
    check("attempt 200", r.status_code == 200, r.text)
    if r.status_code == 200:
        body = r.json()
        check("score 100", body["score"] == 100, str(body))
        check("max 100", body["max_score"] == 100, str(body))
        check("passed true", body["is_passed"] is True, str(body))

    print("[11] Submit attempt (one wrong)")
    wrong = dict(correct)
    wrong[items[0]["id"]] = (correct[items[0]["id"]] + 1) % len(items[0]["choices"])
    r = await client.post(f"/simulations/{sim_id}/attempts", headers=auth, json={"responses": wrong})
    check("wrong attempt 200", r.status_code == 200, r.text)
    if r.status_code == 200:
        check("score 75", r.json()["score"] == 75, str(r.json()))

    print("[12] Progress")
    r = await client.get("/students/me/progress", headers=auth)
    check("progress 200", r.status_code == 200, r.text)
    if r.status_code == 200:
        p = r.json()
        check("progress sims played==2", p["total_simulations_played"] == 2, str(p))
        check("progress best score==100", p["best_single_score"] == 100, str(p))

    print("[13] Achievements (High Scorer should be awarded for the 100-score sim)")
    r = await client.get("/students/me/achievements", headers=auth)
    check("achievements 200", r.status_code == 200, r.text)
    if r.status_code == 200:
        names = [a["name"] for a in r.json()]
        check("High Scorer awarded", "High Scorer" in names, str(names))

    print("[14] Dashboard")
    r = await client.get("/students/me/dashboard", headers=auth)
    check("dashboard 200", r.status_code == 200, r.text)

    print("[15] Generate quiz (stub provider, topic-based) + submit attempt")
    r2 = await client.get(f"/subjects/{subject_id}/topics", headers=auth)
    topic_id = r2.json()[0]["id"] if r2.status_code == 200 else None
    r = await client.post("/quizzes/generate", headers=auth,
                          json={"topic_id": topic_id, "num_questions": 3, "difficulty": "beginner"})
    check("quiz generate 201", r.status_code == 201, r.text)
    if r.status_code == 201:
        quiz = r.json()
        quiz_id = quiz["id"]
        # Stub quiz: correct_index == 0 for every question.
        responses = {str(i): 0 for i in range(len(quiz["questions"]))}
        r = await client.post(f"/quizzes/{quiz_id}/attempts", headers=auth, json={"responses": responses})
        check("quiz attempt 200", r.status_code == 200, r.text)

    print("[16] Quiz Novice achievement after quiz attempt")
    r = await client.get("/students/me/achievements", headers=auth)
    if r.status_code == 200:
        names = [a["name"] for a in r.json()]
        check("Quiz Novice awarded", "Quiz Novice" in names, str(names))

    print("[16] Password change")
    r = await client.put("/students/me/password", headers=auth,
                         json={"current_password": password, "new_password": "NewPassword456"})
    check("password change 200", r.status_code == 200, r.text)

    print("\n========================================")
    print(f"PASSED: {len(passed)}   FAILED: {len(failed)}")
    if failed:
        for n, d in failed:
            print(f"  - {n}: {d}")
    print("========================================")
    await client.aclose()
    return 0 if not failed else 1


if __name__ == "__main__":
    rc = asyncio.run(main())
    sys.exit(rc)
