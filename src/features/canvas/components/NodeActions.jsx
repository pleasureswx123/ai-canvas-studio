import { Save, Sparkles } from 'lucide-react';

export default function NodeActions({ generateLabel, busyLabel = '生成中', busy = false, onGenerate, onSaveMaterial, canSave }) {
  return (
    <div className="node-actions">
      <button type="button" onClick={onGenerate} disabled={busy}>
        <Sparkles size={15} />
        {busy ? busyLabel : generateLabel}
      </button>
      <button type="button" onClick={onSaveMaterial} disabled={!canSave}>
        <Save size={15} />
        存素材
      </button>
    </div>
  );
}
