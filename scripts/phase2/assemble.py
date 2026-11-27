#!/usr/bin/env python3
"""Assemble one phase-2 article from a spec JSON + markdown body into an MDX post.

Spec JSON fields:
  title, slug, excerpt, description, category, tags[], cover (optional; generated if missing),
  date (optional; defaults today), faq: [{q,a}] (optional; appended as FAQ with schema)
Body: markdown file, must NOT contain H1 (added from title), must contain no mid-word links.
Validates: word count >= 800, no mid-word link damage, internal links resolve to existing slugs,
cover exists in public/images (generates a branded one via cover.py if missing).
"""
import json, re, sys, subprocess, datetime, pathlib

ROOT = pathlib.Path(__file__).resolve().parents[2]
POSTS = ROOT / 'content' / 'posts'
IMAGES = ROOT / 'public' / 'images'

def existing_slugs():
    slugs = set()
    for p in POSTS.glob('*.mdx'):
        try:
            fm = p.read_text(encoding='utf-8').split('---', 2)[1]
            m = re.search(r'^slug:\s*(.+)$', fm, re.M)
            val = (m.group(1).strip().strip('"\'')) if m else p.stem
            if val in ('>-', '>', '|-', '|'):  # YAML folded/literal scalar: value on next line
                m2 = re.search(r'^slug:\s*[>|]-?\s*\n\s*(.+)$', fm, re.M)
                val = m2.group(1).strip().strip('"\'') if m2 else p.stem
            slugs.add(val)
        except Exception:
            slugs.add(p.stem)
    return slugs

def validate(body, slugs):
    problems = []
    if re.search(r'[A-Za-z]\[[^\]]+\]\([^)]+\)|\]\([^)]+\)[A-Za-z]', body):
        problems.append('mid-word link damage detected')
    wc = len(re.findall(r'\w+', body))
    if wc < 800:
        problems.append(f'too thin: {wc} words')
    for m in re.finditer(r'\]\(/posts/([^)#\s]+)\)', body):
        if m.group(1) not in slugs:
            problems.append(f'dead internal link: /posts/{m.group(1)}')
    return wc, problems

def fix_routes(body):
    """Rewrite internal links to the correct route (AI News posts live under /news/)."""
    routes_file = pathlib.Path(__file__).parent / 'slug-routes.json'
    if not routes_file.exists():
        return body
    route = json.loads(routes_file.read_text())
    def repl(m):
        pref, slug = m.groups()
        want = route.get(slug)
        return '](' + want + slug + ')' if want and pref != want else m.group(0)
    return re.sub(r'\]\((/posts/|/news/)([a-z0-9-]+)\)', repl, body)

def main(spec_path, body_path):
    spec = json.loads(pathlib.Path(spec_path).read_text(encoding='utf-8'))
    body = pathlib.Path(body_path).read_text(encoding='utf-8').strip()
    body = fix_routes(body)
    slug = spec['slug']
    assert re.fullmatch(r'[a-z0-9-]+', slug), 'bad slug'
    assert not (POSTS / f'{slug}.mdx').exists(), f'{slug} already exists'
    slugs = existing_slugs()
    wc, problems = validate(body, slugs)
    if problems:
        print('REJECTED:', problems); sys.exit(1)

    cover = spec.get('cover') or f'/images/{slug}.jpg'
    img = ROOT / 'public' / cover.lstrip('/')
    if not img.exists():
        subprocess.run([sys.executable, str(pathlib.Path(__file__).parent / 'cover.py'),
                        slug, spec['title'], spec['category']], check=True)

    faq = spec.get('faq') or []
    faq_md = ''
    if faq:
        faq_md = '\n\n## Frequently Asked Questions\n\n' + '\n\n'.join(
            f"### {q['q']}\n\n{q['a']}" for q in faq) + '\n'

    today = spec.get('date') or datetime.date.today().isoformat()
    from bottomline import derive_bottom_line
    bottom_line = spec.get('bottomLine') or derive_bottom_line(body)
    bl_line = f'bottomLine: "{bottom_line.replace(chr(34), chr(39))}"\n' if bottom_line else ''
    tags = '\n'.join(f'  - {t}' for t in spec['tags'])
    mdx = f"""---
title: "{spec['title'].replace('"', "'")}"
slug: {slug}
excerpt: "{spec['excerpt'].replace('"', "'")}"
description: "{spec['description'].replace('"', "'")}"
{bl_line}date: '{today}'
lastUpdated: '{today}'
author: AI Pulse Editorial
category: {spec['category']}
tags:
{tags}
cover: "{cover}"
draft: false
---

{body}{faq_md}
"""
    (POSTS / f'{slug}.mdx').write_text(mdx, encoding='utf-8')
    print(f'OK {slug}: {wc} words, cover {cover}')

if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
