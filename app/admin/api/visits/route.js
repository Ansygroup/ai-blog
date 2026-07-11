import { getVisitStats, resetVisits } from '@/lib/visits';

export const revalidate = 60;

export async function GET(req) {
  try {
    const url = new URL(req.url);
    const days = parseInt(url.searchParams.get('days')) || 30;
    const stats = getVisitStats({ days });
    return Response.json(stats);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE() {
  const ok = resetVisits();
  return Response.json({ success: ok });
}
