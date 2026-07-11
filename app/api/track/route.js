import { trackVisit } from '@/lib/visits';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const { path, referrer, ua } = body;

    const pathname = path || '/';
    const result = trackVisit({
      req,
      pathname,
      ua: ua || req.headers.get('user-agent') || '',
    });

    return Response.json({ ok: result.tracked, ...result });
  } catch (err) {
    return Response.json({ ok: false, error: err.message }, { status: 500 });
  }
}

export async function GET(req) {
  const url = new URL(req.url);
  const pathname = url.searchParams.get('path') || '/';
  const result = trackVisit({
    req,
    pathname,
    ua: req.headers.get('user-agent') || '',
  });
  return Response.json({ ok: result.tracked, ...result });
}
