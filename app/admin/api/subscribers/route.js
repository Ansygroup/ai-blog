import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const FILE = path.join(process.cwd(), 'public', 'data', 'subscribers.json');

function readSubs() {
  try {
    if (!fs.existsSync(FILE)) return [];
    return JSON.parse(fs.readFileSync(FILE, 'utf8'));
  } catch {
    return [];
  }
}

export async function GET(req) {
  const subs = readSubs();
  const url = new URL(req.url);
  if (url.searchParams.get('format') === 'csv') {
    const header = 'email,subscribedAt,source\n';
    const rows = subs
      .map((s) => `${s.email},${s.subscribedAt || ''},${s.source || ''}`)
      .join('\n');
    return new Response(header + rows, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="subscribers.csv"',
      },
    });
  }
  return Response.json({
    count: subs.length,
    subscribers: subs.map((s) => ({ email: s.email, subscribedAt: s.subscribedAt })),
  });
}
