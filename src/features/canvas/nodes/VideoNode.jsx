import { useNodeId } from '@xyflow/react';
import { Video } from 'lucide-react';
import { generateVideo, getVideoTask } from '../../generation/generationApi.js';
import GenerationSettings from '../components/GenerationSettings.jsx';
import MediaPreview from '../components/MediaPreview.jsx';
import MentionPicker from '../components/MentionPicker.jsx';
import NodeActions from '../components/NodeActions.jsx';
import NodeHandles from '../components/NodeHandles.jsx';
import NodeShell from '../components/NodeShell.jsx';
import NodeStatus from '../components/NodeStatus.jsx';
import PromptPanel from '../components/PromptPanel.jsx';

const VIDEO_SETTING_FIELDS = [
  {
    key: 'provider',
    label: '服务',
    defaultValue: 'mock',
    options: [
      { value: 'mock', label: 'Mock' },
      { value: 'xunke_video', label: 'Xunke' },
      { value: 'dashscope_video', label: 'DashScope' },
      { value: 'ark_video', label: 'Ark' },
    ],
  },
  {
    key: 'model',
    label: '模型',
    defaultValue: 'seed-2-720p',
    options: [
      { value: 'seed-2-480p', label: 'Seed 2 480p' },
      { value: 'seed-2-720p', label: 'Seed 2 720p' },
      { value: 'wan2.7-i2v', label: 'Wan 2.7 I2V' },
      { value: 'doubao-seedance-2-0-260128', label: 'Seedance 2 Ark' },
    ],
  },
  {
    key: 'scenario',
    label: '场景',
    defaultValue: 'text',
    options: [
      { value: 'text', label: '文生视频' },
      { value: 'multimodal', label: '参考图' },
      { value: 'first_frame', label: '首帧' },
    ],
  },
  {
    key: 'ratio',
    label: '比例',
    defaultValue: '16:9',
    options: [
      { value: '16:9', label: '16:9' },
      { value: '9:16', label: '9:16' },
      { value: '1:1', label: '1:1' },
    ],
  },
  {
    key: 'resolution',
    label: '清晰度',
    defaultValue: '720p',
    options: [
      { value: '480p', label: '480p' },
      { value: '720p', label: '720p' },
      { value: '1080p', label: '1080p' },
    ],
  },
  {
    key: 'duration',
    label: '时长',
    defaultValue: '5',
    options: [
      { value: '4', label: '4s' },
      { value: '5', label: '5s' },
      { value: '8', label: '8s' },
      { value: '10', label: '10s' },
    ],
  },
];

export default function VideoNode({ data }) {
  const nodeId = useNodeId();
  const asset = data.asset;
  const patch = (next) => data.onPatchNode?.(nodeId, next);

  const pollTask = async (taskId) => {
    let latest = null;
    for (let attempt = 0; attempt < 24; attempt += 1) {
      latest = await getVideoTask(taskId);
      patch({ taskId, status: latest.status });
      if (latest.status === 'SUCCEEDED' || latest.status === 'FAILED') return latest;
      await new Promise((resolve) => window.setTimeout(resolve, 2500));
    }
    throw new Error('视频任务轮询超时');
  };

  async function handleGenerate() {
    if (!data.projectSlug) return patch({ error: '请先打开或创建工程' });
    if (!data.prompt?.trim()) return patch({ error: '请先输入视频提示词' });
    patch({ status: 'RUNNING', error: '' });
    try {
      const submitted = await generateVideo({
        prompt: data.prompt,
        projectSlug: data.projectSlug,
        provider: data.provider || 'mock',
        model: data.model,
        ratio: data.ratio,
        resolution: data.resolution,
        duration: data.duration,
        scenario: data.scenario,
        inputImages: data.upstreamImages || [],
        contextText: data.upstreamText || '',
      });
      patch({ taskId: submitted.taskId, status: submitted.status || 'PENDING' });
      const task = await pollTask(submitted.taskId);
      if (task.status === 'FAILED') throw new Error(task.error || '视频生成失败');
      patch({
        taskId: submitted.taskId,
        status: task.status,
        asset: { src: task.src, name: task.savedFilename, kind: 'video' },
      });
    } catch (error) {
      patch({ status: 'FAILED', error: error.message });
    }
  }

  return (
    <NodeShell
      icon={<Video size={16} />}
      title={data.title}
      onTitleChange={(title) => patch({ title })}
      onDuplicate={() => data.onDuplicateNode?.(nodeId)}
      onDelete={() => data.onDeleteNode?.(nodeId)}
    >
      <NodeHandles />
      <MediaPreview asset={asset} title={data.title} placeholder="Video" kind="video" />
      <PromptPanel value={data.prompt} onChange={(prompt) => patch({ prompt })} placeholder="视频提示词" />
      <MentionPicker
        options={data.mentionOptions}
        onInsert={(mention) => patch({ prompt: `${data.prompt || ''}${data.prompt ? ' ' : ''}${mention}` })}
      />
      <GenerationSettings fields={VIDEO_SETTING_FIELDS} values={data} onChange={patch} />
      {data.upstreamSummary ? <div className="upstream-summary">{data.upstreamSummary}</div> : null}
      <NodeStatus error={data.error} status={data.status} />
      <NodeActions
        generateLabel="生成视频"
        busy={data.status === 'RUNNING' || data.status === 'PENDING'}
        onGenerate={handleGenerate}
        onSaveMaterial={() => data.onSaveMaterial?.(asset)}
        canSave={Boolean(asset?.src)}
      />
    </NodeShell>
  );
}
