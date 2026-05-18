import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
} from '@xyflow/react';
import { Copy, ImagePlus, Trash2, Type, Upload, Video } from 'lucide-react';
import ImageNode from '../features/canvas/nodes/ImageNode.jsx';
import TextNode from '../features/canvas/nodes/TextNode.jsx';
import VideoNode from '../features/canvas/nodes/VideoNode.jsx';
import { cloneCanvasNode, createCanvasNode, normalizeFlow } from '../features/canvas/model.js';
import {
  createProject,
  deleteProject,
  listProjects,
  loadProject,
  renameProject,
  saveProject,
  uploadProjectAsset,
} from '../features/projects/projectApi.js';
import ProjectSidebar from '../features/projects/ProjectSidebar.jsx';
import MaterialPanel from '../features/materials/MaterialPanel.jsx';
import { deleteMaterial, listMaterials, reviewSeedanceMaterial, saveMaterial } from '../features/materials/materialApi.js';
import SaveMaterialModal from '../features/materials/SaveMaterialModal.jsx';
import { inferAssetKind } from '../shared/utils/files.js';
import EmptyCanvasState from '../features/canvas/components/EmptyCanvasState.jsx';
import ConfirmDialog from '../shared/ui/ConfirmDialog.jsx';
import Notice from '../shared/ui/Notice.jsx';
import { saveStatusKind, saveStatusLabel } from '../features/projects/saveStatus.js';

const nodeTypes = {
  imageNode: ImageNode,
  videoNode: VideoNode,
  textNode: TextNode,
};

function stripRuntimeNodeData(nodes) {
  return nodes.map((node) => {
    const data = Object.fromEntries(
      Object.entries(node.data || {}).filter(
        ([key]) => !['onSaveMaterial', 'onPatchNode', 'projectSlug'].includes(key)
      )
    );
    return { ...node, data };
  });
}

function makeProjectPayload(project, nodes, edges, viewport) {
  return {
    ...project,
    history: Array.isArray(project?.history) ? project.history : [],
    flow: {
      nodes: stripRuntimeNodeData(nodes),
      edges,
      viewport,
    },
  };
}

function collectUpstreamContext(nodeId, nodes, edges) {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const current = byId.get(nodeId);
  const upstream = edges
    .filter((edge) => edge.target === nodeId)
    .map((edge) => byId.get(edge.source))
    .filter(Boolean);
  const mentionMatches = `${current?.data?.prompt || ''}\n${current?.data?.text || ''}`.matchAll(
    /@\[.+?\]\(node:([^)]+)\)/g
  );
  for (const match of mentionMatches) {
    const mentioned = byId.get(match[1]);
    if (mentioned && !upstream.some((node) => node.id === mentioned.id)) upstream.push(mentioned);
  }
  const imageRefs = upstream
    .map((node) => node.data?.asset)
    .filter((asset) => asset?.kind === 'image' && asset?.src)
    .map((asset) => asset.src);
  const imageOptions = upstream
    .filter((node) => node.data?.asset?.kind === 'image' && node.data.asset.src)
    .map((node) => ({
      id: node.id,
      title: node.data?.title || node.id,
      src: node.data.asset.src,
    }));
  const textRefs = upstream
    .map((node) => node.data?.text || node.data?.prompt)
    .filter(Boolean)
    .map((value) => String(value).trim())
    .filter(Boolean);
  return {
    upstreamImages: imageRefs,
    upstreamImageOptions: imageOptions,
    upstreamText: textRefs.join('\n\n'),
    upstreamSummary:
      upstream.length > 0 ? `上游引用：${imageRefs.length} 张图片，${textRefs.length} 段文本` : '',
  };
}

