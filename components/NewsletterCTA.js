'use client';
import { useState } from 'react';

export default function NewsletterCTA() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle');
  const action = process.env.NEXT_PUBLIC_NEWSLETTER_FORM_ACTION;

  const submit = async (e) => {
    e.preventDefault();
    if (!action) { setStatus('demo'); return; }
    setStatus('loading');
    try {
      const data = new FormData();
      data.append('email_address', email);
      const res = await fetch(action, { method: 'POST', body: data, mode: 'no-cors' });
      setStatus('success');
      setEmail('');
    } catch (err) { setStatus('error'); }
  };

  return (
    <section id="newsletter" className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white py-16">
      <div className="max-w-3xl mx-auto px-4 text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-3">Get the weekly AI brief</h2>
        <p className="text-lg text-blue-100 mb-8">
          One email per week. The 5 most important AI tool launches, deals, and tactics — curated for marketers and creators.
        </p>
        <form onSubmit={submit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
          <input
            type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com" aria-label="Email"
            className="flex-1 px-4 py-3 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          <button type="submit" disabled={status === 'loading'} className="bg-amber-400 hover:bg-amber-500 disabled:opacity-50 text-slate-900 font-bold px-6 py-3 rounded-lg transition">
            {status === 'loading' ? 'Subscribing...' : 'Subscribe Free'}
          </button>
        </form>
        <p className="text-xs text-blue-200 mt-3">Join 8,400+ readers. Unsubscribe anytime. We never sell your data.</p>
        {status === 'success' && <p className="text-sm text-amber-200 mt-3">✓ Check your inbox to confirm.</p>}
        {status === 'demo' && <p className="text-sm text-amber-200 mt-3">Demo mode — wire up NEXT_PUBLIC_NEWSLETTER_FORM_ACTION to enable.</p>}
        {status === 'error' && <p className="text-sm text-red-200 mt-3">Something went wrong. Try again?</p>}
      </div>
    </section>
  );
}
