#!/usr/bin/env python3
import subprocess, json, os, sys, time, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
QUEUE_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'keyword-queue.json')
POSTS_DIR = os.path.join(ROOT, 'content', 'posts')
IMAGES_DIR = os.path.join(ROOT, 'public', 'images')
OC = r"C:\Users\ansy0\AppData\Roaming\npm\opencode.cmd"
MODEL = "opencode/deepseek-v4.1-flash-free"

args = sys.argv[1:]
batch_size = 5
if '--batch' in args:
    batch_size = int(args[args.index('--batch') + 1])
if '--model' in args:
    MODEL = args[args.index('--model') + 1]

def slugify(s):
    return re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')[:60]

def gen_article(topic, category, keywords):
    prompt = f"""Write a comprehensive SEO-optimized blog post about: "{topic}"

Category: {category}
Keywords: {', '.join(keywords)}

Requirements:
- Title: catchy, SEO-optimized, includes main keyword
- Write 1200-1500 words
- Use markdown with H2 and H3 headings
- Include an introduction, 4-6 main sections, and conclusion
- Include practical examples and actionable advice
- Write in English
- Professional but accessible tone

Output ONLY the article content in markdown format (no frontmatter, no code blocks). Do not run any shell commands. Write text only."""
    try:
        proc = subprocess.run(
            [OC, 'run', '--model', MODEL],
            input=prompt,
            capture_output=True,
            text=True,
            timeout=180,
            shell=True,
        )
        if proc.returncode != 0:
            print(f"  stderr: {proc.stderr[:200]}")
            return None
        lines = proc.stdout.split('\n')
        content_lines = [l for l in lines if not l.startswith('>') and not l.startswith('build')]
        content = '\n'.join(content_lines).strip()
        return content if len(content) >= 200 else None
    except Exception as e:
        print(f"  ❌ Error: {str(e)[:100]}")
        return None

def gen_cover(slug):
    url = f"https://image.pollinations.ai/prompt/{slug.replace('-', '%20')}?width=1200&height=630&model=flux&nologo=true"
    out = os.path.join(IMAGES_DIR, f"{slug}.jpg")
    if os.path.exists(out):
        return out
    try:
        subprocess.run(['curl', '-s', '-o', out, url], timeout=30, check=True)
        if os.path.exists(out) and os.path.getsize(out) > 1000:
            return out
    except:
        pass
    return None

def main():
    with open(QUEUE_PATH, 'r', encoding='utf-8') as f:
        queue = json.load(f)
    to_process = queue[:batch_size]
    remaining = queue[batch_size:]

    print(f"📋 Processing {len(to_process)} of {len(queue)} topics")
    print(f"🤖 Model: {MODEL}\n")

    generated = 0
    failed = 0
    for i, item in enumerate(to_process):
        topic = item['topic']
        category = item.get('category', 'General')
        keywords = item.get('keywords', [])
        slug = slugify(topic)

        print(f"[{i+1}/{len(to_process)}] {topic[:60]}...")

        post_path = os.path.join(POSTS_DIR, f"{slug}.mdx")
        if os.path.exists(post_path):
            print("  ⏭️  Already exists, skipping")
            continue

        content = gen_article(topic, category, keywords)
        if not content:
            print("  ❌ Failed to generate")
            failed += 1
            continue

        today = time.strftime('%Y-%m-%d')
        frontmatter = f"""---
title: "{topic.replace(chr(34), chr(92)+chr(34))}"
date: "{today}"
category: "{category}"
description: "{topic[:160].replace(chr(34), chr(92)+chr(34))}"
---

"""
        with open(post_path, 'w', encoding='utf-8') as f:
            f.write(frontmatter + content)
        print(f"  ✅ Written: {slug}.mdx ({len(content)} chars)")

        img = gen_cover(slug)
        if img:
            print(f"  🖼️  Cover: {slug}.jpg")

        generated += 1

    with open(QUEUE_PATH, 'w', encoding='utf-8') as f:
        json.dump(remaining, f, indent=2, ensure_ascii=False)

    print(f"\n📊 Generated: {generated}, Failed: {failed}, Remaining: {len(remaining)}")

if __name__ == '__main__':
    main()
