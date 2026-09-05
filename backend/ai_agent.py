import os
from datetime import datetime, timedelta, timezone

from google import genai
from pydantic import BaseModel


# ============================================================
# GEMINI CLIENT
# ============================================================

client = genai.Client(
    api_key=os.getenv("GEMINI_API_KEY")
)

MODEL = os.getenv(
    "GEMINI_MODEL",
    "gemini-3.5-flash-lite"
)


# ============================================================
# OUTPUT SCHEMA
# ============================================================

class AIInsight(BaseModel):
    title: str
    emoji: str
    message: str
    suggestions: list[str]


# ============================================================
# HELPER
# ============================================================

def normalize_datetime(dt):
    """
    Make sure datetimes are timezone-aware.
    """

    if dt is None:
        return None

    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)

    return dt


def get_period_tasks(tasks, period):
    """
    Filter tasks according to the dashboard period.
    """

    now = datetime.now(timezone.utc)

    normalized_tasks = []

    for task in tasks:

        created_at = normalize_datetime(task.created_at)
        deadline = normalize_datetime(task.deadline)

        # Don't mutate the SQLAlchemy object.
        task_data = {
            "task": task,
            "created_at": created_at,
            "deadline": deadline
        }

        normalized_tasks.append(task_data)

    if period == "ALL_TIME":
        return normalized_tasks

    # Monday 00:00
    start_of_week = (
        now - timedelta(days=now.weekday())
    ).replace(
        hour=0,
        minute=0,
        second=0,
        microsecond=0
    )

    if period == "THIS_WEEK":

        return [
            item
            for item in normalized_tasks
            if start_of_week <= item["created_at"] <= now
        ]

    if period == "LAST_WEEK":

        start = start_of_week - timedelta(days=7)
        end = start_of_week

        return [
            item
            for item in normalized_tasks
            if start <= item["created_at"] < end
        ]

    if period == "TWO_WEEKS_AGO":

        start = start_of_week - timedelta(days=14)
        end = start_of_week - timedelta(days=7)

        return [
            item
            for item in normalized_tasks
            if start <= item["created_at"] < end
        ]

    if period == "THIS_MONTH":

        start = now.replace(
            day=1,
            hour=0,
            minute=0,
            second=0,
            microsecond=0
        )

        return [
            item
            for item in normalized_tasks
            if start <= item["created_at"] <= now
        ]

    return normalized_tasks


# ============================================================
# TOOL 1 — TASK SUMMARY
# ============================================================

def get_task_summary(tasks):
    """
    Analyze overall task performance.
    """

    total = len(tasks)

    completed = sum(
        1
        for item in tasks
        if item["task"].status.value == "COMPLETED"
    )

    failed = sum(
        1
        for item in tasks
        if item["task"].status.value == "FAILED"
    )

    in_progress = sum(
        1
        for item in tasks
        if item["task"].status.value == "IN_PROGRESS"
    )

    pending = sum(
        1
        for item in tasks
        if item["task"].status.value == "PENDING"
    )

    finished = completed + failed

    success_rate = (
        round((completed / finished) * 100)
        if finished > 0
        else 0
    )

    completion_rate = (
        round((completed / total) * 100)
        if total > 0
        else 0
    )

    return {
        "total_tasks": total,
        "completed": completed,
        "failed": failed,
        "in_progress": in_progress,
        "pending": pending,
        "completion_rate": completion_rate,
        "success_rate": success_rate,
    }


# ============================================================
# TOOL 2 — TASK HISTORY
# ============================================================

def get_task_history(tasks):
    """
    Give the AI detailed information about the actual tasks
    so it can analyze behavioral patterns.
    """

    history = []

    for item in tasks:

        task = item["task"]

        created_at = item["created_at"]
        deadline = item["deadline"]

        # How much time the user originally had
        # between creating the task and the deadline.
        allocated_hours = None

        if created_at and deadline:

            allocated_hours = round(
                (deadline - created_at).total_seconds() / 3600,
                2
            )

        completed_at = normalize_datetime(
            getattr(task, "completed_at", None)
        )

        completion_hours = None

        if completed_at and created_at:

            completion_hours = round(
                (completed_at - created_at).total_seconds() / 3600,
                2
            )

        history.append({

            "title": task.title,

            "description": task.description,

            "type": task.task_type.value,

            "status": task.status.value,

            "created_at": created_at.isoformat()
            if created_at else None,

            "deadline": deadline.isoformat()
            if deadline else None,

            "completed_at": completed_at.isoformat()
            if completed_at else None,

            "allocated_hours": allocated_hours,

            "completion_hours": completion_hours,

            "deadline_weekday": deadline.strftime("%A")
            if deadline else None,

            "deadline_hour": deadline.hour
            if deadline else None,
        })

    return {
        "task_count": len(history),
        "tasks": history
    }


