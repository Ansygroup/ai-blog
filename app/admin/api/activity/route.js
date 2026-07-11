import { getLogs } from '@/lib/activity-log';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const logs = getLogs(200);
    return Response.json({ logs, total: logs.length });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
