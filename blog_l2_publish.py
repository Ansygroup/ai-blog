#!/usr/bin/env python3
"""
blog_l2_publish.py — ai-blog L2 publisher (AUTONOMOUS git push).

GATED: only runs if a FRESH Composio key is present (old leaked key
ak_T5WRVhPFsObc82tYxE4n must be rotated first).

Run daily via cron after the L1 triage gate passes.

Safety:
  - Reads COMPOSIO_API_KEY from env / ~/.hermes/composio_key
  - Refuses to push if the key equals the leaked one
  - Pushes `main` to origin (deploys via GitHub Actions)
  - BLOCKS on merge conflicts (needs manual resolution)
"""
import os, sys, subprocess, datetime

HOME = os.path.expanduser("~")
BLOG = os.path.join(HOME, "ai-blog.link")
LEAKED = "ak_T5WRVhPFsObc82tYxE4n"  # MUST be rotated; do not reuse


def load_key():
    p = os.path.join(HOME, ".hermes", "composio_key")
    if os.path.exists(p):
        return open(p).read().strip()
    return os.environ.get("COMPOSIO_API_KEY", "")


def gate_ok():
    key = load_key()
    if not key:
        return False, "no Composio key — add fresh key to ~/.hermes/composio_key"
    if key == LEAKED:
        return False, "LEAKED key detected — rotate at composio.dev first"
    return True, "key present + not leaked"


def publish():
    os.chdir(BLOG)
    # 1. check for unresolved conflicts (block if present)
    st = subprocess.run(["git", "status", "--porcelain"], timeout=30,
                        capture_output=True, text=True)
    if any(t in st.stdout for t in ("UU", "AA", "DD")):
        return False, ("MERGE CONFLICT detected — resolve manually:\n"
                       "  cd ~/ai-blog.link && git status\n"
                       "  # fix conflicts, git add <files>, git commit\n"
                       "  # then re-run blog_l2_publish.py")
    # 2. pull (merge) to integrate remote
    subprocess.run(["git", "pull", "origin", "main"], timeout=120,
                   capture_output=True, text=True)
    # 3. commit any local changes
    subprocess.run(["git", "add", "-A"], timeout=30)
    msg = f"autopublish {datetime.datetime.now(datetime.timezone.utc):%Y-%m-%d}"
    subprocess.run(["git", "commit", "-m", msg], timeout=30,
                   capture_output=True)
    # 4. push to origin (deploys)
    r = subprocess.run(["git", "push", "origin", "main"], timeout=120,
                       capture_output=True, text=True)
    return r.returncode == 0, r.stdout + r.stderr


def main():
    ok, why = gate_ok()
    if not ok:
        print(f"[blog-L2] BLOCKED: {why}")
        print("[blog-L2] Run UNLOCK_STEPS.md -> rotate Composio key, then re-run.")
        sys.exit(3)
    print("[blog-L2] gate passed — publishing...")
    success, out = publish()
    print(out)
    if success:
        print("[blog-L2] ✓ published to ai-blog")
    else:
        print("[blog-L2] ✗ push failed (see above)")
        sys.exit(1)


if __name__ == "__main__":
    main()
