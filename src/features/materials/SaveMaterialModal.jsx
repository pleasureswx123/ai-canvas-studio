const CATEGORIES = ['人物', '场景', '物品', '风格', '音效', '其他'];

export default function SaveMaterialModal({ draft, onCancel, onConfirm }) {
  if (!draft) return null;

  const update = (patch) => onConfirm({ ...draft, ...patch }, { previewOnly: true });

  return (
    <div className="modal-backdrop" role="presentation">
      <div className="confirm-dialog material-dialog" role="dialog" aria-modal="true" aria-labelledby="save-material-title">
        <h2 id="save-material-title">保存到素材库</h2>
        <label className="dialog-field">
          <span>名称</span>
          <input value={draft.name} onChange={(event) => update({ name: event.target.value })} />
        </label>
        <label className="dialog-field">
          <span>分类</span>
          <select value={draft.category} onChange={(event) => update({ category: event.target.value })}>
            {CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>
        <label className="dialog-field">
          <span>类型</span>
          <select value={draft.kind} onChange={(event) => update({ kind: event.target.value })}>
            <option value="image">图片</option>
            <option value="video">视频</option>
          </select>
        </label>
        <div className="dialog-actions">
          <button type="button" onClick={onCancel}>
            取消
          </button>
          <button type="button" className="primary-inline" onClick={() => onConfirm(draft)}>
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
