import { Handle, Position, useNodeId } from '@xyflow/react';
import { Sparkles, Type } from 'lucide-react';
import NodeShell from '../components/NodeShell.jsx';
import MentionPicker from '../components/MentionPicker.jsx';
import { analyzeText } from '../../text/textApi.js';

export default function TextNode({ data }) {
  const nodeId = useNodeId();
  const patch = (next) => data.onPatchNode?.(nodeId, next);

  async function handleAnalyze() {
    if (!data.text?.trim()) return patch({ error: '请先输入文本内容' });
    patch({ status: 'RUNNING', error: '' });
    try {
      const result = await analyzeText(data.text);
      patch({ analysis: result, status: 'SUCCEEDED' });
    } catch (error) {
      patch({ status: 'FAILED', error: error.message });
    }
  }

  return (
    <NodeShell
      icon={<Type size={16} />}
      title={data.title}
      onTitleChange={(title) => patch({ title })}
      onDuplicate={() => data.onDuplicateNode?.(nodeId)}
      onDelete={() => data.onDeleteNode?.(nodeId)}
    >
      <Handle type="target" position={Position.Left} />
      <textarea
        className="text-node-textarea"
        value={data.text || ''}
        onChange={(event) => patch({ text: event.target.value })}
        placeholder="文本内容"
      />
      <MentionPicker
        options={data.mentionOptions}
        onInsert={(mention) => patch({ text: `${data.text || ''}${data.text ? ' ' : ''}${mention}` })}
      />
      {data.error ? <div className="node-error">{data.error}</div> : null}
      {data.analysis ? (
        <div className="text-analysis">
          <strong>摘要</strong>
          <p>{data.analysis.summary}</p>
          {data.analysis.keywords?.length ? <span>{data.analysis.keywords.join(' / ')}</span> : null}
        </div>
      ) : null}
      <div className="node-actions">
        <button type="button" onClick={handleAnalyze} disabled={data.status === 'RUNNING'}>
          <Sparkles size={15} />
          {data.status === 'RUNNING' ? '分析中' : '分析文本'}
        </button>
      </div>
      <Handle type="source" position={Position.Right} />
    </NodeShell>
  );
}
