import { Trash2 } from 'lucide-react';

export default function MaterialPanel({ materials, onRefresh, onDelete, onDropMaterial }) {
  return (
    <aside className="side-panel right-panel">
      <div className="panel-heading">
        <h2>素材库</h2>
        <button type="button" onClick={onRefresh}>刷新</button>
      </div>
      <div className="material-list">
        {materials.map((item) => (
          <div
            className="material-item"
            draggable
            key={item.id}
            onDragStart={(event) => {
              event.dataTransfer.setData('application/json', JSON.stringify(item));
            }}
            onDoubleClick={() => onDropMaterial(item)}
          >
            <div className="material-thumb">
              {item.kind === 'video' && /\.(mp4|webm|mov)$/i.test(item.src) ? (
                <video src={item.src} muted />
              ) : (
                <img src={item.src} alt={item.name} />
              )}
            </div>
            <div className="material-meta">
              <strong>{item.name}</strong>
              <span>{item.category}</span>
            </div>
            <button type="button" className="icon-button" onClick={() => onDelete(item.id)}>
              <Trash2 size={15} />
            </button>
          </div>
        ))}
        {materials.length === 0 ? <div className="empty-state">暂无素材</div> : null}
      </div>
    </aside>
  );
}
