export default function Notice({ kind = 'info', children, onDismiss }) {
  if (!children) return null;
  return (
    <div className={`notice notice-${kind}`} role={kind === 'error' ? 'alert' : 'status'}>
      <span>{children}</span>
      {onDismiss ? (
        <button type="button" className="notice-close" onClick={onDismiss} aria-label="关闭提示">
          ×
        </button>
      ) : null}
    </div>
  );
}
