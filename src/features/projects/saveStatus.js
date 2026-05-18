export function saveStatusLabel(status) {
  if (status === 'dirty') return '未保存';
  if (status === 'saving') return '保存中';
  if (status === 'saved') return '已保存';
  if (status === 'failed') return '保存失败';
  return '空闲';
}

export function saveStatusKind(status) {
  if (status === 'failed') return 'error';
  if (status === 'dirty') return 'warning';
  if (status === 'saving') return 'info';
  return 'success';
}
