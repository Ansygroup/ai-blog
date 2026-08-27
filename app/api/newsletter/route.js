import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'public', 'data');
const FILE = path.join(DATA_DIR, 'subscribers.json');

export const dynamic = 'force-dynamic';

function readSubs() {
  try {
    if (!fs.existsSync(FILE)) return [];
    return JSON.parse(fs.readFileSync(FILE, 'utf8'));
  } catch {
    return [];
  }
}

function writeSubs(list) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(list, null, 2));
}

export async function POST(req) {
  let email = '';
  const ct = req.headers.get('content-type') || '';
  try {
    if (ct.includes('application/json')) {
      const body = await req.json();
      email = (body.email || body.email_address || '').toString().trim();
    } else {
      const form = await req.formData();
      email = (form.get('email') || form.get('email_address') || '').toString().trim();
    }
  } catch {
    return NextResponse.json({ ok: false, error: 'bad request' }, { status: 400 });
  }

  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (!valid) return NextResponse.json({ ok: false, error: 'invalid email' }, { status: 400 });

  const subs = readSubs();
  if (subs.find((s) => s.email.toLowerCase() === email.toLowerCase())) {
    return NextResponse.json({ ok: true, duplicate: true, message: 'Already subscribed' });
  }
  subs.push({ email, subscribedAt: new Date().toISOString(), source: 'site-cta' });
  writeSubs(subs);

  return NextResponse.json({ ok: true, message: 'Subscribed' });
}

export async function GET() {
  const subs = readSubs();
  return NextResponse.json({ count: subs.length, subscribers: subs });
}
