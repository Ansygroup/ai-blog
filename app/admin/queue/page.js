'use client';

import { useState, useEffect } from 'react';
import QueueList from '@/components/admin/queue-list';
import { ListTodo } from 'lucide-react';

export default function AdminQueuePage() {
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/admin/api/queue')
      .then((r) => r.json())
      .then((d) => { setTopics(d.topics || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function handleAdd(item) {
    const res = await fetch('/admin/api/queue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
    if (!res.ok) throw new Error('Failed to add');
    setTopics((prev) => [item, ...prev]);
  }

  async function handleDelete(topic) {
    const res = await fetch('/admin/api/queue', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic }),
    });
    if (!res.ok) throw new Error('Failed to delete');
    setTopics((prev) => prev.filter((t) => t.topic !== topic));
  }

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <ListTodo className="w-5 h-5 text-brand-600 dark:text-brand-400" />
          <h1 className="text-2xl font-heading font-bold text-slate-900 dark:text-dark-text">
            Keyword Queue
          </h1>
        </div>
        <p className="text-sm text-slate-500 dark:text-dark-muted mt-1">
          Pending blog post topics waiting for generation
        </p>
      </div>
      <QueueList topics={topics} loading={loading} onAdd={handleAdd} onDelete={handleDelete} />
    </div>
  );
}
