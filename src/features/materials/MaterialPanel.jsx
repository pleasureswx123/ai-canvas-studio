import { useMemo, useState } from 'react';
import { Search, Trash2 } from 'lucide-react';

export default function MaterialPanel({ materials, onRefresh, onDelete, onDropMaterial }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [kind, setKind] = useState('all');

  const categories = useMemo(
    () =>
      Array.from(new Set(materials.map((item) => item.category || '其他')))
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, 'zh-Hans-CN')),
    [materials]
  );

  const filteredMaterials = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return materials.filter((item) => {
      const matchesKind = kind === 'all' || item.kind === kind;
      const matchesCategory = category === 'all' || (item.category || '其他') === category;
      const haystack = `${item.name || ''} ${item.category || ''} ${item.kind || ''}`.toLowerCase();
      const matchesQuery = !keyword || haystack.includes(keyword);
      return matchesKind && matchesCategory && matchesQuery;
    });
  }, [category, kind, materials, query]);

  return (
    <aside className="side-panel right-panel">
      <div className="panel-heading">
        <h2>素材库</h2>
        <button type="button" onClick={onRefresh}>刷新</button>
      </div>
      <div className="material-filters">
        <label className="material-search">
          <Search size={15} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索名称或分类" />
        </label>
        <div className="material-filter-row">
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="all">全部分类</option>
            {categories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <select value={kind} onChange={(event) => setKind(event.target.value)}>
            <option value="all">全部类型</option>
            <option value="image">图片</option>
            <option value="video">视频</option>
          </select>
        </div>
      </div>
      <div className="material-list">
        {filteredMaterials.map((item) => (
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
        {materials.length > 0 && filteredMaterials.length === 0 ? <div className="empty-state">没有匹配的素材</div> : null}
      </div>
    </aside>
  );
}
