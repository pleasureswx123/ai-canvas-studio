export default function GenerationSettings({ fields, values, onChange }) {
  return (
    <div className="generation-settings">
      {fields.map((field) => (
        <label key={field.key}>
          <span>{field.label}</span>
          <select value={values[field.key] || field.defaultValue || ''} onChange={(event) => onChange({ [field.key]: event.target.value })}>
            {field.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      ))}
    </div>
  );
}
