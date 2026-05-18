import { FolderOpen, Image, Plus, Save, Trash2 } from 'lucide-react';

export default function ProjectSidebar({
  projects,
  currentProject,
  onCreate,
  onOpen,
  onRename,
  onDelete,
  onSave,
}) {
  return (
    <aside className="side-panel">
      <div className="brand">My Canvas Next</div>
      <button type="button" className="primary-button" data-testid="create-project" onClick={onCreate}>
        <Plus size={16} />
        新建工程
      </button>
      <button type="button" onClick={onSave} disabled={!currentProject}>
        <Save size={16} />
        保存当前工程
      </button>
      <div className="project-list">
        {projects.map((project) => (
          <div className={`project-row ${project.slug === currentProject?.slug ? 'active' : ''}`} key={project.slug}>
            <button type="button" data-testid={`open-project-${project.slug}`} onClick={() => onOpen(project.slug)}>
              <span className="project-cover">
                {project.cover?.src ? <img src={project.cover.src} alt={project.name} /> : <Image size={16} />}
              </span>
              <span className="project-title">
                <strong>{project.name}</strong>
                <small>
                  <FolderOpen size={12} />
                  {project.nodeCount || 0} 节点
                </small>
              </span>
            </button>
            <button type="button" className="icon-button" onClick={() => onRename(project)}>
              改名
            </button>
            <button type="button" className="icon-button" onClick={() => onDelete(project.slug)}>
              <Trash2 size={15} />
            </button>
          </div>
        ))}
        {projects.length === 0 ? <div className="empty-state">暂无工程</div> : null}
      </div>
    </aside>
  );
}
