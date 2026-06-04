import { ImageResponse } from 'next/og';
import { getPostBySlug } from '../../../lib/posts';
import { siteConfig } from '../../../lib/config';

export const dynamic = 'force-dynamic';

export async function GET(_, { params }) {
  const post = getPostBySlug(params.slug);
  if (!post) {
    return new Response('Not found', { status: 404 });
  }

  const categoryColors = {
    Reviews: { bg: '#1e40af', text: '#bfdbfe' },
    Comparisons: { bg: '#7c3aed', text: '#ddd6fe' },
    Tutorials: { bg: '#047857', text: '#a7f3d0' },
    'Best Of': { bg: '#b45309', text: '#fde68a' },
  };
  const cc = categoryColors[post.category] || { bg: '#1e293b', text: '#cbd5e1' };

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
          padding: 60,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <span style={{
              background: cc.bg, color: cc.text, padding: '6px 16px',
              borderRadius: 999, fontSize: 18, fontWeight: 700, letterSpacing: '0.05em',
            }}>
              {post.category || 'Article'}
            </span>
            <span style={{ color: '#64748b', fontSize: 16 }}>
              {new Date(post.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
          <h1 style={{
            fontSize: 52, fontWeight: 800, color: '#f1f5f9',
            lineHeight: 1.1, margin: 0, maxWidth: 900,
            overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {post.title}
          </h1>
          {post.excerpt && (
            <p style={{ fontSize: 22, color: '#94a3b8', lineHeight: 1.4, margin: 0, maxWidth: 800 }}>
              {post.excerpt}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', width: '100%' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{
              width: 48, height: 48, borderRadius: '50%',
              background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontSize: 22, fontWeight: 700,
            }}>
              {siteConfig.name[0]}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ color: '#e2e8f0', fontSize: 18, fontWeight: 600 }}>{siteConfig.name}</span>
              <span style={{ color: '#64748b', fontSize: 14 }}>{siteConfig.tagline}</span>
            </div>
          </div>
          {post.rating && (
            <div style={{ color: '#f59e0b', fontSize: 28, letterSpacing: 4 }}>
              {'★'.repeat(Math.round(post.rating))}{'☆'.repeat(5 - Math.round(post.rating))}
            </div>
          )}
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: { 'Cache-Control': 'public, max-age=31536000, immutable' },
    },
  );
}
