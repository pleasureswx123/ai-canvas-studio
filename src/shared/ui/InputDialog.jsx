import { useEffect, useState } from 'react';

export default function InputDialog({
  open,
  title,
  label,
  description = '',
  initialValue = '',
  placeholder = '',
  confirmText = '确认',
  allowEmpty = false,
  multiline = false,
  onCancel,
  onConfirm,
}) {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    if (open) setValue(initialValue);
  }, [initialValue, open]);

  if (!open) return null;

  const canSubmit = allowEmpty || value.trim().length > 0;
  const Field = multiline ? 'textarea' : 'input';

  return (
    <div className="modal-backdrop" role="presentation">
      <form
        className="confirm-dialog input-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="input-dialog-title"
        onSubmit={(event) => {
          event.preventDefault();
          if (!canSubmit) return;
          onConfirm(allowEmpty ? value.trim() : value.trim());
        }}
      >
        <h2 id="input-dialog-title">{title}</h2>
        {description ? <p>{description}</p> : null}
        <label className="dialog-field">
          <span>{label}</span>
          <Field
            autoFocus
            data-testid="input-dialog-field"
            value={value}
            placeholder={placeholder}
            onChange={(event) => setValue(event.target.value)}
          />
        </label>
        <div className="dialog-actions">
          <button type="button" onClick={onCancel}>
            取消
          </button>
          <button type="submit" className="primary-inline" disabled={!canSubmit} data-testid="input-dialog-confirm">
            {confirmText}
          </button>
        </div>
      </form>
    </div>
  );
}
