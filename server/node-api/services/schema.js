const NODE_TYPES = new Set(['imageNode', 'videoNode', 'textNode']);
const ASSET_KINDS = new Set(['image', 'video']);
const TASK_STATUSES = new Set(['PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED']);

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function optionalString(value, field, errors) {
  if (value == null) return;
  if (typeof value !== 'string') errors.push(`${field} must be a string`);
}

function validatePosition(position, field, errors) {
  if (!isPlainObject(position)) {
    errors.push(`${field} must be an object`);
    return;
  }
  if (!isFiniteNumber(position.x)) errors.push(`${field}.x must be a number`);
  if (!isFiniteNumber(position.y)) errors.push(`${field}.y must be a number`);
}

function validateViewport(viewport, errors) {
  if (!isPlainObject(viewport)) {
    errors.push('flow.viewport must be an object');
    return;
  }
  if (!isFiniteNumber(viewport.x)) errors.push('flow.viewport.x must be a number');
  if (!isFiniteNumber(viewport.y)) errors.push('flow.viewport.y must be a number');
  if (!isFiniteNumber(viewport.zoom)) errors.push('flow.viewport.zoom must be a number');
}

function validateAsset(asset, field, errors) {
  if (asset == null) return;
  if (!isPlainObject(asset)) {
    errors.push(`${field} must be an object`);
    return;
  }
  optionalString(asset.src, `${field}.src`, errors);
  optionalString(asset.name, `${field}.name`, errors);
  if (asset.kind != null && !ASSET_KINDS.has(asset.kind)) {
    errors.push(`${field}.kind must be image or video`);
  }
}

function validateHistoryItem(item, index, errors) {
  if (!isPlainObject(item)) {
    errors.push(`history[${index}] must be an object`);
    return;
  }
  optionalString(item.id, `history[${index}].id`, errors);
  optionalString(item.nodeId, `history[${index}].nodeId`, errors);
  optionalString(item.nodeTitle, `history[${index}].nodeTitle`, errors);
  optionalString(item.prompt, `history[${index}].prompt`, errors);
  optionalString(item.provider, `history[${index}].provider`, errors);
  optionalString(item.model, `history[${index}].model`, errors);
  optionalString(item.createdAt, `history[${index}].createdAt`, errors);
  if (item.kind != null && !ASSET_KINDS.has(item.kind)) {
    errors.push(`history[${index}].kind must be image or video`);
  }
  validateAsset(item.asset, `history[${index}].asset`, errors);
}

function validateNodeData(node, index, errors) {
  const data = node.data;
  if (data == null) return;
  if (!isPlainObject(data)) {
    errors.push(`flow.nodes[${index}].data must be an object`);
    return;
  }
  optionalString(data.title, `flow.nodes[${index}].data.title`, errors);
  optionalString(data.prompt, `flow.nodes[${index}].data.prompt`, errors);
  optionalString(data.text, `flow.nodes[${index}].data.text`, errors);
  for (const key of [
    'provider',
    'model',
    'ratio',
    'size',
    'quality',
    'resolution',
    'duration',
    'scenario',
    'firstFrameNodeId',
    'lastFrameNodeId',
  ]) {
    optionalString(data[key], `flow.nodes[${index}].data.${key}`, errors);
  }
  optionalString(data.taskId, `flow.nodes[${index}].data.taskId`, errors);
  if (data.status != null && !TASK_STATUSES.has(data.status)) {
    errors.push(`flow.nodes[${index}].data.status must be a known task status`);
  }
  if (data.analysis != null && !isPlainObject(data.analysis)) {
    errors.push(`flow.nodes[${index}].data.analysis must be an object`);
  }
  validateAsset(data.asset, `flow.nodes[${index}].data.asset`, errors);
}

function validateNode(node, index, errors) {
  if (!isPlainObject(node)) {
    errors.push(`flow.nodes[${index}] must be an object`);
    return;
  }
  if (typeof node.id !== 'string' || !node.id) errors.push(`flow.nodes[${index}].id is required`);
  if (!NODE_TYPES.has(node.type)) errors.push(`flow.nodes[${index}].type is invalid`);
  validatePosition(node.position, `flow.nodes[${index}].position`, errors);
  validateNodeData(node, index, errors);
}

function validateEdge(edge, index, nodeIds, errors) {
  if (!isPlainObject(edge)) {
    errors.push(`flow.edges[${index}] must be an object`);
    return;
  }
  if (typeof edge.id !== 'string' || !edge.id) errors.push(`flow.edges[${index}].id is required`);
  if (typeof edge.source !== 'string' || !nodeIds.has(edge.source)) {
    errors.push(`flow.edges[${index}].source must reference an existing node`);
  }
  if (typeof edge.target !== 'string' || !nodeIds.has(edge.target)) {
    errors.push(`flow.edges[${index}].target must reference an existing node`);
  }
}

export function validateProjectData(project) {
  const errors = [];
  if (!isPlainObject(project)) errors.push('project must be an object');
  if (errors.length) return { ok: false, errors };

  if (project.version !== 1) errors.push('version must be 1');
  if (typeof project.slug !== 'string' || !project.slug) errors.push('slug is required');
  if (typeof project.name !== 'string' || !project.name.trim()) errors.push('name is required');
  optionalString(project.updatedAt, 'updatedAt', errors);
  if (project.history != null && !Array.isArray(project.history)) errors.push('history must be an array');
  if (Array.isArray(project.history)) {
    project.history.forEach((item, index) => validateHistoryItem(item, index, errors));
  }

  if (!isPlainObject(project.flow)) {
    errors.push('flow must be an object');
    return { ok: false, errors };
  }
  if (!Array.isArray(project.flow.nodes)) errors.push('flow.nodes must be an array');
  if (!Array.isArray(project.flow.edges)) errors.push('flow.edges must be an array');
  validateViewport(project.flow.viewport, errors);

  const nodes = Array.isArray(project.flow.nodes) ? project.flow.nodes : [];
  const nodeIds = new Set();
  nodes.forEach((node, index) => {
    validateNode(node, index, errors);
    if (typeof node?.id === 'string') {
      if (nodeIds.has(node.id)) errors.push(`flow.nodes[${index}].id is duplicated`);
      nodeIds.add(node.id);
    }
  });

  if (Array.isArray(project.flow.edges)) {
    project.flow.edges.forEach((edge, index) => validateEdge(edge, index, nodeIds, errors));
  }

  return { ok: errors.length === 0, errors };
}

export function assertValidProjectData(project) {
  const result = validateProjectData(project);
  if (!result.ok) {
    throw new Error(`Invalid project data: ${result.errors.slice(0, 6).join('; ')}`);
  }
  return project;
}

export const projectDataSchemaDescription = {
  ProjectData: {
    version: 1,
    slug: 'string',
    name: 'string',
    updatedAt: 'ISO string',
    history: 'GenerationHistoryItem[]',
    flow: 'FlowData',
  },
  FlowNode: {
    id: 'string',
    type: ['imageNode', 'videoNode', 'textNode'],
    position: { x: 'number', y: 'number' },
    data: 'NodeData',
  },
  FlowEdge: {
    id: 'string',
    source: 'node id',
    target: 'node id',
  },
};
