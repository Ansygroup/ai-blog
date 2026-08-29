// Cron helper: runs the daily growth engine with a closed stdin so the
// background-launched node doesn't trip the Windows "stdin is not a tty"
// guard that some of its execSync children produce.
import { spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';

const log = createWriteStream('C:/Users/ansy0/AppData/Local/Temp/dge.log', { flags: 'w' });
const child = spawn(
  process.execPath,
  ['scripts/daily-growth-engine.js'],
  { cwd: 'C:/Users/ansy0/ai-blog', stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true }
);
child.stdout.pipe(log);
child.stderr.pipe(log);
child.on('exit', (code) => {
  log.write(`\n[runner] engine exit=${code}\n`);
  log.end();
  process.exit(code ?? 0);
});
