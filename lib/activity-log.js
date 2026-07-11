import fs from 'fs';
import path from 'path';

const LOG_PATH = path.join(process.cwd(), 'public', 'data', 'activity-log.json');

export function logAction(action, details = {}) {
  try {
    const log = fs.existsSync(LOG_PATH) ? JSON.parse(fs.readFileSync(LOG_PATH, 'utf8')) : [];
    log.unshift({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      action,
      details,
      timestamp: new Date().toISOString(),
    });
    if (log.length > 500) log.length = 500;
    fs.writeFileSync(LOG_PATH, JSON.stringify(log, null, 2), 'utf8');
  } catch {}
}

export function getLogs(limit = 100) {
  try {
    if (!fs.existsSync(LOG_PATH)) return [];
    const log = JSON.parse(fs.readFileSync(LOG_PATH, 'utf8'));
    return log.slice(0, limit);
  } catch { return []; }
}
