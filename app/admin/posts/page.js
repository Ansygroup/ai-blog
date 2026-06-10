'use client';

import { useState, useEffect } from 'react';
import PostsTable from '@/components/admin/posts-table';
import { FileText } from 'lucide-react';

export default function AdminPostsPage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/admin/api/posts')
      .then((r) => r.json())
      .then((d) => { setPosts(d.posts || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <FileText className="w-5 h-5 text-brand-600 dark:text-brand-400" />
          <h1 className="text-2xl font-heading font-bold text-slate-900 dark:text-dark-text">
            Posts
          </h1>
        </div>
        <p className="text-sm text-slate-500 dark:text-dark-muted mt-1">
          {loading ? 'Loading...' : `${posts.length} total posts`}
        </p>
      </div>
      <PostsTable posts={posts} loading={loading} />
    </div>
  );
}
