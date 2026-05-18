export function createCanvasNode(type, position, data = {}) {
  const id = `node_${Date.now().toString(36)}_${Math.random().toString(16).slice(2, 8)}`;
  return {
    id,
    type,
    position,
    data: {
      title: type === 'textNode' ? '文本节点' : type === 'videoNode' ? '视频节点' : '图片节点',
      prompt: '',
      text: '',
      ...data,
    },
  };
}

export function cloneCanvasNode(node, offset = { x: 36, y: 36 }) {
  return {
    ...node,
    id: `node_${Date.now().toString(36)}_${Math.random().toString(16).slice(2, 8)}`,
    selected: false,
    position: {
      x: (Number(node.position?.x) || 0) + offset.x,
      y: (Number(node.position?.y) || 0) + offset.y,
    },
    data: {
      ...(node.data || {}),
      title: `${node.data?.title || '节点'} 副本`,
    },
  };
}

export function normalizeFlow(project) {
  return {
    nodes: Array.isArray(project?.flow?.nodes) ? project.flow.nodes : [],
    edges: Array.isArray(project?.flow?.edges) ? project.flow.edges : [],
    viewport: project?.flow?.viewport || { x: 0, y: 0, zoom: 1 },
  };
}
