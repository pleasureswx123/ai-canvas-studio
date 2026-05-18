import { useMemo, useState } from 'react';
import { History, Search, ShieldCheck, ShieldQuestion, Trash2 } from 'lucide-react';
import { featureFlags } from '../../shared/config/featureFlags.js';

function draggableAssetFromHistory(item) {
  return {
    id: item.id,
    name: item.asset?.name || item.nodeTitle || '历史素材',
    category: '生成历史',
    kind: item.kind || item.asset?.kind || 'image',
    src: item.asset?.src,
  };
}

function formatHistoryTime(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function seedanceReviewLabel(review) {
  const status = String(review?.status || '').toLowerCase();
  if (status === 'approved') return '已审核';
  if (status === 'processing') return '审核中';
  if (status === 'failed') return '失败';
  return '未审核';
}

export default function MaterialPanel({
  materials,
  historyItems = [],
  onRefresh,
  onDelete,
  onDropMaterial,
  onReviewMaterial,
}) {
  const [activeTab, setActiveTab] = useState('materials');
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
  const resolvedTab = featureFlags.projectHistory ? activeTab : 'materials';

  return (
    <aside className="side-panel right-panel">
      <div className="panel-heading">
        <h2>{resolvedTab === 'materials' ? '素材库' : '生成历史'}</h2>
        {resolvedTab === 'materials' ? <button type="button" onClick={onRefresh}>刷新</button> : null}
      </div>
      {featureFlags.projectHistory ? (
        <div className="panel-tabs">
          <button type="button" className={activeTab === 'materials' ? 'active' : ''} onClick={() => setActiveTab('materials')}>
            素材
          </button>
          <button type="button" className={activeTab === 'history' ? 'active' : ''} onClick={() => setActiveTab('history')}>
            <History size={15} />
            历史
          </button>
        </div>
      ) : null}
      {resolvedTab === 'materials' && featureFlags.materialFilters ? (
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
      ) : null}
      {resolvedTab === 'materials' ? (
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
                {item.kind === 'image' && featureFlags.materialReview ? (
                  <span className={`seedance-review-status status-${String(item.seedanceFaceReview?.status || 'empty').toLowerCase()}`}>
                    {item.seedanceFaceReview?.status === 'approved' ? <ShieldCheck size={12} /> : <ShieldQuestion size={12} />}
                    {seedanceReviewLabel(item.seedanceFaceReview)}
                  </span>
                ) : null}
              </div>
              {item.kind === 'image' && featureFlags.materialReview ? (
                <button
                  type="button"
                  className="icon-button"
                  title="Seedance 审核"
                  onClick={() => onReviewMaterial?.(item)}
                >
                  <ShieldCheck size={15} />
                </button>
              ) : null}
              <button type="button" className="icon-button" onClick={() => onDelete(item.id)}>
                <Trash2 size={15} />
              </button>
            </div>
          ))}
          {materials.length === 0 ? <div className="empty-state">暂无素材</div> : null}
          {materials.length > 0 && filteredMaterials.length === 0 ? <div className="empty-state">没有匹配的素材</div> : null}
        </div>
      ) : (
        <div className="material-list">
          {historyItems.map((item) => {
            const asset = draggableAssetFromHistory(item);
            return (
              <div
                className="material-item history-item"
                draggable
                key={item.id}
                onDragStart={(event) => {
                  event.dataTransfer.setData('application/json', JSON.stringify(asset));
                }}
                onDoubleClick={() => onDropMaterial(asset)}
              >
                <div className="material-thumb">
                  {asset.kind === 'video' && /\.(mp4|webm|mov)$/i.test(asset.src) ? (
                    <video src={asset.src} muted />
                  ) : (
                    <img src={asset.src} alt={asset.name} />
                  )}
                </div>
                <div className="material-meta">
                  <strong>{item.nodeTitle || asset.name}</strong>
                  <span>{formatHistoryTime(item.createdAt)} · {item.provider || 'mock'} · {item.model || '-'}</span>
                  <p>{item.prompt}</p>
                </div>
              </div>
            );
          })}
          {historyItems.length === 0 ? <div className="empty-state">暂无生成历史</div> : null}
        </div>
      )}
    </aside>
  );
}
