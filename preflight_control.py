"""Read-only validator for the Academy Strateg control layer."""
from __future__ import annotations
import hashlib, json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
TERMINAL = {"COMPLETED", "WAITING_APPROVAL", "USER_ACTION_REQUIRED", "BLOCKED", "CONFLICT", "CANCELLED"}
ACTIVE = {"APPROVED", "VALIDATING", "RUNNING", "RETRYING", "WAITING_APPROVAL"}

def read(name: str) -> str:
    p = ROOT / name
    if not p.exists():
        raise FileNotFoundError(name)
    return p.read_text(encoding="utf-8")

def fields(text: str) -> dict[str, str]:
    out = {}
    for line in text.splitlines():
        m = re.match(r"^([A-Za-z_][\w-]*):\s*(.*)$", line)
        if m: out[m.group(1)] = m.group(2).strip()
    return out

def main() -> int:
    errors = []
    try:
        task_text = read("ACTIVE_TASK.md")
        task = fields(task_text)
    except Exception as e:
        errors.append(f"missing ACTIVE_TASK: {e}")
        task_text, task = "", {}
    if not task.get("task_id") or task.get("task_id") == "null": errors.append("exactly one task_id is required")
    if task.get("status") not in ACTIVE: errors.append(f"invalid active status: {task.get('status')}")
    if task.get("mode") not in {"SAFE_AUTONOMOUS", "APPROVAL_REQUIRED", "USER_ACTION_REQUIRED"}: errors.append("invalid mode")
    if task.get("live_approval") == "true" and task.get("mode") == "SAFE_AUTONOMOUS": errors.append("live approval conflicts with SAFE_AUTONOMOUS")
    if "acceptance_criteria:" not in task_text or not re.search(r"^\s*-\s+\S+", task_text, re.M): errors.append("acceptance_criteria missing")
    try:
        state = json.loads(read("TASK_STATE.json"))
        if state.get("task_id") != task.get("task_id"): errors.append("TASK_STATE task_id differs from ACTIVE_TASK")
        if state.get("status") in TERMINAL and task.get("status") in ACTIVE: errors.append("state is terminal while ACTIVE_TASK remains active")
    except Exception as e: errors.append(f"invalid TASK_STATE.json: {e}")
    digest = hashlib.sha256(task_text.encode("utf-8")).hexdigest()[:16]
    if errors:
        print("[CONFLICT]")
        for e in errors: print(f"- {e}")
        print("safe_work_completed: none; blocked_action: live changes; required_decision: repair control files")
        return 2
    print("[PREFLIGHT_OK]")
    print(f"task_id: {task['task_id']}")
    print(f"revision: {task.get('revision')}")
    print(f"task_hash: {digest}")
    print(f"mode: {task['mode']}")
    print("live_changes: forbidden")
    return 0

if __name__ == "__main__": sys.exit(main())
