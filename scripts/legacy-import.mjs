import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { assertValidProjectData } from '../server/node-api/services/schema.js';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(dirname, '..');
const projectsRoot = path.join(root, 'projects');

function parseArgs(argv) {
  const args = { write: false, source: '', outSlug: '' };
  for (let index = 2; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === '--write') args.write = true;
    else if (value === '--source') args.source = argv[++index] || '';
    else if (value === '--out-slug') args.outSlug = argv[++index] || '';
  }
  return args;
}

function nowIso() {
  return new Date().toISOString();
}

function safeSlug(value) {
  const raw = String(value || '').trim();
  if (/^[a-zA-Z0-9_-]{1,120}$/.test(raw)) return raw;
  const hash = createHash('sha1').update(raw || `${Date.now()}`).digest('hex').slice(0, 8);
  return `legacy_${Date.now().toString(36)}_${hash}`;
}

function inferKindFromSrc(src = '') {
  return /\.(mp4|webm|mov|mkv|avi|m4v)$/i.test(src) ? 'video' : 'image';
}

function pickAsset(data, type) {
  if (!data || typeof data !== 'object') return null;
  if (type === 'imageNode') return data.imageAsset || data.capturedFrame || data.generatedImage || null;
  if (type === 'videoNode') return data.generatedVideo || data.capturedClip || data.videoAsset || null;
  return null;
}

function convertAsset(asset, fallbackKind) {
  if (!asset?.src || typeof asset.src !== 'string') return null;
  return {
    src: asset.src,
    name: typeof asset.name === 'string' ? asset.name : path.basename(asset.src.split('?')[0]),
    kind: fallbackKind || inferKindFromSrc(asset.src),
  };
}

function convertNodeType(type) {
  if (type === 'AIImageNode') return 'imageNode';
  if (type === 'AIVideoNode') return 'videoNode';
  if (type === 'AITextNode') return 'textNode';
  return null;
}

function convertNode(node, report) {
  const type = convertNodeType(node?.type);
  if (!type) {
    report.skippedNodes += 1;
    report.skippedNodeTypes[node?.type || 'unknown'] = (report.skippedNodeTypes[node?.type || 'unknown'] || 0) + 1;
    return null;
  }
  const data = node.data && typeof node.data === 'object' ? node.data : {};
  const nextData = {
    title:
      data.title ||
      data.name ||
      (type === 'imageNode' ? '导入图片' : type === 'videoNode' ? '导入视频' : '导入文本'),
  };

  if (type === 'textNode') {
    nextData.text = data.text || data.content || data.prompt || data.generationPrompt || '';
  } else {
    nextData.prompt = data.generationPrompt || data.prompt || data.lastGenerationPrompt || '';
    const asset = convertAsset(pickAsset(data, type), type === 'videoNode' ? 'video' : 'image');
    if (asset) {
      nextData.asset = asset;
      report.migratedAssets += 1;
    } else {
      report.missingAssets += 1;
    }
    if (data.taskId) nextData.taskId = String(data.taskId);
    if (data.status) nextData.status = String(data.status);
  }

  return {
    id: String(node.id || `legacy_node_${report.convertedNodes + 1}`),
    type,
    position: {
      x: Number(node.position?.x) || 0,
      y: Number(node.position?.y) || 0,
    },
    data: nextData,
  };
}

function convertEdges(edges, nodeIdMap, report) {
  if (!Array.isArray(edges)) return [];
  return edges
    .map((edge, index) => {
      const source = nodeIdMap.get(edge?.source);
      const target = nodeIdMap.get(edge?.target);
      if (!source || !target) {
        report.skippedEdges += 1;
        return null;
      }
      return {
        id: String(edge.id || `legacy_edge_${index + 1}`),
        source,
        target,
        sourceHandle: edge.sourceHandle == null ? null : String(edge.sourceHandle),
        targetHandle: edge.targetHandle == null ? null : String(edge.targetHandle),
      };
    })
    .filter(Boolean);
}

export function convertLegacyProject(legacy, options = {}) {
  const report = {
    sourceSlug: legacy.slug || '',
    convertedNodes: 0,
    skippedNodes: 0,
    skippedNodeTypes: {},
    convertedEdges: 0,
    skippedEdges: 0,
    migratedAssets: 0,
    missingAssets: 0,
    ignoredTransientFields: [
      'singleSelectedNodeId',
      'focusedNodeId',
      'textEditingNodeId',
      'maximizedViewNodeId',
      'connectionHoverNodeId',
      'connectionHoverTilt',
      'uiDismissToken',
    ],
  };
  const flow = legacy.flow && typeof legacy.flow === 'object' ? legacy.flow : {};
  const nodes = [];
  const nodeIdMap = new Map();
  for (const node of Array.isArray(flow.nodes) ? flow.nodes : []) {
    const converted = convertNode(node, report);
    if (!converted) continue;
    nodes.push(converted);
    nodeIdMap.set(node.id, converted.id);
    report.convertedNodes += 1;
  }
  const edges = convertEdges(flow.edges, nodeIdMap, report);
  report.convertedEdges = edges.length;

  const project = {
    version: 1,
    slug: safeSlug(options.outSlug || `${legacy.slug || 'legacy'}_imported`),
    name: `${legacy.name || legacy.slug || 'Legacy Project'}（导入）`,
    updatedAt: nowIso(),
    flow: {
      nodes,
      edges,
      viewport: {
        x: Number(flow.viewport?.x) || 0,
        y: Number(flow.viewport?.y) || 0,
        zoom: Number(flow.viewport?.zoom) || 1,
      },
    },
  };
  assertValidProjectData(project);
  return { project, report };
}

async function main() {
  const args = parseArgs(process.argv);
  if (!args.source) {
    throw new Error('Usage: node scripts/legacy-import.mjs --source <legacy project_data.json> [--write] [--out-slug slug]');
  }
  const sourcePath = path.resolve(args.source);
  const legacy = JSON.parse(await fs.readFile(sourcePath, 'utf8'));
  const { project, report } = convertLegacyProject(legacy, args);
  const result = {
    mode: args.write ? 'write' : 'preview',
    outputSlug: project.slug,
    outputPath: path.join(projectsRoot, project.slug, 'project_data.json'),
    report,
  };
  if (args.write) {
    const outDir = path.join(projectsRoot, project.slug);
    await fs.mkdir(path.join(outDir, 'assets'), { recursive: true });
    await fs.writeFile(path.join(outDir, 'project_data.json'), JSON.stringify(project, null, 2), 'utf8');
  }
  console.log(JSON.stringify(result, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
