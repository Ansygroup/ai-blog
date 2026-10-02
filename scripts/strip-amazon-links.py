#!/usr/bin/env python3
"""Strip all Amazon affiliate links from content/posts/*.mdx (2026-08-26 removal, re-applied).

Idempotent: running it twice is a no-op. Keeps legitimate "amazon" prose mentions
(Amazon SageMaker, Amazon Rekognition, AI-for-affiliate-marketing topics).
"""
import glob
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
POSTS = os.path.join(ROOT, "content", "posts")

PATTERNS = [
    # standalone affiliate line
    (r"^\*Check .*?on \[Amazon\]\(https://www\.amazon\.com/dp/[^)]*\) — affiliate link\.\*\s*$", ""),
    # bullet product link
    (r"^- \*\*\[[^\]]*\]\( ?https://www\.amazon\.com/dp/[^)]*\)\*\* — Buy on (?:\[Amazon\]\([^)]*\)|Amazon)\s*$", ""),
    # disclosure block after ---
    (r"\n---\n\n\*Disclosure: Some links in this article are affiliate links\. We may earn a commission at no extra cost to you\.\*\s*", ""),
    # disclosure in author bio
    (r"\n\n\*Disclosure: This post contains affiliate links\. As an Amazon Associate we earn from qualifying purchases\.\*\s*", ""),
    # inline link -> keep text, drop URL
    (r"\[([^\]]*)\]\(https://www\.amazon\.com/dp/[^)]*\)", r"\1"),
    # bare / mangled URL -> delete
    (r"\(?https://www\.amazon\.com/dp/[^)\s]*\)?", ""),
    (r"https://www\.\[amazon\]\([^)]*\)\.com/dp/[A-Za-z0-9]+\?tag=[^\s)\]]*", ""),
    # table cell
    (r"\|\s*Buy on Amazon\s*\|\s*$", "|"),
    # leftover broken disclosure fragments
    (r"\[Disclosure:.*?(?:affiliate links|Amazon Associate).*?\]?", ""),
    (r"\*Disclosure:[^*\n]*(?:affiliate|Amazon Associate)[^*\n]*\*", ""),
    (r"\[Disclosure\]\(disclosure\)", ""),
    (r"Some links earn us a commission at no cost to you\.", ""),
    # dangling leftovers
    (r"\(/posts/ai-tools-for-freelancers-2026\) from qualifying purchases\.?\]?", ""),
    (r"from qualifying purchases\.?\]?", ""),
]

# "## Recommended Gear" section injected by affiliate-fill.js — drop the whole block
GEAR_SECTION = re.compile(
    r"\n*## Recommended Gear\n*(?:\s*[-*]\s*\*\*\[[^\]]*\]\([^)]*\)\*\*[^\n]*\n*)+", re.MULTILINE
)
GEAR_LINE = re.compile(r"^\s*[-*]\s*\*\*\[[^\]]*\]\([^)]*amazon\.com[^)]*\)\*\*[^\n]*\n?", re.MULTILINE)

# nested-link damage emitted by the bad regex: ](text( url )
NESTED = re.compile(r"\]\((https://www\.amazon\.com/dp/[^)\s]*)\)")


def clean(text: str) -> str:
    for pat, rep in PATTERNS:
        text = re.sub(pat, rep, text, flags=re.MULTILINE)
    text = GEAR_SECTION.sub("\n", text)
    text = GEAR_LINE.sub("", text)
    # repair nested amazon links produced by the broken regex
    text = NESTED.sub("", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text


def main() -> int:
    changed = 0
    remaining = 0
    for path in sorted(glob.glob(os.path.join(POSTS, "*.mdx"))):
        with open(path, "r", encoding="utf-8", newline="") as fh:
            original = fh.read()
        updated = clean(original)
        if updated != original:
            with open(path, "w", encoding="utf-8", newline="") as fh:
                fh.write(updated)
            changed += 1
        if "amazon.com/dp" in updated:
            remaining += 1
    print(f"strip-amazon: {changed} post(s) changed, {remaining} still contain amazon.com/dp")
    return 0 if remaining == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
