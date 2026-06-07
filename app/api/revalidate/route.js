import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const secret = body.secret || request.nextUrl.searchParams.get('secret');

    if (secret !== process.env.REVALIDATION_SECRET) {
      return NextResponse.json({ message: 'Invalid secret' }, { status: 401 });
    }

    const paths = body.paths || ['/news', '/posts'];

    for (const p of paths) {
      revalidatePath(p);
    }

    return NextResponse.json({ revalidated: true, paths, now: Date.now() });
  } catch (err) {
    return NextResponse.json({ message: err.message }, { status: 500 });
  }
}