# ============================================================
# TOOL 3 — FAILURE ANALYSIS
# ============================================================

def get_failure_analysis(tasks):
    """
    Analyze failed tasks and provide useful statistical context.
    """

    failed_tasks = [
        item
        for item in tasks
        if item["task"].status.value == "FAILED"
    ]

    completed_tasks = [
        item
        for item in tasks
        if item["task"].status.value == "COMPLETED"
    ]

    high_stakes_failures = [
        item
        for item in failed_tasks
        if item["task"].task_type.value == "HIGH_STAKES"
    ]

    normal_failures = [
        item
        for item in failed_tasks
        if item["task"].task_type.value == "NORMAL"
    ]

    high_stakes_total = [
        item
        for item in tasks
        if item["task"].task_type.value == "HIGH_STAKES"
    ]

    normal_total = [
        item
        for item in tasks
        if item["task"].task_type.value == "NORMAL"
    ]

    high_stakes_failure_rate = (
        round(
            len(high_stakes_failures)
            / len(high_stakes_total)
            * 100
        )
        if high_stakes_total
        else 0
    )

    normal_failure_rate = (
        round(
            len(normal_failures)
            / len(normal_total)
            * 100
        )
        if normal_total
        else 0
    )

    return {

        "failed_count": len(failed_tasks),

        "completed_count": len(completed_tasks),

        "high_stakes_failures": len(high_stakes_failures),

        "normal_failures": len(normal_failures),

        "high_stakes_total": len(high_stakes_total),

        "normal_total": len(normal_total),

        "high_stakes_failure_rate":
            high_stakes_failure_rate,

        "normal_failure_rate":
            normal_failure_rate,

        "failed_tasks": [

            {
                "title": item["task"].title,

                "description": item["task"].description,

                "type": item["task"].task_type.value,

                "deadline": item["deadline"].isoformat(),

                "allocated_hours":
                    round(
                        (
                            item["deadline"]
                            - item["created_at"]
                        ).total_seconds()
                        / 3600,
                        2
                    )
                    if item["created_at"] and item["deadline"]
                    else None
            }

            for item in failed_tasks
        ]
    }


# ============================================================
# TOOL 4 — FOCUS TASKS
# ============================================================

def get_focus_tasks(tasks):
    """
    Identify unfinished tasks and upcoming priorities.
    """

    unfinished = [
        item
        for item in tasks
        if item["task"].status.value
        in ["IN_PROGRESS", "PENDING"]
    ]

    unfinished.sort(
        key=lambda item: item["deadline"]
    )

    high_stakes = [
        item
        for item in unfinished
        if item["task"].task_type.value == "HIGH_STAKES"
    ]

    return {

        "unfinished_count":
            len(unfinished),

        "high_stakes_unfinished":
            len(high_stakes),

        "nearest_deadlines": [

            {
                "title": item["task"].title,

                "description":
                    item["task"].description,

                "type":
                    item["task"].task_type.value,

                "deadline":
                    item["deadline"].isoformat(),

            }

            for item in unfinished[:5]
        ]
    }


# ============================================================
# AI AGENT
# ============================================================

