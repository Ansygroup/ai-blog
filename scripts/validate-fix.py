#!/usr/bin/env python3
# Validation: run safe fixer on copies, compare valid-link counts (must not drop).
import re, glob, os, shutil
SRC = 'content/posts'
TMP = 'C:/Users/ansy0/testfix/v3'
os.makedirs(TMP, exist_ok=True)
valid_slug = re.compile(r'/posts/([a-z0-9-]+)\)')
broken = re.compile(r'\]\(/posts/[^)\s]*\[')

import importlib.util
spec = importlib.util.spec_from_file_location("fx", "scripts/fix-nested-links-safe.py")
# Instead of importing (it writes to repo), replicate logic on copies:
def fix_token(c, start):
    depth=0; end=None
    for i in range(start+2, len(c)):
        if c[i]=='(': depth+=1
        elif c[i]==')':
            if depth==0: end=i; break
            depth-=1
    if end is None: return None
    token=c[start:end+1]
    slugs=valid_slug.findall(token)
    if slugs: return c[:start]+'](/posts/'+slugs[-1]+')'+c[end+1:]
    m=re.match(r'\]\(/posts/([a-z0-9-]+)-\[([a-z0-9-]+)\]\(/posts/\)\)', token)
    if m: return c[:start]+'](/posts/'+m.group(1)+'-'+m.group(2)+')'+c[end+1:]
    return None

worst_drop=0; fixed=0
for f in glob.glob(os.path.join(SRC,'*.mdx')):
    c=open(f,encoding='utf-8').read()
    if not broken.search(c): continue
    before=len(valid_slug.findall(c))
    c2=c; g=0
    while broken.search(c2) and g<500:
        g+=1; s=broken.search(c2).start(); r=fix_token(c2,s)
        if r is None:
            i=c2.find('[',s); c2=c2[:i]+'_'+c2[i+1:]; continue
        c2=r
    after=len(valid_slug.findall(c2))
    drop=before-after
    if drop>worst_drop: worst_drop=drop
    if c2!=c:
        fixed+=1
        shutil.copy(f, os.path.join(TMP, os.path.basename(f)))
        open(os.path.join(TMP,os.path.basename(f)),'w',encoding='utf-8').write(c2)
print(f"validated_fixed={fixed} worst_valid_link_drop={worst_drop}")
