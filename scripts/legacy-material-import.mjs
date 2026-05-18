import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(dirname, '..');
const targetLibraryDir = path.join(root, 'material-library');
const targetAssetsDir = path.join(targetLibraryDir, 'assets');
const targetIndexPath = path.join(targetLibraryDir, 'library_data.json');

function parseArgs(argv) {
  const args = {
    source: path.resolve(root, '..', 'my-canvas', 'material-library', 'library_data.json'),
    assets: '',
    write: false,
    replace: false,
  };
  for (let index = 2; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === '--source') args.source = path.resolve(argv[++index] || '');
    else if (value === '--assets') args.assets = path.resolve(argv[++index] || '');
    else if (value === '--write') args.write = true;
    else if (value === '--replace') args.replace = true;
  }
  if (!args.assets) args.assets = path.join(path.dirname(args.source), 'assets');
  return args;
}

function safeFileName(value, fallback) {
  const base = path.basename(String(value || fallback || 'asset.bin'));
  const clean = base.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 160);
  return clean || fallback || 'asset.bin';
}

function safeId(value, name) {
  const raw = String(value || '').trim();
  if (/^[a-zA-Z0-9_-]{1,120}$/.test(raw)) return raw;
  const hash = createHash('sha1').update(`${raw}-${name || ''}`).digest('hex').slice(0, 10);
  return `legacy_mat_${hash}`;
}

function inferKind(item) {
  if (item?.kind === 'video') return 'video';
  if (/\.(mp4|webm|mov|mkv|m4v)$/i.test(item?.assetPath || item?.src || '')) return 'video';
  return 'image';
}

function normalizeLegacyLibrary(raw) {
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.items)) return raw.items;
  return [];
}

function targetFileName(item, report) {
  const sourceName = safeFileName(item.assetPath || item.coverPath || item.src, `${item.id || 'material'}.bin`);
  const ext = path.extname(sourceName);
  const base = path.basename(sourceName, ext);
  const fileName = safeFileName(`${safeId(item.id, item.name)}_${base}${ext || ''}`, sourceName);
  if (fileName !== sourceName) report.renamedFiles += 1;
  return fileName;
}

function convertItem(item, report) {
  if (!item || typeof item !== 'object') {
    report.skippedItems += 1;
    return null;
  }
  const sourceAsset = item.assetPath || item.coverPath || item.src;
  if (!sourceAsset) {
    report.skippedItems += 1;
    report.missingAssetPath += 1;
    return null;
  }
  const fileName = targetFileName(item, report);
  if (item.seedanceFaceReview) report.seedanceReviewItems += 1;
  return {
    id: safeId(item.id, item.name),
    name: String(item.name || path.basename(sourceAsset) || 'Legacy Material'),
    category: String(item.category || '其他'),
    kind: inferKind(item),
    src: `/api/material-library/media/${encodeURIComponent(fileName)}`,
    createdAt: typeof item.createdAt === 'string' ? item.createdAt : new Date().toISOString(),
    legacy: {
      assetPath: String(sourceAsset),
      coverPath: item.coverPath ? String(item.coverPath) : '',
      width: Number(item.width) || null,
      height: Number(item.height) || null,
      duration: Number(item.duration) || null,
      seedanceFaceReviewStatus: item.seedanceFaceReview?.status || '',
    },
    _copy: {
      from: path.join(report.sourceAssetsDir, safeFileName(sourceAsset)),
      to: path.join(targetAssetsDir, fileName),
      fileName,
    },
  };
}

async function readJson(filePath, fallback) {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return fallback;
    throw error;
  }
}

async function copyExistingFiles(items, report) {
  await fs.mkdir(targetAssetsDir, { recursive: true });
  for (const item of items) {
    try {
      await fs.copyFile(item._copy.from, item._copy.to);
      report.copiedFiles += 1;
    } catch (error) {
      if (error.code === 'ENOENT') {
        report.missingFiles += 1;
        report.missingFileNames.push(path.basename(item._copy.from));
        continue;
      }
      throw error;
    }
  }
}

function stripInternal(item) {
  const publicItem = { ...item };
  delete publicItem._copy;
  return publicItem;
}

async function main() {
  const args = parseArgs(process.argv);
  const report = {
    mode: args.write ? 'write' : 'preview',
    source: args.source,
    sourceAssetsDir: args.assets,
    targetIndexPath,
    totalItems: 0,
    convertedItems: 0,
    skippedItems: 0,
    missingAssetPath: 0,
    missingFiles: 0,
    missingFileNames: [],
    copiedFiles: 0,
    renamedFiles: 0,
    seedanceReviewItems: 0,
    replace: args.replace,
  };

  const legacy = await readJson(args.source, null);
  if (!legacy) throw new Error(`Legacy material library not found: ${args.source}`);
  const legacyItems = normalizeLegacyLibrary(legacy);
  report.totalItems = legacyItems.length;
  const converted = legacyItems.map((item) => convertItem(item, report)).filter(Boolean);
  report.convertedItems = converted.length;

  const publicItems = converted.map(stripInternal);
  if (args.write) {
    await copyExistingFiles(converted, report);
    const existing = args.replace ? [] : normalizeLegacyLibrary(await readJson(targetIndexPath, []));
    const byId = new Map(existing.map((item) => [item.id, item]));
    for (const item of publicItems) byId.set(item.id, item);
    const merged = Array.from(byId.values()).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    await fs.mkdir(targetLibraryDir, { recursive: true });
    await fs.writeFile(targetIndexPath, JSON.stringify(merged, null, 2), 'utf8');
    report.outputItems = merged.length;
  } else {
    report.sample = publicItems.slice(0, 3);
  }

  console.log(JSON.stringify(report, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
