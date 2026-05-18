import { Handle, Position } from '@xyflow/react';

export default function NodeHandles() {
  return (
    <>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </>
  );
}
