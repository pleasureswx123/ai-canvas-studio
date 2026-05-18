import { readFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { readdirSync, statSync } from 'node:fs';

const roots = ['src'];
const blocked = [/window\.prompt\s*\(/, /window\.confirm\s*\(/, /window\.alert\s*\(/, /\bprompt\s*\(/, /\bconfirm\s*\(/, /\balert\s*\(/];
const allowedExtensions = new Set(['.js', '.jsx', '.ts', '.tsx']);
const violations = [];

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      walk(fullPath);
      continue;
    }
    if (!allowedExtensions.has(extname(fullPath))) continue;
    const lines = readFileSync(fullPath, 'utf8').split(/\r?\n/);
    lines.forEach((line, index) => {
      if (blocked.some((pattern) => pattern.test(line))) {
        violations.push(`${fullPath}:${index + 1}: ${line.trim()}`);
      }
    });
  }
}

for (const root of roots) walk(root);

if (violations.length) {
  console.error('Native browser dialogs are not allowed. Use app-level dialogs instead:');
  for (const violation of violations) console.error(`- ${violation}`);
  process.exit(1);
}

console.log('Native dialog check passed.');
