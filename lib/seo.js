// Keep <title> text short enough that "text | AI Pulse Daily" stays near 60-65 characters.
const STOP = new Set(['a', 'an', 'the', 'of', 'for', 'and', 'to', 'in', 'with', 'is', 'vs', 'on', 'at', 'by', 'or']);

export function fitTitle(text, max = 47) {
  const t = String(text || '').replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const head = t.slice(0, max + 1);
  let best = -1;
  for (const sep of [': ', ' - ', ' | ', ', ', '? ', '. ']) {
    const i = head.lastIndexOf(sep);
    if (i >= 24 && i > best) best = i;
  }
  if (best > 0) return t.slice(0, best).replace(/[\s:,.\-|]+$/, '');
  let cut = head.slice(0, head.lastIndexOf(' ')).split(' ');
  while (cut.length > 3 && STOP.has(cut[cut.length - 1].toLowerCase())) cut.pop();
  return cut.join(' ').replace(/[\s:,.\-|]+$/, '');
}

export function fitDesc(text, max = 158) {
  const t = String(text || '').replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const head = t.slice(0, max + 1);
  let best = -1;
  for (const sep of ['. ', '? ', '; ', ', ']) {
    const i = head.lastIndexOf(sep);
    if (i >= 110 && i > best) best = i;
  }
  if (best > 0) {
    const out = t.slice(0, best).replace(/[\s,;:\-]+$/, '');
    return /[.?!]$/.test(out) ? out : out + '.';
  }
  const cut = head.slice(0, head.lastIndexOf(' ')).split(' ');
  while (cut.length > 5 && STOP.has(cut[cut.length - 1].toLowerCase())) cut.pop();
  return cut.join(' ').replace(/[\s,;:\-]+$/, '') + '.';
}
