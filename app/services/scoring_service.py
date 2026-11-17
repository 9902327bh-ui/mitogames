"""Server-authoritative scoring for game/simulation attempts and quizzes."""

from typing import Any


def score_game(content: dict, responses: dict) -> dict[str, Any]:
    """Score a game/simulation attempt.

    content: the stored JSONB payload with an "items" list, each item having
        id, choices, correct_index, points (default 1).
    responses: {item_id: chosen_index} submitted by the client.

    Returns {score, max_score, percentage, is_passed, feedback}.
    """
    items = content.get("items", []) if isinstance(content, dict) else []
    pass_threshold = content.get("pass_threshold_percent", 60) if isinstance(content, dict) else 60

    score = 0
    max_score = 0
    feedback: list[dict] = []

    for item in items:
        item_id = str(item.get("id", ""))
        points = int(item.get("points", 1) or 1)
        correct_index = item.get("correct_index")
        chosen = responses.get(item_id) if responses else None

        max_score += points
        is_correct = chosen is not None and chosen == correct_index
        if is_correct:
            score += points

        feedback.append({
            "id": item_id,
            "correct": is_correct,
            "correct_index": correct_index,
            "chosen": chosen,
            "explanation": item.get("explanation", ""),
        })

    percentage = round((score / max_score) * 100, 2) if max_score > 0 else 0.0
    is_passed = percentage >= pass_threshold
    return {
        "score": score,
        "max_score": max_score,
        "percentage": percentage,
        "is_passed": is_passed,
        "feedback": {"items": feedback, "pass_threshold_percent": pass_threshold},
    }


def score_quiz(questions: list[dict], responses: dict) -> dict[str, Any]:
    """Score a quiz attempt.

    questions: list of {question, choices, correct_index, explanation}.
    responses: {question_index_str: chosen_index}.

    Returns {score, max_score, percentage, feedback}.
    """
    score = 0
    max_score = len(questions)
    feedback: list[dict] = []

    for idx, q in enumerate(questions):
        correct_index = q.get("correct_index")
        chosen = responses.get(str(idx)) if responses else None
        is_correct = chosen is not None and chosen == correct_index
        if is_correct:
            score += 1
        feedback.append({
            "question_index": idx,
            "question": q.get("question", ""),
            "correct": is_correct,
            "correct_index": correct_index,
            "chosen": chosen,
            "explanation": q.get("explanation", ""),
        })

    percentage = round((score / max_score) * 100, 2) if max_score > 0 else 0.0
    return {
        "score": score,
        "max_score": max_score,
        "percentage": percentage,
        "feedback": {"questions": feedback},
    }
