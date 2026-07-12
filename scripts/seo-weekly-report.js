#!/usr/bin/env node
/**
 * scripts/seo-weekly-report.js
 *
 * Produces a compact Telegram-ready summary of the blog's SEO state from the
 * latest GSC export + orchestrator report. Run weekly by Hermes cron.
 *
 * Usage:
 *   node scripts/seo-weekly-report.js
 *   (prints a Markdown block; Hermes forwards it to Telegram)
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const REPORT = path.join(ROOT, 'data', 'gsc-report.json');
const ORCH = path.join(ROOT, 'data', 'seo-orchestrator-report.md');

function main() {
  if (!fs.existsSync(REPORT)) {
    console.log('⚠️ لا يوجد تقرير GSC — شغّل gsc-analyze.js أولاً (أو حمّل CSV جديد).');
    return;
  }
  const r = JSON.parse(fs.readFileSync(REPORT, 'utf8'));
  const t = r.totals;
  const date = new Date().toISOString().slice(0, 10);

  let out = `📊 *تقرير السيو الأسبوعي — ${date}*\n`;
  out += `━━━━━━━━━━━━━━━━━━\n`;
  out += `🔎 الظهور: *${t.pageImpressions}*\n`;
  out += `🖱️ النقرات: *${t.pageClicks}*\n`;
  out += `📈 متوسط CTR: *${t.avgCtr}%*\n\n`;
  out += `🎯 *أهم الصفحات (أولوية الترقية):*\n`;
  r.priorityPages.slice(0, 6).forEach((p, i) => {
    const flag = p.action === 'WIN' ? '🟢' : p.action === 'PUSH' ? '🟡' : '🔴';
    out += `${i + 1}. ${flag} \`${p.slug.slice(0, 38)}\`\n   المركز ${p.pos} • ظهور ${p.impr} • CTR ${p.ctr}%\n`;
  });
  out += `\n🌍 *أعلى الدول:* `;
  out += r.topCountries.slice(0, 4).map(c => `${c.c}(${c.im})`).join(' · ');
  out += `\n\n✅ المحرك الأوتوماتيكي شغّال — يرقّي العناوين + الروابط الداخلية أسبوعيًا.`;
  console.log(out);
}

main();
