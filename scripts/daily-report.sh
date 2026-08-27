#!/bin/bash
# Daily ai-blog health + revenue report. Self-contained; reads tokens from files.
cd /c/Users/ansy0/ai-blog

TOKEN=$(grep -oE 'https://Ansygroup:[^@\r\n]+@github.com' ~/.git-credentials | head -1 | sed -E 's#https://Ansygroup:([^@]+)@github.com#\1#')
REPO="Ansygroup/ai-blog"
SITE="https://ai-blog-ten-steel.vercel.app"

echo "=== AI BLOG DAILY REPORT — $(date +'%Y-%m-%d %H:%M') ==="
echo

# 1. Site live status
HTTP=$(curl -s -o /dev/null -w '%{http_code}' "$SITE")
echo "[SITE] HTTP $HTTP"
ADS=$(curl -s "$SITE" | grep -oE 'ca-pub-[0-9]+' | head -1)
echo "[ADS]  AdSense: ${ADS:-NONE}"

# 2. Sitemap / indexed Q&A
QA=$(curl -s "$SITE/sitemap.xml" | grep -c "qa-" || true)
POSTS=$(ls content/posts/*.mdx 2>/dev/null | wc -l)
echo "[CONTENT] posts=$POSTS  qa_pages_in_sitemap=$QA"

# 3. Newsletter subscribers
SUB=$(node -e "try{console.log(JSON.parse(require('fs').readFileSync('public/data/subscribers.json','utf8')).length)}catch(e){console.log(0)}" 2>/dev/null)
echo "[NEWSLETTER] subscribers=$SUB"

# 4. Latest deploy SHA via node (GitHub API)
SHA=$(node -e "
const https=require('https');
const tk='$TOKEN';
const req=https.get({host:'api.github.com',path:'/repos/$REPO/commits/main',headers:{'Authorization':'Bearer '+tk,'User-Agent':'node','Accept':'application/vnd.github+json'}},r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>{try{console.log(JSON.parse(d).sha.slice(0,10))}catch(e){console.log('ERR')}})});
req.on('error',()=>console.log('ERR'));
" 2>/dev/null)
echo "[GIT]  main=${SHA:-unknown}"

# 5. GSC snapshot
if [ -f data/gsc/Queries.csv ]; then
  echo "[GSC]  Queries.csv present ($(wc -l < data/gsc/Queries.csv) rows)"
else
  echo "[GSC]  no local snapshot"
fi

echo
echo "=== DONE ==="
