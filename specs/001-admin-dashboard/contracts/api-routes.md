# API Routes Contracts

## GET /api/admin/posts

Proxies to GitHub API to fetch `content/posts/*.mdx` file listing and parse frontmatter.

**Response**:
```json
{
  "posts": [
    {
      "slug": "best-ai-writing-tools",
      "title": "Best AI Writing Tools 2026",
      "excerpt": "SEO excerpt...",
      "category": "Best Of",
      "date": "2026-06-04",
      "lastUpdated": "2026-06-04",
      "tags": ["ai writing", "ai tools"],
      "seoScore": 85,
      "draft": false,
      "rating": 4.7
    }
  ],
  "total": 187,
  "cached": true
}
```

## GET /api/admin/queue

Proxies to GitHub API to fetch `scripts/keyword-queue.json`.

**Response**:
```json
{
  "topics": [
    {
      "topic": "Comparison of AI-Powered Language...",
      "category": "Comparisons",
      "keywords": ["ai language learning"]
    }
  ],
  "total": 113,
  "cached": true
}
```

## GET /api/admin/deploy

Proxies to Vercel API — fetches latest deployments.

**Response**:
```json
{
  "deployments": [
    {
      "uid": "dpl_xxx",
      "url": "ai-blog-xxx.vercel.app",
      "readyState": "READY",
      "created": 1781100192339,
      "target": "production",
      "inspectorUrl": "https://vercel.com/..."
    }
  ],
  "total": 10
}
```

## POST /api/admin/deploy

Triggers a new Vercel deployment via Vercel API.

**Response**:
```json
{
  "success": true,
  "deployment": { "uid": "dpl_xxx", "url": "...", "readyState": "QUEUED" }
}
```

## POST /api/admin/actions/:name

Dispatches a GitHub Actions workflow.

**Body**:
```json
{
  "inputs": { "batch": 3 }
}
```

**Response**:
```json
{
  "success": true,
  "workflowRunId": 123456789
}
```

## POST /api/admin/queue

Adds a topic to keyword-queue.json via GitHub API commit.

**Body**:
```json
{
  "topic": "New Topic Title",
  "category": "Tutorials",
  "keywords": ["keyword1", "keyword2"]
}
```

**Response**:
```json
{
  "success": true,
  "sha": "abc123..."
}
```
