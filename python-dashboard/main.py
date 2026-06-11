#!/usr/bin/env python3
"""
Mission Control — AI Agent Fleet Dashboard (Windows Desktop)
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from config import GITHUB_TOKEN, REPO
from mission_control import run_dashboard


def main():
    if not GITHUB_TOKEN:
        print(">> GITHUB_API_TOKEN not set -- launching in DEMO mode")
        print("   (Run button works but won't actually trigger workflows)")
        print("   Set token with:  $env:GITHUB_API_TOKEN = 'ghp_xxx'")
        print()

    print(f"Launching Mission Control for {REPO}...")
    run_dashboard(GITHUB_TOKEN or "", REPO)


if __name__ == "__main__":
    main()