function Workbench() {
  const [projects, setProjects] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [currentProject, setCurrentProject] = useState(null);
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [notice, setNotice] = useState(null);
  const [saveStatus, setSaveStatus] = useState('idle');
  const [pendingDeleteSlug, setPendingDeleteSlug] = useState(null);
  const [materialDraft, setMaterialDraft] = useState(null);
  const [uploadState, setUploadState] = useState('idle');
  const autosaveTimerRef = useRef(null);
  const lastSavedSignatureRef = useRef('');
  const { screenToFlowPosition, getViewport, setViewport } = useReactFlow();

  const showNotice = useCallback((kind, text) => {
    setNotice({ kind, text });
  }, []);

  const refreshProjects = useCallback(async () => {
    setProjects(await listProjects());
  }, []);

  const refreshMaterials = useCallback(async () => {
    setMaterials(await listMaterials());
  }, []);

  useEffect(() => {
    refreshProjects().catch((error) => showNotice('error', error.message));
    refreshMaterials().catch((error) => showNotice('error', error.message));
  }, [refreshMaterials, refreshProjects, showNotice]);

  useEffect(
    () => () => {
      if (autosaveTimerRef.current) window.clearTimeout(autosaveTimerRef.current);
    },
    []
  );

  const handleSaveMaterial = useCallback(
    (asset) => {
      if (!asset?.src) return;
      setMaterialDraft({
        name: asset.name || '未命名素材',
        category: '其他',
        kind: asset.kind || inferAssetKind(asset.src),
        src: asset.src,
      });
    },
    []
  );

  const confirmSaveMaterial = async (draft, options = {}) => {
    if (options.previewOnly) {
      setMaterialDraft(draft);
      return;
    }
    try {
      const item = await saveMaterial(draft);
      setMaterials((items) => [item, ...items.filter((existing) => existing.id !== item.id)]);
      setMaterialDraft(null);
      showNotice('success', '素材已保存');
    } catch (error) {
      showNotice('error', error.message);
    }
  };

  const patchNodeData = useCallback((nodeId, patch) => {
    setNodes((items) =>
      items.map((node) => (node.id === nodeId ? { ...node, data: { ...node.data, ...patch } } : node))
    );
    setSaveStatus('dirty');
  }, []);

  const deleteNodesById = useCallback((nodeIds) => {
    const ids = new Set(Array.isArray(nodeIds) ? nodeIds : [nodeIds]);
    if (ids.size === 0) return;
    setNodes((items) => items.filter((node) => !ids.has(node.id)));
    setEdges((items) => items.filter((edge) => !ids.has(edge.source) && !ids.has(edge.target)));
    setSaveStatus('dirty');
  }, []);

  const duplicateNodesById = useCallback((nodeIds) => {
    const ids = new Set(Array.isArray(nodeIds) ? nodeIds : [nodeIds]);
    if (ids.size === 0) return;
    setNodes((items) => {
      const clones = items.filter((node) => ids.has(node.id)).map((node, index) => cloneCanvasNode(node, { x: 42 + index * 16, y: 42 + index * 16 }));
      return [...items, ...clones];
    });
    setSaveStatus('dirty');
  }, []);

  const recordGenerationHistory = useCallback((entry) => {
    setCurrentProject((project) => {
      if (!project || !entry?.asset?.src) return project;
      const item = {
        id: `hist_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
        nodeId: entry.nodeId || '',
        nodeTitle: entry.nodeTitle || '未命名节点',
        kind: entry.kind === 'video' ? 'video' : 'image',
        prompt: entry.prompt || '',
        provider: entry.provider || '',
        model: entry.model || '',
        asset: entry.asset,
        createdAt: new Date().toISOString(),
      };
      return { ...project, history: [item, ...(project.history || [])].slice(0, 100) };
    });
    setSaveStatus('dirty');
  }, []);

  const runtimeNodes = useMemo(
    () =>
      nodes.map((node) => ({
        ...node,
        data: {
          ...node.data,
          projectSlug: currentProject?.slug,
          mentionOptions: nodes
            .filter((item) => item.id !== node.id)
            .map((item) => ({ id: item.id, title: item.data?.title || item.id })),
          ...collectUpstreamContext(node.id, nodes, edges),
          onSaveMaterial: handleSaveMaterial,
          onPatchNode: patchNodeData,
          onDeleteNode: deleteNodesById,
          onDuplicateNode: duplicateNodesById,
          onRecordHistory: recordGenerationHistory,
        },
      })),
    [
      currentProject?.slug,
      deleteNodesById,
      duplicateNodesById,
      edges,
      handleSaveMaterial,
      nodes,
      patchNodeData,
      recordGenerationHistory,
    ]
  );

  const selectedNodeIds = useMemo(() => nodes.filter((node) => node.selected).map((node) => node.id), [nodes]);

  const handleCreateProject = async () => {
    const name = window.prompt('工程名称', 'Untitled Project');
    if (!name) return;
    try {
      const project = await createProject(name);
      setCurrentProject(project);
      setNodes([]);
      setEdges([]);
      setViewport({ x: 0, y: 0, zoom: 1 });
      lastSavedSignatureRef.current = JSON.stringify(makeProjectPayload(project, [], [], { x: 0, y: 0, zoom: 1 }));
      setSaveStatus('saved');
      await refreshProjects();
      showNotice('success', '工程已创建');
    } catch (error) {
      showNotice('error', error.message);
    }
  };

  const handleOpenProject = async (slug) => {
    try {
      const project = await loadProject(slug);
      const flow = normalizeFlow(project);
      setCurrentProject(project);
      setNodes(flow.nodes);
      setEdges(flow.edges);
      window.setTimeout(() => setViewport(flow.viewport), 0);
      lastSavedSignatureRef.current = JSON.stringify(makeProjectPayload(project, flow.nodes, flow.edges, flow.viewport));
      setSaveStatus('saved');
      showNotice('success', `已打开：${project.name}`);
    } catch (error) {
      showNotice('error', error.message);
    }
  };

  const handleSaveProject = useCallback(async (options = {}) => {
    if (!currentProject) return;
    try {
      setSaveStatus('saving');
      const payload = makeProjectPayload(currentProject, nodes, edges, getViewport());
      const saved = await saveProject(currentProject.slug, payload);
      setCurrentProject(saved);
      lastSavedSignatureRef.current = JSON.stringify(makeProjectPayload(saved, nodes, edges, getViewport()));
      setSaveStatus('saved');
      if (options.refresh !== false) await refreshProjects();
      if (!options.silent) showNotice('success', '工程已保存');
    } catch (error) {
      setSaveStatus('failed');
      showNotice('error', error.message);
    }
  }, [currentProject, edges, getViewport, nodes, refreshProjects, showNotice]);

  useEffect(() => {
    if (!currentProject) return;
    const signature = JSON.stringify(makeProjectPayload(currentProject, nodes, edges, getViewport()));
    if (signature === lastSavedSignatureRef.current) return;
    setSaveStatus((status) => (status === 'saving' ? status : 'dirty'));
    if (autosaveTimerRef.current) window.clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = window.setTimeout(() => {
      handleSaveProject({ silent: true, refresh: false });
    }, 1600);
  }, [currentProject, edges, getViewport, handleSaveProject, nodes]);

  const handleRenameProject = async (project) => {
    const name = window.prompt('新工程名称', project.name);
    if (!name) return;
    try {
      const renamed = await renameProject(project.slug, name);
      if (project.slug === currentProject?.slug) setCurrentProject(renamed);
      await refreshProjects();
    } catch (error) {
      showNotice('error', error.message);
    }
  };

  const handleDeleteProject = async (slug) => {
    setPendingDeleteSlug(slug);
  };

  const confirmDeleteProject = async () => {
    const slug = pendingDeleteSlug;
    setPendingDeleteSlug(null);
    if (!slug) return;
    try {
      await deleteProject(slug);
      if (slug === currentProject?.slug) {
        setCurrentProject(null);
        setNodes([]);
        setEdges([]);
        setSaveStatus('idle');
      }
      await refreshProjects();
    } catch (error) {
      showNotice('error', error.message);
    }
  };

  const addNode = (type, data = {}) => {
    if (!currentProject) {
      showNotice('warning', '请先创建或打开工程');
      return;
    }
    const position = screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
    setNodes((items) => [...items, createCanvasNode(type, position, data)]);
    setSaveStatus('dirty');
  };

  const addMaterialNode = useCallback(
    (item, clientPoint) => {
      const position = screenToFlowPosition(clientPoint || { x: window.innerWidth / 2, y: window.innerHeight / 2 });
      const type = item.kind === 'video' ? 'videoNode' : 'imageNode';
      if (!currentProject) {
        showNotice('warning', '请先创建或打开工程');
        return;
      }
      setNodes((items) => [
        ...items,
        createCanvasNode(type, position, {
          title: item.name,
          asset: { src: item.src, name: item.name, kind: item.kind },
        }),
      ]);
      setSaveStatus('dirty');
    },
    [currentProject, screenToFlowPosition, showNotice]
  );

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !currentProject) {
      showNotice('warning', '请先打开或创建工程');
      return;
    }
    try {
      setUploadState('uploading');
      const asset = await uploadProjectAsset(currentProject.slug, file);
      const kind = inferAssetKind(file.name);
      addNode(kind === 'video' ? 'videoNode' : 'imageNode', {
        title: file.name,
        asset: { ...asset, kind },
      });
      setUploadState('idle');
      showNotice('success', '素材已上传到当前工程');
    } catch (error) {
      setUploadState('failed');
      showNotice('error', error.message);
    }
  };

  const handleDrop = (event) => {
    event.preventDefault();
    const raw = event.dataTransfer.getData('application/json');
    if (!raw) return;
    addMaterialNode(JSON.parse(raw), { x: event.clientX, y: event.clientY });
  };

  return (
    <div className="app-shell">
      <ProjectSidebar
        projects={projects}
        currentProject={currentProject}
        onCreate={handleCreateProject}
        onOpen={handleOpenProject}
        onRename={handleRenameProject}
        onDelete={handleDeleteProject}
        onSave={handleSaveProject}
      />
      <main className="workspace">
        <header className="topbar">
          <div>
            <strong>{currentProject?.name || '未打开工程'}</strong>
            <span className={`save-pill ${saveStatusKind(saveStatus)}`} data-testid="save-status">
              {saveStatusLabel(saveStatus)}
            </span>
          </div>
          <div className="toolbar">
            <button type="button" onClick={() => addNode('imageNode')}>
              <ImagePlus size={16} />
              图片
            </button>
            <button type="button" onClick={() => addNode('videoNode')}>
              <Video size={16} />
              视频
            </button>
            <button type="button" data-testid="add-text-node" onClick={() => addNode('textNode')}>
              <Type size={16} />
              文本
            </button>
            <label className="file-button">
              <Upload size={16} />
              {uploadState === 'uploading' ? '上传中' : '上传'}
              <input type="file" accept="image/*,video/*" onChange={handleUpload} />
            </label>
          </div>
        </header>
        <section className="canvas-wrap" onDragOver={(event) => event.preventDefault()} onDrop={handleDrop}>
          {currentProject && selectedNodeIds.length > 0 ? (
            <div className="selection-toolbar">
              <span>{selectedNodeIds.length} 个节点</span>
              <button type="button" onClick={() => duplicateNodesById(selectedNodeIds)}>
                <Copy size={15} />
                复制
              </button>
              <button type="button" onClick={() => deleteNodesById(selectedNodeIds)}>
                <Trash2 size={15} />
                删除
              </button>
            </div>
          ) : null}
          {!currentProject ? (
            <EmptyCanvasState onCreate={handleCreateProject} />
          ) : (
            <ReactFlow
              nodes={runtimeNodes}
              edges={edges}
              nodeTypes={nodeTypes}
              onNodesChange={(changes) => {
                setNodes((items) => applyNodeChanges(changes, items));
                setSaveStatus('dirty');
              }}
              onEdgesChange={(changes) => {
                setEdges((items) => applyEdgeChanges(changes, items));
                setSaveStatus('dirty');
              }}
              onConnect={(connection) => {
                setEdges((items) => addEdge(connection, items));
                setSaveStatus('dirty');
              }}
            >
              <Background />
              <Controls />
            </ReactFlow>
          )}
        </section>
      </main>
      <MaterialPanel
        materials={materials}
        historyItems={currentProject?.history || []}
        onRefresh={refreshMaterials}
        onDelete={async (id) => {
          await deleteMaterial(id);
          await refreshMaterials();
        }}
        onReviewMaterial={async (item) => {
          const assetRef = window.prompt('输入已审核的 asset:// 引用；留空则尝试调用 Seedance 审核服务', '');
          if (assetRef == null) return;
          try {
            await reviewSeedanceMaterial(item.id, assetRef ? { assetRef } : {});
            await refreshMaterials();
            showNotice('success', 'Seedance 审核状态已更新');
          } catch (error) {
            showNotice('error', error.message);
          }
        }}
        onDropMaterial={addMaterialNode}
      />
      <Notice kind={notice?.kind} onDismiss={() => setNotice(null)}>
        {notice?.text}
      </Notice>
      <ConfirmDialog
        open={Boolean(pendingDeleteSlug)}
        title="删除工程"
        body="确定删除这个工程？本地 project_data.json 和 assets 会被移除。"
        confirmText="删除"
        onCancel={() => setPendingDeleteSlug(null)}
        onConfirm={confirmDeleteProject}
      />
      <SaveMaterialModal
        draft={materialDraft}
        onCancel={() => setMaterialDraft(null)}
        onConfirm={confirmSaveMaterial}
      />
    </div>
  );
}

export default function App() {
  return (
    <ReactFlowProvider>
      <Workbench />
    </ReactFlowProvider>
  );
}
