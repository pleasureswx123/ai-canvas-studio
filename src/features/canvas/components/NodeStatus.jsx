export default function NodeStatus({ error, status }) {
  return (
    <>
      {error ? <div className="node-error">{error}</div> : null}
      {status ? <div className={`node-status status-${String(status).toLowerCase()}`}>{status}</div> : null}
    </>
  );
}
