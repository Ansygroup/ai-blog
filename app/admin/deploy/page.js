'use client';

import { useState, useEffect } from 'react';
import DeployList from '@/components/admin/deploy-list';
import { Rocket } from 'lucide-react';

export default function AdminDeployPage() {
  const [deployments, setDeployments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function fetchDeployments() {
    setLoading(true);
    try {
      const res = await fetch('/admin/api/deploy');
      const data = await res.json();
      if (data.error) { setError(data.error); setDeployments([]); }
      else { setDeployments(data.deployments || []); setError(null); }
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }

  useEffect(() => { fetchDeployments(); }, []);

  async function handleDeploy() {
    const res = await fetch('/admin/api/deploy', { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      setDeployments((prev) => [data.deployment, ...prev]);
    } else {
      setError(data.error);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <Rocket className="w-5 h-5 text-brand-600 dark:text-brand-400" />
          <h1 className="text-2xl font-heading font-bold text-slate-900 dark:text-dark-text">
            Deployments
          </h1>
        </div>
        <p className="text-sm text-slate-500 dark:text-dark-muted mt-1">
          Vercel deployment status and history
        </p>
      </div>
      <DeployList
        deployments={deployments}
        loading={loading}
        error={error}
        onDeploy={handleDeploy}
      />
    </div>
  );
}
