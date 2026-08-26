#!/usr/bin/env python3
# SAFE fixer v3: handles every broken nested-link token without losing links.
# Case A: ](/posts/X-[WORD](/posts/Y))  -> ](/posts/Y)      (Y salvageable)
# Case B: ](/posts/X-[WORD](/posts/))   -> ](/posts/X-WORD)  (no inner slug; fold word into slug)
# Case C: ](/posts/X](/posts/Y))       -> ](/posts/Y)       (outer junk)
import re, glob, os

SRC = 'content/posts'
broken = re.compile(r'\]\(/posts/[^)\s]*\[')   # a link URL containing '['
valid_slug = re.compile(r'/posts/([a-z0-9-]+)\)')

def fix_token(c, start):
    """Return (new_c, end_consumed) or (None, start) if cannot fix inline."""
    depth = 0
    end = None
    for i in range(start+2, len(c)):
        if c[i] == '(':
            depth += 1
        elif c[i] == ')':
            if depth == 0:
                end = i
                break
            depth -= 1
    if end is None:
        return None
    token = c[start:end+1]
    # Case A / C: inner has a valid slug
    slugs = valid_slug.findall(token)
    if slugs:
        slug = slugs[-1]
        return c[:start] + '](/posts/' + slug + ')' + c[end+1:]
    # Case B: no inner slug -> fold word into outer slug
    # token like ](/posts/X-[WORD](/posts/))
    m = re.match(r'\]\(/posts/([a-z0-9-]+)-\[([a-z0-9-]+)\]\(/posts/\)\)', token)
    if m:
        return c[:start] + '](/posts/' + m.group(1) + '-' + m.group(2) + ')' + c[end+1:]
    # fallback: leave untouched (shouldn't happen)
    return None

fixed_files = 0
total_fixed = 0
for f in glob.glob(os.path.join(SRC, '*.mdx')):
    with open(f, 'r', encoding='utf-8') as fh:
        c = fh.read()
    if not broken.search(c):
        continue
    c2 = c
    changed = False
    guard = 0
    while broken.search(c2) and guard < 500:
        guard += 1
        start = broken.search(c2).start()
        res = fix_token(c2, start)
        if res is None:
            # neutralize this token so loop terminates: replace '[' in URL with '_'
            i = c2.find('[', start)
            c2 = c2[:i] + '_' + c2[i+1:]
            continue
        c2 = res
        changed = True
        total_fixed += 1
    if changed:
        fixed_files += 1
        with open(f, 'w', encoding='utf-8') as fh:
            fh.write(c2)

print(f"fixed_files={fixed_files} total_fixed={total_fixed}")
