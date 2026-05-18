export default function MentionPicker({ options = [], onInsert }) {
  if (!options.length) return null;
  return (
    <label className="mention-picker">
      <span>引用</span>
      <select
        value=""
        onChange={(event) => {
          const value = event.target.value;
          if (!value) return;
          const option = options.find((item) => item.id === value);
          if (option) onInsert(`@[${option.title}](node:${option.id})`);
          event.target.value = '';
        }}
      >
        <option value="">选择节点</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.title}
          </option>
        ))}
      </select>
    </label>
  );
}
