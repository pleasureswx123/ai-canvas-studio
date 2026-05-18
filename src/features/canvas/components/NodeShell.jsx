import { Copy, Trash2 } from 'lucide-react';

export default function NodeShell({ icon, title, onTitleChange, onDuplicate, onDelete, children }) {
  return (
    <div className="node-card">
      <div className="node-title">
        {icon}
        <input value={title || ''} onChange={(event) => onTitleChange(event.target.value)} />
        <button type="button" className="node-icon-action" onClick={onDuplicate} aria-label="复制节点" title="复制节点">
          <Copy size={14} />
        </button>
        <button type="button" className="node-icon-action danger-lite" onClick={onDelete} aria-label="删除节点" title="删除节点">
          <Trash2 size={14} />
        </button>
      </div>
      {children}
    </div>
  );
}
