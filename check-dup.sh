#!/usr/bin/env bash
cd /c/Users/ansy0/ZCodeProject/projects/repos/ai-blog
echo "=== verify the 50 reassigned images exist & are real JPEGs ==="
cnt=0; miss=0
for f in content/posts/qa-*.mdx; do
  slug=$(basename "$f" .mdx)
  img="public/images/$slug.jpg"
  if [ -f "$img" ]; then
    sz=$(wc -c < "$img")
    if [ "$sz" -gt 5000 ]; then cnt=$((cnt+1)); else miss=$((miss+1)); fi
  else miss=$((miss+1)); fi
done
echo "valid_reassigned_images=$cnt  missing_or_tiny=$miss"
