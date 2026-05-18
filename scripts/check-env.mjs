import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();

function readEnvFile(filePath) {
  if (!existsSync(filePath)) return {};
  const env = {};
  for (const rawLine of readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || !line.includes('=')) continue;
    const [rawKey, ...rawValue] = line.split('=');
    const key = rawKey.trim();
    if (!key) continue;
    env[key] = rawValue.join('=').trim().replace(/^["']|["']$/g, '');
  }
  return env;
}

const env = {
  ...readEnvFile(path.join(rootDir, '.env')),
  ...readEnvFile(path.join(rootDir, '.env.local')),
  ...process.env,
};

const providerNames = (env.MEDIA_PROVIDER || 'mock')
  .split(',')
  .map((name) => name.trim().toLowerCase())
  .filter(Boolean);

const requirements = {
  mock: [],
  openai_image: [['OPENAI_IMAGE_API_KEY', 'OPENAI_API_KEY', 'GPT_IMAGE_2_API_KEY', 'VECTORENGINE_API_KEY', 'ARK_API_KEY']],
  openai: [['OPENAI_IMAGE_API_KEY', 'OPENAI_API_KEY', 'GPT_IMAGE_2_API_KEY', 'VECTORENGINE_API_KEY', 'ARK_API_KEY']],
  vectorengine_image: ['VECTORENGINE_API_KEY'],
  vectorengine: ['VECTORENGINE_API_KEY'],
  gemini: ['VECTORENGINE_API_KEY'],
  ark_video: ['ARK_API_KEY'],
  ark: ['ARK_API_KEY'],
  dashscope_video: ['DASHSCOPE_API_KEY'],
  dashscope: ['DASHSCOPE_API_KEY'],
  xunke_video: ['XUNKE_API_KEY'],
  xunke: ['XUNKE_API_KEY'],
  kkai: ['XUNKE_API_KEY'],
};

const recommended = ['NODE_API_PORT', 'MEDIA_SERVICE_PORT', 'MEDIA_SERVICE_ORIGIN'];
const missingRecommended = recommended.filter((key) => !env[key]);
const missingRequired = [];

for (const provider of providerNames.length ? providerNames : ['mock']) {
  const keys = requirements[provider];
  if (!keys) {
    missingRequired.push(`MEDIA_PROVIDER includes unsupported provider "${provider}"`);
    continue;
  }
  for (const key of keys) {
    if (Array.isArray(key)) {
      if (!key.some((candidate) => env[candidate])) {
        missingRequired.push(`${provider} requires one of: ${key.join(', ')}`);
      }
    } else if (!env[key]) {
      missingRequired.push(`${provider} requires ${key}`);
    }
  }
}

if (missingRequired.length) {
  console.error('Environment check failed:');
  for (const item of missingRequired) console.error(`- ${item}`);
  process.exit(1);
}

console.log('Environment check passed.');
console.log(`Active providers: ${providerNames.join(', ') || 'mock'}`);
if (missingRecommended.length) {
  console.log(`Recommended defaults are not set explicitly: ${missingRecommended.join(', ')}`);
  console.log('They will fall back to built-in local defaults.');
}
