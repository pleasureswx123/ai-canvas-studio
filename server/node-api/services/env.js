import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

function loadEnvFile(filePath, { override = false } = {}) {
  if (!existsSync(filePath)) return;
  const lines = readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || !line.includes('=')) continue;
    const [rawKey, ...rawValue] = line.split('=');
    const key = rawKey.trim();
    if (!key) continue;
    if (!override && process.env[key] !== undefined) continue;
    process.env[key] = rawValue.join('=').trim().replace(/^["']|["']$/g, '');
  }
}

export function loadProjectEnv(rootDir = process.cwd()) {
  loadEnvFile(path.join(rootDir, '.env'), { override: false });
  loadEnvFile(path.join(rootDir, '.env.local'), { override: true });
}
