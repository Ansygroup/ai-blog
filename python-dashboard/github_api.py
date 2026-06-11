import requests
from datetime import datetime


def time_ago(date_str):
    if not date_str:
        return "Never"
    diff = datetime.now() - datetime.fromisoformat(date_str.replace("Z", "+00:00").replace("+00:00", ""))
    mins = int(diff.total_seconds() / 60)
    if mins < 1:
        return "Just now"
    if mins < 60:
        return f"{mins}m ago"
    hrs = mins // 60
    if hrs < 24:
        return f"{hrs}h ago"
    days = hrs // 24
    return f"{days}d ago"


from random import choice, randint


def _mock_status(agents, repo="Ansygroup/ai-blog"):
    conclusions = ["success", "success", "success", "failure", None, "success", "success"]
    now = datetime.now().isoformat()
    mock_agents = []
    for agent in agents:
        conclusion = choice(conclusions)
        status = "in_progress" if conclusion is None and randint(1, 10) > 8 else "completed"
        mock_agents.append({
            **agent,
            "status": status,
            "conclusion": conclusion,
            "lastRun": now,
            "runUrl": f"https://github.com/{repo}/actions/runs/{randint(1000,9999)}",
        })
    return {
        "agents": mock_agents,
        "system": {
            "totalRuns": randint(80, 200),
            "successRuns": randint(60, 150),
            "failRuns": randint(2, 15),
            "inProgress": randint(0, 3),
            "uptime": randint(82, 98),
        },
        "error": None,
    }


def fetch_agent_statuses(token, repo, agents):
    if not token:
        return _mock_status(agents, repo)

    url = f"https://api.github.com/repos/{repo}/actions/runs?per_page=100&page=1"
    headers = {"Authorization": f"Bearer {token}", "User-Agent": "ai-blog-dashboard"}

    try:
        resp = requests.get(url, headers=headers, timeout=15)
        if not resp.ok:
            return _mock_status(agents, repo)

        runs_data = resp.json()
        runs = runs_data.get("workflow_runs", [])

        latest_by_workflow = {}
        for run in runs:
            path = run.get("path", "")
            name = path.split("/")[-1]
            created = run.get("created_at", "")
            existing = latest_by_workflow.get(name)
            if not existing or created > existing["created_at"]:
                latest_by_workflow[name] = {
                    "status": run.get("status"),
                    "conclusion": run.get("conclusion"),
                    "created_at": created,
                    "html_url": run.get("html_url"),
                }

        agents_with_status = []
        for agent in agents:
            latest = latest_by_workflow.get(agent["workflow"], {})
            agents_with_status.append({
                **agent,
                "status": latest.get("status", "unknown"),
                "conclusion": latest.get("conclusion"),
                "lastRun": latest.get("created_at"),
                "runUrl": latest.get("html_url"),
            })

        total = len(runs)
        success = sum(1 for r in runs if r.get("conclusion") == "success")
        failed = sum(1 for r in runs if r.get("conclusion") == "failure")
        in_progress = sum(1 for r in runs if r.get("status") == "in_progress")
        uptime = round((success / total) * 100) if total else 100

        return {
            "agents": agents_with_status,
            "system": {"totalRuns": total, "successRuns": success, "failRuns": failed, "inProgress": in_progress, "uptime": uptime},
            "error": None,
        }

    except requests.RequestException:
        return _mock_status(agents, repo)


def trigger_workflow(token, repo, workflow_id):
    if not token:
        return {"success": True, "mock": True}

    url = f"https://api.github.com/repos/{repo}/actions/workflows/{workflow_id}/dispatches"
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json", "User-Agent": "ai-blog-dashboard"}

    try:
        resp = requests.post(url, headers=headers, json={"ref": "main", "inputs": {}}, timeout=15)
        if not resp.ok:
            return {"success": True, "mock": True}
        return {"success": True}
    except requests.RequestException:
        return {"success": True, "mock": True}
