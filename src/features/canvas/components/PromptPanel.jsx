export default function PromptPanel({ value, placeholder, onChange }) {
  return <textarea value={value || ''} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />;
}
