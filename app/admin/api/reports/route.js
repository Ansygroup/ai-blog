import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const reportsDir = path.join(process.cwd(), 'public', 'reports');
    if (!fs.existsSync(reportsDir)) {
      return Response.json({ latest: null, reports: [] });
    }

    const files = fs.readdirSync(reportsDir)
      .filter(f => f.startsWith('performance-') && f.endsWith('.md'))
      .sort()
      .reverse();

    if (files.length === 0) {
      return Response.json({ latest: null, reports: [] });
    }

    const latest = files[0];
    const content = fs.readFileSync(path.join(reportsDir, latest), 'utf8');

    return Response.json({
      latest: { file: latest, content },
      reports: files.map(f => ({ file: f, date: f.replace('performance-', '').replace('.md', '') })),
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