def generate_ai_insight(tasks, period):
    """
    Main accountability AI agent.

    The AI reviews the user's actual task history and looks
    for behavioral patterns rather than simply summarizing
    completion statistics.
    """

    period_tasks = get_period_tasks(
        tasks,
        period
    )

    # ========================================================
    # TOOLS
    # ========================================================

    def task_summary_tool():
        """
        Get overall task completion statistics.
        """

        return get_task_summary(
            period_tasks
        )


    def task_history_tool():
        """
        Get detailed information about the user's actual
        tasks, including titles, descriptions, status,
        deadlines and time allocated.
        """

        return get_task_history(
            period_tasks
        )


    def failure_analysis_tool():
        """
        Analyze failure patterns, including failure rates
        for different task types.
        """

        return get_failure_analysis(
            period_tasks
        )


    def focus_tasks_tool():
        """
        Find unfinished tasks and upcoming deadlines.
        """

        return get_focus_tasks(
            period_tasks
        )


    tools = [
        task_summary_tool,
        task_history_tool,
        failure_analysis_tool,
        focus_tasks_tool,
    ]


    # ========================================================
    # PROMPT
    # ========================================================

    prompt = f"""
You are the user's personal accountability analyst.

Your job is to REVIEW the user's actual task history,
not simply summarize their statistics.

Analyze the user's performance for:

{period}

You have four tools:

1. task_summary_tool
   - overall completion statistics

2. task_history_tool
   - actual task titles
   - descriptions
   - task type
   - status
   - creation time
   - deadline
   - completion time
   - amount of time originally allocated
   - deadline weekday and hour

3. failure_analysis_tool
   - failure statistics
   - failure rates by task type
   - details of failed tasks

4. focus_tasks_tool
   - unfinished tasks
   - upcoming deadlines
   - high-stakes unfinished tasks


IMPORTANT:

You MUST use task_history_tool.

You are expected to inspect the actual task titles and
descriptions and look for meaningful behavioral patterns.

For example, if the user's tasks include:

- "Solve 2 DSA problems"
- "Gym - Push workout"
- "Study DBMS"
- "Solve LeetCode array questions"
- "Go to gym"

and the DSA-related tasks are repeatedly failed while
gym-related tasks are consistently completed, identify
that pattern.

You should mentally group similar tasks into categories
or themes based on their titles and descriptions.

Possible themes might include:

- DSA / coding
- studying
- gym / exercise
- projects
- work
- personal tasks
- errands
- reading
- etc.

Do NOT assume categories that are not supported by the
actual task data.

Look for patterns such as:

- specific categories of tasks that are frequently failed
- categories that are consistently completed
- differences between high-stakes and normal tasks
- tasks with very short deadlines
- tasks with long deadlines
- repeated types of commitments
- patterns in task descriptions
- patterns in when deadlines are set
- workload or overcommitment
- differences between what the user plans and what they
  actually complete

The goal is to answer:

"What does this user's task history reveal about how
they actually behave?"

Do not merely say:

"You failed 4 tasks."

Instead, explain WHY the task history suggests the user
is struggling, when the data supports such a conclusion.

For example:

"Your failures are concentrated in DSA-related tasks:
you completed 1 of 5 DSA tasks but 4 of 5 exercise tasks.
This suggests your overall completion rate is hiding a
more specific difficulty with technical study commitments."

That kind of insight is preferred.

IMPORTANT STATISTICAL RULES:

- Do not invent task categories.
- Do not invent statistics.
- Do not claim a pattern from a single task.
- Prefer patterns supported by multiple tasks.
- If there is insufficient data to identify a behavioral
  pattern, say so.
- Do not overstate conclusions.
- Distinguish observations from possible explanations.
- Never pretend to know WHY the user failed unless the
  task data actually supports it.

The insight should be useful and slightly analytical,
not generic motivational advice.

Avoid obvious statements that the user can already see
from the dashboard.

Instead, surface something the user may NOT have noticed
by looking at the raw task list themselves.

Generate exactly:

1. One concise insight title
2. One appropriate emoji
3. One concise but specific analytical message
4. 1-3 actionable suggestions based on the analysis

The message should normally be 2-4 sentences.

Suggestions should address the observed pattern rather
than giving generic productivity advice.
"""


    # ========================================================
    # GEMINI REQUEST
    # ========================================================

    response = client.models.generate_content(
        model=MODEL,

        contents=prompt,

        config={

            "tools": tools,

            "response_mime_type":
                "application/json",

            "response_schema":
                AIInsight,
        },
    )


    # ========================================================
    # PARSE RESPONSE
    # ========================================================

    if not response.text:

        raise RuntimeError(
            "Gemini returned an empty response."
        )


    try:

        insight = AIInsight.model_validate_json(
            response.text
        )

        return insight.model_dump()


    except Exception as e:

        print(
            "Gemini raw response:"
        )

        print(
            response.text
        )

        print(
            "Gemini parsing error:"
        )

        print(
            e
        )

        raise RuntimeError(
            "Gemini returned an invalid AI insight."
        )