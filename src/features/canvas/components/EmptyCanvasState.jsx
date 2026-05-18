import { FolderPlus } from 'lucide-react';

export default function EmptyCanvasState({ onCreate }) {
  return (
    <div className="empty-canvas">
      <div>
        <FolderPlus size={42} />
        <h1>先创建或打开一个工程</h1>
        <p>工程会保存画布节点、连线和生成素材。新项目默认把用户数据放在本地 `projects/` 目录。</p>
        <button type="button" className="primary-button compact" onClick={onCreate}>
          新建工程
        </button>
      </div>
    </div>
  );
}
