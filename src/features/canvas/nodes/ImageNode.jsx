import { useNodeId } from '@xyflow/react';
import { useState } from 'react';
import { ImagePlus } from 'lucide-react';
import { generateImage } from '../../generation/generationApi.js';
import { uploadProjectAsset } from '../../projects/projectApi.js';
import { featureFlags } from '../../../shared/config/featureFlags.js';
import GenerationSettings from '../components/GenerationSettings.jsx';
import MediaPreview from '../components/MediaPreview.jsx';
import MentionPicker from '../components/MentionPicker.jsx';
import NodeActions from '../components/NodeActions.jsx';
import NodeHandles from '../components/NodeHandles.jsx';
import NodeShell from '../components/NodeShell.jsx';
import NodeStatus from '../components/NodeStatus.jsx';
import PromptPanel from '../components/PromptPanel.jsx';
import { createAnnotatedImageFile, createCroppedImageFile } from '../imageEditing.js';

const IMAGE_SETTING_FIELDS = [
  {
    key: 'provider',
    label: '服务',
    defaultValue: 'mock',
    options: [
      { value: 'mock', label: 'Mock' },
      { value: 'vectorengine_image', label: 'VectorEngine' },
      { value: 'openai_image', label: 'OpenAI/Ark' },
    ],
  },
  {
    key: 'model',
    label: '模型',
    defaultValue: 'gemini-3-pro-image-preview',
    options: [
      { value: 'gemini-3-pro-image-preview', label: 'Gemini 3 Pro Image' },
      { value: 'gpt-image-2', label: 'GPT Image 2' },
      { value: 'doubao-seedream-5-0-260128', label: 'Seedream 5' },
    ],
  },
  {
    key: 'ratio',
    label: '比例',
    defaultValue: '1:1',
    options: [
      { value: '1:1', label: '1:1' },
      { value: '16:9', label: '16:9' },
      { value: '9:16', label: '9:16' },
      { value: '4:3', label: '4:3' },
      { value: '3:4', label: '3:4' },
    ],
  },
  {
    key: 'size',
    label: '尺寸',
    defaultValue: '1024x1024',
    options: [
      { value: '1024x1024', label: '1024' },
      { value: '1536x864', label: '1536x864' },
      { value: '864x1536', label: '864x1536' },
    ],
  },
  {
    key: 'quality',
    label: '质量',
    defaultValue: 'auto',
    options: [
      { value: 'auto', label: 'Auto' },
      { value: 'standard', label: 'Standard' },
      { value: 'hd', label: 'HD' },
      { value: 'high', label: 'High' },
    ],
  },
];

export default function ImageNode({ data }) {
  const nodeId = useNodeId();
  const [annotationText, setAnnotationText] = useState('');
  const asset = data.asset;

  const patch = (next) => data.onPatchNode?.(nodeId, next);

  async function handleGenerate() {
    if (!data.projectSlug) return patch({ error: '请先打开或创建工程' });
    if (!data.prompt?.trim()) return patch({ error: '请先输入图片提示词' });
    patch({ status: 'RUNNING', error: '' });
    try {
      const result = await generateImage({
        prompt: data.prompt,
        projectSlug: data.projectSlug,
        provider: data.provider || 'mock',
        model: data.model,
        ratio: data.ratio,
        size: data.size,
        quality: data.quality,
        inputImages: data.upstreamImages || [],
        contextText: data.upstreamText || '',
      });
      const nextAsset = { src: result.src, name: result.savedFilename, kind: 'image' };
      patch({ asset: nextAsset, status: 'SUCCEEDED' });
      data.onRecordHistory?.({
        nodeId,
        nodeTitle: data.title,
        kind: 'image',
        prompt: data.prompt,
        provider: data.provider || 'mock',
        model: data.model,
        asset: nextAsset,
      });
    } catch (error) {
      patch({ status: 'FAILED', error: error.message });
    }
  }

  async function uploadEditedImage(file) {
    if (!data.projectSlug) return patch({ error: '请先打开或创建工程' });
    patch({ status: 'RUNNING', error: '' });
    try {
      const uploaded = await uploadProjectAsset(data.projectSlug, file);
      patch({
        asset: { src: uploaded.src, name: uploaded.name, kind: 'image' },
        status: 'SUCCEEDED',
        error: '',
      });
    } catch (error) {
      patch({ status: 'FAILED', error: error.message });
    }
  }

  async function handleCrop(aspectRatio) {
    if (!asset?.src) return patch({ error: '请先生成或上传图片' });
    try {
      const file = await createCroppedImageFile(asset.src, aspectRatio, asset.name || data.title);
      await uploadEditedImage(file);
    } catch (error) {
      patch({ status: 'FAILED', error: error.message });
    }
  }

  async function handleAnnotate() {
    if (!asset?.src) return patch({ error: '请先生成或上传图片' });
    if (!annotationText.trim()) return patch({ error: '请输入标注文字' });
    try {
      const file = await createAnnotatedImageFile(asset.src, annotationText, asset.name || data.title);
      await uploadEditedImage(file);
    } catch (error) {
      patch({ status: 'FAILED', error: error.message });
    }
  }

  return (
    <NodeShell
      icon={<ImagePlus size={16} />}
      title={data.title}
      onTitleChange={(title) => patch({ title })}
      onDuplicate={() => data.onDuplicateNode?.(nodeId)}
      onDelete={() => data.onDeleteNode?.(nodeId)}
    >
      <NodeHandles />
      <MediaPreview asset={asset} title={data.title} placeholder="Image" kind="image" />
      {featureFlags.imageEdit ? (
        <div className="image-edit-panel">
          <div className="image-edit-buttons">
            <button type="button" disabled={!asset?.src || data.status === 'RUNNING'} onClick={() => handleCrop(1)}>
              裁剪 1:1
            </button>
            <button type="button" disabled={!asset?.src || data.status === 'RUNNING'} onClick={() => handleCrop(16 / 9)}>
              16:9
            </button>
            <button type="button" disabled={!asset?.src || data.status === 'RUNNING'} onClick={() => handleCrop(9 / 16)}>
              9:16
            </button>
          </div>
          <div className="image-annotation-row">
            <input
              value={annotationText}
              disabled={!asset?.src || data.status === 'RUNNING'}
              onChange={(event) => setAnnotationText(event.target.value)}
              placeholder="标注文字"
            />
            <button type="button" disabled={!asset?.src || data.status === 'RUNNING'} onClick={handleAnnotate}>
              标注
            </button>
          </div>
        </div>
      ) : null}
      <PromptPanel value={data.prompt} onChange={(prompt) => patch({ prompt })} placeholder="图片提示词" />
      <MentionPicker
        options={data.mentionOptions}
        onInsert={(mention) => patch({ prompt: `${data.prompt || ''}${data.prompt ? ' ' : ''}${mention}` })}
      />
      <GenerationSettings fields={IMAGE_SETTING_FIELDS} values={data} onChange={patch} />
      {data.upstreamSummary ? <div className="upstream-summary">{data.upstreamSummary}</div> : null}
      <NodeStatus error={data.error} status={data.status} />
      <NodeActions
        generateLabel="生成图片"
        busy={data.status === 'RUNNING'}
        onGenerate={handleGenerate}
        onSaveMaterial={() => data.onSaveMaterial?.(asset)}
        canSave={Boolean(asset?.src)}
      />
    </NodeShell>
  );
}
